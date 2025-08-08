// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

import { System } from "@latticexyz/world/src/System.sol";
import { EntityId } from "@dust/world/src/types/EntityId.sol";
import { ObjectType } from "@dust/world/src/types/ObjectType.sol";

import { ChestOwner } from "../codegen/tables/ChestOwner.sol";
import { TradingChain } from "../codegen/tables/TradingChain.sol";

contract TradingChainSystem is System {
    function setTradeLink(EntityId chest, ObjectType fromItem, ObjectType toItem) external {
        // Only the owner of the chest can set trade links
        require(ChestOwner.getOwner(chest) == msg.sender, "Only chest owner can set trade links");
        
        // Set the trading chain link
        TradingChain.set(chest, fromItem, toItem);
    }

    function removeTradeLink(EntityId chest, ObjectType fromItem) external {
        // Only the owner of the chest can remove trade links
        require(ChestOwner.getOwner(chest) == msg.sender, "Only chest owner can remove trade links");
        
        // Remove the trading chain link
        TradingChain.deleteRecord(chest, fromItem);
    }

    function getTradeLink(EntityId chest, ObjectType fromItem) external view returns (ObjectType) {
        return TradingChain.getToItem(chest, fromItem);
    }
}