// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

/// @notice Encode a player address into DUST's EntityId bytes32 format.
/// Layout: [0]=0x01 (type tag), [1..20]=address, [21..31]=zeros
function encodePlayerEntityId(address player) pure returns (bytes32) {
    // bytes32(bytes1(0x01)) puts 0x01 in the *most significant* byte.
    // bytes32(bytes20(player)) upcasts the address left-aligned; >> 8 shifts it right by one byte.
    return bytes32(bytes1(0x01)) | (bytes32(bytes20(player)) >> 8);
}

/// @notice Decode a bytes32 back to the player address (reverts if not a Player id).
function decodePlayerEntityId(bytes32 entityId) pure returns (address) {
    // First byte must be the Player type tag (0x01)
    require(bytes1(entityId) == 0x01, "not a player entity");
    // Shift left one byte to drop the type tag, then take the top 20 bytes.
    return address(bytes20(entityId << 8));
}
