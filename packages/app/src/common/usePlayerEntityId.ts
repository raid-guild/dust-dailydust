import { useQuery } from "@tanstack/react-query";

import { useDustClient } from "./useDustClient";

export function usePlayerEntityId() {
  const { data: dustClient } = useDustClient();

  return useQuery({
    queryKey: ["player-entity-id"],
    queryFn: () => {
      if (!dustClient?.appContext.userAddress) {
        throw new Error("User address not available");
      }
      return dustClient.appContext.userAddress;
    },
    enabled: !!dustClient?.appContext.userAddress,
    retry: false,
  });
}
