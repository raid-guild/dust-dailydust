import { useEffect, useMemo, useState } from "react";
import type { OnchainNote } from "../api/types";
import * as notesApi from "../api/notes";

export function useOnchainNotes(params?: { limit?: number; offset?: number }) {
  const [notes, setNotes] = useState<OnchainNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { limit = 100, offset = 0 } = params ?? {};

  const refetch = useMemo(() => async () => {
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
