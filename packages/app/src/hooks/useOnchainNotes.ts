import { useEffect, useMemo, useState } from "react";
import { worldAddress } from "../common/worldAddress";
import { tableName } from "../common/namespace";

export interface OnchainNote {
  id: string; // bytes32 hex
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
const TABLE = tableName("Note");

async function fetchOnchainNotes(limit = 100, offset = 0): Promise<OnchainNote[]> {
  const sql = `SELECT "noteId","owner","createdAt","updatedAt","tipJar","boostUntil","totalTips","title","content","tags","headerImageUrl" FROM "${TABLE}" ORDER BY "updatedAt" DESC LIMIT ${limit} OFFSET ${offset}`;

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
  // Expected shape: { block_height: number, result: [ [ columns[], row1[], row2[], ... ] ] }
  const result = (data?.result ?? []) as any[];
  if (!Array.isArray(result) || result.length === 0) return [];
  const first = result[0];
  if (!Array.isArray(first) || first.length === 0) return [];
  const [columns, ...rows] = first as [string[], ...any[]];

  return rows.map((row: any[]) => {
    const r: Record<string, any> = {};
    (columns as string[]).forEach((col: string, i: number) => {
      r[col] = row[i];
    });

    const rawTags = r.tags;
    let tags: string[] = [];
    if (Array.isArray(rawTags)) tags = rawTags.filter(Boolean);
    else if (typeof rawTags === "string") {
      try {
        tags = JSON.parse(rawTags);
      } catch {
        tags = rawTags.split(',').map((t: string) => t.trim()).filter(Boolean);
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
    } as OnchainNote;
  });
}

export function useOnchainNotes(params?: { limit?: number; offset?: number }) {
  const [notes, setNotes] = useState<OnchainNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { limit = 100, offset = 0 } = params ?? {};

  const refetch = useMemo(() => async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOnchainNotes(limit, offset);
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
