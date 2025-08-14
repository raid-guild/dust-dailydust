// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { ArticleCategories, Category, IsArticle, Post, PostAnchor, PostData } from "../codegen/index.sol";

contract ArticleSystem is System {
  /**
   * @dev Create a new article
   * @param title Article title
   * @param content Article content in markdown
   * @param categoryName Article category
   */
  function createArticle(
    string memory title,
    string memory content,
    string memory categoryName
  ) public returns (bytes32) {
    bytes32 articleId = keccak256(abi.encodePacked(_msgSender(), block.timestamp, title));

    // Ensure article doesn't exist (check if owner is zero address)
    require(Post.getOwner(articleId) == address(0), "Article exists");

    uint64 timestamp = uint64(block.timestamp);

    bytes32 category = keccak256(abi.encodePacked(categoryName));
    _validateArticleCategory(categoryName);

    bytes32[] memory categories = new bytes32[](1);
    categories[0] = category;

    Post.set(
      articleId,
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
    IsArticle.set(articleId, true);

    return articleId;
  }

  /**
   * @dev Create a new article and attach an anchor in the same call
   * @param title Article title
   * @param content Article content in markdown
   * @param categoryName Article category
   * @param entityId Entity to anchor to (bytes32)
   * @param coordX X coordinate cache
   * @param coordY Y coordinate cache
   * @param coordZ Z coordinate cache
   * @return articleId The newly created article id
   */
  function createArticleWithAnchor(
    string memory title,
    string memory content,
    string memory categoryName,
    bytes32 entityId,
    int32 coordX,
    int32 coordY,
    int32 coordZ
  ) public returns (bytes32) {
    bytes32 articleId = keccak256(abi.encodePacked(_msgSender(), block.timestamp, title));

    // Ensure article doesn't exist (check if owner is zero address)
    require(Post.getOwner(articleId) == address(0), "Article exists");

    uint64 timestamp = uint64(block.timestamp);

    bytes32 category = keccak256(abi.encodePacked(categoryName));
    _validateArticleCategory(categoryName);

    bytes32[] memory categories = new bytes32[](1);
    categories[0] = category;

    Post.set(
      articleId,
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
    IsArticle.set(articleId, true);

    // Set the anchor immediately
    PostAnchor.set(articleId, entityId, coordX, coordY, coordZ);

    return articleId;
  }

  /**
   * @dev Update an existing article (owner only)
   * @param articleId Article to update
   * @param title New title
   * @param content New content
   * @param categoryName New category
   */
  function updateArticle(
    bytes32 articleId,
    string memory title,
    string memory content,
    string memory categoryName
  ) public {
    PostData memory article = Post.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    bytes32 category = keccak256(abi.encodePacked(categoryName));
    _validateArticleCategory(categoryName);

    bytes32[] memory categories = new bytes32[](1);
    categories[0] = category;

    Post.setTitle(articleId, title);
    Post.setContent(articleId, content);
    Post.setCategories(articleId, categories);
    Post.setUpdatedAt(articleId, uint64(block.timestamp));
  }

  /**
   * @dev Delete an article (owner only)
   * @param articleId Article to delete
   */
  function deleteArticle(bytes32 articleId) public {
    PostData memory article = Post.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    Post.deleteRecord(articleId);
  }

  /**
   * @dev Create a anchor between a article and an entity
   * @param articleId Article to anchor
   * @param entityId Entity to anchor to
   * @param coordX X coordinate cache
   * @param coordY Y coordinate cache
   * @param coordZ Z coordinate cache
   */
  function createArticleAnchor(bytes32 articleId, bytes32 entityId, int32 coordX, int32 coordY, int32 coordZ) public {
    // Verify article exists and caller is owner
    PostData memory article = Post.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    // pass empty extra metadata for now
    PostAnchor.set(articleId, entityId, coordX, coordY, coordZ);
  }

  /**
   * @dev Remove a anchor between a article and an entity
   * @param articleId Article to unanchor
   */
  function removeArticleAnchor(bytes32 articleId) public {
    // Verify article exists and caller is owner
    PostData memory article = Post.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    PostAnchor.deleteRecord(articleId);
  }

  function _validateArticleCategory(string memory categoryName) internal view {
    bytes32 category = keccak256(abi.encodePacked(categoryName));
    string memory existingCategoryName = Category.get(category);
    bytes32 existingCategory = keccak256(abi.encodePacked(existingCategoryName));
    require(existingCategory == category, "Invalid category");

    bytes32[] memory articleCategories = ArticleCategories.get();
    bool isValid = false;
    for (uint256 i = 0; i < articleCategories.length; i++) {
      if (articleCategories[i] == category) {
        isValid = true;
        break;
      }
    }
    require(isValid, "Invalid category");
  }
}
