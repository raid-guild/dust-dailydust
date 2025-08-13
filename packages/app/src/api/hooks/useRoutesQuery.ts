import { useQuery } from "@tanstack/react-query";
import * as routesApi from "../routes";

export function useRoutesForNote(noteId?: string) {
  return useQuery({
    queryKey: ["routes", noteId],
    queryFn: noteId ? () => routesApi.getRoutesForNote(noteId) : undefined,
    enabled: Boolean(noteId),
    staleTime: 30_000,
  });
}
