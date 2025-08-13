import { tableName } from "../common/namespace";
import { runSql, sql } from "./dustIndexer";
import type { OnchainNote, NotesListFilters, Pagination } from "./types";

const NOTE_TABLE = tableName("Note");
const GROUP_TABLE = tableName("WaypointGroup");
const STEP_TABLE = tableName("WaypointStep");

function mapNoteRow(r: any): OnchainNote {
  let tags: string[] = [];
  const rawTags = r.tags;
  if (Array.isArray(rawTags)) tags = rawTags.filter(Boolean);
  else if (typeof rawTags === "string") {
    try { tags = JSON.parse(rawTags); }
    catch { tags = rawTags.split(',').map((t: string) => t.trim()).filter(Boolean); }
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
  };
}

export async function listNotes(filters: NotesListFilters = {}, pager: Pagination = {}): Promise<OnchainNote[]> {
  const { owner, tags, dateFrom, dateTo, boostedOnly, search } = filters;
  const { limit = 100, offset = 0 } = pager;

  const where: string[] = [];
  if (owner) where.push(`"owner" = ${sql.str(owner)}`);
  if (typeof dateFrom === 'number') where.push(`"updatedAt" >= ${sql.num(dateFrom)}`);
  if (typeof dateTo === 'number') where.push(`"updatedAt" <= ${sql.num(dateTo)}`);
  if (boostedOnly) where.push(`"boostUntil" > ${sql.num(Date.now())}`);
  if (tags && tags.length) {
    // tags stored either as JSON array string or array; use string pattern match as fallback
    const ors = tags.map(t => `("tags" ILIKE '%"${t.replace(/"/g, '""')}"%' OR "tags" ILIKE '%${t.replace(/"/g, '""')}%')`);
    where.push(`(${ors.join(' OR ')})`);
  }
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    where.push(`(LOWER("title") LIKE ${sql.str('%' + s + '%')} OR LOWER("content") LIKE ${sql.str('%' + s + '%')})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const query = `SELECT "noteId","owner","createdAt","updatedAt","tipJar","boostUntil","totalTips","title","content","tags","headerImageUrl" FROM ${sql.ident(NOTE_TABLE)} ${whereSql} ORDER BY "updatedAt" DESC LIMIT ${limit} OFFSET ${offset}`;

  const rows = await runSql<any>(query);
  return rows.map(mapNoteRow);
}

export async function getNoteById(noteId: string): Promise<OnchainNote | null> {
  const query = `SELECT "noteId","owner","createdAt","updatedAt","tipJar","boostUntil","totalTips","title","content","tags","headerImageUrl" FROM ${sql.ident(NOTE_TABLE)} WHERE "noteId" = ${sql.hex32(noteId)} LIMIT 1`;
  const rows = await runSql<any>(query);
  return rows.length ? mapNoteRow(rows[0]) : null;
}

export async function listNotesNear(coords: { x: number; y: number; z: number; radius: number }, pager: Pagination = {}) {
  const { x, y, z, radius } = coords;
  const { limit = 100, offset = 0 } = pager;
  const q = `SELECT DISTINCT n."noteId", n."owner", n."createdAt", n."updatedAt", n."tipJar", n."boostUntil", n."totalTips", n."title", n."content", n."tags", n."headerImageUrl"
    FROM ${sql.ident(NOTE_TABLE)} n
    JOIN ${sql.ident(STEP_TABLE)} s ON s."noteId" = n."noteId"
    WHERE s."x" BETWEEN ${sql.num(x - radius)} AND ${sql.num(x + radius)}
      AND s."y" BETWEEN ${sql.num(y - radius)} AND ${sql.num(y + radius)}
      AND s."z" BETWEEN ${sql.num(z - radius)} AND ${sql.num(z + radius)}
    ORDER BY n."updatedAt" DESC
    LIMIT ${limit} OFFSET ${offset}`;
  const rows = await runSql<any>(q);
  return rows.map(mapNoteRow);
}

export async function listNotesByOwner(owner: string, pager: Pagination = {}) {
  return listNotes({ owner }, pager);
}

export async function listBoosted(limit = 100) {
  return listNotes({ boostedOnly: true }, { limit, offset: 0 });
}

export async function listTrending(limit = 100) {
  const q = `SELECT "noteId","owner","createdAt","updatedAt","tipJar","boostUntil","totalTips","title","content","tags","headerImageUrl"
    FROM ${sql.ident(NOTE_TABLE)}
    ORDER BY "totalTips" DESC, "updatedAt" DESC
    LIMIT ${limit}`;
  const rows = await runSql<any>(q);
  return rows.map(mapNoteRow);
}

// Basic route metadata: count of groups and steps per note
export async function listNotesWithRouteMeta(pager: Pagination = {}) {
  const { limit = 100, offset = 0 } = pager;
  const q = `SELECT n."noteId", n."owner", n."createdAt", n."updatedAt", n."tipJar", n."boostUntil", n."totalTips", n."title", n."content", n."tags", n."headerImageUrl",
    COALESCE(g.cnt, 0) AS groupsCount, COALESCE(st.cnt, 0) AS stepsCount
    FROM ${sql.ident(NOTE_TABLE)} n
    LEFT JOIN (
      SELECT "noteId", COUNT(DISTINCT "groupId") AS cnt
      FROM ${sql.ident(GROUP_TABLE)} GROUP BY "noteId"
    ) g ON g."noteId" = n."noteId"
    LEFT JOIN (
      SELECT "noteId", COUNT(*) AS cnt
      FROM ${sql.ident(STEP_TABLE)} GROUP BY "noteId"
    ) st ON st."noteId" = n."noteId"
    ORDER BY n."updatedAt" DESC LIMIT ${limit} OFFSET ${offset}`;
  const rows = await runSql<any>(q);
  return rows.map(r => ({ ...mapNoteRow(r), groupsCount: Number(r.groupsCount ?? 0), stepsCount: Number(r.stepsCount ?? 0) }));
}
