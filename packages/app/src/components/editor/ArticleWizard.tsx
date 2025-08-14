import React, { useEffect, useState } from "react";
import { resourceToHex } from "@latticexyz/common";
import mudConfig from "contracts/mud.config";
import ArticleSystemAbi from "contracts/out/ArticleSystem.sol/ArticleSystem.abi.json";
import { useDustClient } from "@/common/useDustClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runSql, sql } from "@/api/dustIndexer";
import { tableName } from "@/common/namespace";

interface Props {
  draftId?: string;
  articleId?: string; // on-chain hex id
  onDone?: () => void;
  onCancel?: () => void;
}

interface Draft {
  id: string;
  title: string;
  coverImage?: string;
  content: string;
  lastSaved: number;
  createdAt: number;
}

const DRAFT_KEY = "editor-article-drafts";

function loadDraft(id: string): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw) as Draft[];
    return arr.find((d) => d.id === id) ?? null;
  } catch {
    return null;
  }
}

function saveOrUpdateDraft(d: Draft) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const arr = raw ? (JSON.parse(raw) as Draft[]) : [];
    const idx = arr.findIndex((x) => x.id === d.id);
    if (idx >= 0) arr[idx] = d;
    else arr.push(d);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(arr));
    try {
      window.dispatchEvent(new CustomEvent("editor-article-drafts-updated", { detail: { id: d.id, ts: Date.now() } }));
    } catch {}
  } catch (e) {
    console.error("Failed saving draft", e);
  }
}

function deleteDraftLocal(id: string) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const arr = (JSON.parse(raw) as Draft[]).filter((d) => d.id !== id);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(arr));
    try {
      window.dispatchEvent(new CustomEvent("editor-article-drafts-updated", { detail: { id, ts: Date.now(), deleted: true } }));
    } catch {}
  } catch {}
}

// Minimal markdown renderer used for previews (supports headings, bold, italic, lists, paragraphs)
function renderMarkdownToHtml(md: string) {
  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  if (!md) return "";
  // Normalize line endings
  const text = md.replace(/\r\n?/g, "\n");
  const lines = text.split("\n");

  let html = "";
  let inList = false;

  const flushParagraph = (p: string) => {
    if (!p) return "";
    return `<p>${p.replace(/\n/g, "<br />")}</p>`;
  };

  let paraBuf: string[] = [];

  const pushPara = () => {
    if (paraBuf.length === 0) return;
    html += flushParagraph(paraBuf.join("\n"));
    paraBuf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*([-*])\s+/.test(ln)) {
      // list item
      pushPara();
      if (!inList) {
        inList = true;
        html += "<ul>";
      }
      const item = ln.replace(/^\s*([-*])\s+/, "");
      let content = escapeHtml(item);
      // inline formatting
      content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      content = content.replace(/\*(.+?)\*/g, '<em>$1</em>');
      html += `<li>${content}</li>`;
      continue;
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
    }

    // Headings
    const h1 = ln.match(/^\s*#\s+(.*)/);
    const h2 = ln.match(/^\s*##\s+(.*)/);
    const h3 = ln.match(/^\s*###\s+(.*)/);
    if (h1) {
      pushPara();
      html += `<h1>${escapeHtml(h1[1]).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</h1>`;
      continue;
    }
    if (h2) {
      pushPara();
      html += `<h2>${escapeHtml(h2[1]).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</h2>`;
      continue;
    }
    if (h3) {
      pushPara();
      html += `<h3>${escapeHtml(h3[1]).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</h3>`;
      continue;
    }

    // Empty line -> paragraph break
    if (ln.trim() === "") {
      pushPara();
      continue;
    }

    // accumulate into paragraph buffer
    paraBuf.push(escapeHtml(ln).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>'));
  }

  if (inList) html += "</ul>";
  pushPara();

  return html;
}

export const ArticleWizard: React.FC<Props> = ({ draftId, articleId, onDone, onCancel }) => {
  const { data: dustClient } = useDustClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [content, setContent] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftLocalId, setDraftLocalId] = useState(draftId ?? null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    // hydrate from draft or articleId (basic)
    if (draftId) {
      const d = loadDraft(draftId);
      if (d) {
        setTitle(d.title);
        setCoverImage(d.coverImage ?? "");
        setContent(d.content);
        setDraftLocalId(d.id);
      }
    }

    // If editing an on-chain article and there's no local draft, fetch the Post row from indexer to prefill
    if (articleId && !draftId) {
      let aborted = false;
      (async () => {
        try {
          const query = `SELECT "id","owner","createdAt","updatedAt","title","content","coverImage" FROM ${sql.ident(
            tableName("Post")
          )} WHERE "id" = ${sql.hex32(articleId)} LIMIT 1`;
          const rows = await runSql<any>(query);
          if (rows.length && !aborted) {
            const r = rows[0];
            setTitle((r.title as string) ?? "");
            setCoverImage((r.coverImage as string) ?? "");
            setContent((r.content as string) ?? "");
            // We're editing the on-chain version, so clear any ephemeral draft id
            setDraftLocalId(null);
          }
        } catch (e) {
          // Non-fatal: fall back to blank editor
          // eslint-disable-next-line no-console
          console.warn("Failed to fetch on-chain article for editing", e);
        }
      })();

      return () => {
        aborted = true;
      };
    }
  }, [draftId, articleId]);

  // Simple markdown formatting helper (applies to textarea with id 'article-content-textarea')
  const applyFormatting = (action: "h1" | "h2" | "h3" | "bold" | "italic") => {
    const textarea = document.getElementById("article-content-textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.substring(selectionStart, selectionEnd);

    if (action === "h1" || action === "h2" || action === "h3") {
      const prefix = action === "h1" ? "# " : action === "h2" ? "## " : "### ";
      // Apply header to start of the current line(s)
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);
      // find start of first selected line
      const lineStart = before.lastIndexOf("\n") + 1;
      const lines = value.substring(lineStart, selectionEnd).split("\n");
      const newLines = lines.map((ln) => (ln.startsWith(prefix) ? ln : prefix + ln));
      const newValue = value.substring(0, lineStart) + newLines.join("\n") + after;
      setContent(newValue);
      requestAnimationFrame(() => {
        const newStart = lineStart;
        const newEnd = lineStart + newLines.join("\n").length;
        textarea.selectionStart = newStart;
        textarea.selectionEnd = newEnd;
        textarea.focus();
      });
      return;
    }

    if (action === "bold" || action === "italic") {
      const wrapper = action === "bold" ? "**" : "*";
      const newValue = value.substring(0, selectionStart) + wrapper + selected + wrapper + value.substring(selectionEnd);
      setContent(newValue);
      requestAnimationFrame(() => {
        const start = selectionStart + wrapper.length;
        const end = start + selected.length;
        textarea.selectionStart = start;
        textarea.selectionEnd = end;
        textarea.focus();
      });
      return;
    }
  };

  const canContinueFrom1 = title.trim().length > 0 && content.trim().length > 0;

  const handleSaveDraft = () => {
    const now = Date.now();
    const id = draftLocalId ?? crypto.randomUUID();
    const d: Draft = {
      id,
      title,
      coverImage,
      content,
      lastSaved: now,
      createdAt: draftLocalId ? (loadDraft(draftLocalId!)?.createdAt ?? now) : now,
    };
    saveOrUpdateDraft(d);
    setDraftLocalId(id);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const handlePublish = async () => {
    if (!canContinueFrom1) {
      alert("Please complete content before publishing");
      return;
    }
    if (!dustClient) {
      alert("Wallet/client not ready");
      return;
    }
    setIsPublishing(true);
    try {
      const articleSystemId = resourceToHex({ type: "system", namespace: mudConfig.namespace, name: "ArticleSystem" });

      if (articleId) {
        // update
        await (dustClient as any).provider.request({
          method: "systemCall",
          params: [
            {
              systemId: articleSystemId,
              abi: ArticleSystemAbi as any,
              functionName: "updateArticle",
              args: [articleId, title, content],
            },
          ],
        });
      } else {
        // create
        await (dustClient as any).provider.request({
          method: "systemCall",
          params: [
            {
              systemId: articleSystemId,
              abi: ArticleSystemAbi as any,
              functionName: "createArticle",
              args: [title, content],
            },
          ],
        });
      }

      // remove draft locally if exists
      if (draftLocalId) deleteDraftLocal(draftLocalId);

      onDone?.();
    } catch (e) {
      console.error("Publish failed", e);
      alert("Failed to publish. See console.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card className="border-neutral-900">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="font-heading">{articleId ? "Edit Article" : "New Article"}</span>
            <div className={step === 1 ? "px-2 py-1 text-xs rounded bg-brand-600 text-white" : "px-2 py-1 text-xs rounded bg-neutral-100 text-text-secondary"}>1. Content</div>
            <div className={step === 2 ? "px-2 py-1 text-xs rounded bg-brand-600 text-white" : "px-2 py-1 text-xs rounded bg-neutral-100 text-text-secondary"}>2. Preview</div>
            <div className={step === 3 ? "px-2 py-1 text-xs rounded bg-brand-600 text-white" : "px-2 py-1 text-xs rounded bg-neutral-100 text-text-secondary"}>3. Publish</div>
          </div>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => Math.max(1, (s as number) - 1) as 1 | 2 | 3)}
                className="px-3 py-1.5 text-sm bg-neutral-100 rounded hover:bg-neutral-200"
              >
                Back
              </button>
            )}

            {step === 1 && (
              <>
                <button onClick={handleSaveDraft} className="px-3 py-1.5 text-sm bg-neutral-100 rounded hover:bg-neutral-200">{justSaved ? "Saved" : "Save Draft"}</button>
                <button disabled={!canContinueFrom1} onClick={() => setStep(2)} className="px-3 py-1.5 text-sm text-white bg-brand-600 rounded disabled:opacity-50">Continue</button>
              </>
            )}

            {step === 2 && (
              <button onClick={() => setStep(3)} className="px-3 py-1.5 text-sm text-white bg-brand-600 rounded">Proceed</button>
            )}

            {step === 3 && (
              <button onClick={handlePublish} disabled={isPublishing} className="px-3 py-1.5 text-sm text-white bg-brand-600 rounded">{isPublishing ? "Publishing…" : articleId ? "Update" : "Publish"}</button>
            )}

            <button onClick={onCancel} className="px-3 py-1.5 text-sm bg-neutral-100 rounded hover:bg-neutral-200">Cancel</button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {step === 1 && (
          <div className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full text-xl font-semibold border-none outline-none bg-transparent" />
            <input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="Cover image URL (optional)" className="w-full text-sm border border-neutral-200 rounded px-2 py-1 bg-panel" />

            {/* Markdown toolbar */}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => applyFormatting("h1")} className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200">H1</button>
              <button type="button" onClick={() => applyFormatting("h2")} className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200">H2</button>
              <button type="button" onClick={() => applyFormatting("h3")} className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200">H3</button>
              <button type="button" onClick={() => applyFormatting("bold")} className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200">Bold</button>
              <button type="button" onClick={() => applyFormatting("italic")} className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200">Italic</button>
            </div>

            <textarea id="article-content-textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your article in markdown..." className="w-full h-80 p-2 text-sm border border-neutral-200 rounded bg-transparent" />
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-lg font-medium">Preview</h3>
            {coverImage && <img src={coverImage} alt="cover" className="w-full h-40 object-cover rounded mt-2" />}
            <h2 className="mt-2 text-2xl font-heading">{title || "Untitled"}</h2>
            <div className="prose max-w-none whitespace-pre-wrap mt-2" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content) }} />
          </div>
        )}
        {step === 3 && (
          <div>
            <h3 className="text-lg font-medium">Ready to publish</h3>
            <p className="text-sm text-text-secondary mt-2">Title: {title || "(no title)"}</p>
            <p className="text-sm text-text-secondary">Content length: {content.length} chars</p>
            {coverImage && <p className="text-sm text-text-secondary">Cover image: {coverImage}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
