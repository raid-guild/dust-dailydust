// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

import {System, WorldContextConsumer} from "@latticexyz/world/src/System.sol";
import {HookContext, ITransfer} from "@dust/world/src/ProgramHooks.sol";
import {ObjectType} from "@dust/world/src/types/ObjectType.sol";

import {BaseProgram} from "./BaseProgram.sol";
import {ChestOwner} from "./codegen/tables/ChestOwner.sol";
import {TradingChain} from "./codegen/tables/TradingChain.sol";

contract TradingChainProgram is ITransfer, System, BaseProgram {
    function onAttachProgram(HookContext calldata ctx) public override onlyWorld {
        ChestOwner.set(ctx.target, ctx.caller.getPlayerAddress());
    }

    function onDetachProgram(HookContext calldata ctx) public override onlyWorld {
        ChestOwner.deleteRecord(ctx.target);
    }

    function onTransfer(HookContext calldata ctx, TransferData calldata transfer) external view onlyWorld {
        if (!ctx.revertOnFailure) return;

        address player = ctx.caller.getPlayerAddress();
        address owner = ChestOwner.getOwner(ctx.target);

        // Owner can do anything - withdraw, deposit, etc.
        if (player == owner) {
            return;
        }

        // Non-owners must provide exact trade: withdraw one item, deposit the matching item
        require(transfer.deposits.length == 1, "Must deposit exactly one item type");
        require(transfer.withdrawals.length == 1, "Must withdraw exactly one item type");

        ObjectType withdrawnItem = transfer.withdrawals[0].objectType;
        ObjectType depositedItem = transfer.deposits[0].objectType;

        // Check if this is a valid trade in the chain
        ObjectType expectedDeposit = TradingChain.getToItem(ctx.target, withdrawnItem);
        require(expectedDeposit == depositedItem, "Invalid trade: item not next in chain");
    }

    // Required due to inheriting from System and WorldConsumer
    function _msgSender() public view override(WorldContextConsumer, BaseProgram) returns (address) {
        return BaseProgram._msgSender();
    }

    function _msgValue() public view override(WorldContextConsumer, BaseProgram) returns (uint256) {
        return BaseProgram._msgValue();
    }
}

