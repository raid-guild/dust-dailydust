import { decodePosition, packVec3 } from "@dust/world/internal";
import IWorldAbi from "@dust/world/out/IWorld.sol/IWorld.abi";
import { resourceToHex } from "@latticexyz/common";
import { dustClient } from "../dustClient";
import { spawnEnergy, spawnTileEntityId } from "../common";
import { getSpawnCoord } from "./getSpawnCoord";
import { decodeError } from "../decodeError";

export async function spawnPlayer(): Promise<{ error?: string }> {
  const spawnTileCoord = decodePosition(spawnTileEntityId);
  const spawnCoord = packVec3(getSpawnCoord(spawnTileCoord));

  const result = await dustClient.provider.request({
    method: "systemCall",
    params: [
      {
        systemId: resourceToHex({
          type: "system",
          namespace: "",
          name: "SpawnSystem",
        }),
        abi: IWorldAbi,
        functionName: "spawn",
        args: [spawnTileEntityId, spawnCoord, spawnEnergy, "0x"],
      },
    ],
  });

  const error = decodeError(
    IWorldAbi,
    result.transactionHash ? result.receipt : result.receipt.receipt
  );

  return { error };
}
