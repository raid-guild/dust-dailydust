// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Article, ArticleData } from "../codegen/tables/Article.sol";
import { Tag } from "../codegen/tables/Tag.sol";
import { TagArticle } from "../codegen/tables/TagArticle.sol";

contract TagSystem is System {
  // Events for tracking
  event TagCreated(bytes32 indexed tagHash, string tagString);
  event ArticleTagged(bytes32 indexed articleId, bytes32 indexed tagHash, string tagString);
  event ArticleUntagged(bytes32 indexed articleId, bytes32 indexed tagHash);

  /**
   * @dev Create a new tag (if it doesn't exist) and add it to an article
   * @param articleId Article to tag
   * @param tagString Tag string to add
   */
  function addTagToArticle(bytes32 articleId, string memory tagString) public {
    // Verify article exists and caller is owner
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    // Normalize tag string (lowercase, trim)
    string memory normalizedTag = _normalizeTag(tagString);
    bytes32 tagHash = keccak256(abi.encodePacked(normalizedTag));

    // Create tag if it doesn't exist
    string memory existingTagString = Tag.get(tagHash);
    if (bytes(existingTagString).length == 0) {
      Tag.set(tagHash, normalizedTag);
      emit TagCreated(tagHash, normalizedTag);
    }

    // Check if article is already tagged with this tag (use TagArticle mapping)
    uint8 alreadyTagged = TagArticle.get(tagHash, articleId);
    require(alreadyTagged == 0, "Already tagged");

    // Add tag to article (single canonical index: tag -> article)
    TagArticle.set(tagHash, articleId, 1);

    emit ArticleTagged(articleId, tagHash, normalizedTag);
  }

  /**
   * @dev Remove a tag from an article
   * @param articleId Article to untag
   * @param tagString Tag string to remove
   */
  function removeTagFromArticle(bytes32 articleId, string memory tagString) public {
    // Verify article exists and caller is owner
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    string memory normalizedTag = _normalizeTag(tagString);
    bytes32 tagHash = keccak256(abi.encodePacked(normalizedTag));

    // Check if article has this tag
    uint8 isTagged = TagArticle.get(tagHash, articleId);
    require(isTagged != 0, "Not tagged");

    // Remove tag from article (remove canonical index)
    TagArticle.deleteRecord(tagHash, articleId);

    emit ArticleUntagged(articleId, tagHash);
  }

  /**
   * @dev Add multiple tags to an article at once
   * @param articleId Article to tag
   * @param tags Array of tag strings to add
   */
  function addTagsToArticle(bytes32 articleId, string[] memory tags) public {
    // Verify article exists and caller is owner
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    for (uint256 i = 0; i < tags.length; i++) {
      string memory normalizedTag = _normalizeTag(tags[i]);
      bytes32 tagHash = keccak256(abi.encodePacked(normalizedTag));

      // Create tag if it doesn't exist
      string memory existingTagString = Tag.get(tagHash);
      if (bytes(existingTagString).length == 0) {
        Tag.set(tagHash, normalizedTag);
        emit TagCreated(tagHash, normalizedTag);
      }

      // Add tag if not already present
      uint8 alreadyTagged = TagArticle.get(tagHash, articleId);
      if (alreadyTagged == 0) {
        TagArticle.set(tagHash, articleId, 1);
        emit ArticleTagged(articleId, tagHash, normalizedTag);
      }
    }
  }

  /**
   * @dev Remove multiple tags from an article at once
   * @param articleId Article to untag
   * @param tags Array of tag strings to remove
   */
  function removeTagsFromArticle(bytes32 articleId, string[] memory tags) public {
    // Verify article exists and caller is owner
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    for (uint256 i = 0; i < tags.length; i++) {
      string memory normalizedTag = _normalizeTag(tags[i]);
      bytes32 tagHash = keccak256(abi.encodePacked(normalizedTag));

      // Remove tag if present
      uint8 isTagged = TagArticle.get(tagHash, articleId);
      if (isTagged != 0) {
        TagArticle.deleteRecord(tagHash, articleId);
        emit ArticleUntagged(articleId, tagHash);
      }
    }
  }

  /**
   * @dev Get tag hash from tag string
   * @param tagString Tag string
   * @return Tag hash
   */
  function getTagHash(string memory tagString) public pure returns (bytes32) {
    string memory normalizedTag = _normalizeTag(tagString);
    return keccak256(abi.encodePacked(normalizedTag));
  }

  /**
   * @dev Check if an article has a specific tag
   * @param articleId Article to check
   * @param tagString Tag string to check for
   * @return Whether article has the tag
   */
  function articleHasTag(bytes32 articleId, string memory tagString) public view returns (bool) {
    bytes32 tagHash = getTagHash(tagString);
    return TagArticle.get(tagHash, articleId) != 0;
  }

  /**
   * @dev Check if a tag exists in the system
   * @param tagString Tag string to check
   * @return Whether tag exists
   */
  function tagExists(string memory tagString) public view returns (bool) {
    bytes32 tagHash = getTagHash(tagString);
    string memory tagStr = Tag.get(tagHash);
    return bytes(tagStr).length > 0;
  }

  /**
   * @dev Get tag data by tag string
   * @param tagString Tag string
   * @return Tag data
   */
  function getTagByString(string memory tagString) public view returns (string memory) {
    bytes32 tagHash = getTagHash(tagString);
    return Tag.get(tagHash);
  }

  /**
   * @dev Internal function to normalize tag strings
   * @param tagString Raw tag string
   * @return Normalized tag string (lowercase, trimmed)
   */
  function _normalizeTag(string memory tagString) internal pure returns (string memory) {
    // This is a simplified normalization - in practice you might want more sophisticated processing
    // For now, just return as-is (could add lowercase conversion, trimming, etc.)
    return tagString;
  }
}
