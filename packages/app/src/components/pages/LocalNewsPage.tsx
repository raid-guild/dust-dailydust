import { useEffect, useMemo, useState } from "react";
import { useNotesNear } from "../../api/hooks/useNotesQuery";
import { useWaypoints } from "../../hooks/useWaypoints";
import { usePlayerPositionQuery } from "../../common/usePlayerPositionQuery";

export function LocalNewsPage() {
  const { data: playerPos } = usePlayerPositionQuery();
  const { waypoints } = useWaypoints();

  const [coordsInput, setCoordsInput] = useState("");
  const [position, setPosition] = useState<{ x: number; y: number; z: number } | null>(null);

  // Initialize from player position once
  useEffect(() => {
    if (playerPos && !position) {
      setPosition(playerPos);
      setCoordsInput(`${playerPos.x} ${playerPos.y} ${playerPos.z}`);
    }
  }, [playerPos, position]);

  const parseCoords = (s: string): { x: number; y: number; z: number } | null => {
    const parts = s.trim().split(/\s+/);
    if (parts.length < 3) return null;
    const [sx, sy, sz] = parts;
    const x = Number(sx);
    const y = Number(sy);
    const z = Number(sz);
    if ([x, y, z].some((n) => !Number.isFinite(n))) return null;
    return { x: Math.trunc(x), y: Math.trunc(y), z: Math.trunc(z) };
  };

  const setFromInput = () => {
    const c = parseCoords(coordsInput);
    if (c) setPosition(c);
  };

  const setFromWaypoint = (wp: { x?: number; y?: number; z?: number; name: string }) => {
    if (typeof wp.x === "number" && typeof wp.y === "number" && typeof wp.z === "number") {
      const c = { x: Math.trunc(wp.x), y: Math.trunc(wp.y), z: Math.trunc(wp.z) };
      setPosition(c);
      setCoordsInput(`${c.x} ${c.y} ${c.z}`);
    }
  };

  const { data: notes, isLoading, error } = useNotesNear(
    position ? { ...position, radius: 100, limit: 100, offset: 0 } : undefined
  );

  const waypointChips = useMemo(
    () =>
      waypoints
        .filter((w) => typeof w.x === "number" && typeof w.y === "number" && typeof w.z === "number")
        .slice(0, 12),
    [waypoints]
  );

  return (
    <section className="rounded-xl bg-panel border border-neutral-200 dark:border-neutral-800 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <input
          placeholder="x y z"
          value={coordsInput}
          onChange={(e) => setCoordsInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setFromInput();
          }}
          className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel"
        />
        <button onClick={setFromInput} className="px-3 py-2 bg-neutral-900 text-white rounded font-accent">
          Set Position
        </button>
        <div className="flex gap-2 flex-wrap ml-auto">
          {waypointChips.map((w) => (
            <button
              key={w.id}
              onClick={() => setFromWaypoint(w)}
              title={`${w.name} (${w.x} ${w.y} ${w.z})`}
              className="px-3 py-1 text-xs rounded-full bg-neutral-100 border border-neutral-300 dark:border-neutral-800 font-accent hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              {w.name} ({w.x} {w.y} {w.z})
            </button>
          ))}
        </div>
      </div>
      <div className="my-5 border-t border-neutral-300 dark:border-neutral-800" />

      {!position && (
        <div className="text-sm text-neutral-600">
          Waiting for player position… You can also enter coordinates above.
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600">Failed to load local notes: {(error as any)?.message ?? String(error)}</div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {isLoading && [1, 2, 3, 4].map((i) => (
          <article key={`skeleton-${i}`} className="border-t pt-4 animate-pulse">
            <div className="h-3 w-24 bg-neutral-200 rounded mb-2" />
            <div className="h-6 w-3/4 bg-neutral-200 rounded mb-2" />
            <div className="h-4 w-full bg-neutral-200 rounded" />
          </article>
        ))}

        {!isLoading && notes && notes.length === 0 && position && (
          <div className="text-sm text-neutral-600">
            No notes within 100 blocks of {position.x} {position.y} {position.z}.
          </div>
        )}

        {!isLoading && notes?.map((n) => (
          <article key={n.id} className="border-t pt-4">
            <div className="uppercase tracking-[.2em] text-xs text-neutral-500 font-accent">Local</div>
            <h3 className="font-heading text-2xl">{n.title || "Untitled"}</h3>
            <p className="text-text-secondary line-clamp-2">
              {n.content?.slice(0, 200) || ""}
            </p>
            {position ? (
              <p className="mt-2 text-sm text-neutral-600">
                Within 100 blocks • Coords: {position.x} {position.y} {position.z}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
