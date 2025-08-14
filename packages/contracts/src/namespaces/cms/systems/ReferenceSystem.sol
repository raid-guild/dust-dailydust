// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Article, ArticleData } from "../codegen/tables/Article.sol";
import { ArticleReference, ArticleReferenceData } from "../codegen/tables/ArticleReference.sol";
import { ReferenceToArticle } from "../codegen/tables/ReferenceToArticle.sol";

contract ReferenceSystem is System {
  // Reference types
  uint8 public constant REFERENCE_TYPE_CITATION = 0;
  uint8 public constant REFERENCE_TYPE_RELATED = 1;
  uint8 public constant REFERENCE_TYPE_CONTINUATION = 2;
  uint8 public constant REFERENCE_TYPE_UPDATE = 3;

  // Events for tracking
  event ReferenceCreated(
    bytes32 indexed fromArticleId,
    bytes32 indexed toArticleId,
    uint8 referenceType,
    string context
  );
  event ReferenceUpdated(bytes32 indexed fromArticleId, bytes32 indexed toArticleId, uint8 referenceType);
  event ReferenceRemoved(bytes32 indexed fromArticleId, bytes32 indexed toArticleId);

  /**
   * @dev Create a reference from one article to another
   * @param fromArticleId Article that is making the reference
   * @param toArticleId Article being referenced
   * @param referenceType Type of reference (0=citation, 1=related, 2=continuation, 3=update)
   * @param context Optional context or quote explaining the reference
   */
  function createReference(
    bytes32 fromArticleId,
    bytes32 toArticleId,
    uint8 referenceType,
    string memory context
  ) public {
    // Verify source article exists and caller is owner
    ArticleData memory fromArticle = Article.get(fromArticleId);
    require(fromArticle.owner == _msgSender(), "Not owner of source article");

    // Verify target article exists
    ArticleData memory toArticle = Article.get(toArticleId);
    require(toArticle.owner != address(0), "Target article does not exist");

    // Prevent self-references
    require(fromArticleId != toArticleId, "Cannot reference self");

    // Validate reference type
    require(referenceType <= REFERENCE_TYPE_UPDATE, "Invalid reference type");

    // Check if reference already exists
    ArticleReferenceData memory existingRef = ArticleReference.get(fromArticleId, toArticleId);
    require(existingRef.referenceType == 0 && bytes(existingRef.context).length == 0, "Reference exists");

    // Create forward reference
    ArticleReference.set(fromArticleId, toArticleId, referenceType, context);

    // Create reverse index
    ReferenceToArticle.set(toArticleId, fromArticleId, referenceType);

    emit ReferenceCreated(fromArticleId, toArticleId, referenceType, context);
  }

  /**
   * @dev Update an existing reference
   * @param fromArticleId Article making the reference
   * @param toArticleId Article being referenced
   * @param newReferenceType New reference type
   * @param newContext New context
   */
  function updateReference(
    bytes32 fromArticleId,
    bytes32 toArticleId,
    uint8 newReferenceType,
    string memory newContext
  ) public {
    // Verify source article exists and caller is owner
    ArticleData memory fromArticle = Article.get(fromArticleId);
    require(fromArticle.owner == _msgSender(), "Not owner of source article");

    // Verify reference exists
    ArticleReferenceData memory existingRef = ArticleReference.get(fromArticleId, toArticleId);
    require(existingRef.referenceType > 0 || bytes(existingRef.context).length > 0, "Reference does not exist");

    // Validate new reference type
    require(newReferenceType <= REFERENCE_TYPE_UPDATE, "Invalid reference type");

    // Update forward reference
    ArticleReference.setReferenceType(fromArticleId, toArticleId, newReferenceType);
    ArticleReference.setContext(fromArticleId, toArticleId, newContext);

    // Update reverse index
    ReferenceToArticle.setReferenceType(toArticleId, fromArticleId, newReferenceType);

    emit ReferenceUpdated(fromArticleId, toArticleId, newReferenceType);
  }

  /**
   * @dev Remove a reference between articles
   * @param fromArticleId Article making the reference
   * @param toArticleId Article being referenced
   */
  function removeReference(bytes32 fromArticleId, bytes32 toArticleId) public {
    // Verify source article exists and caller is owner
    ArticleData memory fromArticle = Article.get(fromArticleId);
    require(fromArticle.owner == _msgSender(), "Not owner of source article");

    // Verify reference exists
    ArticleReferenceData memory existingRef = ArticleReference.get(fromArticleId, toArticleId);
    require(existingRef.referenceType > 0 || bytes(existingRef.context).length > 0, "Reference does not exist");

    // Remove forward reference
    ArticleReference.deleteRecord(fromArticleId, toArticleId);

    // Remove reverse index
    ReferenceToArticle.deleteRecord(toArticleId, fromArticleId);

    emit ReferenceRemoved(fromArticleId, toArticleId);
  }

  /**
   * @dev Create multiple references from one article
   * @param fromArticleId Source article
   * @param toArticleIds Array of target articles
   * @param referenceTypes Array of reference types
   * @param contexts Array of contexts
   */
  function createMultipleReferences(
    bytes32 fromArticleId,
    bytes32[] memory toArticleIds,
    uint8[] memory referenceTypes,
    string[] memory contexts
  ) public {
    require(toArticleIds.length == referenceTypes.length, "len mismatch");
    require(toArticleIds.length == contexts.length, "len mismatch");

    // Verify source article exists and caller is owner
    ArticleData memory fromArticle = Article.get(fromArticleId);
    require(fromArticle.owner == _msgSender(), "Not owner of source article");

    for (uint256 i = 0; i < toArticleIds.length; i++) {
      // Verify target article exists
      ArticleData memory toArticle = Article.get(toArticleIds[i]);
      require(toArticle.owner != address(0), "Target article does not exist");

      // Prevent self-references
      require(fromArticleId != toArticleIds[i], "Cannot reference self");

      // Validate reference type
      require(referenceTypes[i] <= REFERENCE_TYPE_UPDATE, "Invalid reference type");

      // Skip if reference already exists
      ArticleReferenceData memory existingRef = ArticleReference.get(fromArticleId, toArticleIds[i]);
      if (existingRef.referenceType > 0 || bytes(existingRef.context).length > 0) {
        continue;
      }

      // Create forward reference
      ArticleReference.set(fromArticleId, toArticleIds[i], referenceTypes[i], contexts[i]);

      // Create reverse index
      ReferenceToArticle.set(toArticleIds[i], fromArticleId, referenceTypes[i]);

      emit ReferenceCreated(fromArticleId, toArticleIds[i], referenceTypes[i], contexts[i]);
    }
  }

  /**
   * @dev Get reference data between two articles
   * @param fromArticleId Source article
   * @param toArticleId Target article
   * @return Reference data
   */
  function getReference(bytes32 fromArticleId, bytes32 toArticleId) public view returns (ArticleReferenceData memory) {
    return ArticleReference.get(fromArticleId, toArticleId);
  }

  /**
   * @dev Check if a reference exists between two articles
   * @param fromArticleId Source article
   * @param toArticleId Target article
   * @return Whether reference exists
   */
  function referenceExists(bytes32 fromArticleId, bytes32 toArticleId) public view returns (bool) {
    ArticleReferenceData memory ref = ArticleReference.get(fromArticleId, toArticleId);
    return ref.referenceType > 0 || bytes(ref.context).length > 0;
  }

  /**
   * @dev Get reference type between two articles
   * @param fromArticleId Source article
   * @param toArticleId Target article
   * @return Reference type (0 if no reference)
   */
  function getReferenceType(bytes32 fromArticleId, bytes32 toArticleId) public view returns (uint8) {
    return ArticleReference.getReferenceType(fromArticleId, toArticleId);
  }

  /**
   * @dev Get reference context between two articles
   * @param fromArticleId Source article
   * @param toArticleId Target article
   * @return Reference context
   */
  function getReferenceContext(bytes32 fromArticleId, bytes32 toArticleId) public view returns (string memory) {
    return ArticleReference.getContext(fromArticleId, toArticleId);
  }

  /**
   * @dev Create a bidirectional reference (mutual reference)
   * @param articleId1 First article
   * @param articleId2 Second article
   * @param referenceType Type of reference for both directions
   * @param context1 Context from article1 to article2
   * @param context2 Context from article2 to article1
   */
  function createMutualReference(
    bytes32 articleId1,
    bytes32 articleId2,
    uint8 referenceType,
    string memory context1,
    string memory context2
  ) public {
    // This would require both article owners to approve, or a different permission model
    // For now, we'll require the caller to own both articles

    ArticleData memory article1 = Article.get(articleId1);
    ArticleData memory article2 = Article.get(articleId2);

    require(article1.owner == _msgSender(), "Not owner of first article");
    require(article2.owner == _msgSender(), "Not owner of second article");

    // Create reference from article1 to article2
    createReference(articleId1, articleId2, referenceType, context1);

    // Create reference from article2 to article1
    createReference(articleId2, articleId1, referenceType, context2);
  }

  /**
   * @dev Get reference type name as string
   * @param referenceType Reference type code
   * @return Human-readable reference type name
   */
  function getReferenceTypeName(uint8 referenceType) public pure returns (string memory) {
    if (referenceType == REFERENCE_TYPE_CITATION) return "citation";
    if (referenceType == REFERENCE_TYPE_RELATED) return "related";
    if (referenceType == REFERENCE_TYPE_CONTINUATION) return "continuation";
    if (referenceType == REFERENCE_TYPE_UPDATE) return "update";
    return "unknown";
  }
}
