// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Article, ArticleData } from "../codegen/tables/Article.sol";
import { Boost, BoostData } from "../codegen/tables/Boost.sol";
import { ActiveBoost } from "../codegen/tables/ActiveBoost.sol";
import { BoostStatus, BoostStatusData } from "../codegen/tables/BoostStatus.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BoostSystem is System {
  // Boost types
  uint8 public constant BOOST_TYPE_TIME = 0;
  uint8 public constant BOOST_TYPE_IMPRESSION = 1;
  uint8 public constant BOOST_TYPE_CLICK = 2;

  // Events for tracking
  event BoostCreated(
    bytes32 indexed articleId,
    address indexed booster,
    uint256 amount,
    address currency,
    uint8 boostType,
    uint64 startTime,
    uint64 endTime
  );
  event BoostDeactivated(bytes32 indexed articleId, address indexed booster, uint64 startTime);
  event BoostExpired(bytes32 indexed articleId, address indexed booster, uint64 startTime);
  event BoostInteraction(bytes32 indexed articleId, uint8 interactionType, uint256 count);

  /**
   * @dev Create a boost for an article
   * @param articleId Article to boost
   * @param currency Payment token address (address(0) for native ETH)
   * @param amount Payment amount (for ERC20 tokens)
   * @param boostType Type of boost (0=time, 1=impression, 2=click)
   * @param duration Duration in seconds (for time-based boosts)
   */
  function createBoost(
    bytes32 articleId,
    address currency,
    uint256 amount,
    uint8 boostType,
    uint64 duration
  ) public payable {
    // Verify article exists
    ArticleData memory article = Article.get(articleId);
    require(article.owner != address(0), "Article does not exist");
    require(boostType <= BOOST_TYPE_CLICK, "Invalid boost type");

    uint256 boostAmount;
    uint64 startTime = uint64(block.timestamp);
    uint64 endTime;

    if (currency == address(0)) {
      // Native ETH boost
      require(msg.value > 0, "Boost payment required");
      boostAmount = msg.value;
    } else {
      // ERC20 token boost
      require(amount > 0, "Boost amount required");
      boostAmount = amount;

      // Transfer tokens from booster to this contract
      IERC20(currency).transferFrom(_msgSender(), address(this), boostAmount);
    }

    if (boostType == BOOST_TYPE_TIME) {
      require(duration > 0, "Duration required for time-based boost");
      endTime = startTime + duration;
    } else {
      // For impression/click based boosts, set far future end time
      endTime = startTime + 365 days;
    }

    // Create boost record
    Boost.set(
      articleId,
      _msgSender(),
      startTime,
      BoostData({
        amount: boostAmount,
        currency: currency,
        boostType: boostType,
        endTime: endTime,
        totalImpressions: 0,
        totalClicks: 0,
        isActive: 1
      })
    );

    // Add to active boost index
    ActiveBoost.set(endTime, articleId, _msgSender(), startTime, 1);

    // Update boost status cache
    _updateBoostStatus(articleId);

    emit BoostCreated(articleId, _msgSender(), boostAmount, currency, boostType, startTime, endTime);
  }

  /**
   * @dev Deactivate a boost (booster only)
   * @param articleId Article being boosted
   * @param startTime Start time of the boost to deactivate
   */
  function deactivateBoost(bytes32 articleId, uint64 startTime) public {
    BoostData memory boost = Boost.get(articleId, _msgSender(), startTime);
    // `booster` is part of the table key (we fetched with _msgSender()); BoostData has no `booster` field
    require(boost.isActive == 1, "Boost not active");

    // Deactivate boost (use uint8 0/1, generated API expects uint8)
    Boost.setIsActive(articleId, _msgSender(), startTime, 0);

    // Remove from active index
    ActiveBoost.deleteRecord(boost.endTime, articleId, _msgSender(), startTime);

    // Update boost status cache
    _updateBoostStatus(articleId);

    emit BoostDeactivated(articleId, _msgSender(), startTime);
  }

  /**
   * @dev Record an impression for impression-based boosts
   * @param articleId Article that was viewed
   */
  function recordImpression(bytes32 articleId) public {
    _recordInteraction(articleId, BOOST_TYPE_IMPRESSION);
    emit BoostInteraction(articleId, BOOST_TYPE_IMPRESSION, 1);
  }

  /**
   * @dev Record a click for click-based boosts
   * @param articleId Article that was clicked
   */
  function recordClick(bytes32 articleId) public {
    _recordInteraction(articleId, BOOST_TYPE_CLICK);
    emit BoostInteraction(articleId, BOOST_TYPE_CLICK, 1);
  }

  /**
   * @dev Clean up expired boosts (can be called by anyone)
   * @param articleId Article to clean up
   * @param booster Booster address
   * @param startTime Start time of expired boost
   */
  function cleanupExpiredBoost(bytes32 articleId, address booster, uint64 startTime) public {
    BoostData memory boost = Boost.get(articleId, booster, startTime);
    require(boost.endTime <= block.timestamp, "Boost not expired");
    require(boost.isActive == 1, "Boost not active");

    // Deactivate boost
    Boost.setIsActive(articleId, booster, startTime, 0);

    // Remove from active index
    ActiveBoost.deleteRecord(boost.endTime, articleId, booster, startTime);

    // Update boost status cache
    _updateBoostStatus(articleId);

    emit BoostExpired(articleId, booster, startTime);
  }

  /**
   * @dev Get current boost status for an article
   * @param articleId Article to query
   * @return boost status data
   */
  function getBoostStatus(bytes32 articleId) public view returns (BoostStatusData memory) {
    return BoostStatus.get(articleId);
  }

  /**
   * @dev Check if article is currently boosted
   * @param articleId Article to query
   * @return Whether article has active boosts
   */
  function isCurrentlyBoosted(bytes32 articleId) public view returns (bool) {
    return BoostStatus.getIsCurrentlyBoosted(articleId) == 1;
  }

  /**
   * @dev Internal function to record boost interactions
   * @param articleId Article being interacted with
   * @param interactionType Type of interaction (impression/click)
   */
  function _recordInteraction(bytes32 articleId, uint8 interactionType) internal {
    // This is a simplified version - in practice you'd iterate through active boosts
    // and update impression/click counts for relevant boost types
    // For now, just update the first active boost found
    // TODO: Implement proper iteration through active boosts
  }

  /**
   * @dev Internal function to update boost status cache
   * @param articleId Article to update
   */
  function _updateBoostStatus(bytes32 articleId) internal {
    // This is simplified - in practice you'd iterate through all active boosts
    // and calculate aggregated status

    uint64 currentTime = uint64(block.timestamp);
    bool hasActiveBoosts = false;
    uint256 totalAmount = 0;
    uint64 latestEndTime = 0;
    uint16 activeCount = 0;

    // TODO: Implement proper aggregation from active boosts

    BoostStatus.set(
      articleId,
      BoostStatusData({
        totalBoostAmount: totalAmount,
        boostUntil: latestEndTime,
        activeBoostCount: activeCount,
        isCurrentlyBoosted: hasActiveBoosts ? 1 : 0
      })
    );
  }
}
