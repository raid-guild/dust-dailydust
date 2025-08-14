// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { FeaturedArticle } from "../codegen/tables/FeaturedArticle.sol";
import { ArticleFeatured } from "../codegen/tables/ArticleFeatured.sol";
import { EditorRole, EditorRoleData } from "../codegen/tables/EditorRole.sol";
import { Article, ArticleData } from "../../cms/codegen/tables/Article.sol";

contract FeaturedSystem is System {
  // Events for tracking
  // Renamed event to avoid collision with generated library `ArticleFeatured`
  event ArticleFeaturedEvent(bytes32 indexed articleId, uint32 indexed date, uint8 slot, address editor);
  event ArticleUnfeatured(bytes32 indexed articleId, uint32 indexed date, uint8 slot, address editor);
  event DailyDigestUpdated(uint32 indexed date, address editor);

  // Modifier to check editor permissions
  modifier onlyEditor() {
    EditorRoleData memory role = EditorRole.get(_msgSender());
    require(role.grantedAt > 0, "Editor role required");
    _;
  }

  /**
   * @dev Feature an article in a specific slot for a specific date
   * @param date Date in YYYYMMDD format
   * @param slot Position in daily digest (0-9)
   * @param articleId Article to feature
   */
  function featureArticle(
    uint32 date,
    uint8 slot,
    bytes32 articleId
  ) public onlyEditor {
    require(slot <= 9, "Invalid slot (0-9)");
    require(date > 0, "Invalid date");

    // Verify article exists
    ArticleData memory article = Article.get(articleId);
    require(article.owner != address(0), "Article does not exist");

    // Check if slot is already occupied
    bytes32 existingArticleId = FeaturedArticle.getArticleId(date, slot);
    if (existingArticleId != bytes32(0)) {
      // Remove previous article from featured list
      ArticleFeatured.deleteRecord(existingArticleId, date);
      emit ArticleUnfeatured(existingArticleId, date, slot, _msgSender());
    }

    // Add new featured article
    FeaturedArticle.set(date, slot, articleId);
    ArticleFeatured.set(articleId, date, slot);

    emit ArticleFeaturedEvent(articleId, date, slot, _msgSender());
  }

  /**
   * @dev Remove an article from featured list
   * @param date Date in YYYYMMDD format
   * @param slot Position in daily digest
   */
  function unfeatureArticle(uint32 date, uint8 slot) public onlyEditor {
    require(slot <= 9, "Invalid slot (0-9)");

    bytes32 articleId = FeaturedArticle.getArticleId(date, slot);
    require(articleId != bytes32(0), "No article featured in this slot");

    // Remove from both tables
    FeaturedArticle.deleteRecord(date, slot);
    ArticleFeatured.deleteRecord(articleId, date);

    emit ArticleUnfeatured(articleId, date, slot, _msgSender());
  }

  /**
   * @dev Feature multiple articles for a date (complete daily digest)
   * @param date Date in YYYYMMDD format
   * @param articleIds Array of article IDs (up to 10)
   */
  function setDailyDigest(
    uint32 date,
    bytes32[] memory articleIds
  ) public onlyEditor {
    require(articleIds.length <= 10, "Maximum 10 articles per day");
    require(date > 0, "Invalid date");

    // Clear existing featured articles for this date
    for (uint8 i = 0; i < 10; i++) {
      bytes32 existingArticleId = FeaturedArticle.getArticleId(date, i);
      if (existingArticleId != bytes32(0)) {
        FeaturedArticle.deleteRecord(date, i);
        ArticleFeatured.deleteRecord(existingArticleId, date);
      }
    }

    // Set new featured articles
    for (uint256 i = 0; i < articleIds.length; i++) {
      if (articleIds[i] != bytes32(0)) {
        // Verify article exists
        ArticleData memory article = Article.get(articleIds[i]);
        require(article.owner != address(0), "Article does not exist");

        FeaturedArticle.set(date, uint8(i), articleIds[i]);
        ArticleFeatured.set(articleIds[i], date, uint8(i));

        emit ArticleFeaturedEvent(articleIds[i], date, uint8(i), _msgSender());
      }
    }

    emit DailyDigestUpdated(date, _msgSender());
  }

  /**
   * @dev Move a featured article to a different slot
   * @param date Date in YYYYMMDD format
   * @param fromSlot Current slot
   * @param toSlot New slot
   */
  function moveFeaturedArticle(
    uint32 date,
    uint8 fromSlot,
    uint8 toSlot
  ) public onlyEditor {
    require(fromSlot <= 9 && toSlot <= 9, "Invalid slot (0-9)");
    require(fromSlot != toSlot, "Same slot");

    bytes32 articleId = FeaturedArticle.getArticleId(date, fromSlot);
    require(articleId != bytes32(0), "No article in source slot");

    bytes32 targetArticleId = FeaturedArticle.getArticleId(date, toSlot);
    require(targetArticleId == bytes32(0), "Target slot occupied");

    // Move article
    FeaturedArticle.deleteRecord(date, fromSlot);
    FeaturedArticle.set(date, toSlot, articleId);

    // Update reverse index
    ArticleFeatured.setSlot(articleId, date, toSlot);

    emit ArticleUnfeatured(articleId, date, fromSlot, _msgSender());
    emit ArticleFeaturedEvent(articleId, date, toSlot, _msgSender());
  }

  /**
   * @dev Swap two featured articles' positions
   * @param date Date in YYYYMMDD format
   * @param slot1 First slot
   * @param slot2 Second slot
   */
  function swapFeaturedArticles(
    uint32 date,
    uint8 slot1,
    uint8 slot2
  ) public onlyEditor {
    require(slot1 <= 9 && slot2 <= 9, "Invalid slot (0-9)");
    require(slot1 != slot2, "Same slot");

    bytes32 articleId1 = FeaturedArticle.getArticleId(date, slot1);
    bytes32 articleId2 = FeaturedArticle.getArticleId(date, slot2);

    if (articleId1 != bytes32(0)) {
      FeaturedArticle.set(date, slot2, articleId1);
      ArticleFeatured.setSlot(articleId1, date, slot2);
    } else {
      FeaturedArticle.deleteRecord(date, slot2);
    }

    if (articleId2 != bytes32(0)) {
      FeaturedArticle.set(date, slot1, articleId2);
      ArticleFeatured.setSlot(articleId2, date, slot1);
    } else {
      FeaturedArticle.deleteRecord(date, slot1);
    }

    emit DailyDigestUpdated(date, _msgSender());
  }

  /**
   * @dev Get featured article for a specific date and slot
   * @param date Date in YYYYMMDD format
   * @param slot Slot position (0-9)
   * @return Article ID (bytes32(0) if no article)
   */
  function getFeaturedArticle(uint32 date, uint8 slot) public view returns (bytes32) {
    require(slot <= 9, "Invalid slot (0-9)");
    return FeaturedArticle.getArticleId(date, slot);
  }

  /**
   * @dev Get all featured articles for a specific date
   * @param date Date in YYYYMMDD format
   * @return Array of article IDs (empty slots will be bytes32(0))
   */
  function getDailyDigest(uint32 date) public view returns (bytes32[10] memory) {
    bytes32[10] memory digest;
    for (uint8 i = 0; i < 10; i++) {
      digest[i] = FeaturedArticle.getArticleId(date, i);
    }
    return digest;
  }

  /**
   * @dev Check if an article is featured on a specific date
   * @param articleId Article to check
   * @param date Date to check
   * @return Whether article is featured and its slot
   */
  function isArticleFeatured(bytes32 articleId, uint32 date) public view returns (bool, uint8) {
    uint8 slot = ArticleFeatured.getSlot(articleId, date);

    // Validate by checking the forward index for the given date and slot
    if (slot <= 9) {
      bytes32 existing = FeaturedArticle.getArticleId(date, slot);
      if (existing == articleId) {
        return (true, slot);
      }
    }
    return (false, 0);
  }

  /**
   * @dev Get today's date in YYYYMMDD format
   * @return Today's date
   */
  function getTodayDate() public view returns (uint32) {
    // Convert timestamp to YYYYMMDD format
    uint256 timestamp = block.timestamp;
    uint256 daysSinceEpoch = timestamp / 86400;
    
    // Convert to YYYYMMDD (simplified calculation)
    // Note: This is a basic calculation and may not handle all edge cases
    uint256 year = 1970 + (daysSinceEpoch * 400) / 146097;
    uint256 month = ((daysSinceEpoch % 365) * 12) / 365 + 1;
    uint256 day = (daysSinceEpoch % 365) % 30 + 1;
    
    // Clamp values to valid ranges
    if (month > 12) month = 12;
    if (day > 31) day = 31;
    
    return uint32(year * 10000 + month * 100 + day);
  }

  /**
   * @dev Get featured articles count for a date
   * @param date Date in YYYYMMDD format
   * @return Number of featured articles for the date
   */
  function getFeaturedCount(uint32 date) public view returns (uint8) {
    uint8 count = 0;
    for (uint8 i = 0; i < 10; i++) {
      if (FeaturedArticle.getArticleId(date, i) != bytes32(0)) {
        count++;
      }
    }
    return count;
  }

  /**
   * @dev Copy featured articles from one date to another
   * @param fromDate Source date
   * @param toDate Target date
   */
  function copyDailyDigest(uint32 fromDate, uint32 toDate) public onlyEditor {
    require(fromDate != toDate, "Same date");
    
    bytes32[10] memory sourceDigest = getDailyDigest(fromDate);
    
    // Filter out empty slots
    bytes32[] memory articles = new bytes32[](10);
    uint256 count = 0;
    for (uint8 i = 0; i < 10; i++) {
      if (sourceDigest[i] != bytes32(0)) {
        articles[count] = sourceDigest[i];
        count++;
      }
    }
    
    // Resize array to actual count
    bytes32[] memory finalArticles = new bytes32[](count);
    for (uint256 i = 0; i < count; i++) {
      finalArticles[i] = articles[i];
    }
     
    setDailyDigest(toDate, finalArticles);
   }
 }
