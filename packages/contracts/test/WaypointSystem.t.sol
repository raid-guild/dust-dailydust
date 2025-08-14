// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { EntityId, EntityTypeLib } from "@dust/world/src/types/EntityId.sol";
import { MudTest } from "@latticexyz/world/test/MudTest.t.sol";
import { console } from "forge-std/console.sol";

import { NoteSystem } from "../src/systems/NoteSystem.sol";
import { WaypointSystem } from "../src/systems/WaypointSystem.sol";

import { noteSystem } from "../src/codegen/systems/NoteSystemLib.sol";
import { waypointSystem } from "../src/codegen/systems/WaypointSystemLib.sol";
import { Post, PostData } from "../src/codegen/tables/Post.sol";
import { WaypointGroup, WaypointGroupData } from "../src/codegen/tables/WaypointGroup.sol";
import { WaypointStep, WaypointStepData } from "../src/codegen/tables/WaypointStep.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";

contract WaypointSystemTest is MudTest {
  NoteSystem noteSystemContract;
  WaypointSystem waypointSystemContract;

  address player1;
  address player2;
  bytes32 testNoteId;

  function setUp() public override {
    super.setUp();

    // Deploy the systems
    noteSystemContract = NoteSystem(noteSystem.getAddress());
    waypointSystemContract = WaypointSystem(waypointSystem.getAddress());

    // Set up test addresses
    player1 = vm.randomAddress();
    player2 = vm.randomAddress();
    
    // Create a test note for waypoint testing
    testNoteId = keccak256(abi.encodePacked(player1, block.timestamp, "test"));
  }

  function testCreateWaypointGroup() public {
    vm.startPrank(player1);
    
    // First create a note
    IWorld(worldAddress).call(
      noteSystem.toResourceId(),
      abi.encodeCall(noteSystemContract.createNote, (testNoteId, "Test Note", "Content"))
    );
    
    // Create a waypoint group
    IWorld(worldAddress).call(
      waypointSystem.toResourceId(),
      abi.encodeCall(waypointSystemContract.createWaypointGroup, (testNoteId, 1, "Test Route", 0xFF0000, true))
    );
    
    // Verify waypoint group was created
    WaypointGroupData memory group = WaypointGroup.get(testNoteId, 1);
    assertEq(group.name, "Test Route");
    assertEq(group.color, 0xFF0000);
    assertTrue(group.isPublic);
    
    vm.stopPrank();
  }

  function testAddWaypointStep() public {
    vm.startPrank(player1);
    
    // Create note and waypoint group first
    IWorld(worldAddress).call(
      noteSystem.toResourceId(),
      abi.encodeCall(noteSystemContract.createNote, (testNoteId, "Test Note", "Content"))
    );
    
    IWorld(worldAddress).call(
      waypointSystem.toResourceId(),
      abi.encodeCall(waypointSystemContract.createWaypointGroup, (testNoteId, 1, "Test Route", 0xFF0000, true))
    );
    
    // Add waypoint step
    IWorld(worldAddress).call(
      waypointSystem.toResourceId(),
      abi.encodeCall(waypointSystemContract.addWaypointStep, (testNoteId, 1, 0, 100, 200, 300, "First Step"))
    );
    
    // Verify waypoint step was created
    WaypointStepData memory step = WaypointStep.get(testNoteId, 1, 0);
    assertEq(step.x, 100);
    assertEq(step.y, 200);
    assertEq(step.z, 300);
    assertEq(step.label, "First Step");
    
    vm.stopPrank();
  }

  function testUpdateWaypointStep() public {
    vm.startPrank(player1);
    
    // Setup: create note, group, and step
    IWorld(worldAddress).call(
      noteSystem.toResourceId(),
      abi.encodeCall(noteSystemContract.createNote, (testNoteId, "Test Note", "Content"))
    );
    
    IWorld(worldAddress).call(
      waypointSystem.toResourceId(),
      abi.encodeCall(waypointSystemContract.createWaypointGroup, (testNoteId, 1, "Test Route", 0xFF0000, true))
    );
    
    IWorld(worldAddress).call(
      waypointSystem.toResourceId(),
      abi.encodeCall(waypointSystemContract.addWaypointStep, (testNoteId, 1, 0, 100, 200, 300, "Original Step"))
    );
    
    // Update the step
    IWorld(worldAddress).call(
      waypointSystem.toResourceId(),
      abi.encodeCall(waypointSystemContract.updateWaypointStep, (testNoteId, 1, 0, 150, 250, 350, "Updated Step"))
    );
    
    // Verify update
    WaypointStepData memory step = WaypointStep.get(testNoteId, 1, 0);
    assertEq(step.x, 150);
    assertEq(step.y, 250);
    assertEq(step.z, 350);
    assertEq(step.label, "Updated Step");
    
    vm.stopPrank();
  }

  function testOnlyNoteOwnerCanCreateWaypointGroup() public {
    vm.startPrank(player1);
    
    // Create note as player1
    IWorld(worldAddress).call(
      noteSystem.toResourceId(),
      abi.encodeCall(noteSystemContract.createNote, (testNoteId, "Test Note", "Content"))
    );
    
    vm.stopPrank();
    vm.startPrank(player2);
    
    // Try to create waypoint group as player2 (should fail)
    vm.expectRevert("Only note owner can create waypoint groups");
    IWorld(worldAddress).call(
      waypointSystem.toResourceId(),
      abi.encodeCall(waypointSystemContract.createWaypointGroup, (testNoteId, 1, "Test Route", 0xFF0000, true))
    );
    
    vm.stopPrank();
  }

  function testRemoveWaypointStep() public {
    vm.startPrank(player1);
    
    // Setup: create note, group, and step
    IWorld(worldAddress).call(
      noteSystem.toResourceId(),
      abi.encodeCall(noteSystemContract.createNote, (testNoteId, "Test Note", "Content"))
    );
    
    IWorld(worldAddress).call(
      waypointSystem.toResourceId(),
      abi.encodeCall(waypointSystemContract.createWaypointGroup, (testNoteId, 1, "Test Route", 0xFF0000, true))
    );
    
    IWorld(worldAddress).call(
      waypointSystem.toResourceId(),
      abi.encodeCall(waypointSystemContract.addWaypointStep, (testNoteId, 1, 0, 100, 200, 300, "Step to Remove"))
    );
    
    // Verify step exists
    assertTrue(bytes(WaypointStep.getLabel(testNoteId, 1, 0)).length > 0);
    
    // Remove the step
    IWorld(worldAddress).call(
      waypointSystem.toResourceId(),
      abi.encodeCall(waypointSystemContract.removeWaypointStep, (testNoteId, 1, 0))
    );
    
    // Verify step was removed
    assertTrue(bytes(WaypointStep.getLabel(testNoteId, 1, 0)).length == 0);
    
    vm.stopPrank();
  }
}
