import { encodeBlock } from "@dust/world/internal";
import { resourceToHex } from "@latticexyz/common";
import { getRecord } from "@latticexyz/stash/internal";
import mudConfig from "contracts/mud.config";
import ArticleSystemAbi from "contracts/out/ArticleSystem.sol/ArticleSystem.abi.json";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Abi } from "viem";

import { useCategories } from "@/common/useCategories";
import { useDustClient } from "@/common/useDustClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { stash, tables } from "@/mud/stash";

import Step1 from "./ArticleWizardStep1";
import Step2 from "./ArticleWizardStep2";
import Step3 from "./ArticleWizardStep3";

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

    window.dispatchEvent(
      new CustomEvent("editor-article-drafts-updated", {
        detail: { id: d.id, ts: Date.now() },
      })
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed saving draft", e);
  }
}

function deleteDraftLocal(id: string) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const arr = (JSON.parse(raw) as Draft[]).filter((d) => d.id !== id);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(arr));

    window.dispatchEvent(
      new CustomEvent("editor-article-drafts-updated", {
        detail: { id, ts: Date.now(), deleted: true },
      })
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed deleting draft", e);
  }
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
      content = content.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      content = content.replace(/\*(.+?)\*/g, "<em>$1</em>");
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
      html += `<h1>${escapeHtml(h1[1])
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")}</h1>`;
      continue;
    }
    if (h2) {
      pushPara();
      html += `<h2>${escapeHtml(h2[1])
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")}</h2>`;
      continue;
    }
    if (h3) {
      pushPara();
      html += `<h3>${escapeHtml(h3[1])
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")}</h3>`;
      continue;
    }

    // Empty line -> paragraph break. Emit a visible spacer div for every
    // blank line so spacing is noticeable in the preview modal.
    if (ln.trim() === "") {
      if (paraBuf.length > 0) pushPara();
      html += '<div style="height:1rem"></div>';
      continue;
    }

    // accumulate into paragraph buffer
    paraBuf.push(
      escapeHtml(ln)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
    );
  }

  if (inList) html += "</ul>";
  pushPara();

  // Add a drop-cap (first-letter styling) if the rendered HTML starts with a paragraph
  // and not with a heading. We inject a small <span> with inline styles around the
  // first visible character of the first paragraph. Also handle the case where the
  // paragraph starts with a <strong> tag.
  if (html.startsWith("<p>")) {
    // Case: <p><strong>X...
    html = html.replace(
      /^<p>(\s*)<strong>(\s*)([^<\s])/,
      '<p>$1<strong>$2<span style="float:left;font-size:3rem;line-height:1;margin-right:0.5rem;">$3</span>'
    );
    // Case: <p>X...
    html = html.replace(
      /^<p>(\s*)([^<\s])/,
      '<p>$1<span style="float:left;font-size:3rem;line-height:1;margin-right:0.5rem;">$2</span>'
    );
  }

  return html;
}

export const ArticleWizard: React.FC<Props> = ({
  draftId,
  articleId,
  onDone,
  onCancel,
}) => {
  const { data: dustClient } = useDustClient();
  const { articleCategories } = useCategories();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftLocalId, setDraftLocalId] = useState(draftId ?? null);
  const [justSaved, setJustSaved] = useState(false);
  // Anchor position (block coords) shown in preview and used for best-effort anchor creation
  const [anchorPos, setAnchorPos] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);

  useEffect(() => {
    setCategory(articleCategories[0] ?? "");
  }, [articleCategories]);

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
      return;
    }

    // If an on-chain article id is provided, load it from the Post table
    if (articleId) {
      try {
        // cast articleId to the expected hex literal type for stash/getRecord
        // Normalize record shapes returned by stash/getRecord. Records can be wrapped
        // in { value: ... }, { data: ... }, arrays, or even JSON strings. This helper
        // tries to unwrap common wrapper shapes recursively and return the underlying
        // payload object.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalize = (r: any): any => {
          if (r == null) return r;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const seen = new Set<any>();

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const unwrap = (obj: any): any => {
            if (obj == null) return obj;
            if (typeof obj === "string") {
              // try to parse JSON-encoded payload
              try {
                const parsed = JSON.parse(obj);
                if (typeof parsed === "object") return unwrap(parsed);
              } catch (e) {
                // not JSON, return original string
                // eslint-disable-next-line no-console
                console.warn("Failed to parse JSON:", e);
                return obj;
              }
            }
            if (Array.isArray(obj)) {
              // common case: [ { value: { ... } } ] or single-element arrays
              if (obj.length === 0) return obj;
              if (obj.length === 1) return unwrap(obj[0]);
              return obj.map(unwrap);
            }
            if (typeof obj === "object") {
              if (seen.has(obj)) return obj;
              seen.add(obj);

              // common wrapper keys
              if ("value" in obj) return unwrap(obj.value);
              if ("data" in obj) return unwrap(obj.data);
              if ("values" in obj) return unwrap(obj.values);

              // sometimes the actual payload is stored under a single key
              const keys = Object.keys(obj);
              if (keys.length === 1) return unwrap(obj[keys[0]]);

              return obj;
            }

            return obj;
          };

          return unwrap(r);
        };

        // Helper that robustly extracts a cover image URL from a normalized record.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extractCoverImage = (rec: any): string => {
          if (!rec) return "";

          // If rec is an array, try first element
          if (Array.isArray(rec) && rec.length) rec = rec[0];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tryField = (v: any): string | null => {
            if (v === null || v === undefined) return null;
            if (typeof v === "string") return v.trim() || null;
            if (typeof v === "object") {
              if (typeof v.url === "string") return v.url;
              if (typeof v.uri === "string") return v.uri;
              if (typeof v.src === "string") return v.src;
              if (typeof v.path === "string") return v.path;
              // if wrapper like {0: '...'} or nested objects, try keys
              const keys = Object.keys(v);
              for (const k of keys) {
                const maybe: string | null = tryField(v[k]);
                if (maybe) return maybe;
              }
            }
            return null;
          };

          const candidates = [
            rec.coverImage,
            rec.image,
            rec.imageUrl,
            rec.cover,
            rec.media,
            rec.thumbnail,
            rec.thumbnailUrl,
          ];

          for (const c of candidates) {
            const found = tryField(c);
            if (found) return found;
          }

          // last resort: scan object keys for anything resembling an image url
          if (typeof rec === "object") {
            for (const k of Object.keys(rec)) {
              if (/image|cover|thumbnail|media|url|src/i.test(k)) {
                const maybe: string | null = tryField(rec[k]);
                if (maybe) return maybe;
              }
            }
          }

          return "";
        };

        const recRaw = getRecord({
          stash,
          table: tables.Post,
          key: { id: articleId as unknown as `0x${string}` },
        });
        const rec = normalize(recRaw);
        if (rec) {
          const possibleCover = extractCoverImage(rec) || "";
          if (possibleCover) setCoverImage(possibleCover);
          else setCoverImage("");
          setTitle(rec.title ?? "");
          setContent(rec.content ?? "");
          setDraftLocalId(null);
        }

        // Try to load an existing anchor for this post so preview shows anchor coords
        try {
          const anchorRaw = getRecord({
            stash,
            table: tables.PostAnchor,
            key: { id: articleId as unknown as `0x${string}` },
          });
          const anchorRec = normalize(anchorRaw);
          if (anchorRec) {
            setAnchorPos({
              x: Math.floor(Number(anchorRec.coordX ?? anchorRec.x ?? 0)),
              y: Math.floor(Number(anchorRec.coordY ?? anchorRec.y ?? 0)),
              z: Math.floor(Number(anchorRec.coordZ ?? anchorRec.z ?? 0)),
            });
          }
        } catch {
          // ignore
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Failed to load article for editing", err);
      }
      return;
    }
  }, [draftId, articleId]);

  // Fetch current player position (best-effort) to show anchor in preview when creating a new article
  useEffect(() => {
    if (articleId) return; // editing existing article - skip
    if (!dustClient) return;

    let cancelled = false;
    (async () => {
      try {
        const pos = await dustClient.provider.request({
          method: "getPlayerPosition",
          params: { entity: dustClient.appContext?.userAddress },
        });
        if (cancelled) return;
        setAnchorPos({
          x: Math.floor(pos.x),
          y: Math.floor(pos.y),
          z: Math.floor(pos.z),
        });
      } catch (e) {
        // noop - preview anchor is optional
        // eslint-disable-next-line no-console
        console.warn("Could not fetch player position for preview anchor", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dustClient, articleId]);

  // Simple markdown formatting helper (applies to textarea with id 'article-content-textarea')
  const applyFormatting = (action: "h1" | "h2" | "h3" | "bold" | "italic") => {
    const textarea = document.getElementById(
      "article-content-textarea"
    ) as HTMLTextAreaElement | null;
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
      const newLines = lines.map((ln) =>
        ln.startsWith(prefix) ? ln : prefix + ln
      );
      const newValue =
        value.substring(0, lineStart) + newLines.join("\n") + after;
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
      const newValue =
        value.substring(0, selectionStart) +
        wrapper +
        selected +
        wrapper +
        value.substring(selectionEnd);
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
      createdAt: draftLocalId
        ? loadDraft(draftLocalId!)?.createdAt ?? now
        : now,
    };
    saveOrUpdateDraft(d);
    setDraftLocalId(id);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const handlePublish = async () => {
    if (!canContinueFrom1) {
      toast.error("Please complete content before publishing");
      return;
    }
    if (!dustClient) {
      toast.error("Wallet/client not ready");
      return;
    }
    setIsPublishing(true);
    try {
      const articleSystemId = resourceToHex({
        type: "system",
        namespace: mudConfig.namespace,
        name: "ArticleSystem",
      });

      // If creating a new article, capture the returned articleId and create an anchor at the player's current block.
      if (articleId) {
        // update existing article
        await dustClient.provider.request({
          method: "systemCall",
          params: [
            {
              systemId: articleSystemId,
              abi: ArticleSystemAbi as Abi,
              functionName: "updateArticle",
              args: [articleId, title, content, category, coverImage],
            },
          ],
        });
      } else {
        // Use the previewed anchor position if available, otherwise try to fetch it now (best-effort)
        let playerPos = null;
        if (anchorPos) {
          playerPos = { x: anchorPos.x, y: anchorPos.y, z: anchorPos.z };
        } else {
          try {
            const pos = await dustClient.provider.request({
              method: "getPlayerPosition",
              params: { entity: dustClient.appContext?.userAddress },
            });
            playerPos = {
              x: Math.floor(pos.x),
              y: Math.floor(pos.y),
              z: Math.floor(pos.z),
            };
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("Failed to get player position for article anchor", e);
          }
        }

        // Create the article. If we have a player position, create the article + anchor in a single call.
        let createResult = null;

        // if we have player position, compute block coords and entityId and call createArticleWithAnchor
        if (playerPos) {
          try {
            const bx = Math.floor(playerPos.x);
            const by = Math.floor(playerPos.y);
            const bz = Math.floor(playerPos.z);
            const entityId = encodeBlock([bx, by, bz]);

            createResult = await dustClient.provider.request({
              method: "systemCall",
              params: [
                {
                  systemId: articleSystemId,
                  abi: ArticleSystemAbi as Abi,
                  functionName: "createArticleWithAnchor",
                  args: [
                    title,
                    content,
                    category,
                    coverImage,
                    entityId,
                    bx,
                    by,
                    bz,
                  ],
                },
              ],
            });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(
              "Failed to create article with anchor, falling back to createArticle",
              e
            );
            // fall through to create without anchor
          }
        }

        // If createResult is still null (no playerPos or previous call failed), create article normally
        if (!createResult) {
          createResult = await dustClient.provider.request({
            method: "systemCall",
            params: [
              {
                systemId: articleSystemId,
                abi: ArticleSystemAbi as Abi,
                functionName: "createArticle",
                args: [title, content, category, coverImage],
              },
            ],
          });
        }
      }

      // remove draft locally if exists
      if (draftLocalId) deleteDraftLocal(draftLocalId);

      onDone?.();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Publish failed", e);

      toast.error("Failed to Publish", {
        description: (e as Error).message,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card className="border-neutral-900">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="font-heading">
              {articleId ? "Edit Article" : "New Article"}
            </span>
            <div
              className={
                step === 1
                  ? "px-2 py-1 text-xs rounded bg-white text-text-primary border border-neutral-900"
                  : "px-2 py-1 text-xs rounded bg-neutral-100 text-text-secondary"
              }
            >
              1. Content
            </div>
            <div
              className={
                step === 2
                  ? "px-2 py-1 text-xs rounded bg-white text-text-primary border border-neutral-900"
                  : "px-2 py-1 text-xs rounded bg-neutral-100 text-text-secondary"
              }
            >
              2. Preview
            </div>
            <div
              className={
                step === 3
                  ? "px-2 py-1 text-xs rounded bg-white text-text-primary border border-neutral-900"
                  : "px-2 py-1 text-xs rounded bg-neutral-100 text-text-secondary"
              }
            >
              3. Publish
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() =>
                  setStep((s) => Math.max(1, (s as number) - 1) as 1 | 2 | 3)
                }
                className="px-3 py-1.5 text-sm bg-neutral-100 rounded hover:bg-neutral-200"
              >
                Back
              </button>
            )}

            {step === 1 && (
              <>
                <button
                  onClick={handleSaveDraft}
                  className="px-3 py-1.5 text-sm bg-neutral-100 rounded hover:bg-neutral-200"
                >
                  {justSaved ? "Saved" : "Save Draft"}
                </button>
                <button
                  disabled={!canContinueFrom1}
                  onClick={() => setStep(2)}
                  className="px-3 py-1.5 text-sm bg-white text-text-primary border border-neutral-900 rounded hover:bg-neutral-100 disabled:opacity-50"
                >
                  Continue
                </button>
              </>
            )}

            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                className="px-3 py-1.5 text-sm bg-white text-text-primary border border-neutral-900 rounded hover:bg-neutral-100"
              >
                Proceed
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="px-3 py-1.5 text-sm bg-white text-text-primary border border-neutral-900 rounded hover:bg-neutral-100"
              >
                {isPublishing
                  ? "Publishing…"
                  : articleId
                    ? "Update"
                    : "Publish"}
              </button>
            )}

            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm bg-neutral-100 rounded hover:bg-neutral-200"
            >
              Cancel
            </button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {step === 1 && (
          <Step1
            title={title}
            setTitle={setTitle}
            coverImage={coverImage}
            setCoverImage={setCoverImage}
            category={category}
            setCategory={setCategory}
            articleCategories={articleCategories}
            applyFormatting={applyFormatting}
            content={content}
            setContent={setContent}
            handleSaveDraft={handleSaveDraft}
            canContinueFrom1={canContinueFrom1}
            justSaved={justSaved}
            onContinue={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <Step2
            coverImage={coverImage}
            title={title}
            content={content}
            anchorPos={anchorPos}
            renderMarkdownToHtml={renderMarkdownToHtml}
            authorAddress={dustClient?.appContext?.userAddress}
            category={category}
          />
        )}
        {step === 3 && (
          <Step3 title={title} content={content} coverImage={coverImage} />
        )}
      </CardContent>
    </Card>
  );
};
