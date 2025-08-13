import { useState, useEffect, useCallback, useRef } from "react";

export interface Draft {
  id: string;
  title: string;
  content: string;
  tags: string;
  headerImageUrl?: string; // new field for header image while drafting
  category?: string; // new field for single-select category while drafting
  kicker?: string; // short teaser line shown above title
  entityId?: string; // primary location entityId snapshot (optional)
  selectedWaypointId?: string; // wizard location selection (by waypoint id)
  routeSteps?: Array<{ waypointId: string; label?: string }>; // wizard route steps
  lastSaved: number;
  createdAt: number;
}

const DRAFTS_STORAGE_KEY = "dailydust-drafts";
const OLD_DRAFTS_STORAGE_KEY = "dust-drafts";
const AUTOSAVE_DELAY = 1000; // 1 second

export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Unique id per hook instance to prevent echo loops
  const instanceIdRef = useRef<string>(
    typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function'
      ? (crypto as any).randomUUID()
      : Math.random().toString(36).slice(2)
  );
  const suppressBroadcastRef = useRef(false);

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

  // Save drafts to localStorage whenever they change and broadcast an update for other hook instances
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
      console.log("💾 Drafts saved to localStorage:", drafts.length);
    } catch (error) {
      console.error("Error saving drafts:", error);
    }
    // Broadcast to other hook instances (but avoid echoing our own syncs)
    if (!suppressBroadcastRef.current) {
      try {
        const evt = new CustomEvent('dailydust-drafts-updated', { detail: { source: instanceIdRef.current, ts: Date.now() } });
        window.dispatchEvent(evt);
      } catch {}
    }
  }, [drafts, isLoaded]);

  // Listen for drafts updates from other instances and sync
  useEffect(() => {
    const onUpdated = (e: Event) => {
      const ce = e as CustomEvent<{ source?: string; ts?: number }>;
      const from = ce.detail?.source;
      if (!from || from === instanceIdRef.current) return; // ignore our own
      try {
        const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored);
        // Suppress broadcast while syncing to avoid feedback loop
        suppressBroadcastRef.current = true;
        setDrafts(parsed);
        // release suppression after next tick
        setTimeout(() => { suppressBroadcastRef.current = false; }, 0);
      } catch {}
    };
    window.addEventListener('dailydust-drafts-updated', onUpdated as EventListener);
    // Also listen to storage events (cross-tab)
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DRAFTS_STORAGE_KEY) return;
      try {
        const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored);
        suppressBroadcastRef.current = true;
        setDrafts(parsed);
        setTimeout(() => { suppressBroadcastRef.current = false; }, 0);
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('dailydust-drafts-updated', onUpdated as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const createDraft = useCallback((initialData?: Partial<Draft>) => {
    const now = Date.now();
    const newDraft: Draft = {
      id: crypto.randomUUID(),
      title: "",
      content: "",
      tags: "",
      headerImageUrl: "",
      category: "Editorial",
      kicker: "",
      entityId: initialData?.entityId,
      selectedWaypointId: initialData?.selectedWaypointId,
      routeSteps: initialData?.routeSteps ?? [],
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

  const deleteDraft = useCallback((id: string) => {
    setDrafts(prev => prev.filter(draft => draft.id !== id));
  }, []);

  const clearAllDrafts = useCallback(() => {
    setDrafts([]);
  }, []);

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
      kicker: draft.kicker ?? "",
      entityId: draft.entityId,
    };
  }, []);

  return {
    drafts,
    isLoaded,
    createDraft,
    updateDraftImmediate,
    deleteDraft,
    clearAllDrafts,
    getDraft,
    getRecentDrafts,
    hasUnsavedChanges,
    draftToNote,
  };
}
