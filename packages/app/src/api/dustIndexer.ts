import { worldAddress } from "../common/worldAddress";

const INDEXER_Q_URL = "https://indexer.mud.redstonechain.com/q";

export type SqlQuery = {
  query: string;
  address?: string; // defaults to worldAddress
};

// Centralized low-level indexer client
export async function runSql<T = unknown>(query: string, address = worldAddress): Promise<T[]> {
  const res = await fetch(INDEXER_Q_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ query, address }]),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const result = (data?.result ?? []) as any[];
  if (!Array.isArray(result) || result.length === 0) return [] as T[];
  const first = result[0];
  if (!Array.isArray(first) || first.length === 0) return [] as T[];
  const [columns, ...rows] = first as [string[], ...any[]];

  return rows.map((row: any[]) => {
    const r: Record<string, any> = {};
    (columns as string[]).forEach((col: string, i: number) => {
      r[col] = row[i];
    });
    return r as T;
  });
}

// Helpers to safely embed values in SQL
export const sql = {
  ident: (name: string) => '"' + name.replace(/"/g, '""') + '"',
  str: (v: string) => "'" + v.replace(/'/g, "''") + "'",
  num: (v: number) => String(Math.trunc(v)),
  bool: (b: boolean) => (b ? "TRUE" : "FALSE"),
  hex32: (h: string) => sql.str(h.toLowerCase()),
  csvStr: (arr: string[]) => arr.map(sql.str).join(","),
};
