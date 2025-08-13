import { useEffect, useMemo, useState } from "react";

import { useDustClient } from "../common/useDustClient";
import { CollectionsTab } from "../components/CollectionsTab";
import { NoteEditor } from "../components/NoteEditor";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { WaypointsTab } from "../components/WaypointsTab";
import { useDrafts } from "../hooks/useDrafts";
import { useOnchainNotes } from "../hooks/useOnchainNotes";
import { cn } from "../lib/utils";

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
      className="border-neutral-900"
      onClick={() => setTab(k)}
      size="sm"
      variant={tab === k ? "default" : "outline"}
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

      {tab === "published" && (
        <Card className="border-neutral-900">
          {/* My Published Stories */}
          <CardHeader>
            <CardTitle
              className={cn("font-heading", "flex justify-between text-xl")}
            >
              My Published Stories
              <div className="flex gap-2 items-center">
                <span className="text-sm text-text-secondary">
                  {myPublished.length}
                </span>
                <button
                  onClick={() => void refetch()}
                  className="bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded text-text-secondary text-xs"
                >
                  Refresh
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                    className="border border-neutral-200 dark:border-neutral-800 dark:hover:bg-neutral-800 flex gap-3 hover:bg-neutral-50 items-center justify-between p-3 rounded-lg"
                  >
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => setSelectedNoteId(n.id)}
                    >
                      <div className="font-medium text-text-primary truncate">
                        {n.title || "Untitled"}
                      </div>
                      <div className="mt-0.5 text-text-secondary text-xs">
                        Updated {formatDate(n.updatedAt)}
                      </div>
                    </button>
                    <button
                      className="bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded text-text-secondary text-xs"
                      onClick={() => setSelectedNoteId(n.id)}
                    >
                      Edit
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Inline editor when a published note is selected */}
            {selectedNoteId && (
              <div className="border border-neutral-300 dark:border-neutral-800 p-4 rounded-xl">
                <h3 className="font-heading mb-3 text-xl">
                  Edit Published Story
                </h3>
                <NoteEditor
                  noteId={selectedNoteId}
                  onCancel={() => setSelectedNoteId(null)}
                  onSave={() => {
                    setSelectedNoteId(null);
                    void refetch();
                  }}
                  variant="bare"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                <Button
                  onClick={() => {
                    const d = createDraft();
                    setSelectedNoteId(null);
                    setSelectedDraftId(d.id);
                  }}
                  className={cn("font-accent", "h-9 px-3 text-[10px]")}
                >
                  New Draft
                </Button>
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

      {tab === "collections" && (
        <Card className="border-neutral-900">
          <CardHeader>
            <CardTitle
              className={cn("font-heading", "flex justify-between text-xl")}
            >
              Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CollectionsTab />
          </CardContent>
        </Card>
      )}

      {tab === "waypoints" && (
        <Card className="border-neutral-900">
          <CardHeader>
            <CardTitle
              className={cn("font-heading", "flex justify-between text-xl")}
            >
              Waypoint Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WaypointsTab />
          </CardContent>
        </Card>
      )}
    </section>
  );
}
