import { useQuery, keepPreviousData } from "@tanstack/react-query";
import * as notesApi from "../notes";
import type { NotesListFilters, Pagination } from "../types";

export function useNotesList(filters: NotesListFilters = {}, pager: Pagination = {}) {
  const { limit = 100, offset = 0 } = pager;
  return useQuery({
    queryKey: ["notes", filters, { limit, offset }],
    queryFn: () => notesApi.listNotes(filters, { limit, offset }),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useNote(noteId?: string) {
  return useQuery({
    queryKey: ["note", noteId],
    queryFn: noteId ? () => notesApi.getNoteById(noteId) : undefined,
    enabled: Boolean(noteId),
    staleTime: 30_000,
  });
}

export function useNotesNear(params?: { x: number; y: number; z: number; radius: number; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["notes", "near", params],
    queryFn: params ? () => notesApi.listNotesNear(params, { limit: params.limit, offset: params.offset }) : undefined,
    enabled: Boolean(params),
    staleTime: 5_000,
  });
}

export function useBoostedNotes(limit = 100) {
  return useQuery({
    queryKey: ["notes", "boosted", limit],
    queryFn: () => notesApi.listBoosted(limit),
    staleTime: 10_000,
  });
}

export function useTrendingNotes(limit = 100) {
  return useQuery({
    queryKey: ["notes", "trending", limit],
    queryFn: () => notesApi.listTrending(limit),
    staleTime: 10_000,
  });
}
