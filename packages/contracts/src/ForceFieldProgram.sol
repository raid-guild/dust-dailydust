// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

import { System } from "@latticexyz/world/src/System.sol";
import { WorldContextConsumer } from "@latticexyz/world/src/WorldContext.sol";

import {
  HookContext,
  IAddFragment,
  IBuild,
  IEnergize,
  IHit,
  IMine,
  IProgramValidator,
  IRemoveFragment
} from "@dust/world/src/ProgramHooks.sol";

import { BaseProgram } from "./BaseProgram.sol";

contract ForceFieldProgram is
  IProgramValidator,
  IEnergize,
  IHit,
  IAddFragment,
  IRemoveFragment,
  IBuild,
  IMine,
  System,
  BaseProgram
{
  function validateProgram(HookContext calldata ctx, ProgramData calldata) external view { }
  function onEnergize(HookContext calldata ctx, EnergizeData calldata energize) external onlyWorld { }
  function onHit(HookContext calldata ctx, HitData calldata hit) external onlyWorld { }
  function onAddFragment(HookContext calldata ctx, AddFragmentData calldata fragment) external view onlyWorld { }
  function onRemoveFragment(HookContext calldata ctx, RemoveFragmentData calldata) external view onlyWorld { }
  function onBuild(HookContext calldata ctx, BuildData calldata build) external onlyWorld { }
  function onMine(HookContext calldata ctx, MineData calldata mine) external view onlyWorld { }

  // Required due to inheriting from System and WorldConsumer
  function _msgSender() public view override(WorldContextConsumer, BaseProgram) returns (address) {
    return BaseProgram._msgSender();
  }

  function _msgValue() public view override(WorldContextConsumer, BaseProgram) returns (uint256) {
    return BaseProgram._msgValue();
  }
}
