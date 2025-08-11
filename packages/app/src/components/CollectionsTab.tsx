import { useMemo, useState } from "react";
import { useCollections } from "../hooks/useCollections";
import { useNotes } from "../hooks/useNotes";
import { useOnchainNotes } from "../hooks/useOnchainNotes";

export function CollectionsTab() {
  const { collections, createCollection, updateCollection, deleteCollection, addNoteToCollection, removeNoteFromCollection } = useCollections();
  const { notes: localNotes } = useNotes();
  const { notes: chainNotes, loading: chainLoading, error: chainError, refetch } = useOnchainNotes({ limit: 300, offset: 0 });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [searchByCol, setSearchByCol] = useState<Record<string, string>>({});
  // New Collection picker state
  const [newSearch, setNewSearch] = useState("");
  const [newNoteIds, setNewNoteIds] = useState<string[]>([]);

  const create = () => {
    if (!title.trim()) return;
    createCollection({ title: title.trim(), description, coverImageUrl: coverImageUrl.trim() || undefined, featured, noteIds: newNoteIds });
    setTitle(""); setDescription(""); setCoverImageUrl(""); setFeatured(false);
    setNewSearch(""); setNewNoteIds([]);
  };

  // Combine candidates: published only (on-chain is published; filter out local drafts) and keep updatedAt for sorting
  const candidates = useMemo(() => {
    const map = new Map<string, { id: string; title: string; tags: string[]; updatedAt: number }>();
    for (const n of chainNotes) {
      map.set(n.id, { id: n.id, title: n.title || "(Untitled)", tags: Array.isArray(n.tags) ? n.tags : [], updatedAt: Number((n as any).updatedAt ?? 0) });
    }
    for (const n of localNotes) {
      if ((n as any).isDraft) continue; // exclude drafts
      if (!map.has(n.id)) {
        map.set(n.id, { id: n.id, title: n.title || "(Untitled)", tags: Array.isArray(n.tags) ? n.tags : [], updatedAt: Number((n as any).updatedAt ?? 0) });
      }
    }
    return Array.from(map.values());
  }, [chainNotes, localNotes]);

  // Suggestions for the new collection picker
  const newSuggestions = useMemo(() => {
    const base = candidates.filter(c => !newNoteIds.includes(c.id));
    const q = newSearch.toLowerCase().trim();
    const filtered = q
      ? base.filter(c => c.title.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q)))
      : base;
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12);
  }, [candidates, newNoteIds, newSearch]);

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Collections</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="border border-neutral-300 rounded px-2 py-1 bg-panel text-text-primary" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="border border-neutral-300 rounded px-2 py-1 bg-panel text-text-primary" placeholder="Cover image URL (optional)" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} />
          <label className="inline-flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} /> Featured</label>
          <button className="bg-brand-600 text-white rounded px-3 py-1 hover:bg-brand-700 disabled:opacity-50" onClick={create} disabled={!title.trim()}>Create</button>
        </div>
        <textarea className="border border-neutral-300 rounded px-2 py-1 w-full bg-panel text-text-primary" placeholder="Description" rows={2} value={description} onChange={e => setDescription(e.target.value)} />

        {/* Seed new collection with published notes */}
        <div className="rounded border border-neutral-300 p-3 space-y-2 bg-panel">
          <div className="flex items-center justify-between">
            <div className="uppercase tracking-[.2em] text-xs text-neutral-500 font-accent">Add published notes</div>
            <span className="text-xs text-text-secondary">{newNoteIds.length} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="flex-1 border border-neutral-300 rounded px-2 py-1 bg-panel text-text-primary"
              placeholder="Search published notes by title or tag…"
              value={newSearch}
              onChange={e => setNewSearch(e.target.value)}
            />
            <button onClick={() => void refetch()} className="px-2 py-1 text-xs text-text-secondary bg-neutral-100 rounded hover:bg-neutral-200">
              {chainLoading ? 'Refreshing…' : 'Refresh on-chain'}
            </button>
          </div>
          <ul className="space-y-1">
            {newSuggestions.length === 0 ? (
              <li className="text-text-secondary text-sm">No matches.</li>
            ) : (
              newSuggestions.map(n => (
                <li key={n.id} className="flex items-center justify-between gap-2 border border-neutral-300 rounded px-2 py-1 bg-panel">
                  <div className="min-w-0">
                    <div className="text-sm truncate text-text-primary">{n.title}</div>
                    {n.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {n.tags.slice(0, 5).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 text-xs bg-neutral-100 text-text-secondary rounded">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="text-xs px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700"
                    onClick={() => setNewNoteIds(prev => (prev.includes(n.id) ? prev : [...prev, n.id]))}
                  >
                    Add
                  </button>
                </li>
              ))
            )}
          </ul>

          {newNoteIds.length > 0 && (
            <div className="pt-2 border-t border-neutral-200">
              <div className="text-sm font-medium mb-1 text-text-primary">Selected</div>
              <ul className="space-y-1">
                {newNoteIds.map((nid) => {
                  const n = chainNotes.find(nn => nn.id === nid) || localNotes.find(nn => nn.id === nid);
                  const title = (n as any)?.title || '(Untitled)';
                  return (
                    <li key={nid} className="flex items-center justify-between gap-2 border border-neutral-300 rounded px-2 py-1 bg-panel">
                      <div className="text-sm truncate text-text-primary">{title}</div>
                      <button className="text-xs px-2 py-1 border border-neutral-300 rounded" onClick={() => setNewNoteIds(prev => prev.filter(id => id !== nid))}>Remove</button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {collections.length === 0 ? (
        <p className="text-text-secondary italic">No collections yet. Create one above.</p>
      ) : (
        <div className="space-y-4">
          {collections.map(col => {
            const query = (searchByCol[col.id] ?? '').toLowerCase().trim();
            const existing = new Set(col.noteIds);
            const base = candidates.filter(c => !existing.has(c.id));
            const filtered = (query
              ? base.filter(c => c.title.toLowerCase().includes(query) || c.tags.some(t => t.toLowerCase().includes(query)))
              : base)
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .slice(0, 12);

            return (
              <div key={col.id} className="border border-neutral-300 rounded p-3 space-y-3 bg-panel">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        className="text-lg font-semibold border-b border-neutral-300 px-1 bg-panel text-text-primary"
                        value={col.title}
                        onChange={e => updateCollection(col.id, { title: e.target.value })}
                      />
                      {col.featured && <span className="text-amber-600 text-xs">Featured</span>}
                    </div>
                    <input
                      className="w-full text-sm border-b border-neutral-300 px-1 bg-panel text-text-primary"
                      value={col.coverImageUrl || ""}
                      placeholder="Cover image URL"
                      onChange={e => updateCollection(col.id, { coverImageUrl: e.target.value })}
                    />
                    <textarea
                      className="w-full text-sm border border-neutral-300 rounded px-2 py-1 bg-panel text-text-primary"
                      value={col.description}
                      placeholder="Description"
                      rows={2}
                      onChange={e => updateCollection(col.id, { description: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <label className="text-sm inline-flex items-center gap-1 text-text-secondary">
                      <input type="checkbox" checked={!!col.featured} onChange={e => updateCollection(col.id, { featured: e.target.checked })} />
                      Featured
                    </label>
                    <button className="text-danger text-sm" onClick={() => deleteCollection(col.id)}>Delete</button>
                  </div>
                </div>

                {/* Search and add published notes for existing collection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 border border-neutral-300 rounded px-2 py-1 bg-panel text-text-primary"
                      placeholder="Search published notes by title or tag…"
                      value={searchByCol[col.id] ?? ''}
                      onChange={e => setSearchByCol(prev => ({ ...prev, [col.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => void refetch()}
                      className="px-2 py-1 text-xs text-text-secondary bg-neutral-100 rounded hover:bg-neutral-200"
                    >
                      {chainLoading ? 'Refreshing…' : 'Refresh on-chain'}
                    </button>
                  </div>
                  {chainError && <div className="text-danger text-xs">{String(chainError)}</div>}

                  <ul className="space-y-1">
                    {filtered.length === 0 ? (
                      <li className="text-text-secondary text-sm">No matches.</li>
                    ) : (
                      filtered.map(n => (
                        <li key={n.id} className="flex items-center justify-between gap-2 border border-neutral-300 rounded px-2 py-1 bg-panel">
                          <div className="min-w-0">
                            <div className="text-sm truncate text-text-primary">{n.title}</div>
                            {n.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {n.tags.slice(0, 5).map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 text-xs bg-neutral-100 text-text-secondary rounded">#{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            className="text-xs px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700"
                            onClick={() => addNoteToCollection(col.id, n.id)}
                          >
                            Add
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                {/* Notes in collection */}
                {col.noteIds.length === 0 ? (
                  <p className="text-text-secondary text-sm">No notes in this collection.</p>
                ) : (
                  <ul className="space-y-1">
                    {col.noteIds.map((nid, idx) => {
                      const note = localNotes.find(n => n.id === nid) || chainNotes.find(n => n.id === nid);
                      return (
                        <li key={nid} className="flex items-center justify-between gap-2 border border-neutral-300 rounded px-2 py-1 bg-panel">
                          <div className="text-sm truncate text-text-primary">
                            {idx + 1}. {note ? (note as any).title : `(missing) ${nid}`}
                          </div>
                          <div className="flex items-center gap-2">
                            {idx > 0 && (
                              <button className="text-xs px-2 py-1 border border-neutral-300 rounded" onClick={() => {
                                // move up
                                const from = idx, to = idx - 1;
                                col.noteIds.splice(to, 0, col.noteIds.splice(from, 1)[0]);
                                updateCollection(col.id, { noteIds: [...col.noteIds] });
                              }}>↑</button>
                            )}
                            {idx < col.noteIds.length - 1 && (
                              <button className="text-xs px-2 py-1 border border-neutral-300 rounded" onClick={() => {
                                // move down
                                const from = idx, to = idx + 1;
                                col.noteIds.splice(to, 0, col.noteIds.splice(from, 1)[0]);
                                updateCollection(col.id, { noteIds: [...col.noteIds] });
                              }}>↓</button>
                            )}
                            <button className="text-xs px-2 py-1 border border-neutral-300 rounded" onClick={() => removeNoteFromCollection(col.id, nid)}>Remove</button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
