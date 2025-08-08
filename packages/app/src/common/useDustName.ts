import { skipToken, useQuery } from "@tanstack/react-query";
import { type Hex, getAddress } from "viem";

async function getDustName(userAddress: Hex): Promise<{
  username: string | null;
  isWhitelisted: boolean;
}> {
  return await fetch(
    "https://zqeiphhhhnflwahcjfos.supabase.co/functions/v1/verify-ethereum-whitelist",
    {
      method: "POST",
      body: JSON.stringify({
        ethereumAddress: getAddress(userAddress),
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZWlwaGhoaG5mbHdhaGNqZm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MTIyMjQsImV4cCI6MjA2NDM4ODIyNH0.-Gy8bxSLEgYalp79E750DptjN1GlE9cg7GMYoEwtbzk",
      },
    }
  ).then((res) => res.json());
}

export function useDustName(rawAddress: Hex | undefined) {
  const address = rawAddress ? getAddress(rawAddress) : undefined;
  return useQuery({
    staleTime: 1000 * 60 * 60,
    queryKey: ["keymaker-user", address],
    queryFn: address ? () => getDustName(address) : skipToken,
  });
}
