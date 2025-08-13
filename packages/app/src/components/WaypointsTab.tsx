import { encodeBlock } from "@dust/world/internal";
import { useState } from "react";

import { useDustClient } from "../common/useDustClient";
import { useWaypoints, type Waypoint } from "../hooks/useWaypoints";

export function WaypointsTab() {
  const { data: dustClient } = useDustClient();
  const {
    waypoints,
    addWaypoint,
    deleteWaypoint,
    clearAllWaypoints,
    importWaypoints,
  } = useWaypoints();

  // New filters/search state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [nearMe, setNearMe] = useState<boolean>(false);
  const [playerPos, setPlayerPos] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);

  const [newWaypointName, setNewWaypointName] = useState("");
  const [newWaypointDescription, setNewWaypointDescription] = useState("");
  const [newWaypointEntityId, setNewWaypointEntityId] = useState("");
  const [newWaypointCategory, setNewWaypointCategory] = useState("General");
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const bannerClass: Record<NonNullable<typeof feedback>["type"], string> = {
    success: "bg-success/10 text-success border border-success/30",
    error: "bg-danger/10 text-danger border border-danger/30",
    info: "bg-info/10 text-info border border-info/30",
  } as const;

  const showFeedback = (
    message: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchPlayerPosition = async () => {
    if (!dustClient) {
      showFeedback("DUST client not connected", "error");
      return null;
    }
    try {
      const result = await dustClient.provider.request({
        method: "getPlayerPosition",
        params: { entity: dustClient.appContext.userAddress },
      });
      if (
        result &&
        typeof result === "object" &&
        "x" in result &&
        "y" in result &&
        "z" in result
      ) {
        const { x, y, z } = result as { x: number; y: number; z: number };
        const roundedX = x < 0 ? Math.floor(x) : Math.round(x);
        const roundedY = y < 0 ? Math.floor(y) : Math.round(y);
        const roundedZ = z < 0 ? Math.floor(z) : Math.round(z);
        const pos = { x: roundedX, y: roundedY, z: roundedZ };
        setPlayerPos(pos);
        return pos;
      }
      showFeedback("Failed to get current position", "error");
      return null;
    } catch (error) {
      console.error("Error getting current position:", error);
      showFeedback("Failed to get current position", "error");
      return null;
    }
  };

  const ensurePlayerPosIfNeeded = async () => {
    if (nearMe && !playerPos) {
      await fetchPlayerPosition();
    }
  };

  const distance = (
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number }
  ) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  const filtered = waypoints.filter((w) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      [w.name, w.description, w.category].some((v) =>
        (v || "").toLowerCase().includes(q)
      ) ||
      w.entityId.toLowerCase().includes(q);
    const matchesCategory =
      categoryFilter === "All" || w.category === categoryFilter;
    let matchesProximity = true;
    if (nearMe) {
      if (!playerPos) matchesProximity = false;
      else if (
        typeof w.x === "number" &&
        typeof w.y === "number" &&
        typeof w.z === "number"
      ) {
        matchesProximity =
          distance(playerPos, { x: w.x, y: w.y, z: w.z }) <= 200;
      } else {
        matchesProximity = false; // Unknown coords; cannot check proximity
      }
    }
    return matchesSearch && matchesCategory && matchesProximity;
  });

  const doExport = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      waypoints,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dailydust-waypoints-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showFeedback("Waypoints exported", "success");
  };

  const doImport = async (replace = false) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const ok = importWaypoints(json?.waypoints ? json : json, replace);
        if (ok)
          showFeedback(
            replace ? "Waypoints replaced" : "Waypoints imported",
            "success"
          );
        else showFeedback("No valid waypoints found in file", "error");
      } catch (e) {
        console.error("Import error", e);
        showFeedback("Failed to import waypoints", "error");
      }
    };
    input.click();
  };

  // Set waypoint to player's current position
  const setWaypointToCurrent = async () => {
    if (!dustClient) {
      showFeedback("DUST client not connected", "error");
      return;
    }

    if (!newWaypointName.trim()) {
      showFeedback("Please enter a waypoint name", "error");
      return;
    }

    try {
      const result = await dustClient.provider.request({
        method: "getPlayerPosition",
        params: { entity: dustClient.appContext.userAddress },
      });

      if (
        result &&
        typeof result === "object" &&
        "x" in result &&
        "y" in result &&
        "z" in result
      ) {
        const { x, y, z } = result as { x: number; y: number; z: number };

        // Round coordinates to integers for block position
        const roundedX = x < 0 ? Math.floor(x) : Math.round(x);
        const roundedY = y < 0 ? Math.floor(y) - 1 : Math.round(y) - 1; // -1 for block below player
        const roundedZ = z < 0 ? Math.floor(z) : Math.round(z);

        // Use encodeBlock to generate entity ID from coordinates
        const entityId = encodeBlock([roundedX, roundedY, roundedZ]);

        // Update the form with the generated entity ID
        setNewWaypointEntityId(entityId);

        addWaypoint({
          name: newWaypointName,
          entityId,
          description: newWaypointDescription,
          category: newWaypointCategory,
          x: roundedX,
          y: roundedY,
          z: roundedZ,
        });

        showFeedback(
          `Waypoint "${newWaypointName}" created successfully!`,
          "success"
        );
        setNewWaypointName("");
        setNewWaypointDescription("");
        setNewWaypointEntityId("");
      } else {
        showFeedback("Failed to get current position", "error");
      }
    } catch (error) {
      console.error("Error getting current position:", error);
      showFeedback("Failed to get current position", "error");
    }
  };

  // Set waypoint using dustkit
  const setWaypointInGame = async (waypoint: Waypoint) => {
    if (!dustClient) {
      showFeedback("DUST client not connected", "error");
      return;
    }

    try {
      await dustClient.provider.request({
        method: "setWaypoint",
        params: {
          entity: waypoint.entityId as `0x${string}`,
          label: waypoint.name,
        },
      });
      showFeedback(`Waypoint "${waypoint.name}" set in game!`, "success");
    } catch (error) {
      console.error("Error setting waypoint:", error);
      showFeedback("Failed to set waypoint in game", "error");
    }
  };

  // Create waypoint manually with entity ID
  const createWaypointManually = () => {
    if (!newWaypointName.trim()) {
      showFeedback("Please enter a waypoint name", "error");
      return;
    }

    if (!newWaypointEntityId.trim()) {
      showFeedback("Please enter an entity ID", "error");
      return;
    }

    addWaypoint({
      name: newWaypointName,
      entityId: newWaypointEntityId,
      description: newWaypointDescription,
      category: newWaypointCategory,
    });

    showFeedback(
      `Waypoint "${newWaypointName}" created successfully!`,
      "success"
    );
    setNewWaypointName("");
    setNewWaypointDescription("");
    setNewWaypointEntityId("");
  };

  const handleDeleteWaypoint = (waypoint: Waypoint) => {
    deleteWaypoint(waypoint.id);
    showFeedback(`Waypoint "${waypoint.name}" deleted`, "success");
  };

  const handleClearAll = () => {
    if (waypoints.length === 0) return;

    if (
      confirm(
        `Are you sure you want to delete all ${waypoints.length} waypoints? This cannot be undone.`
      )
    ) {
      clearAllWaypoints();
      showFeedback("All waypoints cleared", "success");
    }
  };

  // Build category options from data
  const categories = Array.from(
    new Set(["All", ...waypoints.map((w) => w.category || "General")])
  ) as string[];

  return (
    <div className="p-5">
      {feedback && (
        <div className={`p-3 mb-4 rounded ${bannerClass[feedback.type]}`}>
          {feedback.message}
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_220px_120px] gap-2 items-center mb-3">
        <input
          type="text"
          placeholder="Search by name, description, category, entity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel text-text-primary placeholder-neutral-400"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel text-text-primary"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-text-primary">
            <input
              type="checkbox"
              checked={nearMe}
              onChange={async (e) => {
                setNearMe(e.target.checked);
                if (e.target.checked) await ensurePlayerPosIfNeeded();
              }}
            />
            <span>Near me (≤ 200)</span>
          </label>
          <button
            onClick={fetchPlayerPosition}
            className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-800 bg-neutral-100 hover:bg-neutral-200 text-text-primary"
          >
            📍 Position
          </button>
        </div>
        <div className="text-right text-xs text-text-secondary">
          {playerPos
            ? `Pos: ${playerPos.x}, ${playerPos.y}, ${playerPos.z}`
            : "Pos: unknown"}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          <button
            onClick={doExport}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-text-primary rounded border border-neutral-300 dark:border-neutral-800"
          >
            ⬇️ Export
          </button>
          <button
            onClick={() => doImport(false)}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-text-primary rounded border border-neutral-300 dark:border-neutral-800"
          >
            ⬆️ Import (merge)
          </button>
          <button
            onClick={() => doImport(true)}
            className="px-3 py-1.5 bg-danger text-white rounded border border-danger/60"
          >
            ⬆️ Import (replace)
          </button>
        </div>
        {waypoints.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 bg-danger text-white rounded text-xs"
          >
            🧹 Clear All
          </button>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-brand-600 mb-3 font-medium">
          📍 Create New Waypoint
        </h3>

        <div className="flex flex-col gap-2 max-w-md">
          <input
            type="text"
            placeholder="Waypoint name"
            value={newWaypointName}
            onChange={(e) => setNewWaypointName(e.target.value)}
            className="px-2 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel text-text-primary placeholder-neutral-400"
          />

          <input
            type="text"
            placeholder="Entity ID (will be auto-filled when you click button below)"
            value={newWaypointEntityId}
            onChange={(e) => setNewWaypointEntityId(e.target.value)}
            className="px-2 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel text-text-primary placeholder-neutral-400"
          />

          <select
            value={newWaypointCategory}
            onChange={(e) => setNewWaypointCategory(e.target.value)}
            className="px-2 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel text-text-primary"
          >
            <option value="General">General</option>
            <option value="Mining">Mining</option>
            <option value="Resources">Resources</option>
            <option value="Base">Base</option>
            <option value="Trading">Trading</option>
            <option value="Custom">Custom</option>
          </select>

          <textarea
            placeholder="Description (optional)"
            value={newWaypointDescription}
            onChange={(e) => setNewWaypointDescription(e.target.value)}
            rows={3}
            className="px-2 py-2 rounded border border-neutral-300 dark:border-neutral-800 bg-panel text-text-primary placeholder-neutral-400 resize-y"
          />

          <div className="flex gap-2">
            <button
              onClick={async () => {
                await setWaypointToCurrent();
                await ensurePlayerPosIfNeeded();
              }}
              disabled={!newWaypointName.trim()}
              className="flex-1 px-4 py-2 rounded bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              📍 Create at Current Position
            </button>

            <button
              onClick={createWaypointManually}
              disabled={!newWaypointName.trim() || !newWaypointEntityId.trim()}
              className="flex-1 px-4 py-2 rounded bg-info hover:brightness-110 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              ➕ Create with Entity ID
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-brand-600 m-0 font-medium">
            🗺️ Saved Waypoints ({filtered.length}/{waypoints.length})
          </h3>
          {waypoints.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-danger text-white rounded text-xs"
            >
              🧹 Clear All
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-text-secondary italic">
            No waypoints match your filters.
          </p>
        ) : (
          <div className="grid gap-3">
            {filtered.map((waypoint) => (
              <div
                key={waypoint.id}
                className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 bg-panel"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-brand-600 font-semibold m-0 mb-1">
                      {waypoint.name}
                    </h4>
                    <p className="text-xs text-text-secondary m-0">
                      🆔 {waypoint.entityId.substring(0, 10)}...
                    </p>
                    <p className="text-xs text-neutral-500 m-0 mt-1">
                      📂 {waypoint.category}
                    </p>
                    {typeof waypoint.x === "number" &&
                      typeof waypoint.y === "number" &&
                      typeof waypoint.z === "number" && (
                        <p className="text-xs text-neutral-500 m-0 mt-1">
                          📍 {waypoint.x}, {waypoint.y}, {waypoint.z}
                          {nearMe && playerPos && (
                            <>
                              {" "}
                              <span className="text-neutral-400">
                                (d ≈{" "}
                                {Math.round(
                                  distance(playerPos, {
                                    x: waypoint.x,
                                    y: waypoint.y,
                                    z: waypoint.z,
                                  })
                                )}
                                )
                              </span>
                            </>
                          )}
                        </p>
                      )}
                    {waypoint.description && (
                      <p className="text-sm text-text-secondary m-0 mt-1">
                        {waypoint.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setWaypointInGame(waypoint)}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs"
                    >
                      🎯 Set
                    </button>

                    <button
                      onClick={() => handleDeleteWaypoint(waypoint)}
                      className="px-3 py-1.5 bg-danger hover:brightness-110 text-white rounded text-xs"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                <div className="text-xs text-neutral-500">
                  Created: {new Date(waypoint.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
