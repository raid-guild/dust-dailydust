import { encodeBlock } from "@dust/world/internal";
import { toast } from "sonner";

import type { Post } from "@/utils/types";

import { useDustClient } from "./useDustClient";

export const useWaypoint = () => {
  const { data: dustClient } = useDustClient();

  const onSetWaypoint = async (post: Post) => {
    try {
      if (!dustClient) {
        throw new Error("Wallet/client not ready");
      }
      const coords = post.coords;
      if (!coords || typeof coords.x !== "number") {
        throw new Error("Post has no anchor/coordinates to set a waypoint for");
      }
      const bx = Math.floor(coords.x);
      const by = Math.floor(coords.y);
      const bz = Math.floor(coords.z);
      const entityId = encodeBlock([bx, by, bz]);

      await dustClient.provider.request({
        method: "setWaypoint",
        params: { entity: entityId, label: post.title || "Waypoint" },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to set waypoint", e);
      toast.error("Failed to Set Waypoint", {
        description: (e as Error).message,
      });
    }
  };

  return { onSetWaypoint };
};
