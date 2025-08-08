import { redstone as redstoneChain } from "@latticexyz/common/chains";
import type { Chain } from "viem";

export const redstone = {
  ...redstoneChain,
  rpcUrls: {
    ...redstoneChain.rpcUrls,
    wiresaw: {
      http: ["https://wiresaw.redstonechain.com"],
      webSocket: ["wss://wiresaw.redstonechain.com"],
    },
  },
} satisfies Chain;
