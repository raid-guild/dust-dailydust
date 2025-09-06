// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { System } from "@latticexyz/world/src/System.sol";
import { Creators, DevContributors, Editors, Post, TipDetails, TipDetailsData, TipReceipt, TipReceiptData, Treasury } from "../codegen/index.sol";

contract TipSystem is System {
  /**
   * @dev Tip a post with a specified token and amount
   * @param postId The ID of the post to tip
   * @param tokenAddress The address of the ERC-20 token to use for tipping
   * @param amount The amount of tokens to tip
   * @return The ID of the created tipDetails record
   */
  function tipPost(bytes32 postId, address tokenAddress, uint256 amount) public returns (bytes32) {
    IERC20 token = IERC20(tokenAddress);

    require(Post.getOwner(postId) != address(0), "Post does not exist");
    require(token.totalSupply() > 0, "Token has no supply");
    require(amount > 0, "Amount must be greater than zero");

    address tipperAddress = _msgSender();
    bytes32 tipDetailsId = keccak256(abi.encodePacked(tipperAddress, postId, block.timestamp));

    TipDetails.set(
      tipDetailsId,
      TipDetailsData({
        amount: amount,
        createdAt: uint64(block.timestamp),
        postId: postId,
        tipperAddress: tipperAddress,
        tokenAddress: tokenAddress
      })
    );

    // | Role                                 | Share   |
    // |--------------------------------------|---------|
    // | Tipped author or commentor           | 60%     |
    // | RaidGuild Forge (treasaury)          | 10%     |
    // | Original Creators (listed in app)    | 10%     |
    // | Editor                               | 10%     |
    // | Dev Contributors.                    | 10%     |

    uint256 authorShare = (amount * 60) / 100;
    uint256 treasuryShare = (amount * 10) / 100;
    uint256 creatorsShare = (amount * 10) / 100;
    uint256 editorShare = (amount * 10) / 100;
    uint256 devContributorsShare = amount - (authorShare + treasuryShare + creatorsShare + editorShare); // Remainder to avoid rounding issues

    // Transfer the total amount from the tipper to this contract
    token.transferFrom(tipperAddress, address(this), amount);

    address postOwner = Post.getOwner(postId);
    token.transfer(postOwner, authorShare);

    if (Treasury.get() != address(0)) {
      token.transfer(Treasury.get(), treasuryShare);
    }

    _tipCreators(postId, creatorsShare, tipperAddress, tokenAddress, token);
    _tipEditors(postId, editorShare, tipperAddress, tokenAddress, token);
    _tipDevContributors(postId, devContributorsShare, tipperAddress, tokenAddress, token);

    return tipDetailsId;
  }

  function _tipCreators(
    bytes32 postId,
    uint256 creatorsShare,
    address tipperAddress,
    address tokenAddress,
    IERC20 token
  ) internal {
    address[] memory creatorAddresses = Creators.get();
    for (uint256 i = 0; i < creatorAddresses.length; i++) {
      token.transfer(creatorAddresses[i], creatorsShare / creatorAddresses.length);

      _storeTipReceipt(
        postId,
        creatorAddresses[i],
        creatorsShare / creatorAddresses.length,
        tipperAddress,
        tokenAddress
      );
    }
  }

  function _tipEditors(
    bytes32 postId,
    uint256 editorShare,
    address tipperAddress,
    address tokenAddress,
    IERC20 token
  ) internal {
    address[] memory editorAddresses = Editors.get();
    for (uint256 i = 0; i < editorAddresses.length; i++) {
      token.transfer(editorAddresses[i], editorShare / editorAddresses.length);
      _storeTipReceipt(postId, editorAddresses[i], editorShare / editorAddresses.length, tipperAddress, tokenAddress);
    }
  }

  function _tipDevContributors(
    bytes32 postId,
    uint256 devContributorsShare,
    address tipperAddress,
    address tokenAddress,
    IERC20 token
  ) internal {
    address[] memory devContributorsAddresses = DevContributors.get();
    for (uint256 i = 0; i < devContributorsAddresses.length; i++) {
      token.transfer(devContributorsAddresses[i], devContributorsShare / devContributorsAddresses.length);
      _storeTipReceipt(
        postId,
        devContributorsAddresses[i],
        devContributorsShare / devContributorsAddresses.length,
        tipperAddress,
        tokenAddress
      );
    }
  }

  function _storeTipReceipt(
    bytes32 postId,
    address receiver,
    uint256 amount,
    address tipperAddress,
    address tokenAddress
  ) internal {
    bytes32 tipReceiptId = keccak256(abi.encodePacked(tipperAddress, postId, block.timestamp, receiver));
    TipReceipt.set(
      tipReceiptId,
      TipReceiptData({
        amount: amount,
        createdAt: uint64(block.timestamp),
        postId: postId,
        receiver: receiver,
        tipperAddress: tipperAddress,
        tokenAddress: tokenAddress
      })
    );
  }
}
