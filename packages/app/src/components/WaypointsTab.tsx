import { useState } from "react";
import { useDustClient } from "../common/useDustClient";
import { useWaypoints, type Waypoint } from "../hooks/useWaypoints";
import { encodeBlock } from "@dust/world/internal";

export function WaypointsTab() {
  const { data: dustClient } = useDustClient();
  const { waypoints, addWaypoint, deleteWaypoint, clearAllWaypoints, importWaypoints } = useWaypoints();
  
  // New filters/search state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [nearMe, setNearMe] = useState<boolean>(false);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number; z: number } | null>(null);

  const [newWaypointName, setNewWaypointName] = useState("");
  const [newWaypointDescription, setNewWaypointDescription] = useState("");
  const [newWaypointEntityId, setNewWaypointEntityId] = useState("");
  const [newWaypointCategory, setNewWaypointCategory] = useState("General");
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showFeedback = (message: string, type: "success" | "error" | "info" = "success") => {
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
      if (result && typeof result === "object" && "x" in result && "y" in result && "z" in result) {
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

  const distance = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  const filtered = waypoints.filter((w) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [w.name, w.description, w.category].some(v => (v || "").toLowerCase().includes(q)) || w.entityId.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "All" || w.category === categoryFilter;
    let matchesProximity = true;
    if (nearMe) {
      if (!playerPos) matchesProximity = false;
      else if (typeof w.x === "number" && typeof w.y === "number" && typeof w.z === "number") {
        matchesProximity = distance(playerPos, { x: w.x, y: w.y, z: w.z }) <= 200;
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
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
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
        if (ok) showFeedback(replace ? "Waypoints replaced" : "Waypoints imported", "success");
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

      if (result && typeof result === "object" && "x" in result && "y" in result && "z" in result) {
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

        showFeedback(`Waypoint "${newWaypointName}" created successfully!`, "success");
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

    showFeedback(`Waypoint "${newWaypointName}" created successfully!`, "success");
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
    
    if (confirm(`Are you sure you want to delete all ${waypoints.length} waypoints? This cannot be undone.`)) {
      clearAllWaypoints();
      showFeedback("All waypoints cleared", "success");
    }
  };

  // Build category options from data
  const categories = Array.from(new Set(["All", ...waypoints.map(w => w.category || "General")])) as string[];

  return (
    <div style={{ padding: "20px" }}>
      {feedback && (
        <div
          style={{
            padding: "10px",
            marginBottom: "20px",
            borderRadius: "5px",
            backgroundColor: feedback.type === "success" ? "#d4edda" : feedback.type === "error" ? "#f8d7da" : "#d1ecf1",
            color: feedback.type === "success" ? "#155724" : feedback.type === "error" ? "#721c24" : "#0c5460",
            border: `1px solid ${feedback.type === "success" ? "#c3e6cb" : feedback.type === "error" ? "#f5c6cb" : "#bee5eb"}`,
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 180px 220px 120px", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search by name, description, category, entity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 8, borderRadius: 4, border: "1px solid #444", background: "#2a2a2a", color: "#fff" }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: 8, borderRadius: 4, border: "1px solid #444", background: "#2a2a2a", color: "#fff" }}
        >
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={nearMe}
              onChange={async (e) => { setNearMe(e.target.checked); if (e.target.checked) await ensurePlayerPosIfNeeded(); }}
            />
            <span>Near me (≤ 200)</span>
          </label>
          <button
            onClick={fetchPlayerPosition}
            style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #666", background: "#444", color: "#fff" }}
          >
            📍 Position
          </button>
        </div>
        <div style={{ color: "#aaa", fontSize: 12, textAlign: "right" }}>
          {playerPos ? `Pos: ${playerPos.x}, ${playerPos.y}, ${playerPos.z}` : "Pos: unknown"}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={doExport} style={{ padding: "6px 12px", background: "#444", color: "#fff", borderRadius: 4, border: "1px solid #666" }}>⬇️ Export</button>
          <button onClick={() => doImport(false)} style={{ padding: "6px 12px", background: "#444", color: "#fff", borderRadius: 4, border: "1px solid #666" }}>⬆️ Import (merge)</button>
          <button onClick={() => doImport(true)} style={{ padding: "6px 12px", background: "#b23b3b", color: "#fff", borderRadius: 4, border: "1px solid #8a2b2b" }}>⬆️ Import (replace)</button>
        </div>
        {waypoints.length > 0 && (
          <button
            onClick={handleClearAll}
            style={{
              padding: "6px 12px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.8em",
            }}
          >
            🧹 Clear All
          </button>
        )}
      </div>

      <div style={{ marginBottom: "30px" }}>
        <h3 style={{ color: "#4CAF50", marginBottom: "15px" }}>📍 Create New Waypoint</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px" }}>
          <input
            type="text"
            placeholder="Waypoint name"
            value={newWaypointName}
            onChange={(e) => setNewWaypointName(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              backgroundColor: "#2a2a2a",
              color: "white",
            }}
          />
          
          <input
            type="text"
            placeholder="Entity ID (will be auto-filled when you click button below)"
            value={newWaypointEntityId}
            onChange={(e) => setNewWaypointEntityId(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              backgroundColor: "#2a2a2a",
              color: "white",
            }}
          />
          
          <select
            value={newWaypointCategory}
            onChange={(e) => setNewWaypointCategory(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              backgroundColor: "#2a2a2a",
              color: "white",
            }}
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
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              backgroundColor: "#2a2a2a",
              color: "white",
              resize: "vertical",
            }}
          />
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={async () => { await setWaypointToCurrent(); await ensurePlayerPosIfNeeded(); }}
              disabled={!newWaypointName.trim()}
              style={{
                padding: "10px 20px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: !newWaypointName.trim() ? "not-allowed" : "pointer",
                opacity: !newWaypointName.trim() ? 0.6 : 1,
                flex: 1,
              }}
            >
              📍 Create at Current Position
            </button>
            
            <button
              onClick={createWaypointManually}
              disabled={!newWaypointName.trim() || !newWaypointEntityId.trim()}
              style={{
                padding: "10px 20px",
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: (!newWaypointName.trim() || !newWaypointEntityId.trim()) ? "not-allowed" : "pointer",
                opacity: (!newWaypointName.trim() || !newWaypointEntityId.trim()) ? 0.6 : 1,
                flex: 1,
              }}
            >
              ➕ Create with Entity ID
            </button>
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h3 style={{ color: "#4CAF50", margin: 0 }}>🗺️ Saved Waypoints ({filtered.length}/{waypoints.length})</h3>
          {waypoints.length > 0 && (
            <button
              onClick={handleClearAll}
              style={{
                padding: "6px 12px",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.8em",
              }}
            >
              🧹 Clear All
            </button>
          )}
        </div>
        
        {filtered.length === 0 ? (
          <p style={{ color: "#888", fontStyle: "italic" }}>No waypoints match your filters.</p>
        ) : (
          <div style={{ display: "grid", gap: "15px" }}>
            {filtered.map((waypoint) => (
              <div
                key={waypoint.id}
                style={{
                  border: "1px solid #444",
                  borderRadius: "8px",
                  padding: "15px",
                  backgroundColor: "#2a2a2a",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <h4 style={{ color: "#4CAF50", margin: "0 0 5px 0" }}>
                      {waypoint.name}
                    </h4>
                    <p style={{ color: "#ccc", margin: "0", fontSize: "0.9em" }}>
                      🆔 {waypoint.entityId.substring(0, 10)}...
                    </p>
                    <p style={{ color: "#888", margin: "5px 0 0 0", fontSize: "0.8em" }}>
                      📂 {waypoint.category}
                    </p>
                    {typeof waypoint.x === "number" && typeof waypoint.y === "number" && typeof waypoint.z === "number" && (
                      <p style={{ color: "#888", margin: "5px 0 0 0", fontSize: "0.8em" }}>
                        📍 {waypoint.x}, {waypoint.y}, {waypoint.z}
                        {nearMe && playerPos && (
                          <>
                            {" "}
                            <span style={{ color: "#aaa" }}>
                              (d ≈ {Math.round(distance(playerPos, { x: waypoint.x, y: waypoint.y, z: waypoint.z }))})
                            </span>
                          </>
                        )}
                      </p>
                    )}
                    {waypoint.description && (
                      <p style={{ color: "#aaa", margin: "5px 0 0 0", fontSize: "0.9em" }}>
                        {waypoint.description}
                      </p>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setWaypointInGame(waypoint)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#2196F3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.8em",
                      }}
                    >
                      🎯 Set
                    </button>
                    
                    <button
                      onClick={() => handleDeleteWaypoint(waypoint)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#f44336",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.8em",
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
                
                <div style={{ fontSize: "0.8em", color: "#666" }}>
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
