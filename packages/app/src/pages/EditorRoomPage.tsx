import { useEffect, useState } from "react";

import { ArticleWizard } from "@/components/editor/ArticleWizard";
import { CollectionWizard } from "@/components/editor/CollectionWizard";
import { PublishedList } from "@/components/editor/PublishedList";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/helpers";
import { renderMarkdownToHtml } from "@/utils/markdown";

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

export const EditorRoomPage = () => {
  type TabKey = "published" | "drafts";
  const [tab, setTab] = useState<TabKey>("published");

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
  const [openCollectionWizard, setOpenCollectionWizard] = useState(false);
  const [openArticleWizard, setOpenArticleWizard] = useState(false);
  const [wizardDraftId, setWizardDraftId] = useState<string | undefined>(
    undefined
  );
  const [wizardArticleId, setWizardArticleId] = useState<string | undefined>(
    undefined
  );

  const onOpenNewArticle = () => {
    setWizardDraftId(undefined);
    setWizardArticleId(undefined);
    setOpenArticleWizard(true);
  };

  const onOpenDraft = (id: string) => {
    setWizardDraftId(id);
    setWizardArticleId(undefined);
    setOpenArticleWizard(true);
  };

  const onOpenArticle = (id: string) => {
    setWizardArticleId(id);
    setWizardDraftId(undefined);
    setOpenArticleWizard(true);
  };

  const onArticleDone = () => {
    // close and refresh local drafts and rely on stash/react to update published
    setOpenArticleWizard(false);
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
        <div className="flex items-center gap-2">
          <Button
            className="border-neutral-900"
            variant="outline"
            onClick={() => setOpenCollectionWizard(true)}
            size="sm"
          >
            New Collection
          </Button>
          <Button
            className="border-neutral-900"
            onClick={onOpenNewArticle}
            size="sm"
          >
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
                        onClick={() => onOpenDraft(d.id)}
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
            onEdit={(id) => onOpenArticle(id)}
            renderMarkdownToHtml={renderMarkdownToHtml}
          />
        )}
      </div>

      {openCollectionWizard && (
        <div className="fixed flex inset-0 items-start justify-center p-4 sm:items-center z-50">
          <div
            className="absolute bg-black/50 inset-0"
            onClick={() => setOpenCollectionWizard(false)}
          />
          <div className="max-w-4xl mx-auto relative w-full">
            <div className="bg-panel max-h-[80vh] overflow-scroll">
              <CollectionWizard
                onCancel={() => setOpenCollectionWizard(false)}
                onDone={() => setOpenCollectionWizard(false)}
              />
            </div>
          </div>
        </div>
      )}

      {openArticleWizard && (
        <div className="fixed flex inset-0 items-start justify-center p-4 sm:items-center z-50">
          <div
            className="absolute bg-black/50 inset-0"
            onClick={() => setOpenArticleWizard(false)}
          />
          <div className="max-w-4xl mx-auto relative w-full">
            <div className="bg-panel max-h-[80vh] overflow-scroll">
              <ArticleWizard
                articleId={wizardArticleId}
                draftId={wizardDraftId}
                onCancel={() => setOpenArticleWizard(false)}
                onDone={onArticleDone}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
