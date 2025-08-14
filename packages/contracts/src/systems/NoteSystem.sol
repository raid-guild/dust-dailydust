// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Category, IsNote, NoteCategories, Post, PostAnchor, PostData } from "../codegen/index.sol";

contract NoteSystem is System {
  /**
   * @dev Create a new note
   * @param title Note title
   * @param content Note content in markdown
   * @param categoryName Note category
   */
  function createNote(string memory title, string memory content, string memory categoryName) public returns (bytes32) {
    bytes32 noteId = keccak256(abi.encodePacked(_msgSender(), block.timestamp, title));
    // Ensure note doesn't exist (check if owner is zero address)
    require(Post.getOwner(noteId) == address(0), "Note exists");

    uint64 timestamp = uint64(block.timestamp);

    bytes32 category = keccak256(abi.encodePacked(categoryName));
    _validateNoteCategory(categoryName);

    bytes32[] memory categories = new bytes32[](1);
    categories[0] = category;

    Post.set(
      noteId,
      PostData({
        createdAt: timestamp,
        owner: _msgSender(),
        updatedAt: timestamp,
        content: content,
        coverImage: "",
        title: title,
        categories: categories
      })
    );
    IsNote.set(noteId, true);

    return noteId;
  }

  /**
   * @dev Create a new note and attach an anchor in the same call
   * @param title Note title
   * @param content Note content in markdown
   * @param categoryName Note category
   * @param entityId Entity to anchor to (bytes32)
   * @param coordX X coordinate cache
   * @param coordY Y coordinate cache
   * @param coordZ Z coordinate cache
   * @return noteId The newly created note id
   */
  function createNoteWithAnchor(
    string memory title,
    string memory content,
    string memory categoryName,
    bytes32 entityId,
    int32 coordX,
    int32 coordY,
    int32 coordZ
  ) public returns (bytes32) {
    bytes32 noteId = keccak256(abi.encodePacked(_msgSender(), block.timestamp, title));
    // Ensure note doesn't exist (check if owner is zero address)
    require(Post.getOwner(noteId) == address(0), "Note exists");

    uint64 timestamp = uint64(block.timestamp);

    bytes32 category = keccak256(abi.encodePacked(categoryName));
    _validateNoteCategory(categoryName);

    bytes32[] memory categories = new bytes32[](1);
    categories[0] = category;

    Post.set(
      noteId,
      PostData({
        createdAt: timestamp,
        owner: _msgSender(),
        updatedAt: timestamp,
        content: content,
        coverImage: "",
        title: title,
        categories: categories
      })
    );
    IsNote.set(noteId, true);

    // Set the anchor immediately
    PostAnchor.set(noteId, entityId, coordX, coordY, coordZ);

    return noteId;
  }

  /**
   * @dev Update an existing note (owner only)
   * @param noteId Note to update
   * @param title New title
   * @param content New content
   * @param categoryName New category
   */
  function updateNote(
    bytes32 noteId,
    string memory title,
    string memory content,
    string memory categoryName
  ) public returns (bytes32) {
    PostData memory note = Post.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    bytes32 category = keccak256(abi.encodePacked(categoryName));
    _validateNoteCategory(categoryName);

    bytes32[] memory categories = new bytes32[](1);
    categories[0] = category;

    Post.setTitle(noteId, title);
    Post.setContent(noteId, content);
    Post.setCategories(noteId, categories);
    Post.setUpdatedAt(noteId, uint64(block.timestamp));

    return noteId;
  }

  /**
   * @dev Delete a note (owner only)
   * @param noteId Note to delete
   */
  function deleteNote(bytes32 noteId) public returns (bytes32) {
    PostData memory note = Post.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    Post.deleteRecord(noteId);
    return noteId;
  }

  /**
   * @dev Create a anchor between a note and an entity
   * @param noteId Note to anchor
   * @param entityId Entity to anchor to
   * @param coordX X coordinate cache
   * @param coordY Y coordinate cache
   * @param coordZ Z coordinate cache
   */
  function createNoteAnchor(
    bytes32 noteId,
    bytes32 entityId,
    int32 coordX,
    int32 coordY,
    int32 coordZ
  ) public returns (bytes32) {
    // Verify note exists and caller is owner
    PostData memory note = Post.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    PostAnchor.set(noteId, entityId, coordX, coordY, coordZ);
    return noteId;
  }

  /**
   * @dev Remove a anchor between a note and an entity
   * @param noteId Note to unanchor
   */
  function removeNoteAnchor(bytes32 noteId) public returns (bytes32) {
    // Verify note exists and caller is owner
    PostData memory note = Post.get(noteId);
    require(note.owner == _msgSender(), "Not owner");

    PostAnchor.deleteRecord(noteId);
    return noteId;
  }

  function _validateNoteCategory(string memory categoryName) internal view {
    bytes32 category = keccak256(abi.encodePacked(categoryName));
    string memory existingCategoryName = Category.get(category);
    bytes32 existingCategory = keccak256(abi.encodePacked(existingCategoryName));
    require(existingCategory == category, "Invalid category");

    bytes32[] memory noteCategories = NoteCategories.get();
    bool isValid = false;
    for (uint256 i = 0; i < noteCategories.length; i++) {
      if (noteCategories[i] == category) {
        isValid = true;
        break;
      }
    }
    require(isValid, "Invalid category");
  }
}
