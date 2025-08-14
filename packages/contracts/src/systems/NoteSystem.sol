// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { NoteLink, Post, PostData } from "../codegen/index.sol";

contract NoteSystem is System {
  /**
   * @dev Create a new note
   * @param title Note title
   * @param content Note content in markdown
   */
  function createNote(string memory title, string memory content) public returns (bytes32) {
    bytes32 noteId = keccak256(abi.encodePacked(_msgSender(), block.timestamp, title));

    // Ensure note doesn't exist (check if owner is zero address)
    require(Post.getOwner(noteId) == address(0), "Note exists");

    uint64 timestamp = uint64(block.timestamp);

    Post.set(
      noteId,
      PostData({
        createdAt: timestamp,
        owner: _msgSender(),
        updatedAt: timestamp,
        content: content,
        title: title,
        categories: new bytes32[](0)
      })
    );

    return noteId;
  }

  /**
   * @dev Update an existing note (owner only)
   * @param noteId Note to update
   * @param title New title
   * @param content New content
   */
  function updateNote(bytes32 noteId, string memory title, string memory content) public {
    PostData memory note = Post.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    Post.setTitle(noteId, title);
    Post.setContent(noteId, content);
    Post.setCategories(noteId, new bytes32[](0));
    Post.setUpdatedAt(noteId, uint64(block.timestamp));
  }

  /**
   * @dev Delete a note (owner only)
   * @param noteId Note to delete
   */
  function deleteNote(bytes32 noteId) public {
    PostData memory note = Post.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    Post.deleteRecord(noteId);
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
    PostData memory note = Post.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    // pass empty extra metadata for now
    NoteLink.set(noteId, entityId, coordX, coordY, coordZ, linkType, "");
  }

  /**
   * @dev Remove a link between a note and an entity
   * @param noteId Note to unlink
   * @param entityId Entity to unlink from
   */
  function removeNoteLink(bytes32 noteId, bytes32 entityId) public {
    // Verify note exists and caller is owner
    PostData memory note = Post.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    NoteLink.deleteRecord(noteId, entityId);
  }
}
