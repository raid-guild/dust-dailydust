import { createStash } from "@latticexyz/stash/internal";
import type { SyncFilter } from "@latticexyz/store-sync";
import dustWorldConfig from "@dust/world/mud.config";
import contractsConfig from "contracts/mud.config";
import { worldAddress } from "../common/worldAddress";
import { syncToStash } from "@latticexyz/store-sync/internal";
import { redstone } from "./redstone";

const selectedDustTables = {
  Energy: dustWorldConfig.tables.Energy,
};

export const tables = {
  ...selectedDustTables,
  ...contractsConfig.namespaces[
    contractsConfig.namespace as keyof typeof contractsConfig.namespaces
  ].tables,
};

export const stashConfig = {
  namespaces: {
    "": {
      tables: selectedDustTables,
    },
    ...contractsConfig.namespaces,
  },
};

export const filters = [
  ...Object.values(tables).map((table) => ({
    tableId: table.tableId,
  })),
] satisfies SyncFilter[];

export const stash = createStash(stashConfig);

await syncToStash({
  address: worldAddress,
  stash,
  filters,
  internal_clientOptions: { chain: redstone },
  indexerUrl: redstone.indexerUrl,
});
