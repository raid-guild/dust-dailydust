// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";

import { console } from "forge-std/console.sol";

import { Script } from "./Script.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";
import { adminSystem } from "../src/codegen/systems/AdminSystemLib.sol";
import { AdminSystem } from "../src/systems/AdminSystem.sol";

contract AddCategory is Script {
  function run() external {
    address worldAddress = vm.envAddress("WORLD_ADDRESS");
    StoreSwitch.setStoreAddress(worldAddress);

    startBroadcast();

    AdminSystem adminSystemContract = AdminSystem(adminSystem.getAddress());
    IWorld(worldAddress).call(
      adminSystem.toResourceId(),
      abi.encodeCall(adminSystemContract.addNoteCategory, ("Offer"))
    );

    vm.stopBroadcast();
  }
}
