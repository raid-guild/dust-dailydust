// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

import { WorldConsumer } from "@latticexyz/world-consumer/src/experimental/WorldConsumer.sol";
import { System } from "@latticexyz/world/src/System.sol";
import { WorldContextConsumer } from "@latticexyz/world/src/WorldContext.sol";

import { HookContext, IAttachProgram, IDetachProgram } from "@dust/world/src/ProgramHooks.sol";

import { Constants } from "./Constants.sol";

abstract contract BaseProgram is IAttachProgram, IDetachProgram, System, WorldConsumer(Constants.DUST_WORLD) {
  function onAttachProgram(HookContext calldata ctx) public virtual override onlyWorld { }
  function onDetachProgram(HookContext calldata ctx) public virtual override onlyWorld { }

  // Other hooks revert
  fallback() external virtual {
    revert("Hook not supported");
  }

  // Required due to inheriting from System and WorldConsumer
  function _msgSender() public view virtual override(WorldContextConsumer, WorldConsumer) returns (address) {
    return WorldConsumer._msgSender();
  }

  function _msgValue() public view virtual override(WorldContextConsumer, WorldConsumer) returns (uint256) {
    return WorldConsumer._msgValue();
  }
}
