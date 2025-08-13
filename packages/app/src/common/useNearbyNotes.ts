import { skipToken, useQuery } from "@tanstack/react-query";

import { useNotes } from "@/hooks/useNotes";
import { useWaypoints } from "@/hooks/useWaypoints";

import { useDustClient } from "./useDustClient";
import { usePlayerPositionQuery } from "./usePlayerPositionQuery";

type NearbyNote = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  distance: number;
  entityId?: string;
  waypointInfo?: {
    id: string;
    name: string;
  };
};

const PROXIMITY_RADIUS = 10; // blocks
const SCAN_INTERVAL = 2000; // 2 seconds

export function useNearbyNotes() {
  const { data: dustClient } = useDustClient();
  const { data: playerPosition } = usePlayerPositionQuery();
  const { notes } = useNotes();
  const { waypoints } = useWaypoints();

  return useQuery<NearbyNote[]>({
    queryKey: [
      "nearbyNotes",
      playerPosition?.x,
      playerPosition?.y,
      playerPosition?.z,
    ],
    queryFn:
      !dustClient || !playerPosition
        ? skipToken
        : async () => {
            const nearbyNotes: NearbyNote[] = [];

            // Get nearby entities using dustkit
            try {
              // Check force fields in the area
              for (
                let x = playerPosition.x - PROXIMITY_RADIUS;
                x <= playerPosition.x + PROXIMITY_RADIUS;
                x += 2
              ) {
                for (
                  let y = playerPosition.y - PROXIMITY_RADIUS;
                  y <= playerPosition.y + PROXIMITY_RADIUS;
                  y += 2
                ) {
                  for (
                    let z = playerPosition.z - PROXIMITY_RADIUS;
                    z <= playerPosition.z + PROXIMITY_RADIUS;
                    z += 2
                  ) {
                    try {
                      const forceField = await dustClient.provider.request({
                        method: "getForceFieldAt",
                        params: { x, y, z },
                      });

                      if (forceField) {
                        const distance = Math.sqrt(
                          Math.pow(x - playerPosition.x, 2) +
                            Math.pow(y - playerPosition.y, 2) +
                            Math.pow(z - playerPosition.z, 2)
                        );

                        // Find notes linked to this entity
                        const linkedNotes = notes.filter(
                          (note) =>
                            note.entityId === forceField.forceFieldId ||
                            note.tags.includes(
                              `entity:${forceField.forceFieldId}`
                            )
                        );

                        for (const note of linkedNotes) {
                          nearbyNotes.push({
                            id: note.id,
                            title: note.title,
                            content: note.content,
                            tags: note.tags,
                            distance: Math.round(distance),
                            entityId: forceField.forceFieldId,
                          });
                        }
                      }
                    } catch (e) {
                      // Ignore individual scan errors
                    }
                  }
                }
              }

              // Check notes linked to waypoints that are near the player
              // Note: Since our waypoints are entity-based, we would need to query
              // entity positions to determine proximity. For now, we'll just look
              // for notes that reference waypoints through tags or content.
              for (const waypoint of waypoints) {
                // Find notes that reference this waypoint
                const waypointNotes = notes.filter(
                  (note) =>
                    note.tags.includes(`waypoint:${waypoint.id}`) ||
                    note.content.includes(waypoint.name) ||
                    note.entityId === waypoint.entityId
                );

                for (const note of waypointNotes) {
                  // Since we don't have waypoint coordinates directly, we'll add them
                  // with a default distance (could be enhanced later with entity position lookup)
                  nearbyNotes.push({
                    id: note.id,
                    title: note.title,
                    content: note.content,
                    tags: note.tags,
                    distance: 0, // Could be calculated if we had entity positions
                    waypointInfo: {
                      id: waypoint.id,
                      name: waypoint.name,
                    },
                  });
                }
              }

              // Remove duplicates and sort by distance
              const uniqueNotes = nearbyNotes.filter(
                (note, index, self) =>
                  index === self.findIndex((n) => n.id === note.id)
              );

              return uniqueNotes.sort((a, b) => a.distance - b.distance);
            } catch (error) {
              console.warn("Error scanning for nearby notes:", error);
              return [];
            }
          },
    enabled: Boolean(dustClient && playerPosition),
    refetchInterval: SCAN_INTERVAL,
    staleTime: 1000, // 1 second
  });
}

// Hook for getting context-specific information when opening an entity
export function useEntityContext(entityId?: string) {
  const { notes } = useNotes();

  return useQuery({
    queryKey: ["entityContext", entityId],
    queryFn: entityId
      ? async () => {
          // Find notes linked to this specific entity
          const linkedNotes = notes.filter(
            (note) =>
              note.entityId === entityId ||
              note.tags.includes(`entity:${entityId}`)
          );

          return {
            entityId,
            hasNotes: linkedNotes.length > 0,
            notes: linkedNotes,
          };
        }
      : skipToken,
    enabled: Boolean(entityId),
  });
}
