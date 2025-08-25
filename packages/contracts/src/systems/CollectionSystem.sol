// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Collection, CollectionData } from "../codegen/tables/Collection.sol";
import { CollectionPosts } from "../codegen/tables/CollectionPosts.sol";
import { IsEditor } from "../codegen/tables/IsEditor.sol";
import { IsEditor } from "../codegen/tables/IsEditor.sol";
import { LastEditorPublication } from "../codegen/tables/LastEditorPublication.sol";
import { IsEditorPublication } from "../codegen/tables/IsEditorPublication.sol";
import { encodePlayerEntityId } from "../Libraries/PlayerEntityIdLib.sol";

contract CollectionSystem is System {
  /**
   * @dev Create a new collection
   * @param title Collection title
   * @param description Collection description
   * @param coverImage Collection cover image
   * @param postIds Array of post IDs to include in the collection
   */
  function createCollection(
    string memory title,
    string memory description,
    string memory coverImage,
    bytes32[] memory postIds
  ) public returns (bytes32) {
    bytes32 collectionId = keccak256(abi.encodePacked(_msgSender(), block.timestamp, title));

    // Ensure the collection does not already exist (owner == address(0) sentinel)
    require(Collection.getOwner(collectionId) == address(0), "Collection exists");

    uint64 currentTime = uint64(block.timestamp);

    Collection.set(
        collectionId,
        CollectionData({
          createdAt: currentTime,
          owner: _msgSender(),
          updatedAt: currentTime,
          coverImage: coverImage,
          description: description,
          title: title
        })
      );

    require(postIds.length > 0, "Collection must have at least one post");
    require(postIds.length <= 5, "Collection cannot have more than 5 posts");

    CollectionPosts.set(
      collectionId,
      postIds
    );


    bytes32 playerId = encodePlayerEntityId(_msgSender());
    if (IsEditor.get(playerId)) {
      uint64 timeSinceLastPublication = currentTime - LastEditorPublication.get(collectionId);
      if (timeSinceLastPublication < 7 days) {
        revert("Editor publication interval not met");
      }

      IsEditorPublication.set(collectionId, true);
      LastEditorPublication.set(collectionId, currentTime);
    }

    return collectionId;
  }

  /**
   * @dev Update collection metadata (owner only)
   * @param title Collection title
   * @param description Collection description
   * @param coverImage Collection cover image
   */
  function updateCollection(bytes32 collectionId, string memory title, string memory description, string memory coverImage) public returns (bytes32) {
    address owner = Collection.getOwner(collectionId);
    require(owner != address(0), "Collection does not exist");
    require(owner == _msgSender(), "Only owner can update collection");

    Collection.setTitle(collectionId, title);
    Collection.setDescription(collectionId, description);
    Collection.setCoverImage(collectionId, coverImage);
    Collection.setUpdatedAt(collectionId, uint64(block.timestamp));

    return collectionId;
  }

  /**
   * @dev Delete a collection (owner only)
   * @param collectionId The ID of the collection to delete
   */
  function deleteCollection(bytes32 collectionId) public returns (bytes32) {
    address owner = Collection.getOwner(collectionId);
    require(owner != address(0), "Collection does not exist");
    require(owner == _msgSender(), "Only owner can delete collection");

    Collection.deleteRecord(collectionId);
    CollectionPosts.deleteRecord(collectionId);

    return collectionId;
  }

  /**
   * @dev Add or update a post in a collection with an index (owner only)
   * @param collectionId The ID of the collection to update
   * @param postIds The IDs of the posts to add or update
   */
  function updateCollectionPosts(bytes32 collectionId, bytes32[] memory postIds) public returns (bytes32){
    address owner = Collection.getOwner(collectionId);
    require(owner != address(0), "Collection does not exist");
    require(owner == _msgSender(), "Only owner can modify collection");
    require(postIds.length > 0, "Collection must have at least one post");
    require(postIds.length <= 5, "Collection cannot have more than 5 posts");

    Collection.setUpdatedAt(collectionId, uint64(block.timestamp));
    CollectionPosts.set(collectionId, postIds);

    return collectionId;
  }
}
