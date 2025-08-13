import { encodeBlock } from "@dust/world/internal";
import { useEffect, useState } from "react";

export interface Waypoint {
  id: string;
  name: string;
  entityId: string;
  description: string;
  category: string;
  createdAt: number;
  // Optional coordinates to enable proximity filtering
  x?: number;
  y?: number;
  z?: number;
}

const WAYPOINTS_STORAGE_KEY = "dailydust-waypoints";
const OLD_WAYPOINTS_STORAGE_KEY = "dust-waypoints";

// Generate the default waypoints for first-time users
function getDefaultWaypoints(): Waypoint[] {
  const defs = [
    {
      id: "default-raidguild-forge",
      name: "Raidguild Forge",
      coords: [1272, 154, -930] as const,
      description: "The main RaidGuild Forge Hall - a central hub for crafting and community",
      category: "Base",
    },
    {
      id: "default-arena-eternal",
      name: "Arena Eternal",
      coords: [-22, 75, 101] as const,
      description: "Community PvP arena",
      category: "Arena",
    },
    {
      id: "default-perm-town-market",
      name: "Perm Town Market",
      coords: [609, 149, -1509] as const,
      description: "Trading hub in Perm Town",
      category: "Trading",
    },
    {
      id: "default-baby-yoda",
      name: "Baby Yoda",
      coords: [0, 0, 0] as const,
      description: "Baby Yoda landmark",
      category: "Landmark",
    },
    {
      id: "default-ethereum-monument",
      name: "Ethereum Monument",
      coords: [57, 63, -87] as const,
      description: "Ethereum monument",
      category: "Monument",
    },
  ];

  const createdAt = Date.now();
  return defs.map(({ id, name, coords, description, category }) => {
    const [x, y, z] = coords;
    return {
      id,
      name,
      entityId: encodeBlock([x, y, z]),
      description,
      category,
      createdAt,
      x,
      y,
      z,
    } satisfies Waypoint;
  });
}

export function useWaypoints() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load waypoints from localStorage on mount
  useEffect(() => {
    try {
      let stored = localStorage.getItem(WAYPOINTS_STORAGE_KEY);
      let migrated = false;
      if (!stored) {
        const old = localStorage.getItem(OLD_WAYPOINTS_STORAGE_KEY);
        if (old) {
          stored = old;
          migrated = true;
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log("📂 Loading waypoints from localStorage:", parsed.length);
          setWaypoints(parsed);
          if (migrated) {
            try {
              localStorage.setItem(
                WAYPOINTS_STORAGE_KEY,
                JSON.stringify(parsed)
              );
              localStorage.removeItem(OLD_WAYPOINTS_STORAGE_KEY);
            } catch (e) {
              console.warn("Waypoint key migration failed", e);
            }
          }
        } else {
          console.log("📂 No saved waypoints found in localStorage — seeding default waypoints");
          setWaypoints(getDefaultWaypoints());
        }
      } else {
        console.log("📂 No saved waypoints found in localStorage — seeding default waypoints");
        setWaypoints(getDefaultWaypoints());
      }
    } catch (error) {
      console.error("Error loading waypoints:", error);
      // Fallback: seed defaults so UI has something sensible
      setWaypoints(getDefaultWaypoints());
    }
    setIsLoaded(true);
  }, []);

  // Save waypoints to localStorage whenever they change
  useEffect(() => {
    // Only save after initial load to prevent overwriting with empty array
    if (isLoaded) {
      try {
        localStorage.setItem(WAYPOINTS_STORAGE_KEY, JSON.stringify(waypoints));
        console.log("💾 Waypoints saved to localStorage:", waypoints.length);
      } catch (error) {
        console.error("Error saving waypoints:", error);
      }
    }
  }, [waypoints, isLoaded]);

  const addWaypoint = (waypoint: Omit<Waypoint, "id" | "createdAt">) => {
    const newWaypoint: Waypoint = {
      ...waypoint,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setWaypoints((prev) => [...prev, newWaypoint]);
    return newWaypoint;
  };

  const updateWaypoint = (
    id: string,
    updates: Partial<Omit<Waypoint, "id" | "createdAt">>
  ) => {
    setWaypoints((prev) =>
      prev.map((waypoint) =>
        waypoint.id === id ? { ...waypoint, ...updates } : waypoint
      )
    );
  };

  const deleteWaypoint = (id: string) => {
    setWaypoints((prev) => prev.filter((waypoint) => waypoint.id !== id));
  };

  const clearAllWaypoints = () => {
    setWaypoints([]);
  };

  // Import helpers
  const importWaypoints = (input: unknown, replace = false) => {
    // Accept stringified JSON as well
    let payload: any = input as any;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = [];
      }
    }

    const array = Array.isArray(payload?.waypoints)
      ? payload.waypoints
      : Array.isArray(payload)
        ? payload
        : [];

    const isHexEntityId = (s: string) => /^0x[0-9a-fA-F]{64}$/.test(s);

    const parseNum = (v: any): number | null => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)))
        return Number(v);
      return null;
    };

    const sanitize = (item: any): Waypoint | null => {
      if (!item || typeof item !== "object") return null;

      // Name: support legacy `label`
      const name =
        typeof item.name === "string" && item.name
          ? item.name
          : typeof item.label === "string" && item.label
            ? item.label
            : "";

      // Description: support legacy `notes`
      const description =
        typeof item.description === "string"
          ? item.description
          : typeof item.notes === "string"
            ? item.notes
            : "";

      // Category
      const category =
        typeof item.category === "string" && item.category
          ? item.category
          : "General";

      // createdAt: accept number ms or ISO string
      let createdAt: number = Date.now();
      if (typeof item.createdAt === "number" && isFinite(item.createdAt)) {
        createdAt = item.createdAt;
      } else if (typeof item.createdAt === "string") {
        const t = Date.parse(item.createdAt);
        if (!isNaN(t)) createdAt = t;
      }

      // EntityId: prefer valid hex, else derive from x/y/z if present
      let entityId =
        typeof item.entityId === "string" && isHexEntityId(item.entityId)
          ? item.entityId
          : "";
      let xi: number | null = null;
      let yi: number | null = null;
      let zi: number | null = null;
      if (!entityId) {
        const x = parseNum(item.x);
        const y = parseNum(item.y);
        const z = parseNum(item.z);
        if (x !== null && y !== null && z !== null) {
          // Floor to integers for block coordinates
          xi = Math.floor(x);
          yi = Math.floor(y);
          zi = Math.floor(z);
          try {
            entityId = encodeBlock([xi, yi, zi]);
          } catch (e) {
            console.warn(
              "Failed to encodeBlock for",
              { x: xi, y: yi, z: zi },
              e
            );
          }
        }
      }

      if (!name || !entityId) return null;

      // id: accept string or number, else generate
      let id: string;
      if (typeof item.id === "string" && item.id) id = item.id;
      else if (typeof item.id === "number" && isFinite(item.id))
        id = String(item.id);
      else id = crypto.randomUUID();

      const wp: Waypoint = {
        id,
        name,
        entityId,
        description,
        category,
        createdAt,
      };
      if (xi !== null && yi !== null && zi !== null) {
        wp.x = xi;
        wp.y = yi;
        wp.z = zi;
      }
      return wp;
    };

    const sanitized: Waypoint[] = array
      .map(sanitize)
      .filter(Boolean) as Waypoint[];

    if (sanitized.length === 0) return false;

    if (replace) {
      setWaypoints(sanitized);
      return true;
    }

    // Merge with dedupe by (entityId + name)
    setWaypoints((prev) => {
      const key = (w: Waypoint) => `${w.entityId}::${w.name}`.toLowerCase();
      const map = new Map<string, Waypoint>();

      for (const w of prev) map.set(key(w), w);
      for (const w of sanitized) if (!map.has(key(w))) map.set(key(w), w);

      return Array.from(map.values());
    });
    return true;
  };

  return {
    waypoints,
    addWaypoint,
    updateWaypoint,
    deleteWaypoint,
    clearAllWaypoints,
    importWaypoints,
  };
}
