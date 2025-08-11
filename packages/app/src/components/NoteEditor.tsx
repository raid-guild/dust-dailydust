import type React from "react";
import { useState, useEffect } from "react";
import { useDrafts } from "../hooks/useDrafts";
import { useNotes } from "../hooks/useNotes";
import { WaypointNoteLinker } from "./WaypointNoteLinker";
import { useDustClient } from "../common/useDustClient";
import type { Abi } from "viem";
import { resourceToHex } from "@latticexyz/common";

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

// Hardcode deployed namespace to avoid importing contracts config
const NAMESPACE = "rg_dd_ab564f";

interface NoteEditorProps {
  draftId?: string;
  noteId?: string;
  onSave?: () => void;
  onCancel?: () => void;
  initialEntityId?: string;
}

function randomBytes32(): `0x${string}` {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return (`0x${hex}`) as `0x${string}`;
}

export function NoteEditor({ draftId, noteId, onSave, onCancel, initialEntityId }: NoteEditorProps) {
  const { drafts, updateDraftImmediate, updateDraftWithAutosave, deleteDraft, createDraft } = useDrafts();
  const { notes, addNote, addNoteWithId, updateNote } = useNotes();
  const { data: dustClient } = useDustClient();
  
  const [title, setTitle] = useState("");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("Editorial"); // new single-select category
  const [isPublishing, setIsPublishing] = useState(false);
  const [showWaypointLinker, setShowWaypointLinker] = useState(false);
  const [linkedWaypointsCount, setLinkedWaypointsCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // Ensure we always have a draft when creating a new note for autosave
  useEffect(() => {
    if (!noteId && !draftId) {
      const d = createDraft({ entityId: initialEntityId, category: "Editorial" });
      // We can't change the prop, but we can load the created draft into state
      // Consumers (NotesManager) now creates a draft, so this is just a safety net
      const created = drafts.find(dr => dr.id === d.id) ?? d;
      setTitle(created.title);
      setHeaderImageUrl(created.headerImageUrl || "");
      setContent(created.content);
      setTags(created.tags || "");
      setCategory(created.category || "Editorial");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for linked waypoints
  useEffect(() => {
    const checkLinkedWaypoints = () => {
      const links = localStorage.getItem('dailydust-waypoint-links') || localStorage.getItem('waypoint-links');
      if (links) {
        const waypointLinks = JSON.parse(links);
        const currentLinks = waypointLinks.filter((link: any) => 
          (noteId && link.noteId === noteId) || (draftId && link.draftId === draftId)
        );
        setLinkedWaypointsCount(currentLinks.length);
        // migrate on read
        try {
          localStorage.setItem('dailydust-waypoint-links', JSON.stringify(waypointLinks));
          localStorage.removeItem('waypoint-links');
        } catch {}
      } else {
        setLinkedWaypointsCount(0);
      }
    };

    checkLinkedWaypoints();
    
    // Re-check when the waypoint linker closes
    if (!showWaypointLinker) {
      checkLinkedWaypoints();
    }
  }, [noteId, draftId, showWaypointLinker]);

  // Load existing draft or note
  useEffect(() => {
    if (noteId) {
      // Editing existing note
      const note = notes.find(n => n.id === noteId);
      if (note) {
        setTitle(note.title);
        setHeaderImageUrl(note.headerImageUrl || "");
        setContent(note.content);
        setTags(note.tags.join(", "));
        setCategory(note.category || "Editorial");
      }
    } else if (draftId) {
      // Editing existing draft
      const draft = drafts.find(d => d.id === draftId);
      if (draft) {
        setTitle(draft.title);
        setHeaderImageUrl(draft.headerImageUrl || "");
        setContent(draft.content);
        setTags(draft.tags);
        setCategory(draft.category || "Editorial");
      }
    }
  }, [noteId, draftId, notes, drafts]);

  // Autosave to draft while editing
  useEffect(() => {
    if (draftId && !noteId) {
      updateDraftWithAutosave(draftId, {
        title,
        headerImageUrl,
        content,
        tags,
        category,
        entityId: initialEntityId,
      });
    }
  }, [draftId, noteId, title, headerImageUrl, content, tags, category, initialEntityId, updateDraftWithAutosave]);

  // Handle saving draft manually
  const handleSaveDraft = () => {
    if (draftId) {
      updateDraftImmediate(draftId, {
        title,
        headerImageUrl,
        content,
        tags,
        category,
      });
    }
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

        if (createdId) {
          await addNoteWithId(createdId, {
            title: title.trim(),
            headerImageUrl: headerImageUrl.trim(),
            content: content.trim(),
            tags: tagArray,
            category,
            owner: dustClient?.appContext.userAddress || "0x0000000000000000000000000000000000000000",
            tipJar: dustClient?.appContext.userAddress || "0x0000000000000000000000000000000000000000",
            boostUntil: 0,
            entityId: initialEntityId,
          });
        } else {
          await addNote({
            title: title.trim(),
            headerImageUrl: headerImageUrl.trim(),
            content: content.trim(),
            tags: tagArray,
            category,
            owner: dustClient?.appContext.userAddress || "0x0000000000000000000000000000000000000000",
            tipJar: dustClient?.appContext.userAddress || "0x0000000000000000000000000000000000000000",
            boostUntil: 0,
            entityId: initialEntityId,
          });
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

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {noteId ? "Edit Note" : "New Note"}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWaypointLinker(true)}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              linkedWaypointsCount > 0 
                ? 'text-blue-700 bg-blue-100 hover:bg-blue-200' 
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            🗺️ {linkedWaypointsCount > 0 ? `Waypoints (${linkedWaypointsCount})` : 'Link Waypoints'}
          </button>
          <button
            onClick={() => setShowPreview(p => !p)}
            className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublishing || !title.trim() || !content.trim()}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPublishing ? "Publishing..." : noteId ? "Update" : "Publish"}
          </button>
        </div>
      </div>

      {/* Title + Header image + Category */}
      <div className="p-4 border-b border-gray-100 space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full text-xl font-semibold text-gray-900 placeholder-gray-400 border-none outline-none resize-none"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="url"
            value={headerImageUrl}
            onChange={(e) => setHeaderImageUrl(e.target.value)}
            placeholder="Header image URL (optional)"
            className="w-full text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-sm text-gray-800 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {['Editorial','Classified','News','Quest','Guide','Lore','Help','Release Notes'].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-wrap gap-2 mb-2">
          {tagArray.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <TagInput onAddTag={handleAddTag} placeholder="Add tags (comma separated)..." />
      </div>

      {/* Content Editor */}
      <div className="flex-1 p-4">
        {!showPreview ? (
          <>
            <div className="flex gap-2 mb-2">
              <button onClick={() => applyFormatting('bold')} className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Bold</button>
              <button onClick={() => applyFormatting('italic')} className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Italic</button>
              <button onClick={() => applyFormatting('code')} className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Code</button>
              <button onClick={() => applyFormatting('quote')} className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Quote</button>
              <button onClick={() => applyFormatting('ul')} className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">• List</button>
              <button onClick={() => applyFormatting('ol')} className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">1. List</button>
            </div>
            <textarea
              id="note-content-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your note..."
              className="w-full h-full text-gray-900 placeholder-gray-400 border-none outline-none resize-none font-mono text-sm leading-relaxed"
            />
          </>
        ) : (
          <MarkdownPreview content={content} headerImageUrl={headerImageUrl} />
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 text-xs text-gray-500 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-4">
          <span>
            {content.length} characters
          </span>
          {linkedWaypointsCount > 0 && (
            <span className="text-blue-600 flex items-center gap-1">
              🗺️ {linkedWaypointsCount} waypoint{linkedWaypointsCount !== 1 ? 's' : ''} linked
            </span>
          )}
        </div>
        {draftId && !noteId && (
          <div className="flex items-center gap-2">
            <span className="text-amber-600">
              Draft
            </span>
            <button
              onClick={handleSaveDraft}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Draft
            </button>
          </div>
        )}
      </div>

      {/* Waypoint Linker Modal */}
      {showWaypointLinker && (
        <WaypointNoteLinker
          noteId={noteId}
          draftId={draftId}
          onClose={() => setShowWaypointLinker(false)}
        />
      )}
    </div>
  );
}

function MarkdownPreview({ content, headerImageUrl }: { content: string; headerImageUrl?: string }) {
  // Super minimal markdown rendering: headings, bold, italic, code, lists, blockquotes, links
  const render = (md: string) => {
    let html = md;
    // Escape basic HTML
    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Headings
    html = html.replace(/^###\s(.+)$/gm, '<h3 class="text-base font-semibold mt-3">$1</h3>');
    html = html.replace(/^##\s(.+)$/gm, '<h2 class="text-lg font-semibold mt-4">$1</h2>');
    html = html.replace(/^#\s(.+)$/gm, '<h1 class="text-xl font-bold mt-6">$1</h1>');
    // Blockquote
    html = html.replace(/^>\s(.+)$/gm, '<blockquote class="border-l-4 pl-3 my-2 text-gray-600">$1</blockquote>');
    // Bold/Italic/Code
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>');
    // Links
    html = html.replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g, '<a class="text-blue-600 underline" href="$2" target="_blank" rel="noreferrer">$1</a>');
    // Lists (very basic)
    html = html.replace(/^(?:-\s.+\n?)+/gm, match => `<ul class="list-disc ml-5 my-2">${match.replace(/^-\s(.+)$/gm, '<li>$1</li>')}</ul>`);
    html = html.replace(/^(?:\d+\.\s.+\n?)+/gm, match => `<ol class="list-decimal ml-5 my-2">${match.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')}</ol>`);
    // Paragraphs
    html = html.replace(/^(?!<h\d|<ul|<ol|<blockquote)(.+)$/gm, '<p class="my-2">$1</p>');
    return html;
  };

  return (
    <div className="prose max-w-none">
      {headerImageUrl ? (
        <img src={headerImageUrl} alt="header" className="w-full max-h-64 object-cover rounded mb-4" />
      ) : null}
      <div dangerouslySetInnerHTML={{ __html: render(content) }} />
    </div>
  );
}

interface TagInputProps {
  onAddTag: (tag: string) => void;
  placeholder?: string;
}

function TagInput({ onAddTag, placeholder = "Add tag..." }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        onAddTag(inputValue.trim());
        setInputValue("");
      }
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      onAddTag(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <input
      type="text"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyPress={handleKeyPress}
      onBlur={handleBlur}
      placeholder={placeholder}
      className="w-full px-2 py-1 text-sm text-gray-700 placeholder-gray-400 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  );
}
