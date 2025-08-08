// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { console } from "forge-std/console.sol";

import { Script } from "./Script.sol";

import { bedProgram } from "../src/codegen/systems/BedProgramLib.sol";

import { chestCounterProgram } from "../src/codegen/systems/ChestCounterProgramLib.sol";
import { chestProgram } from "../src/codegen/systems/ChestProgramLib.sol";
import { forceFieldProgram } from "../src/codegen/systems/ForceFieldProgramLib.sol";
import { spawnTileProgram } from "../src/codegen/systems/SpawnTileProgramLib.sol";

contract PostDeploy is Script {
  function run(address worldAddress) external {
    StoreSwitch.setStoreAddress(worldAddress);
    startBroadcast();

    // do something

    vm.stopBroadcast();

    if (block.chainid == 31337) {
      console.log("Setting local world address to:", worldAddress);
      _setLocalWorldAddress(worldAddress);
    }
  }

  // Set the world address by directly writing to storage for local setup
  function _setLocalWorldAddress(address worldAddress) internal {
    bytes32 worldSlot = keccak256("mud.store.storage.StoreSwitch");
    bytes32 worldAddressBytes32 = bytes32(uint256(uint160(worldAddress)));
    vm.store(forceFieldProgram.getAddress(), worldSlot, worldAddressBytes32);
    vm.store(spawnTileProgram.getAddress(), worldSlot, worldAddressBytes32);
    vm.store(bedProgram.getAddress(), worldSlot, worldAddressBytes32);
    vm.store(chestProgram.getAddress(), worldSlot, worldAddressBytes32);
    vm.store(chestCounterProgram.getAddress(), worldSlot, worldAddressBytes32);
  }
}
