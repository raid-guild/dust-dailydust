// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { HookContext, ITransfer } from "@dust/world/src/ProgramHooks.sol";
import { System, WorldContextConsumer } from "@latticexyz/world/src/System.sol";

import { BaseProgram } from "./BaseProgram.sol";
import { Counter } from "./codegen/tables/Counter.sol";

contract ChestCounterProgram is ITransfer, System, BaseProgram {
  function onTransfer(HookContext calldata ctx, TransferData calldata) external view onlyWorld {
    if (!ctx.revertOnFailure) return;

    uint256 counterValue = Counter.getValue();

    // Only allow transfers when counter is odd
    require(counterValue % 2 == 1, "Transfers only allowed when counter is odd");

    // If we reach here, the transfer is allowed
  }

  // Required due to inheriting from System and WorldConsumer
  function _msgSender() public view override(WorldContextConsumer, BaseProgram) returns (address) {
    return BaseProgram._msgSender();
  }

  function _msgValue() public view override(WorldContextConsumer, BaseProgram) returns (uint256) {
    return BaseProgram._msgValue();
  }
}
