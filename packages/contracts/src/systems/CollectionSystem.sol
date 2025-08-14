// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Collection } from "../codegen/tables/Collection.sol";
import { CollectionPost } from "../codegen/tables/CollectionPost.sol";

contract CollectionSystem is System {
  /**
   * @dev Create a new collection owned by msg.sender
   */
  function createCollection(bytes32 collectionId, string memory title, string memory description) public {
    // Ensure the collection does not already exist (owner == address(0) sentinel)
    require(Collection.getOwner(collectionId) == address(0), "Collection already exists");

    uint64 ts = uint64(block.timestamp);

    Collection.set(collectionId, ts, _msgSender(), ts, "", description, title);
  }

  /**
   * @dev Update collection metadata (owner only)
   */
  function updateCollection(bytes32 collectionId, string memory title, string memory description) public {
    address owner = Collection.getOwner(collectionId);
    require(owner != address(0), "Collection does not exist");
    require(owner == _msgSender(), "Only owner can update collection");

    Collection.setTitle(collectionId, title);
    Collection.setDescription(collectionId, description);
    Collection.setUpdatedAt(collectionId, uint64(block.timestamp));
  }

  /**
   * @dev Delete a collection (owner only)
   */
  function deleteCollection(bytes32 collectionId) public {
    address owner = Collection.getOwner(collectionId);
    require(owner != address(0), "Collection does not exist");
    require(owner == _msgSender(), "Only owner can delete collection");

    // Note: Any existing CollectionPost entries remain; a cleanup routine could be added if needed.
    Collection.deleteRecord(collectionId);
  }

  /**
   * @dev Add or update a note in a collection with an index (owner only)
   */
  function addNoteToCollection(bytes32 collectionId, bytes32 noteId, uint16 index) public {
    address owner = Collection.getOwner(collectionId);
    require(owner != address(0), "Collection does not exist");
    require(owner == _msgSender(), "Only owner can modify collection");

    // Idempotent upsert; no uniqueness guard beyond (collectionId, noteId) key
    CollectionPost.setIndex(collectionId, noteId, index);

    // Touch updatedAt for the collection
    Collection.setUpdatedAt(collectionId, uint64(block.timestamp));
  }

  /**
   * @dev Remove a note from a collection (owner only)
   */
  function removeNoteFromCollection(bytes32 collectionId, bytes32 noteId) public {
    address owner = Collection.getOwner(collectionId);
    require(owner != address(0), "Collection does not exist");
    require(owner == _msgSender(), "Only owner can modify collection");

    CollectionPost.deleteRecord(collectionId, noteId);
    Collection.setUpdatedAt(collectionId, uint64(block.timestamp));
  }

  /**
   * @dev Transfer ownership of a collection
   */
  function transferCollectionOwnership(bytes32 collectionId, address newOwner) public {
    address owner = Collection.getOwner(collectionId);
    require(owner != address(0), "Collection does not exist");
    require(owner == _msgSender(), "Only owner can transfer");
    require(newOwner != address(0), "Invalid owner");

    Collection.setOwner(collectionId, newOwner);
    Collection.setUpdatedAt(collectionId, uint64(block.timestamp));
  }
}
