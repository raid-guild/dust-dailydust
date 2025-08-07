// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System, WorldContextConsumer } from "@latticexyz/world/src/System.sol";

import { HookContext, ITransfer } from "@dust/world/src/ProgramHooks.sol";

import { BaseProgram } from "./BaseProgram.sol";

contract ChestProgram is ITransfer, System, BaseProgram {
  function onTransfer(HookContext calldata ctx, TransferData calldata transfer) external onlyWorld { }

  // Required due to inheriting from System and WorldConsumer
  function _msgSender() public view override(WorldContextConsumer, BaseProgram) returns (address) {
    return BaseProgram._msgSender();
  }

  function _msgValue() public view override(WorldContextConsumer, BaseProgram) returns (uint256) {
    return BaseProgram._msgValue();
  }
}
