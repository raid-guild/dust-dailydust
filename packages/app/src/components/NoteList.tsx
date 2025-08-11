import { useState, useMemo } from "react";
import { useNotes } from "../hooks/useNotes";
import { useDrafts } from "../hooks/useDrafts";
import { useOnchainNotes } from "../hooks/useOnchainNotes";

interface NoteListProps {
  onEditNote?: (noteId: string) => void;
  onEditDraft?: (draftId: string) => void;
  onCreateNew?: () => void;
  selectedTags?: string[];
  searchQuery?: string;
}

export function NoteList({ 
  onEditNote, 
  onEditDraft, 
  onCreateNew, 
  selectedTags = [], 
  searchQuery = "" 
}: NoteListProps) {
  const { notes: localNotes, deleteNote } = useNotes();
  const { deleteDraft, getRecentDrafts } = useDrafts();
  const [showDrafts, setShowDrafts] = useState(true);
  const { notes: chainNotes, loading: chainLoading, error: chainError, refetch } = useOnchainNotes({ limit: 200, offset: 0 });

  // Merge on-chain with local cache (prefer on-chain for duplicates by id)
  const publishedCombined = useMemo(() => {
    const byId = new Map<string, ReturnType<typeof mapToUiNote>>();
    chainNotes.forEach(n => byId.set(n.id, mapToUiNote(n)));
    localNotes.forEach(n => {
      if (!byId.has(n.id)) byId.set(n.id, n);
    });
    return Array.from(byId.values());
  }, [chainNotes, localNotes]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    const base = publishedCombined as Array<{ id: string; title: string; content: string; tags: string[]; updatedAt: number; totalTips?: number }>;
    return base.filter(note => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = note.title.toLowerCase().includes(query);
        const matchesContent = note.content.toLowerCase().includes(query);
        const matchesTags = note.tags.some((tag: string) => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesContent && !matchesTags) return false;
      }
      // Tag filter
      if (selectedTags.length > 0) {
        const hasSelectedTag = selectedTags.some((selectedTag: string) => note.tags.includes(selectedTag));
        if (!hasSelectedTag) return false;
      }
      return true;
    });
  }, [publishedCombined, searchQuery, selectedTags]);

  // Sort notes by updatedAt (most recent first)
  const sortedNotes = useMemo(() => [...filteredNotes].sort((a, b) => b.updatedAt - a.updatedAt), [filteredNotes]);
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

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateNew}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            New Note
          </button>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            title="Refresh on-chain notes"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setShowDrafts(false)}
          className={`px-4 py-2 text-sm font-medium ${
            !showDrafts 
              ? "text-blue-600 border-b-2 border-blue-600" 
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Published ({sortedNotes.length})
        </button>
        <button
          onClick={() => setShowDrafts(true)}
          className={`px-4 py-2 text-sm font-medium ${
            showDrafts 
              ? "text-blue-600 border-b-2 border-blue-600" 
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Drafts ({recentDrafts.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showDrafts ? (
          // Drafts List
          <div className="p-4 space-y-3">
            {recentDrafts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No drafts yet</p>
                <p className="text-sm">Start writing to create your first draft</p>
              </div>
            ) : (
              recentDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onEditDraft?.(draft.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {draft.title || "Untitled"}
                      </h3>
                      {draft.content && (
                        <p className="mt-1 text-sm text-gray-600">
                          {truncateContent(draft.content)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {formatDate(draft.lastSaved)}
                        </span>
                        {draft.tags && (
                          <div className="flex gap-1">
                            {draft.tags.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this draft?")) {
                          deleteDraft(draft.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Published Notes List
          <div className="p-4 space-y-3">
            {chainLoading && (
              <div className="text-center py-8 text-gray-500">Loading on-chain notes…</div>
            )}
            {chainError && (
              <div className="text-center py-2 text-red-600 text-sm">{String(chainError)}</div>
            )}
            {!chainLoading && sortedNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No published notes yet</p>
                <p className="text-sm">Publish your first note to see it here</p>
              </div>
            ) : (
              sortedNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onEditNote?.(note.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {note.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {truncateContent(note.content)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {formatDate(note.updatedAt)}
                        </span>
                        {note.tags.length > 0 && (
                          <div className="flex gap-1">
                            {note.tags.slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {note.tags.length > 3 && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                +{note.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        {typeof note.totalTips === 'number' && note.totalTips > 0 && (
                          <span className="text-xs text-green-600 font-medium">
                            ${note.totalTips} tips
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this note?")) {
                          deleteNote(note.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function mapToUiNote(n: any) {
  // Minimal adapter for OnchainNote -> local Note shape used by list
  if (Array.isArray(n.tags)) return n as { id: string; title: string; content: string; tags: string[]; updatedAt: number; totalTips?: number };
  return { ...n, tags: [] as string[] } as { id: string; title: string; content: string; tags: string[]; updatedAt: number; totalTips?: number };
}
