import { skipToken, useQuery } from "@tanstack/react-query";
import { useDustClient } from "./useDustClient";

type PlayerPosition = {
  x: number;
  y: number;
  z: number;
};

export function usePlayerPositionQuery() {
  const { data: dustClient } = useDustClient();

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
    enabled: Boolean(dustClient),
    refetchIntervalInBackground: true,
    refetchInterval: 500,
  });
}
