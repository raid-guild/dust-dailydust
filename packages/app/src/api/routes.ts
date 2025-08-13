import { tableName } from "../common/namespace";
import { runSql, sql } from "./dustIndexer";
import type { Route, WaypointGroup, WaypointStep } from "./types";

const GROUP_TABLE = tableName("WaypointGroup");
const STEP_TABLE = tableName("WaypointStep");

export async function getRoutesForNote(noteId: string): Promise<Route[]> {
  const groupQuery = `SELECT "noteId","groupId","color","isPublic","name","description" FROM ${sql.ident(GROUP_TABLE)} WHERE "noteId" = ${sql.hex32(noteId)} ORDER BY "groupId" ASC`;
  const stepQuery = `SELECT "noteId","groupId","index","x","y","z","label" FROM ${sql.ident(STEP_TABLE)} WHERE "noteId" = ${sql.hex32(noteId)} ORDER BY "groupId" ASC, "index" ASC`;

  const [groupsRaw, stepsRaw] = await Promise.all([
    runSql<any>(groupQuery),
    runSql<any>(stepQuery),
  ]);

  const groups: WaypointGroup[] = groupsRaw.map((g) => ({
    noteId: g.noteId,
    groupId: Number(g.groupId),
    color: Number(g.color),
    isPublic: Boolean(g.isPublic),
    name: g.name ?? "",
    description: g.description ?? "",
  }));

  const steps: WaypointStep[] = stepsRaw.map((s) => ({
    noteId: s.noteId,
    groupId: Number(s.groupId),
    index: Number(s.index),
    x: Number(s.x),
    y: Number(s.y),
    z: Number(s.z),
    label: s.label ?? "",
  }));

  const byGroup = new Map<number, WaypointStep[]>();
  for (const st of steps) {
    const key = st.groupId;
    const arr = byGroup.get(key) ?? [];
    arr.push(st);
    byGroup.set(key, arr);
  }

  return groups.map(g => ({ group: g, steps: (byGroup.get(g.groupId) ?? []).sort((a,b)=>a.index-b.index) }));
}
