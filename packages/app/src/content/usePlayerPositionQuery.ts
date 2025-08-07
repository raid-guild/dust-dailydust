import { skipToken, useQuery } from "@tanstack/react-query";
import { dustClient } from "../dustClient";

type PlayerPosition = {
  x: number;
  y: number;
  z: number;
};

export function usePlayerPositionQuery() {
  return useQuery<PlayerPosition | null>({
    queryKey: ["playerPosition"],
    queryFn: !dustClient
      ? skipToken
      : async () => {
          const position = await dustClient.provider.request({
            method: "getPlayerPosition",
            params: {
              entity: "0x",
            },
          });

          return {
            x: Math.floor(position.x),
            y: Math.floor(position.y),
            z: Math.floor(position.z),
          };
        },
    enabled: !!dustClient,
    refetchIntervalInBackground: true,
    refetchInterval: 100,
  });
}
