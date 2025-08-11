import { useMemo, useState } from "react";
import { useCollections } from "../hooks/useCollections";
import { useNotes } from "../hooks/useNotes";

export function CollectionsTab() {
  const { collections, createCollection, updateCollection, deleteCollection, addNoteToCollection, removeNoteFromCollection } = useCollections();
  const { notes } = useNotes();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [featured, setFeatured] = useState(false);

  const create = () => {
    if (!title.trim()) return;
    createCollection({ title: title.trim(), description, coverImageUrl: coverImageUrl.trim() || undefined, featured });
    setTitle(""); setDescription(""); setCoverImageUrl(""); setFeatured(false);
  };

  const availableNotes = useMemo(() => notes.map(n => ({ id: n.id, label: `${n.title}` })), [notes]);

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Collections</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="border rounded px-2 py-1" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="border rounded px-2 py-1" placeholder="Cover image URL (optional)" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} />
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} /> Featured</label>
          <button className="bg-green-600 text-white rounded px-3 py-1" onClick={create} disabled={!title.trim()}>Create</button>
        </div>
        <textarea className="border rounded px-2 py-1 w-full" placeholder="Description" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      {collections.length === 0 ? (
        <p className="text-gray-500 italic">No collections yet. Create one above.</p>
      ) : (
        <div className="space-y-4">
          {collections.map(col => (
            <div key={col.id} className="border rounded p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      className="text-lg font-semibold border-b px-1"
                      value={col.title}
                      onChange={e => updateCollection(col.id, { title: e.target.value })}
                    />
                    {col.featured && <span className="text-amber-600 text-xs">Featured</span>}
                  </div>
                  <input
                    className="w-full text-sm border-b px-1"
                    value={col.coverImageUrl || ""}
                    placeholder="Cover image URL"
                    onChange={e => updateCollection(col.id, { coverImageUrl: e.target.value })}
                  />
                  <textarea
                    className="w-full text-sm border rounded px-2 py-1"
                    value={col.description}
                    placeholder="Description"
                    rows={2}
                    onChange={e => updateCollection(col.id, { description: e.target.value })}
                  />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <label className="text-sm inline-flex items-center gap-1">
                    <input type="checkbox" checked={!!col.featured} onChange={e => updateCollection(col.id, { featured: e.target.checked })} />
                    Featured
                  </label>
                  <button className="text-red-600 text-sm" onClick={() => deleteCollection(col.id)}>Delete</button>
                </div>
              </div>

              {/* Note picker */}
              <div className="flex items-center gap-2">
                <select
                  className="border rounded px-2 py-1"
                  onChange={(e) => {
                    const noteId = e.target.value;
                    if (noteId) addNoteToCollection(col.id, noteId);
                    e.currentTarget.selectedIndex = 0;
                  }}
                >
                  <option value="">Add note…</option>
                  {availableNotes
                    .filter(n => !col.noteIds.includes(n.id))
                    .map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                </select>
              </div>

              {/* Notes in collection */}
              {col.noteIds.length === 0 ? (
                <p className="text-gray-500 text-sm">No notes in this collection.</p>
              ) : (
                <ul className="space-y-1">
                  {col.noteIds.map((nid, idx) => {
                    const note = notes.find(n => n.id === nid);
                    return (
                      <li key={nid} className="flex items-center justify-between gap-2 border rounded px-2 py-1">
                        <div className="text-sm truncate">
                          {idx + 1}. {note ? note.title : `(missing) ${nid}`}
                        </div>
                        <div className="flex items-center gap-2">
                          {idx > 0 && (
                            <button className="text-xs px-2 py-1 border rounded" onClick={() => {
                              // move up
                              const from = idx, to = idx - 1;
                              col.noteIds.splice(to, 0, col.noteIds.splice(from, 1)[0]);
                              updateCollection(col.id, { noteIds: [...col.noteIds] });
                            }}>↑</button>
                          )}
                          {idx < col.noteIds.length - 1 && (
                            <button className="text-xs px-2 py-1 border rounded" onClick={() => {
                              // move down
                              const from = idx, to = idx + 1;
                              col.noteIds.splice(to, 0, col.noteIds.splice(from, 1)[0]);
                              updateCollection(col.id, { noteIds: [...col.noteIds] });
                            }}>↓</button>
                          )}
                          <button className="text-xs px-2 py-1 border rounded" onClick={() => removeNoteFromCollection(col.id, nid)}>Remove</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
