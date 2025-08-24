import { getRecord } from "@latticexyz/stash/internal";
import { useMemo } from "react";
import { hexToString, isAddress } from "viem";

import { stash, tables } from "@/mud/stash";

export const usePlayerName = (playerAddress: string | undefined) => {
  const playerName = useMemo(() => {
    if (!playerAddress) return "Anonymous";
    if (isAddress(playerAddress) === false) return "Anonymous";

    const ownerUsername = getRecord({
      stash,
      table: tables.PlayerName,
      key: { player: playerAddress as `0x${string}` },
    })?.name;

    if (ownerUsername) {
      return hexToString(ownerUsername).replace(/\0+$/, "");
    }
    return "Anonymous";
  }, [playerAddress]);

  return {
    playerName,
  };
};
