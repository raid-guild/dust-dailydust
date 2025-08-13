import { useState, useEffect } from "react";
import { useDrafts } from "../hooks/useDrafts";
import { useNotes } from "../hooks/useNotes";
import { WaypointNoteLinker } from "./WaypointNoteLinker";
import { useDustClient } from "../common/useDustClient";
import type { Abi } from "viem";
import { resourceToHex } from "@latticexyz/common";
import { worldAddress } from "../common/worldAddress";
import { DUST_NAMESPACE } from "../common/namespace";


// Inline minimal ABI for NoteSystem methods we call
const noteSystemAbi: Abi = [
  {
    type: "function",
    name: "createNote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "title", type: "string" },
      { name: "content", type: "string" },
      { name: "tagsCsv", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "updateNote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "title", type: "string" },
      { name: "content", type: "string" },
      { name: "tagsCsv", type: "string" },
    ],
    outputs: [],
  },
];

// Use centralized namespace
const NAMESPACE = DUST_NAMESPACE;
const INDEXER_Q_URL = "https://indexer.mud.redstonechain.com/q";
const TABLE = `${NAMESPACE}__Note`;

interface NoteEditorProps {
  draftId?: string;
  noteId?: string;
  onSave?: () => void;
  onCancel?: () => void;
  initialEntityId?: string;
  variant?: 'default' | 'bare';
  // New: when used inside a stepper, hide action buttons and emit state upward
  stepperMode?: boolean;
  onStateChange?: (state: {
    title: string;
    headerImageUrl: string;
    content: string;
    tags: string; // csv
    category: string;
    kicker: string; // short teaser
    effectiveDraftId: string | null;
    noteId?: string;
  }) => void;
}

function randomBytes32(): `0x${string}` {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return (`0x${hex}`) as `0x${string}`;
}

export function NoteEditor({ draftId, noteId, onSave, onCancel, initialEntityId, variant = 'default', stepperMode = false, onStateChange }: NoteEditorProps) {
  const { drafts, updateDraftImmediate, deleteDraft, createDraft } = useDrafts();
  const { notes, addNote, addNoteWithId, updateNote } = useNotes();
  const { data: dustClient } = useDustClient();
  
  // Track an internal draft id when the editor creates one implicitly
  const [internalDraftId, setInternalDraftId] = useState<string | null>(null);
  const effectiveDraftId = draftId ?? internalDraftId ?? null;

  const [title, setTitle] = useState("");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("Editorial");
  const [kicker, setKicker] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [showWaypointLinker, setShowWaypointLinker] = useState(false);
  const [linkedWaypointsCount, setLinkedWaypointsCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Check for linked waypoints (use effectiveDraftId)
  useEffect(() => {
    const checkLinkedWaypoints = () => {
      const links = localStorage.getItem('dailydust-waypoint-links') || localStorage.getItem('waypoint-links');
      if (links) {
        const waypointLinks = JSON.parse(links);
        const currentLinks = waypointLinks.filter((link: any) => 
          (noteId && link.noteId === noteId) || (effectiveDraftId && link.draftId === effectiveDraftId)
        );
        setLinkedWaypointsCount(currentLinks.length);
        try {
          localStorage.setItem('dailydust-waypoint-links', JSON.stringify(waypointLinks));
          localStorage.removeItem('waypoint-links');
        } catch {}
      } else {
        setLinkedWaypointsCount(0);
      }
    };

    checkLinkedWaypoints();
    if (!showWaypointLinker) checkLinkedWaypoints();
  }, [noteId, effectiveDraftId, showWaypointLinker]);

  // Load existing draft or note
  useEffect(() => {
    if (noteId) {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        setTitle(note.title);
        setHeaderImageUrl(note.headerImageUrl || "");
        setContent(note.content);
        setTags(note.tags.join(", "));
        setCategory(note.category || "Editorial");
        setKicker(note.kicker || "");
      }
    } else if (draftId) {
      const draft = drafts.find(d => d.id === draftId);
      if (draft) {
        setTitle(draft.title);
        setHeaderImageUrl(draft.headerImageUrl || "");
        setContent(draft.content);
        setTags(draft.tags);
        setCategory(draft.category || "Editorial");
        setKicker(draft.kicker || "");
      }
    }
  }, [noteId, draftId, notes, drafts]);

  // If editing a noteId that isn't in local storage, fetch it from indexer for prefill
  useEffect(() => {
    let aborted = false;
    async function fetchOnchainById(id: string) {
      const sql = `SELECT "noteId","owner","createdAt","updatedAt","tipJar","boostUntil","totalTips","title","content","tags","headerImageUrl" FROM "${TABLE}" WHERE "noteId"='${id}' LIMIT 1`;
      try {
        const res = await fetch(INDEXER_Q_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([
            { query: sql, address: worldAddress },
          ]),
        });
        if (!res.ok) return;
        const data = await res.json();
        const result = (data?.result ?? []) as any[];
        if (!Array.isArray(result) || result.length === 0) return;
        const first = result[0];
        if (!Array.isArray(first) || first.length === 0) return;
        const [columns, ...rows] = first as [string[], ...any[]];
        if (!rows[0]) return;
        const row = rows[0] as any[];
        const r: Record<string, any> = {};
        (columns as string[]).forEach((col: string, i: number) => {
          r[col] = row[i];
        });
        const rawTags = r.tags;
        let tagsArr: string[] = [];
        if (Array.isArray(rawTags)) tagsArr = rawTags.filter(Boolean);
        else if (typeof rawTags === "string") {
          try { tagsArr = JSON.parse(rawTags); } catch { tagsArr = rawTags.split(',').map((t: string) => t.trim()).filter(Boolean); }
        }
        if (!aborted) {
          setTitle((r.title as string) ?? "");
          setHeaderImageUrl(((r.headerImageUrl as string) ?? ""));
          setContent((r.content as string) ?? "");
          setTags(tagsArr.join(', '));
          // category not on-chain yet; leave as current
        }
      } catch {
        // ignore
      }
    }

    if (noteId) {
      const existsLocally = notes.some(n => n.id === noteId);
      if (!existsLocally) {
        void fetchOnchainById(noteId);
      }
    }

    return () => { aborted = true; };
  }, [noteId, notes]);

  // Save draft explicitly
  const handleSaveDraft = async () => {
    let id = effectiveDraftId;
    if (!id) {
      const d = createDraft({ entityId: initialEntityId, category, title, headerImageUrl, content, tags, kicker });
      setInternalDraftId(d.id);
      id = d.id;
    }
    updateDraftImmediate(id!, { title, headerImageUrl, content, tags, category, kicker, entityId: initialEntityId });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  async function createOnchainNote(noteHexId: `0x${string}`, titleIn: string, contentIn: string, tagsCsv: string) {
    if (!dustClient) throw new Error("No DUST client");
    const systemId = resourceToHex({ type: "system", namespace: NAMESPACE, name: "NoteSystem" });
    const res = await (dustClient as any).provider.request({
      method: "systemCall",
      params: [
        {
          systemId,
          abi: noteSystemAbi,
          functionName: "createNote",
          args: [noteHexId, titleIn, contentIn, tagsCsv],
        },
      ],
    } as any);
    return res;
  }

  async function updateOnchainNote(noteHexId: `0x${string}`, titleIn: string, contentIn: string, tagsCsv: string) {
    if (!dustClient) throw new Error("No DUST client");
    const systemId = resourceToHex({ type: "system", namespace: NAMESPACE, name: "NoteSystem" });
    const res = await (dustClient as any).provider.request({
      method: "systemCall",
      params: [
        {
          systemId,
          abi: noteSystemAbi,
          functionName: "updateNote",
          args: [noteHexId, titleIn, contentIn, tagsCsv],
        },
      ],
    } as any);
    return res;
  }

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Please provide both title and content");
      return;
    }

    setIsPublishing(true);
    try {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      const tagsCsv = tagArray.join(',');

      if (noteId) {
        // Update existing note
        try {
          if (dustClient && noteId.startsWith("0x") && noteId.length === 66) {
            await updateOnchainNote(noteId as `0x${string}`, title.trim(), content.trim(), tagsCsv);
          }
        } catch (e) {
          console.warn("On-chain update failed, updating locally only", e);
        }
        await updateNote(noteId, {
          title: title.trim(),
          headerImageUrl: headerImageUrl.trim(),
          content: content.trim(),
          tags: tagArray,
          category,
          kicker: kicker.trim(),
        });
      } else {
        // Create new note
        let createdId: string | null = null;
        if (dustClient) {
          try {
            const noteHexId = randomBytes32();
            await createOnchainNote(noteHexId, title.trim(), content.trim(), tagsCsv);
            createdId = noteHexId;
          } catch (e) {
            console.warn("On-chain create failed, falling back to local", e);
          }
        }

        const base = {
          title: title.trim(),
          headerImageUrl: headerImageUrl.trim(),
          content: content.trim(),
          tags: tagArray,
          category,
          kicker: kicker.trim(),
          owner: dustClient?.appContext.userAddress || "0x0000000000000000000000000000000000000000",
          tipJar: dustClient?.appContext.userAddress || "0x0000000000000000000000000000000000000000",
          boostUntil: 0,
          entityId: initialEntityId,
        };

        if (createdId) {
          await addNoteWithId(createdId, base);
        } else {
          await addNote(base);
        }
      }

      // Delete draft if we were working from one
      if (draftId) {
        deleteDraft(draftId);
      }

      onSave?.();
    } catch (error) {
      console.error("Failed to publish note:", error);
      alert("Failed to publish note. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancel = () => {
    if (draftId && !noteId) {
      // Ask if they want to keep the draft
      if (title.trim() || content.trim()) {
        const keepDraft = confirm("Do you want to save this as a draft?");
        if (!keepDraft) {
          deleteDraft(draftId);
        } else {
          // Save the current state to draft before closing
          updateDraftImmediate(draftId, {
            title,
            headerImageUrl,
            content,
            tags,
          });
        }
      } else {
        deleteDraft(draftId);
      }
    }
    onCancel?.();
  };

  const handleAddTag = (newTag: string) => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag) return;
    
    const currentTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    if (!currentTags.includes(trimmedTag)) {
      const updatedTags = [...currentTags, trimmedTag].join(', ');
      setTags(updatedTags);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove).join(', ');
    setTags(updatedTags);
  };

  // Minimal markdown controls
  const applyFormatting = (syntax: 'bold' | 'italic' | 'code' | 'quote' | 'ul' | 'ol') => {
    const textarea = document.getElementById('note-content-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.substring(selectionStart, selectionEnd);

    const wrappers: Record<typeof syntax, [string, string]> = {
      bold: ['**', '**'],
      italic: ['*', '*'],
      code: ['`', '`'],
      quote: ['> ', ''],
      ul: ['- ', ''],
      ol: ['1. ', ''],
    } as const;

    const [prefix, suffix] = wrappers[syntax];

    // For list/quote, apply to each selected line
    if (syntax === 'quote' || syntax === 'ul' || syntax === 'ol') {
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);
      const lines = selected.split(/\n/).map(line => line ? prefix + line : line).join('\n');
      const newValue = before + lines + after;
      setContent(newValue);
      // Restore selection roughly
      requestAnimationFrame(() => {
        textarea.selectionStart = selectionStart;
        textarea.selectionEnd = selectionStart + lines.length;
        textarea.focus();
      });
      return;
    }

    const newValue = value.substring(0, selectionStart) + prefix + selected + suffix + value.substring(selectionEnd);
    setContent(newValue);
    // Restore selection around wrapped text
    requestAnimationFrame(() => {
      const start = selectionStart + prefix.length;
      const end = start + selected.length;
      textarea.selectionStart = start;
      textarea.selectionEnd = end;
      textarea.focus();
    });
  };

  const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);

  const containerClass =
    variant === 'bare'
      ? 'flex flex-col h-full rounded-lg'
      : 'flex flex-col h-full bg-panel border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm';

  // Emit state to parent when used in stepper mode (avoid including onStateChange in deps)
  useEffect(() => {
    if (!stepperMode || !onStateChange) return;
    onStateChange({
      title,
      headerImageUrl,
      content,
      tags,
      category,
      kicker,
      effectiveDraftId,
      noteId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, headerImageUrl, content, tags, category, kicker, effectiveDraftId, noteId, stepperMode]);

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-lg font-semibold text-text-primary">
          {noteId ? "Edit Note" : "Note Editor"}
        </h2>
        {!stepperMode && (
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowWaypointLinker(true)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                linkedWaypointsCount > 0 
                  ? 'text-brand-700 bg-brand-100 hover:bg-brand-200' 
                  : 'text-text-secondary bg-neutral-100 hover:bg-neutral-200'
              }`}
            >
              🗺️ {linkedWaypointsCount > 0 ? `Waypoints (${linkedWaypointsCount})` : 'Link Waypoints'}
            </button>
            <button
              onClick={() => setShowPreview(p => !p)}
              className="px-3 py-1.5 text-sm text-text-secondary bg-neutral-100 rounded hover:bg-neutral-200 transition-colors"
            >
              {showPreview ? 'Edit' : 'Preview'}
            </button>
            {!noteId && (
              <button
                onClick={handleSaveDraft}
                className="px-3 py-1.5 text-sm text-text-secondary bg-neutral-100 rounded hover:bg-neutral-200 transition-colors"
              >
                {justSaved ? 'Saved' : 'Save Draft'}
              </button>
            )}
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-text-secondary bg-neutral-100 rounded hover:bg-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-3 py-1.5 text-sm text-white bg-brand-600 rounded hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPublishing ? 'Publishing…' : (noteId ? 'Update' : 'Publish')}
            </button>
          </div>
        )}
      </div>

      {/* Title & Meta */}
      <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full text-xl font-semibold text-text-primary placeholder-neutral-400 border-none outline-none resize-none bg-transparent"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            value={headerImageUrl}
            onChange={(e) => setHeaderImageUrl(e.target.value)}
            placeholder="Header image URL (optional)"
            className="w-full text-sm text-text-primary placeholder-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-panel"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-sm text-text-primary border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-panel"
          >
            <option>Editorial</option>
            <option>Guide</option>
            <option>News</option>
            <option>Build</option>
            <option>Other</option>
          </select>
        </div>
        <input
          value={kicker}
          onChange={(e) => setKicker(e.target.value)}
          placeholder="Kicker (short teaser above the title)"
          className="w-full text-sm text-text-primary placeholder-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-panel"
        />
      </div>

      {/* Tags */}
      <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tagArray.slice(0, 6).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-100 text-brand-800 rounded-full">
                #{tag}
                <button onClick={() => handleRemoveTag(tag)} className="text-brand-700 hover:text-brand-900">×</button>
              </span>
            ))}
          </div>
          <button onClick={() => handleAddTag(prompt('New tag') || '')} className="text-brand-600 hover:text-brand-800">+ Add tag</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => applyFormatting('bold')} className="text-xs px-2 py-1 bg-neutral-100 rounded hover:bg-neutral-200">Bold</button>
          <button onClick={() => applyFormatting('italic')} className="text-xs px-2 py-1 bg-neutral-100 rounded hover:bg-neutral-200">Italic</button>
          <button onClick={() => applyFormatting('code')} className="text-xs px-2 py-1 bg-neutral-100 rounded hover:bg-neutral-200">Code</button>
          <button onClick={() => applyFormatting('quote')} className="text-xs px-2 py-1 bg-neutral-100 rounded hover:bg-neutral-200">Quote</button>
          <button onClick={() => applyFormatting('ul')} className="text-xs px-2 py-1 bg-neutral-100 rounded hover:bg-neutral-200">• List</button>
          <button onClick={() => applyFormatting('ol')} className="text-xs px-2 py-1 bg-neutral-100 rounded hover:bg-neutral-200">1. List</button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4">
        {showPreview ? (
          <div className="prose max-w-none text-text-primary">
            {content || 'Nothing to preview yet.'}
          </div>
        ) : (
          <textarea
            id="note-content-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note in markdown..."
            className="w-full h-full text-text-primary placeholder-neutral-400 border-none outline-none resize-none font-mono text-sm leading-relaxed bg-transparent"
          />
        )}
      </div>

      {showWaypointLinker && (
        <WaypointNoteLinker noteId={noteId} draftId={effectiveDraftId ?? undefined} onClose={() => setShowWaypointLinker(false)} />
      )}
    </div>
  );
}
