import { useEffect, useState } from "react";

import { ArticleWizard } from "@/components/editor/ArticleWizard";
import { PublishedList } from "@/components/editor/PublishedList";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/helpers";

export const EditorRoomPage = () => {
  type TabKey = "published" | "drafts";
  const [tab, setTab] = useState<TabKey>("drafts");

  // Minimal markdown -> HTML renderer (same rules as ArticleWizard)
  const renderMarkdownToHtml = (md: string) => {
    if (!md) return "";
    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const text = md.replace(/\r\n?/g, "\n");
    const lines = text.split("\n");
    let html = "";
    let inList = false;
    let paraBuf: string[] = [];
    const pushPara = () => {
      if (!paraBuf.length) return;
      html += `<p>${paraBuf.join("\n").replace(/\n/g, "<br />")}</p>`;
      paraBuf = [];
    };
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (/^\s*([-*])\s+/.test(ln)) {
        pushPara();
        if (!inList) {
          inList = true;
          html += "<ul>";
        }
        const item = ln.replace(/^\s*([-*])\s+/, "");
        const content = escapeHtml(item)
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>");
        html += `<li>${content}</li>`;
        continue;
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
      }

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

      if (ln.trim() === "") {
        pushPara();
        continue;
      }

      paraBuf.push(
        escapeHtml(ln)
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
      );
    }
    if (inList) html += "</ul>";
    pushPara();
    return html;
  };

  const TabButton = ({ k, label }: { k: TabKey; label: string }) => (
    <Button
      className="border-neutral-900"
      onClick={() => setTab(k)}
      size="sm"
      variant={tab === k ? "default" : "outline"}
    >
      {label}
    </Button>
  );

  // Drafts stored in localStorage under same key as ArticleWizard
  const DRAFT_KEY = "editor-article-drafts";
  const loadDrafts = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr)
        ? arr.sort(
            (a, b) =>
              (b.lastSaved || b.createdAt || 0) -
              (a.lastSaved || a.createdAt || 0)
          )
        : [];
    } catch {
      return [];
    }
  };

  const [drafts, setDrafts] = useState(() => loadDrafts());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DRAFT_KEY) setDrafts(loadDrafts());
    };
    const onCustom = () => {
      // Refresh drafts list when ArticleWizard saves/deletes
      setDrafts(loadDrafts());
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "editor-article-drafts-updated",
      onCustom as EventListener
    );
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "editor-article-drafts-updated",
        onCustom as EventListener
      );
    };
  }, []);

  const removeDraft = (id: string) => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw).filter((d: { id: string }) => d.id !== id);
      localStorage.setItem(DRAFT_KEY, JSON.stringify(arr));
      setDrafts(arr);
    } catch {
      // eslint-disable-next-line no-console
      console.error("Failed to remove draft", id);
    }
  };

  // Wizard dialog state
  const [open, setOpen] = useState(false);
  const [wizardDraftId, setWizardDraftId] = useState<string | undefined>(
    undefined
  );
  const [wizardArticleId, setWizardArticleId] = useState<string | undefined>(
    undefined
  );

  const openNew = () => {
    setWizardDraftId(undefined);
    setWizardArticleId(undefined);
    setOpen(true);
  };
  const openDraft = (id: string) => {
    setWizardDraftId(id);
    setWizardArticleId(undefined);
    setOpen(true);
  };
  const openArticle = (id: string) => {
    setWizardArticleId(id);
    setWizardDraftId(undefined);
    setOpen(true);
  };

  const handleDone = () => {
    // close and refresh local drafts and rely on stash/react to update published
    setOpen(false);
    setWizardArticleId(undefined);
    setWizardDraftId(undefined);
    setDrafts(loadDrafts());
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TabButton k="published" label="Published" />
          <TabButton k="drafts" label="Drafts" />
        </div>
        <div>
          <Button onClick={openNew} size="sm" className="border-neutral-900">
            New Article
          </Button>
        </div>
      </div>

      <div className="flex-1">
        {tab === "drafts" && (
          <div className="grid gap-3">
            {drafts.length === 0 ? (
              <div className="p-4 bg-panel border border-neutral-200 rounded">
                No drafts yet. Click "New Article" to start.
              </div>
            ) : (
              drafts.map((d) => (
                <div
                  key={d.id}
                  className="p-3 border border-neutral-200 rounded bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-heading text-lg">
                        {d.title || "Untitled"}
                      </div>
                      <div className="text-xs text-text-secondary">
                        Last saved:{" "}
                        {formatDate(d.lastSaved || d.createdAt || Date.now())}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDraft(d.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Delete draft?")) removeDraft(d.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-[15px] leading-relaxed text-text-primary">
                    <div
                      className="prose max-w-none overflow-hidden max-h-24"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdownToHtml(d.content || ""),
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "published" && (
          <PublishedList
            onEdit={(id) => openArticle(id)}
            renderMarkdownToHtml={renderMarkdownToHtml}
          />
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-4xl mx-auto">
            <div className="bg-panel border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-[80vh] overflow-scroll">
              <ArticleWizard
                draftId={wizardDraftId}
                articleId={wizardArticleId}
                onDone={handleDone}
                onCancel={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
