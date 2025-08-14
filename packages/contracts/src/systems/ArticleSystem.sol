// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { IsArticle, Post, PostAnchor, PostData } from "../codegen/index.sol";

contract ArticleSystem is System {
  /**
   * @dev Create a new article
   * @param title Article title
   * @param content Article content in markdown
   */
  function createArticle(string memory title, string memory content) public returns (bytes32) {
    bytes32 articleId = keccak256(abi.encodePacked(_msgSender(), block.timestamp, title));

    // Ensure article doesn't exist (check if owner is zero address)
    require(Post.getOwner(articleId) == address(0), "Article exists");

    uint64 timestamp = uint64(block.timestamp);

    Post.set(
      articleId,
      PostData({
        createdAt: timestamp,
        owner: _msgSender(),
        updatedAt: timestamp,
        content: content,
        coverImage: "",
        title: title,
        categories: new bytes32[](0)
      })
    );
    IsArticle.set(articleId, true);

    return articleId;
  }

  /**
   * @dev Update an existing article (owner only)
   * @param articleId Article to update
   * @param title New title
   * @param content New content
   */
  function updateArticle(bytes32 articleId, string memory title, string memory content) public {
    PostData memory article = Post.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    Post.setTitle(articleId, title);
    Post.setContent(articleId, content);
    Post.setCategories(articleId, new bytes32[](0));
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
}
