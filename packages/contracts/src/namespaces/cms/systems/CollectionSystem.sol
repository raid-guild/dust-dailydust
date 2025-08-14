// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Collection, CollectionData } from "../codegen/tables/Collection.sol";
import { CollectionByType } from "../codegen/tables/CollectionByType.sol";
import { CollectionArticle } from "../codegen/tables/CollectionArticle.sol";
import { ArticleCollection } from "../codegen/tables/ArticleCollection.sol";
import { Article, ArticleData } from "../codegen/tables/Article.sol";
import { EditorRole, EditorRoleData } from "../../dailydust/codegen/tables/EditorRole.sol";

contract CollectionSystem is System {
  // Collection types
  uint8 public constant TYPE_REGULAR = 0;
  uint8 public constant TYPE_FRONTPAGE = 1;
  uint8 public constant TYPE_SPECIAL = 2;

  // Events for tracking
  event CollectionCreated(bytes32 indexed collectionId, address indexed owner, uint8 collectionType);
  event CollectionUpdated(bytes32 indexed collectionId, address indexed owner);
  event CollectionDeleted(bytes32 indexed collectionId, address indexed owner);
  event ArticleAddedToCollection(bytes32 indexed collectionId, bytes32 indexed articleId, uint16 index);
  event ArticleRemovedFromCollection(bytes32 indexed collectionId, bytes32 indexed articleId);
  event CollectionReordered(bytes32 indexed collectionId);

  /**
   * @dev Create a new collection
   * @param collectionId Unique identifier for the collection
   * @param collectionType Type of collection (0=regular, 1=frontpage, 2=special)
   * @param title Collection title
   * @param description Collection description
   * @param headerImageUrl Optional header image URL
   * @param featured Whether collection is featured
   */
  function createCollection(
    bytes32 collectionId,
    uint8 collectionType,
    string memory title,
    string memory description,
    string memory headerImageUrl,
    bool featured
  ) public {
    // Ensure the collection does not already exist
    require(Collection.getOwner(collectionId) == address(0), "Collection exists");
    require(collectionType <= TYPE_SPECIAL, "Invalid type");

    // Check permissions for frontpage collections
    if (collectionType == TYPE_FRONTPAGE) {
      EditorRoleData memory role = EditorRole.get(_msgSender());
      require(role.grantedAt > 0 && role.role >= 0, "Editor role required");
    }

    uint64 timestamp = uint64(block.timestamp);

    // Create collection record
    Collection.set(
      collectionId,
      CollectionData({
        owner: _msgSender(),
        createdAt: timestamp,
        updatedAt: timestamp,
        collectionType: collectionType,
        featured: featured ? 1 : 0,
        title: title,
        description: description,
        headerImageUrl: headerImageUrl,
        extra: ""
      })
    );

    // Add to type index
    // CollectionByType.set(collectionType, timestamp, collectionId);
    // TODO: Re-enable index insertion after regenerating tables to include a value field for CollectionByType

    emit CollectionCreated(collectionId, _msgSender(), collectionType);
  }

  /**
   * @dev Update collection metadata (owner only)
   * @param collectionId Collection to update
   * @param title New title
   * @param description New description
   * @param headerImageUrl New header image URL
   * @param featured Whether collection is featured
   */
  function updateCollection(
    bytes32 collectionId,
    string memory title,
    string memory description,
    string memory headerImageUrl,
    bool featured
  ) public {
    CollectionData memory collection = Collection.get(collectionId);
    require(collection.owner != address(0), "Collection does not exist");
    require(collection.owner == _msgSender(), "Not owner");

    Collection.setTitle(collectionId, title);
    Collection.setDescription(collectionId, description);
    Collection.setHeaderImageUrl(collectionId, headerImageUrl);
    Collection.setFeatured(collectionId, featured ? 1 : 0);
    Collection.setUpdatedAt(collectionId, uint64(block.timestamp));

    emit CollectionUpdated(collectionId, _msgSender());
  }

  /**
   * @dev Delete a collection (owner only)
   * @param collectionId Collection to delete
   */
  function deleteCollection(bytes32 collectionId) public {
    CollectionData memory collection = Collection.get(collectionId);
    require(collection.owner != address(0), "Collection does not exist");
    require(collection.owner == _msgSender(), "Not owner");

    // Remove from type index
    CollectionByType.deleteRecord(collection.collectionType, collection.createdAt, collectionId);

    // TODO: Clean up CollectionArticle and ArticleCollection entries
    // This would require iterating through articles, which is gas-intensive
    // Consider implementing a separate cleanup function or handling on the client side

    Collection.deleteRecord(collectionId);

    emit CollectionDeleted(collectionId, _msgSender());
  }

  /**
   * @dev Add an article to a collection
   * @param collectionId Collection to add to
   * @param articleId Article to add
   * @param index Position in the collection (for ordering)
   */
  function addArticleToCollection(bytes32 collectionId, bytes32 articleId, uint16 index) public {
    CollectionData memory collection = Collection.get(collectionId);
    require(collection.owner != address(0), "Collection does not exist");
    require(collection.owner == _msgSender(), "Not owner");

    // Verify article exists
    ArticleData memory article = Article.get(articleId);
    require(article.owner != address(0), "Article does not exist");

    // Check if article is already in collection
    bytes32 existingArticleId = CollectionArticle.getArticleId(collectionId, index);
    require(existingArticleId == bytes32(0), "Index occupied");

    // Add to collection
    CollectionArticle.set(collectionId, index, articleId);

    // Add reverse index
    ArticleCollection.set(articleId, collectionId, 1);

    Collection.setUpdatedAt(collectionId, uint64(block.timestamp));

    emit ArticleAddedToCollection(collectionId, articleId, index);
  }

  /**
   * @dev Remove an article from a collection
   * @param collectionId Collection to remove from
   * @param index Index of article to remove
   */
  function removeArticleFromCollection(bytes32 collectionId, uint16 index) public {
    CollectionData memory collection = Collection.get(collectionId);
    require(collection.owner != address(0), "Collection does not exist");
    require(collection.owner == _msgSender(), "Not owner");

    bytes32 articleId = CollectionArticle.getArticleId(collectionId, index);
    require(articleId != bytes32(0), "No article at index");

    // Remove from collection
    CollectionArticle.deleteRecord(collectionId, index);

    // Remove reverse index
    ArticleCollection.deleteRecord(articleId, collectionId);

    Collection.setUpdatedAt(collectionId, uint64(block.timestamp));

    emit ArticleRemovedFromCollection(collectionId, articleId);
  }

  /**
   * @dev Move an article to a different position in the collection
   * @param collectionId Collection to reorder
   * @param fromIndex Current index of article
   * @param toIndex New index for article
   */
  function moveArticleInCollection(bytes32 collectionId, uint16 fromIndex, uint16 toIndex) public {
    CollectionData memory collection = Collection.get(collectionId);
    require(collection.owner != address(0), "Collection does not exist");
    require(collection.owner == _msgSender(), "Not owner");
    require(fromIndex != toIndex, "Same index");

    bytes32 articleId = CollectionArticle.getArticleId(collectionId, fromIndex);
    require(articleId != bytes32(0), "No article at from index");

    bytes32 targetArticleId = CollectionArticle.getArticleId(collectionId, toIndex);
    require(targetArticleId == bytes32(0), "Target index occupied");

    // Move article
    CollectionArticle.deleteRecord(collectionId, fromIndex);
    CollectionArticle.set(collectionId, toIndex, articleId);

    Collection.setUpdatedAt(collectionId, uint64(block.timestamp));

    emit CollectionReordered(collectionId);
  }

  /**
   * @dev Transfer collection ownership
   * @param collectionId Collection to transfer
   * @param newOwner New owner address
   */
  function transferCollectionOwnership(bytes32 collectionId, address newOwner) public {
    CollectionData memory collection = Collection.get(collectionId);
    require(collection.owner != address(0), "Collection does not exist");
    require(collection.owner == _msgSender(), "Not owner");
    require(newOwner != address(0), "Invalid address");

    Collection.setOwner(collectionId, newOwner);
    Collection.setUpdatedAt(collectionId, uint64(block.timestamp));

    emit CollectionUpdated(collectionId, newOwner);
  }

  /**
   * @dev Get collection data
   * @param collectionId Collection to query
   * @return Collection data
   */
  function getCollection(bytes32 collectionId) public view returns (CollectionData memory) {
    return Collection.get(collectionId);
  }

  /**
   * @dev Check if an article is in a collection
   * @param articleId Article to check
   * @param collectionId Collection to check
   * @return Whether article is in collection
   */
  function isArticleInCollection(bytes32 articleId, bytes32 collectionId) public view returns (bool) {
    uint8 exists = ArticleCollection.get(articleId, collectionId);
    return exists != 0;
  }
}
