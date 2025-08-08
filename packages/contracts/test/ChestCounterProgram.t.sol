// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { HookContext, ITransfer, SlotData } from "@dust/world/src/ProgramHooks.sol";
import { EntityId, EntityTypeLib } from "@dust/world/src/types/EntityId.sol";
import { ObjectType, ObjectTypes } from "@dust/world/src/types/ObjectType.sol";
import { MudTest } from "@latticexyz/world/test/MudTest.t.sol";
import { console } from "forge-std/console.sol";

import { ChestCounterProgram } from "../src/ChestCounterProgram.sol";
import { Constants } from "../src/Constants.sol";

import { chestCounterProgram } from "../src/codegen/systems/ChestCounterProgramLib.sol";
import { counterSystem } from "../src/codegen/systems/CounterSystemLib.sol";
import { Counter } from "../src/codegen/tables/Counter.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";

contract ChestCounterProgramTest is MudTest {
  ChestCounterProgram program;

  EntityId chest;
  EntityId player;

  function setUp() public override {
    super.setUp();

    // Deploy the programs
    program = ChestCounterProgram(chestCounterProgram.getAddress());

    bytes32 worldSlot = keccak256("mud.store.storage.StoreSwitch");
    bytes32 worldAddressBytes32 = bytes32(uint256(uint160(worldAddress)));
    vm.store(address(program), worldSlot, worldAddressBytes32);

    // Create test entities
    chest = EntityId.wrap(bytes32(uint256(1)));
    player = EntityTypeLib.encodePlayer(vm.randomAddress());
  }

  function testTransferAllowedWhenCounterIsOdd() public {
    // Set counter to 1 (odd)
    counterSystem.setValue(1);

    HookContext memory ctx = HookContext({ caller: player, target: chest, revertOnFailure: true, extraData: "" });

    SlotData[] memory deposits = new SlotData[](1);
    deposits[0] = SlotData({ entityId: EntityId.wrap(0), objectType: ObjectTypes.WheatSeed, amount: 5 });

    ITransfer.TransferData memory transfer =
      ITransfer.TransferData({ deposits: deposits, withdrawals: new SlotData[](0) });

    // Should not revert when counter is odd
    vm.prank(worldAddress);
    program.onTransfer(ctx, transfer);
  }

  function testTransferBlockedWhenCounterIsEven() public {
    // Set counter to 2 (even)
    counterSystem.setValue(2);

    HookContext memory ctx = HookContext({ caller: player, target: chest, revertOnFailure: true, extraData: "" });

    SlotData[] memory deposits = new SlotData[](1);
    deposits[0] = SlotData({ entityId: EntityId.wrap(0), objectType: ObjectTypes.WheatSeed, amount: 5 });

    ITransfer.TransferData memory transfer =
      ITransfer.TransferData({ deposits: deposits, withdrawals: new SlotData[](0) });

    // Should revert when counter is even
    vm.expectRevert("Transfers only allowed when counter is odd");
    vm.prank(worldAddress);
    program.onTransfer(ctx, transfer);
  }

  function testCounterSystemIncrementAndTransfer() public {
    // Start with counter at 0 (even)

    HookContext memory ctx = HookContext({ caller: player, target: chest, revertOnFailure: true, extraData: "" });

    SlotData[] memory deposits = new SlotData[](1);
    deposits[0] = SlotData({ entityId: EntityId.wrap(0), objectType: ObjectTypes.WheatSeed, amount: 5 });

    ITransfer.TransferData memory transfer =
      ITransfer.TransferData({ deposits: deposits, withdrawals: new SlotData[](0) });

    // Transfer should fail at 0 (even)
    vm.expectRevert("Transfers only allowed when counter is odd");
    vm.prank(worldAddress);
    program.onTransfer(ctx, transfer);

    // Increment counter to 1 (odd)
    counterSystem.increment();
    assertEq(Counter.getValue(), 1);

    // Now transfer should succeed
    vm.prank(worldAddress);
    program.onTransfer(ctx, transfer);

    // Increment counter to 2 (even)
    counterSystem.increment();
    assertEq(Counter.getValue(), 2);

    // Transfer should fail again
    vm.expectRevert("Transfers only allowed when counter is odd");
    vm.prank(worldAddress);
    program.onTransfer(ctx, transfer);

    // Increment counter to 3 (odd)
    counterSystem.increment();
    assertEq(Counter.getValue(), 3);

    // Transfer should succeed again
    vm.prank(worldAddress);
    program.onTransfer(ctx, transfer);
  }

  function testWithdrawalsFollowSameRule() public {
    // Set counter to 1 (odd) - withdrawals allowed
    counterSystem.setValue(1);

    HookContext memory ctx = HookContext({ caller: player, target: chest, revertOnFailure: true, extraData: "" });

    SlotData[] memory withdrawals = new SlotData[](1);
    withdrawals[0] = SlotData({ entityId: EntityId.wrap(0), objectType: ObjectTypes.WheatSeed, amount: 3 });

    ITransfer.TransferData memory transfer =
      ITransfer.TransferData({ deposits: new SlotData[](0), withdrawals: withdrawals });

    // Withdrawal should succeed when counter is odd
    vm.prank(worldAddress);
    program.onTransfer(ctx, transfer);

    // Set counter to 4 (even) - withdrawals blocked
    counterSystem.setValue(4);

    // Withdrawal should fail when counter is even
    vm.expectRevert("Transfers only allowed when counter is odd");
    vm.prank(worldAddress);
    program.onTransfer(ctx, transfer);
  }

  function testNonRevertingMode() public {
    // Set counter to 2 (even)
    counterSystem.setValue(2);

    HookContext memory ctx = HookContext({
      caller: player,
      target: chest,
      revertOnFailure: false, // Non-reverting mode
      extraData: ""
    });

    SlotData[] memory deposits = new SlotData[](1);
    deposits[0] = SlotData({ entityId: EntityId.wrap(0), objectType: ObjectTypes.WheatSeed, amount: 5 });

    ITransfer.TransferData memory transfer =
      ITransfer.TransferData({ deposits: deposits, withdrawals: new SlotData[](0) });

    // Should not revert in non-reverting mode, even when counter is even
    vm.prank(worldAddress);
    program.onTransfer(ctx, transfer);
  }
}
