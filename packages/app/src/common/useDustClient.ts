import { useQuery } from "@tanstack/react-query";
import { connectDustClient } from "dustkit/internal";

export function useDustClient() {
  return useQuery({
    queryKey: ["dust-client"],
    queryFn: async () => {
      const dustClient = await connectDustClient();
      console.log("app connected", dustClient);
      document.documentElement.setAttribute(
        "data-dust-app",
        dustClient.appContext.id
      );
      return dustClient;
    },
  });
}
