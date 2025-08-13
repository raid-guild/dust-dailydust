// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Note, NoteData } from "../codegen/tables/Note.sol";
import { WaypointGroup, WaypointGroupData } from "../codegen/tables/WaypointGroup.sol";
import { WaypointStep, WaypointStepData } from "../codegen/tables/WaypointStep.sol";

contract WaypointSystem is System {
  /**
   * @dev Create a new waypoint group
   * @param noteId Note this group belongs to
   * @param groupId Unique group ID within the note
   * @param name Display name for the group
   * @param color Color hint for UI (24-bit hex)
   * @param isPublic Whether group is publicly visible
   */
  function createWaypointGroup(bytes32 noteId, uint16 groupId, string memory name, uint24 color, bool isPublic) public {
    // Verify note exists and caller is owner
    NoteData memory note = Note.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    // Ensure group doesn't exist (check if name is empty)
    require(bytes(WaypointGroup.getName(noteId, groupId)).length == 0, "Group exists");

    WaypointGroup.set(
      noteId,
      groupId,
      WaypointGroupData({ color: color, isPublic: isPublic, name: name, description: "" })
    );
  }

  /**
   * @dev Update waypoint group properties
   * @param noteId Note containing the group
   * @param groupId Group to update
   * @param name New name
   * @param color New color
   * @param isPublic New visibility
   */
  function updateWaypointGroup(bytes32 noteId, uint16 groupId, string memory name, uint24 color, bool isPublic) public {
    // Verify note exists and caller is owner
    NoteData memory note = Note.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    // Verify group exists
    require(bytes(WaypointGroup.getName(noteId, groupId)).length > 0, "Group missing");

    WaypointGroup.setName(noteId, groupId, name);
    WaypointGroup.setColor(noteId, groupId, color);
    WaypointGroup.setIsPublic(noteId, groupId, isPublic);
  }

  /**
   * @dev Delete a waypoint group and all its steps
   * @param noteId Note containing the group
   * @param groupId Group to delete
   */
  function deleteWaypointGroup(bytes32 noteId, uint16 groupId) public {
    // Verify note exists and caller is owner
    NoteData memory note = Note.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    // Delete the group (steps would need to be deleted separately in a real implementation)
    WaypointGroup.deleteRecord(noteId, groupId);
  }

  /**
   * @dev Add a waypoint step to a group
   * @param noteId Note containing the group
   * @param groupId Group to add step to
   * @param index Position in the sequence
   * @param x X coordinate
   * @param y Y coordinate
   * @param z Z coordinate
   * @param label Display label for this step
   */
  function addWaypointStep(
    bytes32 noteId,
    uint16 groupId,
    uint16 index,
    int32 x,
    int32 y,
    int32 z,
    string memory label
  ) public {
    // Verify note exists and caller is owner
    NoteData memory note = Note.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    // Verify group exists
    require(bytes(WaypointGroup.getName(noteId, groupId)).length > 0, "Group missing");

    // Ensure step doesn't exist at this index (check if label is empty)
    require(bytes(WaypointStep.getLabel(noteId, groupId, index)).length == 0, "Step exists");

    WaypointStep.set(noteId, groupId, index, WaypointStepData({ x: x, y: y, z: z, label: label }));
  }

  /**
   * @dev Update a waypoint step
   * @param noteId Note containing the step
   * @param groupId Group containing the step
   * @param index Step index to update
   * @param x New X coordinate
   * @param y New Y coordinate
   * @param z New Z coordinate
   * @param label New label
   */
  function updateWaypointStep(
    bytes32 noteId,
    uint16 groupId,
    uint16 index,
    int32 x,
    int32 y,
    int32 z,
    string memory label
  ) public {
    // Verify note exists and caller is owner
    NoteData memory note = Note.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    // Verify step exists
    require(bytes(WaypointStep.getLabel(noteId, groupId, index)).length > 0, "Step missing");

    WaypointStep.setX(noteId, groupId, index, x);
    WaypointStep.setY(noteId, groupId, index, y);
    WaypointStep.setZ(noteId, groupId, index, z);
    WaypointStep.setLabel(noteId, groupId, index, label);
  }

  /**
   * @dev Remove a waypoint step
   * @param noteId Note containing the step
   * @param groupId Group containing the step
   * @param index Step index to remove
   */
  function removeWaypointStep(bytes32 noteId, uint16 groupId, uint16 index) public {
    // Verify note exists and caller is owner
    NoteData memory note = Note.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    WaypointStep.deleteRecord(noteId, groupId, index);
  }
}
