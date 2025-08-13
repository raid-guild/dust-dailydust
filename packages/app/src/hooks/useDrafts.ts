import { useCallback, useEffect, useState } from "react";

export interface Draft {
  id: string;
  title: string;
  content: string;
  tags: string;
  headerImageUrl?: string; // new field for header image while drafting
  category?: string; // new field for single-select category while drafting
  entityId?: string;
  lastSaved: number;
  createdAt: number;
}

const DRAFTS_STORAGE_KEY = "dailydust-drafts";
const OLD_DRAFTS_STORAGE_KEY = "dust-drafts";
const AUTOSAVE_DELAY = 1000; // 1 second

export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [autosaveTimeouts, setAutosaveTimeouts] = useState<Map<string, number>>(
    new Map()
  );

  // Load drafts from localStorage on mount
  useEffect(() => {
    try {
      let stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
      let migrated = false;
      if (!stored) {
        const old = localStorage.getItem(OLD_DRAFTS_STORAGE_KEY);
        if (old) {
          stored = old;
          migrated = true;
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log("📄 Loading drafts from localStorage:", parsed.length);
        setDrafts(parsed);
        if (migrated) {
          try {
            localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(parsed));
            localStorage.removeItem(OLD_DRAFTS_STORAGE_KEY);
          } catch (e) {
            console.warn("Draft key migration failed", e);
          }
        }
      } else {
        console.log("📄 No saved drafts found in localStorage");
      }
    } catch (error) {
      console.error("Error loading drafts:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save drafts to localStorage whenever they change
  useEffect(() => {
    // Only save after initial load to prevent overwriting with empty array
    if (isLoaded) {
      try {
        localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
        console.log("💾 Drafts saved to localStorage:", drafts.length);
      } catch (error) {
        console.error("Error saving drafts:", error);
      }
    }
  }, [drafts, isLoaded]);

  // Cleanup autosave timeouts on unmount
  useEffect(() => {
    return () => {
      autosaveTimeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [autosaveTimeouts]);

  const createDraft = useCallback((initialData?: Partial<Draft>) => {
    const now = Date.now();
    const newDraft: Draft = {
      id: crypto.randomUUID(),
      title: "",
      content: "",
      tags: "",
      headerImageUrl: "",
      category: "Editorial",
      lastSaved: now,
      createdAt: now,
      ...initialData,
    };

    setDrafts((prev) => [...prev, newDraft]);
    return newDraft;
  }, []);

  const updateDraftImmediate = useCallback(
    (id: string, updates: Partial<Omit<Draft, "id" | "createdAt">>) => {
      setDrafts((prev) =>
        prev.map((draft) =>
          draft.id === id
            ? { ...draft, ...updates, lastSaved: Date.now() }
            : draft
        )
      );
    },
    []
  );

  const updateDraftWithAutosave = useCallback(
    (id: string, updates: Partial<Omit<Draft, "id" | "createdAt">>) => {
      // Update the draft optimistically (without lastSaved update)
      setDrafts((prev) =>
        prev.map((draft) =>
          draft.id === id ? { ...draft, ...updates } : draft
        )
      );

      // Clear existing timeout for this draft
      const existingTimeout = autosaveTimeouts.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new autosave timeout
      const newTimeout = setTimeout(() => {
        updateDraftImmediate(id, { lastSaved: Date.now() });
        setAutosaveTimeouts((prev) => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      }, AUTOSAVE_DELAY);

      setAutosaveTimeouts((prev) => new Map(prev.set(id, newTimeout)));
    },
    [autosaveTimeouts]
  );

  const deleteDraft = useCallback(
    (id: string) => {
      // Clear any pending autosave
      const timeout = autosaveTimeouts.get(id);
      if (timeout) {
        clearTimeout(timeout);
        setAutosaveTimeouts((prev) => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      }

      setDrafts((prev) => prev.filter((draft) => draft.id !== id));
    },
    [autosaveTimeouts]
  );

  const clearAllDrafts = useCallback(() => {
    // Clear all autosave timeouts
    autosaveTimeouts.forEach((timeout) => clearTimeout(timeout));
    setAutosaveTimeouts(new Map());

    setDrafts([]);
  }, [autosaveTimeouts]);

  const getDraft = useCallback(
    (id: string) => {
      return drafts.find((draft) => draft.id === id);
    },
    [drafts]
  );

  // Get drafts sorted by last modified
  const getRecentDrafts = useCallback(() => {
    return [...drafts].sort((a, b) => b.lastSaved - a.lastSaved);
  }, [drafts]);

  // Check if a draft has unsaved changes (lastSaved is older than a reasonable autosave delay)
  const hasUnsavedChanges = useCallback(
    (id: string) => {
      const draft = getDraft(id);
      if (!draft) return false;

      const timeSinceLastSave = Date.now() - draft.lastSaved;
      return timeSinceLastSave > AUTOSAVE_DELAY * 2; // Give some buffer
    },
    [getDraft]
  );

  // Convert draft to note format (for publishing)
  const draftToNote = useCallback((draft: Draft) => {
    return {
      title: draft.title,
      content: draft.content,
      tags: draft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      headerImageUrl: draft.headerImageUrl ?? "",
      category: draft.category || "Editorial",
      entityId: draft.entityId,
    };
  }, []);

  return {
    drafts,
    isLoaded,
    createDraft,
    updateDraftImmediate,
    updateDraftWithAutosave,
    deleteDraft,
    clearAllDrafts,
    getDraft,
    getRecentDrafts,
    hasUnsavedChanges,
    draftToNote,
  };
}
