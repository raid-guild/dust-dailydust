import { useEffect, useState, useCallback } from "react";
import type { OnchainNote } from "../api/types";
import * as notesApi from "../api/notes";

export interface PublishedNoteUI extends OnchainNote {}

export function usePublishedNotes(params?: { limit?: number; offset?: number }) {
  const { limit = 200, offset = 0 } = params ?? {};
  const [notes, setNotes] = useState<PublishedNoteUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notesApi.listNotes({}, { limit, offset });
      setNotes(data);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { notes, loading, error, refetch };
}
