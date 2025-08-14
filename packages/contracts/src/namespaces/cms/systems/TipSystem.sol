// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Article, ArticleData } from "../codegen/tables/Article.sol";
import { TipJar, TipJarData } from "../codegen/tables/TipJar.sol";
import { Tip } from "../codegen/tables/Tip.sol";
import { TipSplit, TipSplitData } from "../codegen/tables/TipSplit.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TipSystem is System {
  // Events for tracking
  event TipSent(
    bytes32 indexed articleId,
    address indexed tipper,
    address indexed recipient,
    uint256 amount,
    address currency,
    string message
  );
  event TipJarUpdated(bytes32 indexed articleId, address newRecipient, bool isActive);
  event TipSplitAdded(bytes32 indexed articleId, address recipient, uint16 percentage);
  event TipSplitRemoved(bytes32 indexed articleId, address recipient);

  /**
   * @dev Send a tip to an article's tip jar
   * @param articleId Article to tip
   * @param currency ERC20 token address (address(0) for native ETH)
   * @param amount Amount to tip (for ERC20 tokens)
   * @param message Optional tip message
   */
  function tipArticle(bytes32 articleId, address currency, uint256 amount, string memory message) public payable {
    // Verify article exists
    ArticleData memory article = Article.get(articleId);
    require(article.owner != address(0), "Article does not exist");

    // Get tip jar configuration
    TipJarData memory tipJar = TipJar.get(articleId);
    require(tipJar.isActive == 1, "Jar disabled");

    uint256 tipAmount;
    address recipient = tipJar.recipient;

    if (currency == address(0)) {
      // Native ETH tip
      require(msg.value > 0, "Invalid tip amount");
      tipAmount = msg.value;

      // Send tip to recipient
      (bool success, ) = recipient.call{ value: tipAmount }("");
      require(success, "Tip transfer failed");
    } else {
      // ERC20 token tip
      require(amount > 0, "Invalid tip amount");
      tipAmount = amount;

      // Transfer tokens from tipper to recipient
      IERC20(currency).transferFrom(_msgSender(), recipient, tipAmount);
    }

    uint64 timestamp = uint64(block.timestamp);

    // Record the tip
    Tip.set(articleId, _msgSender(), timestamp, tipAmount, currency, message);

    // Update tip jar totals (only tracks native ETH for now)
    if (currency == address(0)) {
      uint256 newTotal = tipJar.totalTips + tipAmount;
      TipJar.setTotalTips(articleId, newTotal);
      TipJar.setLastTipAt(articleId, timestamp);
    }

    emit TipSent(articleId, _msgSender(), recipient, tipAmount, currency, message);
  }

  /**
   * @dev Update tip jar recipient (article owner only)
   * @param articleId Article to update
   * @param newRecipient New tip recipient address
   */
  function updateTipJar(bytes32 articleId, address newRecipient) public {
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");
    require(newRecipient != address(0), "Invalid address");

    TipJar.setRecipient(articleId, newRecipient);
    TipJar.setIsActive(articleId, 1);

    emit TipJarUpdated(articleId, newRecipient, true);
  }

  /**
   * @dev Enable or disable tip jar (article owner only)
   * @param articleId Article to update
   * @param isActive Whether tip jar should be active
   */
  function setTipJarActive(bytes32 articleId, bool isActive) public {
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    TipJar.setIsActive(articleId, isActive ? 1 : 0);

    emit TipJarUpdated(articleId, TipJar.getRecipient(articleId), isActive);
  }

  /**
   * @dev Add a tip split recipient (article owner only)
   * @param articleId Article to configure
   * @param recipient Address to receive percentage of tips
   * @param percentage Percentage in basis points (10000 = 100%)
   */
  function addTipSplit(bytes32 articleId, address recipient, uint16 percentage) public {
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");
    require(recipient != address(0), "Invalid address");
    require(percentage > 0 && percentage <= 10000, "Invalid percentage");

    // TODO: Validate total percentages don't exceed 100%

    TipSplit.set(articleId, recipient, percentage, 1);

    emit TipSplitAdded(articleId, recipient, percentage);
  }

  /**
   * @dev Remove a tip split recipient (article owner only)
   * @param articleId Article to configure
   * @param recipient Address to remove from splits
   */
  function removeTipSplit(bytes32 articleId, address recipient) public {
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    TipSplit.deleteRecord(articleId, recipient);

    emit TipSplitRemoved(articleId, recipient);
  }

  /**
   * @dev Activate or deactivate a tip split (article owner only)
   * @param articleId Article to configure
   * @param recipient Split recipient to update
   * @param isActive Whether this split should be active
   */
  function setTipSplitActive(bytes32 articleId, address recipient, bool isActive) public {
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not owner");

    TipSplitData memory split = TipSplit.get(articleId, recipient);
    require(split.percentage > 0, "Split does not exist");

    TipSplit.setIsActive(articleId, recipient, isActive ? 1 : 0);
  }

  /**
   * @dev Get total tips for an article (native ETH only)
   * @param articleId Article to query
   * @return Total tips in wei
   */
  function getTotalTips(bytes32 articleId) public view returns (uint256) {
    return TipJar.getTotalTips(articleId);
  }

  /**
   * @dev Check if article has active tip jar
   * @param articleId Article to query
   * @return Whether tip jar is active
   */
  function isTipJarActive(bytes32 articleId) public view returns (bool) {
    return TipJar.getIsActive(articleId) == 1;
  }
}
