import { spawnRadius } from "../common";

export function getSpawnCoord(
  spawnTileCoord: readonly [number, number, number]
): [number, number, number] {
  const dx = Math.round(Math.random() * (spawnRadius * 2)) - spawnRadius;
  const dz = Math.round(Math.random() * (spawnRadius * 2)) - spawnRadius;
  const dy = dx === 0 && dz === 0 ? 1 : 0;
  return [
    spawnTileCoord[0] + dx,
    spawnTileCoord[1] + dy,
    spawnTileCoord[2] + dz,
  ];
}
