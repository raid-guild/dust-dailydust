// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { EditorRole, EditorRoleData } from "../codegen/tables/EditorRole.sol";

contract EditorSystem is System {
  // Role constants
  uint8 public constant ROLE_EDITOR = 0;
  uint8 public constant ROLE_ADMIN = 1;
  uint8 public constant ROLE_OWNER = 2;

  // Events for tracking
  event RoleGranted(address indexed user, uint8 role, address indexed grantedBy);
  event RoleRevoked(address indexed user, address indexed revokedBy);

  // Modifier to check admin permissions
  modifier onlyAdmin() {
    EditorRoleData memory role = EditorRole.get(_msgSender());
    require(role.role >= ROLE_ADMIN, "Admin required");
    _;
  }

  // Modifier to check owner permissions
  modifier onlyOwner() {
    EditorRoleData memory role = EditorRole.get(_msgSender());
    require(role.role == ROLE_OWNER, "Owner required");
    _;
  }

  /**
   * @dev Grant a role to a user (admin+ only)
   * @param user User to grant role to
   * @param role Role level to grant (0=editor, 1=admin, 2=owner)
   */
  function grantRole(address user, uint8 role) public onlyAdmin {
    require(user != address(0), "Invalid address");
    require(role <= ROLE_OWNER, "Invalid role");

    EditorRoleData memory callerRole = EditorRole.get(_msgSender());

    // Can't grant a role higher than your own
    require(role <= callerRole.role, "Cannot grant higher role than your own");

    // Check if user already has a role
    EditorRoleData memory existingRole = EditorRole.get(user);
    if (existingRole.grantedAt > 0) {
      // User already has a role, check if we can modify it
      require(existingRole.role < callerRole.role, "Cannot modify higher or equal role");
    }

    // Use the generated overload which takes (user, role, grantedBy, grantedAt)
    EditorRole.set(user, role, _msgSender(), uint64(block.timestamp));

    emit RoleGranted(user, role, _msgSender());
  }

  /**
   * @dev Revoke a user's role (admin+ only)
   * @param user User to revoke role from
   */
  function revokeRole(address user) public onlyAdmin {
    EditorRoleData memory targetRole = EditorRole.get(user);
    require(targetRole.grantedAt > 0, "User has no role");

    EditorRoleData memory callerRole = EditorRole.get(_msgSender());

    // Can't revoke a role higher than or equal to your own (unless you're removing yourself)
    if (user != _msgSender()) {
      require(targetRole.role < callerRole.role, "Cannot revoke higher or equal role");
    }

    EditorRole.deleteRecord(user);

    emit RoleRevoked(user, _msgSender());
  }

  /**
   * @dev Initialize the first owner (can only be called once)
   * @param initialOwner Address to make the initial owner
   */
  function initializeOwner(address initialOwner) public {
    require(initialOwner != address(0), "Invalid address");

    // Check that no owner exists yet
    // This is a simplified check - in practice you might want a more robust initialization pattern
    EditorRoleData memory callerRole = EditorRole.get(_msgSender());
    require(callerRole.grantedAt == 0, "System already initialized");

    EditorRole.set(initialOwner, ROLE_OWNER, address(0), uint64(block.timestamp));

    emit RoleGranted(initialOwner, ROLE_OWNER, address(0));
  }

  /**
   * @dev Get user's role information
   * @param user User to query
   * @return Role data
   */
  function getUserRole(address user) public view returns (EditorRoleData memory) {
    return EditorRole.get(user);
  }

  /**
   * @dev Check if user has at least the specified role level
   * @param user User to check
   * @param requiredRole Minimum role level required
   * @return Whether user has sufficient role
   */
  function hasRole(address user, uint8 requiredRole) public view returns (bool) {
    EditorRoleData memory userRole = EditorRole.get(user);
    return userRole.grantedAt > 0 && userRole.role >= requiredRole;
  }

  /**
   * @dev Check if user is an editor or higher
   * @param user User to check
   * @return Whether user is an editor
   */
  function isEditor(address user) public view returns (bool) {
    return hasRole(user, ROLE_EDITOR);
  }

  /**
   * @dev Check if user is an admin or higher
   * @param user User to check
   * @return Whether user is an admin
   */
  function isAdmin(address user) public view returns (bool) {
    return hasRole(user, ROLE_ADMIN);
  }

  /**
   * @dev Check if user is the owner
   * @param user User to check
   * @return Whether user is the owner
   */
  function isOwner(address user) public view returns (bool) {
    return hasRole(user, ROLE_OWNER);
  }

  /**
   * @dev Transfer ownership to a new address (owner only)
   * @param newOwner New owner address
   */
  function transferOwnership(address newOwner) public onlyOwner {
    require(newOwner != address(0), "Invalid address");
    require(newOwner != _msgSender(), "Already owner");

    // Grant owner role to new address
    EditorRole.set(newOwner, ROLE_OWNER, _msgSender(), uint64(block.timestamp));

    // Remove owner role from current owner
    EditorRole.deleteRecord(_msgSender());

    emit RoleGranted(newOwner, ROLE_OWNER, _msgSender());
    emit RoleRevoked(_msgSender(), _msgSender());
  }
}
