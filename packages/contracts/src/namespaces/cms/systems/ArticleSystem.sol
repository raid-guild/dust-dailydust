// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Article, ArticleData } from "../codegen/tables/Article.sol";
import { ArticleByType } from "../codegen/tables/ArticleByType.sol";
import { ArticleByCategory } from "../codegen/tables/ArticleByCategory.sol";
import { ArticleByDate } from "../codegen/tables/ArticleByDate.sol";
import { ArticleLink } from "../../dailydust/codegen/tables/ArticleLink.sol";
import { LinkByEntity } from "../../dailydust/codegen/tables/LinkByEntity.sol";
import { TipJar } from "../codegen/tables/TipJar.sol";

contract ArticleSystem is System {
  // Events for tracking
  event ArticleCreated(bytes32 indexed articleId, address indexed owner, uint8 articleType, bytes32 category);
  event ArticleUpdated(bytes32 indexed articleId, address indexed owner);
  event ArticleDeleted(bytes32 indexed articleId, address indexed owner);
  event ArticleLinkCreated(bytes32 indexed articleId, bytes32 indexed entityId, uint8 linkType);
  event ArticleLinkRemoved(bytes32 indexed articleId, bytes32 indexed entityId);

  /**
   * @dev Create a new article
   * @param articleId Unique identifier for the article
   * @param articleType Type of article (0=article, 1=classified)
   * @param category Category hash for broad classification
   * @param title Article title
   * @param kicker Short deck/subhead for previews
   * @param content Article content in markdown
   * @param headerImageUrl Optional header image URL
   */
  function createArticle(
    bytes32 articleId,
    uint8 articleType,
    bytes32 category,
    string memory title,
    string memory kicker,
    string memory content,
    string memory headerImageUrl
  ) public {
    // Ensure article doesn't exist (check if owner is zero address)
    require(Article.getOwner(articleId) == address(0), "Article exists");

    uint64 timestamp = uint64(block.timestamp);
    uint32 date = uint32(((timestamp / 86400) * 86400) / 86400 + 719163); // Convert to YYYYMMDD format

    // Create main article record
    Article.set(
      articleId,
      ArticleData({
        owner: _msgSender(),
        createdAt: timestamp,
        updatedAt: timestamp,
        articleType: articleType,
        category: category,
        title: title,
        kicker: kicker,
        content: content,
        headerImageUrl: headerImageUrl
      })
    );

    // Create index entries for efficient querying
    ArticleByType.set(articleType, articleId, 1);
    if (category != bytes32(0)) {
      ArticleByCategory.set(category, articleId, 1);
    }
    ArticleByDate.set(date, articleId, timestamp);

    // Initialize tip jar (defaults to article owner)
    TipJar.set(articleId, _msgSender(), 0, 0, 1);

    emit ArticleCreated(articleId, _msgSender(), articleType, category);
  }

  /**
   * @dev Update an existing article (owner only)
   * @param articleId Article to update
   * @param title New title
   * @param kicker New kicker
   * @param content New content
   * @param headerImageUrl New header image URL
   */
  function updateArticle(
    bytes32 articleId,
    string memory title,
    string memory kicker,
    string memory content,
    string memory headerImageUrl
  ) public {
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    Article.setTitle(articleId, title);
    Article.setKicker(articleId, kicker);
    Article.setContent(articleId, content);
    Article.setHeaderImageUrl(articleId, headerImageUrl);
    Article.setUpdatedAt(articleId, uint64(block.timestamp));

    emit ArticleUpdated(articleId, _msgSender());
  }

  /**
   * @dev Update article category (owner only)
   * @param articleId Article to update
   * @param newCategory New category hash
   */
  function updateCategory(bytes32 articleId, bytes32 newCategory) public {
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    bytes32 oldCategory = article.category;

    // Update main record
    Article.setCategory(articleId, newCategory);
    Article.setUpdatedAt(articleId, uint64(block.timestamp));

    // Update category index
    if (oldCategory != bytes32(0)) {
      ArticleByCategory.deleteRecord(oldCategory, articleId);
    }
    if (newCategory != bytes32(0)) {
      ArticleByCategory.set(newCategory, articleId, 1);
    }

    emit ArticleUpdated(articleId, _msgSender());
  }

  /**
   * @dev Delete an article (owner only)
   * @param articleId Article to delete
   */
  function deleteArticle(bytes32 articleId) public {
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    uint32 date = uint32(((article.createdAt / 86400) * 86400) / 86400 + 719163);

    // Remove from indexes
    ArticleByType.deleteRecord(article.articleType, articleId);
    if (article.category != bytes32(0)) {
      ArticleByCategory.deleteRecord(article.category, articleId);
    }
    ArticleByDate.deleteRecord(date, articleId);

    // Remove tip jar
    TipJar.deleteRecord(articleId);

    // Remove main record
    Article.deleteRecord(articleId);

    emit ArticleDeleted(articleId, _msgSender());
  }

  /**
   * @dev Create a link between an article and an entity
   * @param articleId Article to link
   * @param entityId Entity to link to
   * @param linkType Type of link (0=anchor, 1=mirror, 2=embed)
   * @param coordX X coordinate cache
   * @param coordY Y coordinate cache
   * @param coordZ Z coordinate cache
   * @param extra Optional JSON/metadata
   */
  function createArticleLink(
    bytes32 articleId,
    bytes32 entityId,
    uint8 linkType,
    int32 coordX,
    int32 coordY,
    int32 coordZ,
    string memory extra
  ) public {
    // Verify article exists and caller is owner
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    // Create forward link
    ArticleLink.set(articleId, entityId, linkType, coordX, coordY, coordZ, extra);

    // Create reverse index for entity-based queries
    LinkByEntity.set(entityId, articleId, linkType);

    emit ArticleLinkCreated(articleId, entityId, linkType);
  }

  /**
   * @dev Remove a link between an article and an entity
   * @param articleId Article to unlink
   * @param entityId Entity to unlink from
   */
  function removeArticleLink(bytes32 articleId, bytes32 entityId) public {
    // Verify article exists and caller is owner
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    // Remove forward link
    ArticleLink.deleteRecord(articleId, entityId);

    // Remove reverse index
    LinkByEntity.deleteRecord(entityId, articleId);

    emit ArticleLinkRemoved(articleId, entityId);
  }

  /**
   * @dev Transfer article ownership (current owner only)
   * @param articleId Article to transfer
   * @param newOwner New owner address
   */
  function transferOwnership(bytes32 articleId, address newOwner) public {
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");
    require(newOwner != address(0), "Invalid address");

    Article.setOwner(articleId, newOwner);
    Article.setUpdatedAt(articleId, uint64(block.timestamp));

    emit ArticleUpdated(articleId, newOwner);
  }
}
