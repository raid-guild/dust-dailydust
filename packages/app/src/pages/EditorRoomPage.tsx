import { useState, useMemo, useEffect } from "react";
import { NoteEditor } from "../components/NoteEditor";
import { WaypointsTab } from "../components/WaypointsTab";
import { CollectionsTab } from "../components/CollectionsTab";
import { useDrafts } from "../hooks/useDrafts";
import { useOnchainNotes } from "../hooks/useOnchainNotes";
import { useDustClient } from "../common/useDustClient";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export function EditorRoomPage() {
  type TabKey = "published" | "submit" | "collections" | "waypoints";
  const [tab, setTab] = useState<TabKey>("submit");

  const { getRecentDrafts, deleteDraft, createDraft } = useDrafts();
  const {
    notes: chainNotes,
    loading: chainLoading,
    error: chainError,
    refetch,
  } = useOnchainNotes({ limit: 200, offset: 0 });
  const { data: dustClient } = useDustClient();

  // Selection state for editors within tabs
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Clear cross-tab selections when switching
  useEffect(() => {
    if (tab === "submit") setSelectedNoteId(null);
    if (tab === "published") setSelectedDraftId(null);
  }, [tab]);

  const myAddress = (dustClient?.appContext.userAddress || "").toLowerCase();

  const myPublished = useMemo(() => {
    if (!myAddress) return [] as typeof chainNotes;
    return chainNotes.filter(
      (n) => (n.owner || "").toLowerCase() === myAddress
    );
  }, [chainNotes, myAddress]);

  const recentDrafts = getRecentDrafts();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const TabButton = ({ k, label }: { k: TabKey; label: string }) => (
    <Button
      onClick={() => setTab(k)}
      className={cn(
        "font-accent",
        "h-9 px-3 text-[10px]",
        {
          "bg-black": tab === k,
          "bg-white": tab !== k,
        },
        { "text-white": tab === k, "text-black": tab !== k }
      )}
    >
      {label}
    </Button>
  );

  return (
    <section className="gap-6 grid p-4 sm:p-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        <h1 className={cn("font-heading", "text-3xl")}>Editor Room</h1>
        <div className="flex flex-wrap gap-2 ml-auto">
          <TabButton k="published" label="My Published Stories" />
          <TabButton k="submit" label="Submit Content" />
          <TabButton k="collections" label="Collections" />
          <TabButton k="waypoints" label="Waypoint Tools" />
        </div>
      </div>

      {/* Content per tab */}
      {tab === "submit" && (
        <>
          <Card className="border-neutral-900">
            {/* Submit New Content */}
            <CardHeader>
              <CardTitle
                className={cn("font-heading", "flex justify-between text-xl")}
              >
                Submit New Content
                <button
                  onClick={() => {
                    const d = createDraft();
                    setSelectedNoteId(null);
                    setSelectedDraftId(d.id);
                  }}
                  className="px-3 py-1.5 text-sm text-white bg-brand-600 rounded hover:bg-brand-700 transition-colors"
                >
                  New Draft
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Only draft editing in Submit tab */}
              <NoteEditor
                variant="bare"
                draftId={selectedDraftId || undefined}
                onSave={() => {
                  setSelectedDraftId(null);
                  void refetch();
                }}
                onCancel={() => {
                  setSelectedDraftId(null);
                }}
              />
            </CardContent>
          </Card>

          {/* Your Drafts */}
          <Card className="border-neutral-900">
            <CardHeader>
              <CardTitle
                className={cn("font-heading", "flex justify-between text-xl")}
              >
                Your Drafts
                <span className="text-sm text-text-secondary">
                  {recentDrafts.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentDrafts.length === 0 ? (
                <div className="text-text-secondary text-sm">
                  No drafts yet. Create one to get started.
                </div>
              ) : (
                <ul className="space-y-2">
                  {recentDrafts.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-3 p-3 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <button
                        className="text-left flex-1 min-w-0"
                        onClick={() => {
                          setSelectedDraftId(d.id);
                        }}
                      >
                        <div className="font-medium text-text-primary truncate">
                          {d.title || "Untitled"}
                        </div>
                        <div className="text-xs text-text-secondary mt-0.5">
                          Last saved {formatDate(d.lastSaved)}
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedDraftId(d.id)}
                          className="px-2 py-1 text-xs text-text-secondary bg-neutral-100 rounded hover:bg-neutral-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this draft?"))
                              deleteDraft(d.id);
                          }}
                          className="px-2 py-1 text-xs text-danger border border-danger/30 rounded hover:bg-danger/10"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === "published" && (
        <div className="space-y-6">
          {/* My Published Stories */}
          <div className="rounded-xl border border-neutral-300 dark:border-neutral-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-2xl">My Published Stories</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">
                  {myPublished.length}
                </span>
                <button
                  onClick={() => void refetch()}
                  className="px-2 py-1 text-xs text-text-secondary bg-neutral-100 rounded hover:bg-neutral-200"
                >
                  Refresh
                </button>
              </div>
            </div>
            {!myAddress ? (
              <div className="text-text-secondary text-sm">
                Connect your wallet to see your published stories.
              </div>
            ) : chainLoading ? (
              <div className="text-text-secondary text-sm">Loading…</div>
            ) : chainError ? (
              <div className="text-danger text-sm">{String(chainError)}</div>
            ) : myPublished.length === 0 ? (
              <div className="text-text-secondary text-sm">
                No published stories yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {myPublished.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-center justify-between gap-3 p-3 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <button
                      className="text-left flex-1 min-w-0"
                      onClick={() => setSelectedNoteId(n.id)}
                    >
                      <div className="font-medium text-text-primary truncate">
                        {n.title || "Untitled"}
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        Updated {formatDate(n.updatedAt)}
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedNoteId(n.id)}
                      className="px-2 py-1 text-xs text-text-secondary bg-neutral-100 rounded hover:bg-neutral-200"
                    >
                      Edit
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Inline editor when a published note is selected */}
          {selectedNoteId && (
            <div className="rounded-xl border border-neutral-300 dark:border-neutral-800 p-4">
              <h3 className="font-heading text-xl mb-3">
                Edit Published Story
              </h3>
              <NoteEditor
                variant="bare"
                noteId={selectedNoteId}
                onSave={() => {
                  setSelectedNoteId(null);
                  void refetch();
                }}
                onCancel={() => setSelectedNoteId(null)}
              />
            </div>
          )}
        </div>
      )}

      {tab === "collections" && (
        <div className="rounded-xl border border-neutral-300 dark:border-neutral-800 p-4">
          <h2 className="font-heading text-2xl mb-3">Collections</h2>
          <CollectionsTab />
        </div>
      )}

      {tab === "waypoints" && (
        <div className="rounded-xl border border-neutral-300 dark:border-neutral-800 p-4">
          <h2 className="font-heading text-2xl mb-3">Waypoint Tools</h2>
          <WaypointsTab />
        </div>
      )}
    </section>
  );
}
