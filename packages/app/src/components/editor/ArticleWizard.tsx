import { encodeBlock } from "@dust/world/internal";
import { resourceToHex } from "@latticexyz/common";
import { getRecord } from "@latticexyz/stash/internal";
import { useRecord } from "@latticexyz/stash/react";
import mudConfig from "contracts/mud.config";
import ArticleSystemAbi from "contracts/out/ArticleSystem.sol/ArticleSystem.abi.json";
import React, { useEffect, useState } from "react";

import { useDustClient } from "@/common/useDustClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { stash, tables } from "@/mud/stash";

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
      window.dispatchEvent(
        new CustomEvent("editor-article-drafts-updated", {
          detail: { id: d.id, ts: Date.now() },
        })
      );
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
      window.dispatchEvent(
        new CustomEvent("editor-article-drafts-updated", {
          detail: { id, ts: Date.now(), deleted: true },
        })
      );
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

    // Empty line -> paragraph break
    if (ln.trim() === "") {
      pushPara();
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

  return html;
}

export const ArticleWizard: React.FC<Props> = ({
  draftId,
  articleId,
  onDone,
  onCancel,
}) => {
  const { data: dustClient } = useDustClient();

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

  const articleCategories = (useRecord({
    stash,
    table: tables.ArticleCategories,
    key: {},
  })
    ?.value?.map((c) => {
      return getRecord({
        stash,
        table: tables.Category,
        key: { id: c },
      })?.value;
    })
    .filter((c): c is string => !!c) ?? []) as string[];

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
        const rec = getRecord({
          stash,
          table: tables.Post,
          key: { id: articleId as unknown as `0x${string}` },
        }) as any | null;
        if (rec) {
          setTitle(rec.title ?? "");
          setCoverImage(rec.coverImage ?? "");
          setContent(rec.content ?? "");
          setDraftLocalId(null);
        }
      } catch (err) {
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
        const pos = await (dustClient as any).provider.request({
          method: "getPlayerPosition",
          params: { entity: (dustClient as any).appContext?.userAddress },
        });
        if (cancelled) return;
        setAnchorPos({
          x: Math.floor(pos.x),
          y: Math.floor(pos.y),
          z: Math.floor(pos.z),
        });
      } catch (e) {
        // noop - preview anchor is optional
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
      alert("Please complete content before publishing");
      return;
    }
    if (!dustClient) {
      alert("Wallet/client not ready");
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
        // Use the previewed anchor position if available, otherwise try to fetch it now (best-effort)
        let playerPos: any = null;
        if (anchorPos) {
          playerPos = { x: anchorPos.x, y: anchorPos.y, z: anchorPos.z };
        } else {
          try {
            const pos = await (dustClient as any).provider.request({
              method: "getPlayerPosition",
              params: { entity: (dustClient as any).appContext?.userAddress },
            });
            playerPos = {
              x: Math.floor(pos.x),
              y: Math.floor(pos.y),
              z: Math.floor(pos.z),
            };
          } catch (e) {
            console.warn("Failed to get player position for article anchor", e);
          }
        }

        // Create the article. If we have a player position, create the article + anchor in a single call.
        let createResult: any = null;

        // if we have player position, compute block coords and entityId and call createArticleWithAnchor
        if (playerPos) {
          try {
            const bx = Math.floor(playerPos.x);
            const by = Math.floor(playerPos.y);
            const bz = Math.floor(playerPos.z);
            const entityId = encodeBlock([bx, by, bz]);

            console.log("Creating article with anchor at", {
              entityId,
              bx,
              by,
              bz,
            });

            createResult = await (dustClient as any).provider.request({
              method: "systemCall",
              params: [
                {
                  systemId: articleSystemId,
                  abi: ArticleSystemAbi as any,
                  functionName: "createArticleWithAnchor",
                  args: [title, content, category, entityId, bx, by, bz],
                },
              ],
            });
          } catch (e) {
            console.error(
              "Failed to create article with anchor, falling back to createArticle",
              e
            );
            // fall through to create without anchor
          }
        }

        // If createResult is still null (no playerPos or previous call failed), create article normally
        if (!createResult) {
          createResult = await (dustClient as any).provider.request({
            method: "systemCall",
            params: [
              {
                systemId: articleSystemId,
                abi: ArticleSystemAbi as any,
                functionName: "createArticle",
                args: [title, content, category],
              },
            ],
          });
        }

        // Optional: try to log the created article id for debugging (best-effort)
        const extractBytes32 = (res: any): string | null => {
          if (!res) return null;
          const hexRegex = /0x[0-9a-fA-F]{64}/g;
          const seen = new Set<any>();
          const stack: any[] = [res];
          while (stack.length) {
            const cur = stack.pop();
            if (!cur || typeof cur === "function") continue;
            if (typeof cur === "string") {
              const m = cur.match(hexRegex);
              if (m) return m[0];
              continue;
            }
            if (typeof cur === "object") {
              if (seen.has(cur)) continue;
              seen.add(cur);
              for (const k of Object.keys(cur)) stack.push(cur[k]);
            }
          }
          return null;
        };

        console.log("Create result", createResult);
        const newArticleIdHex = extractBytes32(createResult);
        console.log("Extracted new article id", newArticleIdHex);
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
            <span className="font-heading">
              {articleId ? "Edit Article" : "New Article"}
            </span>
            <div
              className={
                step === 1
                  ? "px-2 py-1 text-xs rounded bg-brand-600 text-white"
                  : "px-2 py-1 text-xs rounded bg-neutral-100 text-text-secondary"
              }
            >
              1. Content
            </div>
            <div
              className={
                step === 2
                  ? "px-2 py-1 text-xs rounded bg-brand-600 text-white"
                  : "px-2 py-1 text-xs rounded bg-neutral-100 text-text-secondary"
              }
            >
              2. Preview
            </div>
            <div
              className={
                step === 3
                  ? "px-2 py-1 text-xs rounded bg-brand-600 text-white"
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
                  className="px-3 py-1.5 text-sm text-white bg-brand-600 rounded disabled:opacity-50"
                >
                  Continue
                </button>
              </>
            )}

            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                className="px-3 py-1.5 text-sm text-white bg-brand-600 rounded"
              >
                Proceed
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="px-3 py-1.5 text-sm text-white bg-brand-600 rounded"
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
          <div className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full text-xl font-semibold border-none outline-none bg-transparent"
            />
            <input
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="Cover image URL (optional)"
              className="w-full text-sm border border-neutral-200 rounded px-2 py-1 bg-panel"
            />

            <select
              id="article-category-select"
              aria-label="Type"
              className={cn(
                "border-input bg-transparent border border-neutral-900",
                "h-9 w-full rounded-md px-3 py-1 text-base shadow-xs",
                "transition-[color,box-shadow] outline-none",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                "md:text-sm"
              )}
              onChange={(e) => setCategory(e.target.value)}
              value={category}
            >
              {articleCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Markdown toolbar */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyFormatting("h1")}
                className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => applyFormatting("h2")}
                className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => applyFormatting("h3")}
                className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => applyFormatting("bold")}
                className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200"
              >
                Bold
              </button>
              <button
                type="button"
                onClick={() => applyFormatting("italic")}
                className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200"
              >
                Italic
              </button>
            </div>

            <textarea
              id="article-content-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your article in markdown..."
              className="w-full h-80 p-2 text-sm border border-neutral-200 rounded bg-transparent"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-lg font-medium">Preview</h3>
            {coverImage && (
              <img
                src={coverImage}
                alt="cover"
                className="w-full h-40 object-cover rounded mt-2"
              />
            )}
            <h2 className="mt-2 text-2xl font-heading">
              {title || "Untitled"}
            </h2>
            <div
              className="prose max-w-none whitespace-pre-wrap mt-2"
              dangerouslySetInnerHTML={{
                __html: renderMarkdownToHtml(content),
              }}
            />
            {/* Show planned anchor position if available */}
            {anchorPos && (
              <div className="mt-3 text-sm text-text-secondary">
                Anchor position: x:{anchorPos.x} y:{anchorPos.y} z:{anchorPos.z}
              </div>
            )}
          </div>
        )}
        {step === 3 && (
          <div>
            <h3 className="text-lg font-medium">Ready to publish</h3>
            <p className="text-sm text-text-secondary mt-2">
              Title: {title || "(no title)"}
            </p>
            <p className="text-sm text-text-secondary">
              Content length: {content.length} chars
            </p>
            {coverImage && (
              <p className="text-sm text-text-secondary">
                Cover image: {coverImage}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
