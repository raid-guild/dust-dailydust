// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { DustConfig } from "../codegen/tables/DustConfig.sol";
import { AuthorizedBooster, AuthorizedBoosterData } from "../codegen/tables/AuthorizedBooster.sol";
import { EditorRole, EditorRoleData } from "../codegen/tables/EditorRole.sol";

contract DustSystem is System {
  // Events for tracking
  event ConfigUpdated(bytes32 indexed configKey, string value, address updatedBy);
  event BoosterAuthorized(address indexed programAddress, uint8 programType, uint256 maxBoostAmount);
  event BoosterDeauthorized(address indexed programAddress);
  event BoosterUpdated(address indexed programAddress, uint256 newMaxBoostAmount, bool isActive);

  // Modifier to check admin permissions
  modifier onlyAdmin() {
    EditorRoleData memory role = EditorRole.get(_msgSender());
    require(role.role >= 1, "Admin required"); // 1 = admin, 2 = owner
    _;
  }

  // Modifier to check owner permissions
  modifier onlyOwner() {
    EditorRoleData memory role = EditorRole.get(_msgSender());
    require(role.role == 2, "Owner required"); // 2 = owner
    _;
  }

  /**
   * @dev Set a configuration value (admin+ only)
   * @param configKey Configuration key
   * @param value Configuration value (JSON string or simple value)
   */
  function setConfig(bytes32 configKey, string memory value) public onlyAdmin {
    DustConfig.set(configKey, value);
    emit ConfigUpdated(configKey, value, _msgSender());
  }

  /**
   * @dev Set a configuration value by string key
   * @param configKeyString Configuration key as string
   * @param value Configuration value
   */
  function setConfigByString(string memory configKeyString, string memory value) public onlyAdmin {
    bytes32 configKey = keccak256(abi.encodePacked(configKeyString));
    setConfig(configKey, value);
  }

  /**
   * @dev Get a configuration value
   * @param configKey Configuration key
   * @return Configuration value
   */
  function getConfig(bytes32 configKey) public view returns (string memory) {
    return DustConfig.getValue(configKey);
  }

  /**
   * @dev Get a configuration value by string key
   * @param configKeyString Configuration key as string
   * @return Configuration value
   */
  function getConfigByString(string memory configKeyString) public view returns (string memory) {
    bytes32 configKey = keccak256(abi.encodePacked(configKeyString));
    return getConfig(configKey);
  }

  /**
   * @dev Authorize an external program to trigger boosts (admin+ only)
   * @param programAddress Address of the external program
   * @param programType Type of program (0=forcefield, 1=quest, 2=event, etc.)
   * @param maxBoostAmount Maximum boost amount this program can trigger
   */
  function authorizeBooster(address programAddress, uint8 programType, uint256 maxBoostAmount) public onlyAdmin {
    require(programAddress != address(0), "Invalid program address");
    require(maxBoostAmount > 0, "Max boost > 0");

    AuthorizedBooster.set(
      programAddress,
      AuthorizedBoosterData({
        programType: programType,
        maxBoostAmount: maxBoostAmount,
        grantedBy: _msgSender(),
        grantedAt: uint64(block.timestamp),
        isActive: 1
      })
    );

    emit BoosterAuthorized(programAddress, programType, maxBoostAmount);
  }

  /**
   * @dev Deauthorize an external program (admin+ only)
   * @param programAddress Address of the program to deauthorize
   */
  function deauthorizeBooster(address programAddress) public onlyAdmin {
    AuthorizedBoosterData memory booster = AuthorizedBooster.get(programAddress);
    require(booster.grantedAt > 0, "Program not authorized");

    AuthorizedBooster.deleteRecord(programAddress);

    emit BoosterDeauthorized(programAddress);
  }

  /**
   * @dev Update booster settings (admin+ only)
   * @param programAddress Address of the program to update
   * @param newMaxBoostAmount New maximum boost amount
   * @param isActive Whether the booster should be active
   */
  function updateBooster(address programAddress, uint256 newMaxBoostAmount, bool isActive) public onlyAdmin {
    AuthorizedBoosterData memory booster = AuthorizedBooster.get(programAddress);
    require(booster.grantedAt > 0, "Program not authorized");

    AuthorizedBooster.setMaxBoostAmount(programAddress, newMaxBoostAmount);
    AuthorizedBooster.setIsActive(programAddress, isActive ? 1 : 0);

    emit BoosterUpdated(programAddress, newMaxBoostAmount, isActive);
  }

  /**
   * @dev Check if a program is authorized to boost
   * @param programAddress Program address to check
   * @return Whether program is authorized and active
   */
  function isBoosterAuthorized(address programAddress) public view returns (bool) {
    AuthorizedBoosterData memory booster = AuthorizedBooster.get(programAddress);
    return booster.grantedAt > 0 && booster.isActive != 0;
  }

  /**
   * @dev Get booster information
   * @param programAddress Program address to query
   * @return Booster data
   */
  function getBooster(address programAddress) public view returns (AuthorizedBoosterData memory) {
    return AuthorizedBooster.get(programAddress);
  }

  /**
   * @dev Get maximum boost amount for a program
   * @param programAddress Program address to query
   * @return Maximum boost amount (0 if not authorized)
   */
  function getMaxBoostAmount(address programAddress) public view returns (uint256) {
    AuthorizedBoosterData memory booster = AuthorizedBooster.get(programAddress);
    if (booster.grantedAt > 0 && booster.isActive != 0) {
      return booster.maxBoostAmount;
    }
    return 0;
  }

  /**
   * @dev Initialize default configuration (owner only, one-time setup)
   */
  function initializeConfig() public onlyOwner {
    // Set default configuration values
    setConfig(keccak256("site_name"), "Daily Dust");
    setConfig(keccak256("site_description"), "Decentralized content management for Minecraft");
    setConfig(keccak256("max_articles_per_day"), "10");
    setConfig(keccak256("min_boost_amount"), "100000000000000000"); // 0.1 ETH in wei
    setConfig(keccak256("default_tip_split_platform"), "1000"); // 10% in basis points

    emit ConfigUpdated(keccak256("system_initialized"), "true", _msgSender());
  }

  /**
   * @dev Batch set multiple configuration values
   * @param configKeys Array of configuration keys
   * @param values Array of configuration values
   */
  function batchSetConfig(bytes32[] memory configKeys, string[] memory values) public onlyAdmin {
    require(configKeys.length == values.length, "Keys and values length mismatch");

    for (uint256 i = 0; i < configKeys.length; i++) {
      DustConfig.set(configKeys[i], values[i]);
      emit ConfigUpdated(configKeys[i], values[i], _msgSender());
    }
  }

  /**
   * @dev Delete a configuration value (owner only)
   * @param configKey Configuration key to delete
   */
  function deleteConfig(bytes32 configKey) public onlyOwner {
    DustConfig.deleteRecord(configKey);
    emit ConfigUpdated(configKey, "", _msgSender());
  }

  /**
   * @dev Emergency pause/unpause system (owner only)
   * @param isPaused Whether system should be paused
   */
  function setSystemPaused(bool isPaused) public onlyOwner {
    string memory pauseValue = isPaused ? "true" : "false";
    setConfig(keccak256("system_paused"), pauseValue);
  }

  /**
   * @dev Check if system is paused
   * @return Whether system is currently paused
   */
  function isSystemPaused() public view returns (bool) {
    string memory pauseValue = getConfig(keccak256("system_paused"));
    return keccak256(abi.encodePacked(pauseValue)) == keccak256(abi.encodePacked("true"));
  }

  /**
   * @dev Get configuration key hash from string
   * @param configKeyString Configuration key as string
   * @return Configuration key hash
   */
  function getConfigKeyHash(string memory configKeyString) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(configKeyString));
  }

  /**
   * @dev Check if configuration exists
   * @param configKey Configuration key
   * @return Whether configuration exists
   */
  function configExists(bytes32 configKey) public view returns (bool) {
    string memory value = DustConfig.getValue(configKey);
    return bytes(value).length > 0;
  }

  /**
   * @dev Check if configuration exists by string key
   * @param configKeyString Configuration key as string
   * @return Whether configuration exists
   */
  function configExistsByString(string memory configKeyString) public view returns (bool) {
    bytes32 configKey = keccak256(abi.encodePacked(configKeyString));
    return configExists(configKey);
  }
}
