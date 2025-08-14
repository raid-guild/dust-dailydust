// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Category, CategoryData } from "../codegen/tables/Category.sol";

contract CategorySystem is System {
  // Events for tracking
  event CategoryCreated(bytes32 indexed categoryHash, string categoryName);
  event CategoryUpdated(bytes32 indexed categoryHash, string categoryName);
  event CategoryDeleted(bytes32 indexed categoryHash);

  /**
   * @dev Create a new category
   * @param categoryName Human-readable category name
   * @param description Category description
   * @param color Hex color for UI (24-bit RGB)
   */
  function createCategory(string memory categoryName, string memory description, uint24 color) public {
    bytes32 categoryHash = keccak256(abi.encodePacked(categoryName));

    // Check if category already exists
    CategoryData memory existing = Category.get(categoryHash);
    require(bytes(existing.categoryName).length == 0, "Category already exists");

    Category.set(categoryHash, CategoryData({ color: color, categoryName: categoryName, description: description }));

    emit CategoryCreated(categoryHash, categoryName);
  }

  /**
   * @dev Update an existing category
   * @param categoryName Category name to update
   * @param newDescription New description
   * @param newColor New color
   */
  function updateCategory(string memory categoryName, string memory newDescription, uint24 newColor) public {
    bytes32 categoryHash = keccak256(abi.encodePacked(categoryName));

    // Verify category exists
    CategoryData memory category = Category.get(categoryHash);
    require(bytes(category.categoryName).length > 0, "Category does not exist");

    Category.setDescription(categoryHash, newDescription);
    Category.setColor(categoryHash, newColor);

    emit CategoryUpdated(categoryHash, categoryName);
  }

  /**
   * @dev Delete a category
   * @param categoryName Category name to delete
   */
  function deleteCategory(string memory categoryName) public {
    bytes32 categoryHash = keccak256(abi.encodePacked(categoryName));

    // Verify category exists
    CategoryData memory category = Category.get(categoryHash);
    require(bytes(category.categoryName).length > 0, "Category does not exist");

    Category.deleteRecord(categoryHash);

    emit CategoryDeleted(categoryHash);
  }

  /**
   * @dev Get category hash from name
   * @param categoryName Category name
   * @return Category hash
   */
  function getCategoryHash(string memory categoryName) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(categoryName));
  }

  /**
   * @dev Get category data
   * @param categoryName Category name
   * @return Category data
   */
  function getCategoryByName(string memory categoryName) public view returns (CategoryData memory) {
    bytes32 categoryHash = keccak256(abi.encodePacked(categoryName));
    return Category.get(categoryHash);
  }

  /**
   * @dev Check if category exists
   * @param categoryName Category name to check
   * @return Whether category exists
   */
  function categoryExists(string memory categoryName) public view returns (bool) {
    bytes32 categoryHash = keccak256(abi.encodePacked(categoryName));
    CategoryData memory category = Category.get(categoryHash);
    return bytes(category.categoryName).length > 0;
  }
}
