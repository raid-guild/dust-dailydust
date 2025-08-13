// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Note, NoteData } from "../codegen/tables/Note.sol";
import { NoteLink } from "../codegen/tables/NoteLink.sol";

contract NoteSystem is System {
  /**
   * @dev Create a new note
   * @param noteId Unique identifier for the note
   * @param title Note title
   * @param content Note content in markdown
   * @param tags CSV string of tags
   */
  function createNote(bytes32 noteId, string memory title, string memory content, string memory tags) public {
    // Ensure note doesn't exist (check if owner is zero address)
    require(Note.getOwner(noteId) == address(0), "Note exists");

    uint64 timestamp = uint64(block.timestamp);

    Note.set(
      noteId,
      NoteData({
        owner: _msgSender(),
        createdAt: timestamp,
        updatedAt: timestamp,
        tipJar: _msgSender(), // Default to owner
        boostUntil: 0,
        totalTips: 0,
        title: title,
        kicker: "",
        content: content,
        tags: tags,
        headerImageUrl: ""
      })
    );
  }

  /**
   * @dev Update an existing note (owner only)
   * @param noteId Note to update
   * @param title New title
   * @param content New content
   * @param tags New tags
   */
  function updateNote(bytes32 noteId, string memory title, string memory content, string memory tags) public {
    NoteData memory note = Note.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    Note.setTitle(noteId, title);
    Note.setContent(noteId, content);
    Note.setTags(noteId, tags);
    Note.setUpdatedAt(noteId, uint64(block.timestamp));
  }

  /**
   * @dev Update the header image URL (owner only)
   */
  function updateHeaderImageUrl(bytes32 noteId, string memory newUrl) public {
    NoteData memory note = Note.get(noteId);
    require(note.owner == _msgSender(), "Not owner");
    Note.setHeaderImageUrl(noteId, newUrl);
    Note.setUpdatedAt(noteId, uint64(block.timestamp));
  }

  /**
   * @dev Update tip jar address (owner only)
   * @param noteId Note to update
   * @param newTipJar New tip jar address
   */
  function updateTipJar(bytes32 noteId, address newTipJar) public {
    NoteData memory note = Note.get(noteId);
    require(note.owner == _msgSender(), "Not owner");
    require(newTipJar != address(0), "Invalid address");

    Note.setTipJar(noteId, newTipJar);
  }

  /**
   * @dev Delete a note (owner only)
   * @param noteId Note to delete
   */
  function deleteNote(bytes32 noteId) public {
    NoteData memory note = Note.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    Note.deleteRecord(noteId);
  }

  /**
   * @dev Create a link between a note and an entity
   * @param noteId Note to link
   * @param entityId Entity to link to
   * @param linkType Type of link (0=anchor, 1=mirror, 2=embed)
   * @param coordX X coordinate cache
   * @param coordY Y coordinate cache
   * @param coordZ Z coordinate cache
   */
  function createNoteLink(
    bytes32 noteId,
    bytes32 entityId,
    uint8 linkType,
    int32 coordX,
    int32 coordY,
    int32 coordZ
  ) public {
    // Verify note exists and caller is owner
    NoteData memory note = Note.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    // pass empty extra metadata for now
    NoteLink.set(noteId, entityId, linkType, coordX, coordY, coordZ, "");
  }

  /**
   * @dev Remove a link between a note and an entity
   * @param noteId Note to unlink
   * @param entityId Entity to unlink from
   */
  function removeNoteLink(bytes32 noteId, bytes32 entityId) public {
    // Verify note exists and caller is owner
    NoteData memory note = Note.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    NoteLink.deleteRecord(noteId, entityId);
  }
}
