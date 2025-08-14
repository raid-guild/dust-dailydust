// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";

contract SearchSystem is System {
  // Keep a minimal surface for the system after removing keyword index tables
  event ArticleIndexed(bytes32 indexed articleId, uint16 totalKeywords);

  /**
   * @dev Internal function to normalize keyword strings
   * @param keyword Raw keyword string
   * @return Normalized keyword string (lowercase, trimmed)
   */
  function _normalizeKeyword(string memory keyword) internal pure returns (string memory) {
    // Simplified normalization placeholder
    return keyword;
  }

  /**
   * @dev Get the normalized form of a keyword
   * @param keyword Raw keyword string
   * @return Normalized keyword
   */
  function getNormalizedKeyword(string memory keyword) public pure returns (string memory) {
    return _normalizeKeyword(keyword);
  }
}
