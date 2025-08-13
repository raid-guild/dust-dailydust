import { useEffect, useMemo, useState } from "react";

import type { Note } from "./useNotes";

export interface Collection {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  tags?: string[];
  category?: string;
  featured?: boolean; // for front page
  publishedAt?: number; // ms epoch. if omitted, treat as draft/unpublished
  createdAt: number;
  updatedAt: number;
  noteIds: string[]; // references Note.id
}

const STORAGE_KEY = "dailydust-collections";
const OLD_STORAGE_KEY = "dust-collections";

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load
  useEffect(() => {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      let migrated = false;
      if (!raw) {
        const old = localStorage.getItem(OLD_STORAGE_KEY);
        if (old) {
          raw = old;
          migrated = true;
        }
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized: Collection[] = Array.isArray(parsed)
          ? parsed.map((c: any) => ({
              id:
                typeof c?.id === "string" && c.id ? c.id : crypto.randomUUID(),
              title:
                typeof c?.title === "string" ? c.title : "Untitled Collection",
              description:
                typeof c?.description === "string" ? c.description : "",
              coverImageUrl:
                typeof c?.coverImageUrl === "string"
                  ? c.coverImageUrl
                  : undefined,
              tags: Array.isArray(c?.tags)
                ? c.tags.filter((t: any) => typeof t === "string")
                : [],
              category:
                typeof c?.category === "string" ? c.category : undefined,
              featured: Boolean(c?.featured),
              publishedAt:
                typeof c?.publishedAt === "number" ? c.publishedAt : undefined,
              createdAt:
                typeof c?.createdAt === "number" ? c.createdAt : Date.now(),
              updatedAt:
                typeof c?.updatedAt === "number" ? c.updatedAt : Date.now(),
              noteIds: Array.isArray(c?.noteIds)
                ? c.noteIds.filter((n: any) => typeof n === "string")
                : [],
            }))
          : [];
        setCollections(normalized);
        if (migrated) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            localStorage.removeItem(OLD_STORAGE_KEY);
          } catch (e) {
            console.warn("Collections key migration failed", e);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load collections", e);
      setCollections([]);
    }
    setIsLoaded(true);
  }, []);

  // Save
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
    } catch (e) {
      console.error("Failed to save collections", e);
    }
  }, [collections, isLoaded]);

  // CRUD
  const createCollection = (
    init?: Partial<Omit<Collection, "id" | "createdAt" | "updatedAt">>
  ) => {
    const now = Date.now();
    const col: Collection = {
      id: crypto.randomUUID(),
      title: init?.title?.trim() || "Untitled Collection",
      description: init?.description || "",
      coverImageUrl: init?.coverImageUrl,
      tags: init?.tags || [],
      category: init?.category,
      featured: Boolean(init?.featured),
      publishedAt: init?.publishedAt,
      createdAt: now,
      updatedAt: now,
      noteIds: Array.isArray(init?.noteIds) ? [...new Set(init!.noteIds!)] : [],
    };
    setCollections((prev) => [...prev, col]);
    return col;
  };

  const updateCollection = (
    id: string,
    updates: Partial<Omit<Collection, "id" | "createdAt">>
  ) => {
    setCollections((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
      )
    );
  };

  const deleteCollection = (id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
  };

  const clearAllCollections = () => setCollections([]);

  // Note membership helpers
  const addNoteToCollection = (collectionId: string, noteId: string) => {
    setCollections((prev) =>
      prev.map((c) => {
        if (c.id !== collectionId) return c;
        if (c.noteIds.includes(noteId)) return c;
        return { ...c, noteIds: [...c.noteIds, noteId], updatedAt: Date.now() };
      })
    );
  };

  const removeNoteFromCollection = (collectionId: string, noteId: string) => {
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId
          ? {
              ...c,
              noteIds: c.noteIds.filter((id) => id !== noteId),
              updatedAt: Date.now(),
            }
          : c
      )
    );
  };

  const reorderNotesInCollection = (
    collectionId: string,
    fromIndex: number,
    toIndex: number
  ) => {
    setCollections((prev) =>
      prev.map((c) => {
        if (c.id !== collectionId) return c;
        const list = [...c.noteIds];
        const [moved] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, moved);
        return { ...c, noteIds: list, updatedAt: Date.now() };
      })
    );
  };

  // Getters
  const getCollection = (id: string) => collections.find((c) => c.id === id);
  const getFeatured = () => collections.filter((c) => c.featured);
  const getPublished = () =>
    collections.filter((c) => typeof c.publishedAt === "number");
  const getDrafts = () =>
    collections.filter((c) => typeof c.publishedAt !== "number");
  const getByTag = (tag: string) =>
    collections.filter((c) => c.tags?.includes(tag));

  // Denormalize helper: join with notes
  const withNotes = (id: string, notes: Note[]) => {
    const c = getCollection(id);
    if (!c) return null;
    const map = new Map(notes.map((n) => [n.id, n] as const));
    const items = c.noteIds
      .map((nid) => map.get(nid))
      .filter(Boolean) as Note[];
    return { ...c, notes: items } as const;
  };

  // Export/Import for collections
  const exportCollections = () => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    collections,
  });
  const importCollections = (input: unknown, replace = false) => {
    let payload: any = input as any;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = [];
      }
    }
    const arr = Array.isArray(payload?.collections)
      ? payload.collections
      : Array.isArray(payload)
        ? payload
        : [];
    const sanitize = (item: any): Collection | null => {
      if (!item || typeof item !== "object") return null;
      const title =
        typeof item.title === "string" ? item.title : "Untitled Collection";
      const description =
        typeof item.description === "string" ? item.description : "";
      const coverImageUrl =
        typeof item.coverImageUrl === "string" ? item.coverImageUrl : undefined;
      const tags = Array.isArray(item.tags)
        ? item.tags.filter((t: any) => typeof t === "string")
        : [];
      const category =
        typeof item.category === "string" ? item.category : undefined;
      const featured = Boolean(item.featured);
      const publishedAt =
        typeof item.publishedAt === "number"
          ? item.publishedAt
          : typeof item.publishedAt === "string"
            ? isNaN(Date.parse(item.publishedAt))
              ? undefined
              : Date.parse(item.publishedAt)
            : undefined;
      const createdAt =
        typeof item.createdAt === "number" ? item.createdAt : Date.now();
      const updatedAt =
        typeof item.updatedAt === "number" ? item.updatedAt : createdAt;
      const noteIds: string[] = Array.isArray(item.noteIds)
        ? item.noteIds.filter((n: any) => typeof n === "string")
        : [];
      const id =
        typeof item.id === "string" && item.id ? item.id : crypto.randomUUID();
      return {
        id,
        title,
        description,
        coverImageUrl,
        tags,
        category,
        featured,
        publishedAt,
        createdAt,
        updatedAt,
        noteIds,
      };
    };

    const sanitized = arr.map(sanitize).filter(Boolean) as Collection[];
    if (sanitized.length === 0) return false;

    if (replace) {
      setCollections(sanitized);
      return true;
    }

    // merge by title (case-insensitive) or id if present
    setCollections((prev) => {
      const key = (c: Collection) => (c.id || c.title).toLowerCase();
      const map = new Map<string, Collection>();
      for (const c of prev) map.set(key(c), c);
      for (const c of sanitized) if (!map.has(key(c))) map.set(key(c), c);
      return Array.from(map.values());
    });
    return true;
  };

  const stats = useMemo(
    () => ({
      total: collections.length,
      featured: collections.filter((c) => c.featured).length,
      published: collections.filter((c) => typeof c.publishedAt === "number")
        .length,
      drafts: collections.filter((c) => typeof c.publishedAt !== "number")
        .length,
    }),
    [collections]
  );

  return {
    collections,
    isLoaded,
    stats,
    createCollection,
    updateCollection,
    deleteCollection,
    clearAllCollections,
    addNoteToCollection,
    removeNoteFromCollection,
    reorderNotesInCollection,
    getCollection,
    getFeatured,
    getPublished,
    getDrafts,
    getByTag,
    withNotes,
    exportCollections,
    importCollections,
  } as const;
}
