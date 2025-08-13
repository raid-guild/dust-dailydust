import { useEffect, useState } from "react";

export interface Note {
  id: string;
  title: string;
  kicker?: string; // short teaser above title
  content: string;
  tags: string[];
  owner: string;
  tipJar: string;
  createdAt: number;
  updatedAt: number;
  boostUntil: number;
  totalTips: number;
  headerImageUrl: string; // new header image URL
  category: string; // new single-select category
  // Local/draft-only properties
  isDraft?: boolean;
  entityId?: string; // For linking to entities
}

const NOTES_STORAGE_KEY = "dailydust-notes";
const OLD_NOTES_STORAGE_KEY = "dust-notes";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load notes from localStorage on mount (with migration from old key)
  useEffect(() => {
    try {
      let stored = localStorage.getItem(NOTES_STORAGE_KEY);
      let migratedFromOld = false;
      if (!stored) {
        const old = localStorage.getItem(OLD_NOTES_STORAGE_KEY);
        if (old) {
          stored = old;
          migratedFromOld = true;
        }
      }

      if (stored) {
        const parsed = JSON.parse(stored);
        console.log("📝 Loading notes from localStorage:", parsed.length);
        const normalized: Note[] = Array.isArray(parsed)
          ? parsed.map((n: any) => ({
              ...n,
              category:
                typeof n?.category === "string" && n.category
                  ? n.category
                  : "Editorial",
              headerImageUrl:
                typeof n?.headerImageUrl === "string" ? n.headerImageUrl : "",
            }))
          : [];
        setNotes(normalized);

        // Write to new key if migrated
        if (migratedFromOld) {
          try {
            localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(normalized));
            localStorage.removeItem(OLD_NOTES_STORAGE_KEY);
          } catch (e) {
            console.warn("Note key migration failed", e);
          }
        }
      } else {
        console.log("📝 No saved notes found in localStorage");
      }
    } catch (error) {
      console.error("Error loading notes:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    // Only save after initial load to prevent overwriting with empty array
    if (isLoaded) {
      try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
        console.log("💾 Notes saved to localStorage:", notes.length);
      } catch (error) {
        console.error("Error saving notes:", error);
      }
    }
  }, [notes, isLoaded]);

  const addNote = (
    note: Omit<Note, "id" | "createdAt" | "updatedAt" | "totalTips">
  ) => {
    const now = Date.now();
    const newNote: Note = {
      ...note,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      totalTips: 0,
      tipJar: note.tipJar || note.owner, // Default tipJar to owner
      boostUntil: note.boostUntil || 0,
      headerImageUrl: note.headerImageUrl ?? "",
      category: note.category || "Editorial",
    };
    setNotes((prev) => [...prev, newNote]);
    return newNote;
  };

  const addNoteWithId = (
    id: string,
    note: Omit<Note, "id" | "createdAt" | "updatedAt" | "totalTips">
  ) => {
    const now = Date.now();
    const newNote: Note = {
      ...note,
      id,
      createdAt: now,
      updatedAt: now,
      totalTips: 0,
      tipJar: note.tipJar || note.owner,
      boostUntil: note.boostUntil || 0,
      headerImageUrl: note.headerImageUrl ?? "",
      category: note.category || "Editorial",
    };
    setNotes((prev) => [...prev, newNote]);
    return newNote;
  };

  const updateNote = (
    id: string,
    updates: Partial<Omit<Note, "id" | "createdAt">>
  ) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
      )
    );
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const clearAllNotes = () => {
    setNotes([]);
  };

  // Get notes by category/filter
  const getDraftNotes = () => notes.filter((note) => note.isDraft);
  const getPublishedNotes = () => notes.filter((note) => !note.isDraft);
  const getNotesByOwner = (owner: string) =>
    notes.filter((note) => note.owner === owner);
  const getNotesByTag = (tag: string) =>
    notes.filter((note) => note.tags.includes(tag));
  const getNotesLinkedToEntity = (entityId: string) =>
    notes.filter((note) => note.entityId === entityId);
  const getNotesByCategory = (category: string) =>
    notes.filter((note) => note.category === category);

  // Get unique tags across all notes
  const getAllTags = () => {
    const allTags = notes.flatMap((note) => note.tags);
    return Array.from(new Set(allTags)).sort();
  };

  return {
    notes,
    isLoaded,
    addNote,
    addNoteWithId,
    updateNote,
    deleteNote,
    clearAllNotes,
    // Filtered getters
    getDraftNotes,
    getPublishedNotes,
    getNotesByOwner,
    getNotesByTag,
    getNotesLinkedToEntity,
    getNotesByCategory,
    getAllTags,
  };
}
