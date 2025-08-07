import { encodePlayer } from "@dust/world/internal";
import { dustClient } from "./dustClient";

export const spawnRadius = 5;
export const spawnEnergy = (817600000000000000n * 3n) / 10n; // 30% of max energy
export const spawnTileEntityId =
  "0x03000000390000003fffffffa900000000000000000000000000000000000000";

export const worldAddress = "0x253eb85B3C953bFE3827CC14a151262482E7189C";
export const playerEntityId = encodePlayer(dustClient.appContext.userAddress);
