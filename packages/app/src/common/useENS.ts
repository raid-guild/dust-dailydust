import { skipToken, useQuery } from "@tanstack/react-query";
import type { Hex } from "viem";

export function useENS(address: Hex | undefined) {
  const normalizedAddress = address?.toLowerCase();
  return useQuery<{
    address: string | undefined;
    name: string | undefined;
    displayName: string | undefined;
    avatar: string | undefined;
  }>({
    staleTime: 1000 * 60 * 60,
    queryKey: ["ens", normalizedAddress],
    queryFn: normalizedAddress
      ? async () => {
          const data = await fetch(
            `https://api.ensideas.com/ens/resolve/${normalizedAddress}`
          ).then((res) => res.json());
          return {
            address: data.address ?? undefined,
            name: data.name ?? undefined,
            displayName: data.displayName ?? undefined,
            avatar: data.avatar ?? undefined,
          };
        }
      : skipToken,
  });
}
