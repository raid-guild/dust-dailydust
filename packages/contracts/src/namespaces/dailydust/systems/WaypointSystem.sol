// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Article, ArticleData } from "../../cms/codegen/tables/Article.sol";
import { WaypointGroup, WaypointGroupData } from "../codegen/tables/WaypointGroup.sol";
import { WaypointStep, WaypointStepData } from "../codegen/tables/WaypointStep.sol";

contract WaypointSystem is System {
  // Events for tracking
  event WaypointGroupCreated(bytes32 indexed articleId, uint16 indexed groupId, string name);
  event WaypointGroupUpdated(bytes32 indexed articleId, uint16 indexed groupId);
  event WaypointGroupDeleted(bytes32 indexed articleId, uint16 indexed groupId);
  event WaypointStepAdded(bytes32 indexed articleId, uint16 indexed groupId, uint16 index, int32 x, int32 y, int32 z);
  event WaypointStepUpdated(bytes32 indexed articleId, uint16 indexed groupId, uint16 index);
  event WaypointStepRemoved(bytes32 indexed articleId, uint16 indexed groupId, uint16 index);

  /**
   * @dev Create a new waypoint group for an article
   * @param articleId Article to add waypoint group to
   * @param groupId Unique group identifier within the article
   * @param color Hex color for UI hints (24-bit RGB)
   * @param isPublic Whether the waypoint group is publicly visible
   * @param name Name of the waypoint group
   * @param description Optional description of the waypoint group
   */
  function createWaypointGroup(
    bytes32 articleId,
    uint16 groupId,
    uint24 color,
    bool isPublic,
    string memory name,
    string memory description
  ) public {
    // Verify article exists and caller is owner
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not article owner");

    // Check if group already exists
    WaypointGroupData memory existingGroup = WaypointGroup.get(articleId, groupId);
    require(bytes(existingGroup.name).length == 0, "Waypoint group already exists");

    WaypointGroup.set(
      articleId,
      groupId,
      WaypointGroupData({ color: color, isPublic: isPublic ? 1 : 0, name: name, description: description })
    );

    emit WaypointGroupCreated(articleId, groupId, name);
  }

  /**
   * @dev Update an existing waypoint group
   * @param articleId Article containing the waypoint group
   * @param groupId Group to update
   * @param color New color
   * @param isPublic New visibility setting
   * @param name New name
   * @param description New description
   */
  function updateWaypointGroup(
    bytes32 articleId,
    uint16 groupId,
    uint24 color,
    bool isPublic,
    string memory name,
    string memory description
  ) public {
    // Verify article exists and caller is owner
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not article owner");

    // Verify group exists
    WaypointGroupData memory group = WaypointGroup.get(articleId, groupId);
    require(bytes(group.name).length > 0, "Waypoint group does not exist");

    WaypointGroup.setColor(articleId, groupId, color);
    WaypointGroup.setIsPublic(articleId, groupId, isPublic ? 1 : 0);
    WaypointGroup.setName(articleId, groupId, name);
    WaypointGroup.setDescription(articleId, groupId, description);

    emit WaypointGroupUpdated(articleId, groupId);
  }

  /**
   * @dev Delete a waypoint group and all its steps
   * @param articleId Article containing the waypoint group
   * @param groupId Group to delete
   */
  function deleteWaypointGroup(bytes32 articleId, uint16 groupId) public {
    // Verify article exists and caller is owner
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not article owner");

    // Verify group exists
    WaypointGroupData memory group = WaypointGroup.get(articleId, groupId);
    require(bytes(group.name).length > 0, "Waypoint group does not exist");

    // Delete the group (steps will need to be cleaned up separately or handled client-side)
    WaypointGroup.deleteRecord(articleId, groupId);

    // TODO: Clean up all WaypointStep records for this group
    // This would require iterating through all steps, which is gas-intensive
    // Consider implementing a separate cleanup function

    emit WaypointGroupDeleted(articleId, groupId);
  }

  /**
   * @dev Add a waypoint step to a group
   * @param articleId Article containing the waypoint group
   * @param groupId Group to add step to
   * @param index Position in the waypoint sequence
   * @param x X coordinate
   * @param y Y coordinate
   * @param z Z coordinate
   * @param label Label for this waypoint step
   */
  function addWaypointStep(
    bytes32 articleId,
    uint16 groupId,
    uint16 index,
    int32 x,
    int32 y,
    int32 z,
    string memory label
  ) public {
    // Verify article exists and caller is owner
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not article owner");

    // Verify group exists
    WaypointGroupData memory group = WaypointGroup.get(articleId, groupId);
    require(bytes(group.name).length > 0, "Waypoint group does not exist");

    // Check if step already exists at this index
    WaypointStepData memory existingStep = WaypointStep.get(articleId, groupId, index);
    require(bytes(existingStep.label).length == 0, "Waypoint step already exists at index");

    WaypointStep.set(articleId, groupId, index, WaypointStepData({ x: x, y: y, z: z, label: label }));

    emit WaypointStepAdded(articleId, groupId, index, x, y, z);
  }

  /**
   * @dev Update an existing waypoint step
   * @param articleId Article containing the waypoint
   * @param groupId Group containing the step
   * @param index Step index to update
   * @param x New X coordinate
   * @param y New Y coordinate
   * @param z New Z coordinate
   * @param label New label
   */
  function updateWaypointStep(
    bytes32 articleId,
    uint16 groupId,
    uint16 index,
    int32 x,
    int32 y,
    int32 z,
    string memory label
  ) public {
    // Verify article exists and caller is owner
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not article owner");

    // Verify step exists
    WaypointStepData memory step = WaypointStep.get(articleId, groupId, index);
    require(bytes(step.label).length > 0, "Waypoint step does not exist");

    WaypointStep.setX(articleId, groupId, index, x);
    WaypointStep.setY(articleId, groupId, index, y);
    WaypointStep.setZ(articleId, groupId, index, z);
    WaypointStep.setLabel(articleId, groupId, index, label);

    emit WaypointStepUpdated(articleId, groupId, index);
  }

  /**
   * @dev Remove a waypoint step
   * @param articleId Article containing the waypoint
   * @param groupId Group containing the step
   * @param index Step index to remove
   */
  function removeWaypointStep(bytes32 articleId, uint16 groupId, uint16 index) public {
    // Verify article exists and caller is owner
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not article owner");

    // Verify step exists
    WaypointStepData memory step = WaypointStep.get(articleId, groupId, index);
    require(bytes(step.label).length > 0, "Waypoint step does not exist");

    WaypointStep.deleteRecord(articleId, groupId, index);

    emit WaypointStepRemoved(articleId, groupId, index);
  }

  /**
   * @dev Move a waypoint step to a different index
   * @param articleId Article containing the waypoint
   * @param groupId Group containing the step
   * @param fromIndex Current index of the step
   * @param toIndex New index for the step
   */
  function moveWaypointStep(bytes32 articleId, uint16 groupId, uint16 fromIndex, uint16 toIndex) public {
    // Verify article exists and caller is owner
    ArticleData memory article = Article.get(articleId);
    require(article.owner == _msgSender(), "Not article owner");
    require(fromIndex != toIndex, "Same index");

    // Verify source step exists
    WaypointStepData memory step = WaypointStep.get(articleId, groupId, fromIndex);
    require(bytes(step.label).length > 0, "Source waypoint step does not exist");

    // Verify target index is available
    WaypointStepData memory targetStep = WaypointStep.get(articleId, groupId, toIndex);
    require(bytes(targetStep.label).length == 0, "Target index already occupied");

    // Move the step
    WaypointStep.deleteRecord(articleId, groupId, fromIndex);
    WaypointStep.set(articleId, groupId, toIndex, step);

    emit WaypointStepRemoved(articleId, groupId, fromIndex);
    emit WaypointStepAdded(articleId, groupId, toIndex, step.x, step.y, step.z);
  }

  /**
   * @dev Get all data for a waypoint group
   * @param articleId Article containing the waypoint group
   * @param groupId Group to query
   * @return Waypoint group data
   */
  function getWaypointGroup(bytes32 articleId, uint16 groupId) public view returns (WaypointGroupData memory) {
    return WaypointGroup.get(articleId, groupId);
  }

  /**
   * @dev Get data for a specific waypoint step
   * @param articleId Article containing the waypoint
   * @param groupId Group containing the step
   * @param index Step index to query
   * @return Waypoint step data
   */
  function getWaypointStep(
    bytes32 articleId,
    uint16 groupId,
    uint16 index
  ) public view returns (WaypointStepData memory) {
    return WaypointStep.get(articleId, groupId, index);
  }

  /**
   * @dev Check if a waypoint group exists
   * @param articleId Article to check
   * @param groupId Group to check
   * @return Whether the waypoint group exists
   */
  function waypointGroupExists(bytes32 articleId, uint16 groupId) public view returns (bool) {
    WaypointGroupData memory group = WaypointGroup.get(articleId, groupId);
    return bytes(group.name).length > 0;
  }

  /**
   * @dev Check if a waypoint step exists
   * @param articleId Article to check
   * @param groupId Group to check
   * @param index Step index to check
   * @return Whether the waypoint step exists
   */
  function waypointStepExists(bytes32 articleId, uint16 groupId, uint16 index) public view returns (bool) {
    WaypointStepData memory step = WaypointStep.get(articleId, groupId, index);
    return bytes(step.label).length > 0;
  }
}
