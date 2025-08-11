import { useEffect, useMemo, useState, useCallback } from "react";
import { worldAddress } from "../common/worldAddress";

export interface PublishedNoteUI {
  id: string;
  title: string;
  content: string;
  tags: string[];
  owner: string;
  tipJar: string | null;
  createdAt: number;
  updatedAt: number;
  boostUntil: number;
  totalTips: number;
  headerImageUrl: string;
}

const INDEXER_Q_URL = "https://indexer.mud.redstonechain.com/q";
const NAMESPACE = "rg_dd_ab564f";
const TABLE = `${NAMESPACE}__Note`;

export function usePublishedNotes(params?: { limit?: number; offset?: number }) {
  const { limit = 200, offset = 0 } = params ?? {};
  const [notes, setNotes] = useState<PublishedNoteUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sql = useMemo(() => {
    return `SELECT "noteId","owner","createdAt","updatedAt","tipJar","boostUntil","totalTips","title","content","tags","headerImageUrl" FROM "${TABLE}" ORDER BY "updatedAt" DESC LIMIT ${limit} OFFSET ${offset}`;
  }, [limit, offset]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(INDEXER_Q_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            query: sql,
            address: worldAddress,
          },
        ]),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const rows: any[] = Array.isArray(data) ? (data[0]?.rows ?? []) : (data?.rows ?? []);
      const mapped = rows.map((r: any) => {
        const rawTags = r.tags;
        let tags: string[] = [];
        if (Array.isArray(rawTags)) tags = rawTags.filter(Boolean);
        else if (typeof rawTags === "string") {
          try {
            tags = JSON.parse(rawTags);
          } catch {
            tags = rawTags.split(",").map((t: string) => t.trim()).filter(Boolean);
          }
        }
        return {
          id: r.noteId as string,
          owner: (r.owner as string) ?? "0x0000000000000000000000000000000000000000",
          createdAt: Number(r.createdAt ?? 0),
          updatedAt: Number(r.updatedAt ?? 0),
          tipJar: (r.tipJar as string) ?? null,
          boostUntil: Number(r.boostUntil ?? 0),
          totalTips: Number(r.totalTips ?? 0),
          title: (r.title as string) ?? "",
          content: (r.content as string) ?? "",
          tags,
          headerImageUrl: (r.headerImageUrl as string) ?? "",
        } as PublishedNoteUI;
      });
      setNotes(mapped);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [sql]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { notes, loading, error, refetch };
}
