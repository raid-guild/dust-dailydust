// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { Script as _Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";

contract Script is _Script {
  constructor() {
    address worldAddress = vm.envOr("WORLD_ADDRESS", address(0));
    if (worldAddress != address(0)) {
      console.log("Using world address", worldAddress);
      StoreSwitch.setStoreAddress(worldAddress);
    }
  }

  function startBroadcast() internal returns (address) {
    // Start broadcasting transactions from the deployer account
    address[] memory wallets = vm.getWallets();
    if (wallets.length > 0) {
      console.log("Using unlocked wallet %s", wallets[0]);
      vm.startBroadcast(wallets[0]);
      return wallets[0];
    } else {
      uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
      console.log("Using private key wallet %s", vm.addr(deployerPrivateKey));
      vm.startBroadcast(deployerPrivateKey);
      return vm.addr(deployerPrivateKey);
    }
  }
}
