import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  codegen: {
    generateSystemLibraries: true,
  },
  userTypes: {
    ObjectType: {
      filePath: "@dust/world/src/types/ObjectType.sol",
      type: "uint16",
    },
    EntityId: {
      filePath: "@dust/world/src/types/EntityId.sol",
      type: "bytes32",
    },
    ProgramId: {
      filePath: "@dust/world/src/types/ProgramId.sol",
      type: "bytes32",
    },
    ResourceId: {
      filePath: "@latticexyz/store/src/ResourceId.sol",
      type: "bytes32",
    },
  },
  // Replace this with a unique namespace
  namespace: "template",
  systems: {
    ForceFieldProgram: {
      openAccess: false,
      deploy: { registerWorldFunctions: false },
    },
    SpawnTileProgram: {
      openAccess: false,
      deploy: { registerWorldFunctions: false },
    },
    ChestProgram: {
      openAccess: false,
      deploy: { registerWorldFunctions: false },
    },
    BedProgram: {
      openAccess: false,
      deploy: { registerWorldFunctions: false },
    },
    CounterSystem: {
      deploy: { registerWorldFunctions: false },
    },
    ChestCounterProgram: {
      openAccess: false,
      deploy: { registerWorldFunctions: false },
    },
  },
  tables: {
    Counter: {
      schema: {
        value: "uint256",
      },
      key: [],
    },
  },
});
