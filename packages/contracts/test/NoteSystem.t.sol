// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { EntityId, EntityTypeLib } from "@dust/world/src/types/EntityId.sol";
import { MudTest } from "@latticexyz/world/test/MudTest.t.sol";
import { IWorld } from "../src/codegen/world/IWorld.sol";
import { console } from "forge-std/console.sol";

import { AdminSystem } from "../src/systems/AdminSystem.sol";
import { NoteSystem } from "../src/systems/NoteSystem.sol";

import { adminSystem } from "../src/codegen/systems/AdminSystemLib.sol";
import { noteSystem } from "../src/codegen/systems/NoteSystemLib.sol";

import { Post, PostData } from "../src/codegen/tables/Post.sol";

contract NoteSystemTest is MudTest {
  AdminSystem adminSystemContract;
  NoteSystem noteSystemContract;

  address public adminAddress = vm.addr(vm.envUint("PRIVATE_KEY"));
  address player1;
  address player2;
  bytes32 testNoteId;

  function setUp() public override {
    super.setUp();

    // Deploy the systems
    adminSystemContract = AdminSystem(adminSystem.getAddress());
    noteSystemContract = NoteSystem(noteSystem.getAddress());

    vm.prank(adminAddress);
    IWorld(worldAddress).call(
      adminSystem.toResourceId(),
      abi.encodeCall(adminSystemContract.addNoteCategory, ("Offer"))
    );

    // Set up test addresses
    player1 = vm.randomAddress();
    player2 = vm.randomAddress();
  }

  function testCreateNote() public {
    vm.startPrank(player1);

    // First create a note
    bytes memory result = IWorld(worldAddress).call(
      noteSystem.toResourceId(),
      abi.encodeCall(noteSystemContract.createNote, ("Test Note", "Content", "Offer"))
    );
    testNoteId = abi.decode(result, (bytes32));

    // Verify the note was created
    PostData memory note = Post.get(testNoteId);
    assertEq(note.title, "Test Note");
    assertEq(note.content, "Content");

    vm.stopPrank();
  }
}
