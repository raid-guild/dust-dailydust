// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { ArticleCategories, Category, NoteCategories } from "../codegen/index.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract AdminSystem is System {
  function addArticleCategory(string memory categoryName) external returns (bytes32 categoryId) {
    categoryId = keccak256(abi.encodePacked(categoryName));
    Category.set(categoryId, categoryName);
    bytes32[] memory existingCategories = ArticleCategories.get();

    // Check if category already exists
    for (uint256 i = 0; i < existingCategories.length; i++) {
      require(existingCategories[i] != categoryId, "Category already exists");
    }

    // Add to existing categories
    bytes32[] memory newCategories = new bytes32[](existingCategories.length + 1);
    for (uint256 i = 0; i < existingCategories.length; i++) {
      newCategories[i] = existingCategories[i];
    }
    newCategories[existingCategories.length] = categoryId;
    ArticleCategories.set(newCategories);
  }

  function removeArticleCategory(bytes32 categoryId) external {
    bytes32[] memory existingCategories = ArticleCategories.get();
    uint256 index = existingCategories.length; // Default to length (not found)

    // Find the index of the category to remove
    for (uint256 i = 0; i < existingCategories.length; i++) {
      if (existingCategories[i] == categoryId) {
        index = i;
        break;
      }
    }

    require(index < existingCategories.length, "Category not found");

    // Create a new array without the removed category
    bytes32[] memory newCategories = new bytes32[](existingCategories.length - 1);
    for (uint256 i = 0; i < index; i++) {
      newCategories[i] = existingCategories[i];
    }
    for (uint256 i = index + 1; i < existingCategories.length; i++) {
      newCategories[i - 1] = existingCategories[i];
    }

    ArticleCategories.set(newCategories);
    Category.deleteRecord(categoryId);
  }

  function addNoteCategory(string memory categoryName) external returns (bytes32 categoryId) {
    categoryId = keccak256(abi.encodePacked(categoryName));
    Category.set(categoryId, categoryName);
    bytes32[] memory existingCategories = NoteCategories.get();

    // Check if category already exists
    for (uint256 i = 0; i < existingCategories.length; i++) {
      require(existingCategories[i] != categoryId, "Category already exists");
    }

    // Add to existing categories
    bytes32[] memory newCategories = new bytes32[](existingCategories.length + 1);
    for (uint256 i = 0; i < existingCategories.length; i++) {
      newCategories[i] = existingCategories[i];
    }
    newCategories[existingCategories.length] = categoryId;
    NoteCategories.set(newCategories);
  }

  function removeNoteCategory(bytes32 categoryId) external {
    bytes32[] memory existingCategories = NoteCategories.get();
    uint256 index = existingCategories.length; // Default to length (not found)

    // Find the index of the category to remove
    for (uint256 i = 0; i < existingCategories.length; i++) {
      if (existingCategories[i] == categoryId) {
        index = i;
        break;
      }
    }

    require(index < existingCategories.length, "Category not found");

    // Create a new array without the removed category
    bytes32[] memory newCategories = new bytes32[](existingCategories.length - 1);
    for (uint256 i = 0; i < index; i++) {
      newCategories[i] = existingCategories[i];
    }
    for (uint256 i = index + 1; i < existingCategories.length; i++) {
      newCategories[i - 1] = existingCategories[i];
    }

    NoteCategories.set(newCategories);
    Category.deleteRecord(categoryId);
  }
}
