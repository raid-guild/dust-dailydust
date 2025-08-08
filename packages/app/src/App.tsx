import { usePlayerStatus } from "./common/usePlayerStatus";
import { useSyncStatus } from "./mud/useSyncStatus";
import { usePlayerPositionQuery } from "./common/usePlayerPositionQuery";
import { AccountName } from "./common/AccountName";
import { useDustClient } from "./common/useDustClient";
import { stash, tables } from "./mud/stash";
import { useRecord } from "@latticexyz/stash/react";
import { useMutation } from "@tanstack/react-query";
import { resourceToHex } from "@latticexyz/common";
// import IWorldAbi from "dustkit/out/IWorld.sol/IWorld.abi";
import mudConfig from "contracts/mud.config";
import CounterAbi from "contracts/out/CounterSystem.sol/CounterSystem.abi.json";

export default function App() {
  const { data: dustClient } = useDustClient();
  const syncStatus = useSyncStatus();
  const playerStatus = usePlayerStatus();
  const playerPosition = usePlayerPositionQuery();

  const counter = useRecord({
    stash,
    table: tables.Counter,
    key: {},
  });

  const increment = useMutation({
    mutationFn: () => {
      if (!dustClient) throw new Error("Dust client not connected");
      return dustClient.provider.request({
        method: "systemCall",
        params: [
          {
            systemId: resourceToHex({
              type: "system",
              namespace: mudConfig.namespace,
              name: "CounterSystem",
            }),
            abi: CounterAbi,
            functionName: "increment",
            args: [],
          },
        ],
      });
    },
  });

  if (!dustClient) {
    const url = `https://alpha.dustproject.org?debug-app=${window.location.origin}/dust-app.json`;
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <a href={url} className="text-center text-blue-500 underline">
          Open this page in DUST to connect to dustkit
        </a>
      </div>
    );
  }

  if (!syncStatus.isLive || !playerStatus) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p className="text-center">Syncing ({syncStatus.percentage}%)...</p>
      </div>
    );
  }

  return (
    <div>
      <p>
        Hello <AccountName address={dustClient.appContext.userAddress} />
      </p>
      {playerPosition.data && (
        <p>Your position: {JSON.stringify(playerPosition.data, null, " ")}</p>
      )}
      <p>Counter: {counter?.value.toString() ?? "unset"}</p>
      <button
        onClick={() => increment.mutate()}
        disabled={increment.isPending}
        className="bg-blue-500 text-white p-2"
      >
        {increment.isPending ? "Incrementing..." : "Increment"}
      </button>
    </div>
  );
}
