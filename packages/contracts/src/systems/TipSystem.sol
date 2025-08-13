// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { Note, NoteData } from "../codegen/tables/Note.sol";

contract TipSystem is System {
  // Events for tracking
  event TipSent(bytes32 indexed noteId, address indexed tipper, address indexed recipient, uint256 amount);
  event NoteBoost(bytes32 indexed noteId, address indexed booster, uint256 amount, uint64 duration);

  /**
   * @dev Send a tip to a note's tip jar
   * @param noteId Note to tip
   */
  function tipNote(bytes32 noteId) public payable {
    require(msg.value > 0, "Tip amount must be greater than 0");

    // Verify note exists
    NoteData memory note = Note.get(noteId);
    require(note.owner != address(0), "Note does not exist");

    // Send tip to the tip jar address
    (bool success, ) = note.tipJar.call{ value: msg.value }("");
    require(success, "Tip transfer failed");

    // Update total tips counter
    uint256 newTotal = note.totalTips + msg.value;
    Note.setTotalTips(noteId, newTotal);

    emit TipSent(noteId, _msgSender(), note.tipJar, msg.value);
  }

  /**
   * @dev Boost a note for featured visibility
   * @param noteId Note to boost
   * @param duration How long to boost in seconds
   */
  function boostNote(bytes32 noteId, uint64 duration) public payable {
    require(msg.value > 0, "Boost payment required");
    require(duration > 0, "Duration must be greater than 0");

    // Verify note exists
    NoteData memory note = Note.get(noteId);
    require(note.owner != address(0), "Note does not exist");

    // Calculate new boost end time
    uint64 currentTime = uint64(block.timestamp);
    uint64 newBoostUntil = currentTime + duration;

    // If already boosted, extend the time
    if (note.boostUntil > currentTime) {
      newBoostUntil = note.boostUntil + duration;
    }

    // Set the new boost time
    Note.setBoostUntil(noteId, newBoostUntil);

    // Send boost payment to note owner (could be changed to a treasury)
    (bool success, ) = note.owner.call{ value: msg.value }("");
    require(success, "Boost payment transfer failed");

    emit NoteBoost(noteId, _msgSender(), msg.value, duration);
  }

  /**
   * @dev Get tip jar balance for a note
   * @param noteId Note to check
   * @return balance Current balance of the tip jar
   */
  function getTipJarBalance(bytes32 noteId) public view returns (uint256 balance) {
    NoteData memory note = Note.get(noteId);
    require(note.owner != address(0), "Note does not exist");

    return note.tipJar.balance;
  }

  /**
   * @dev Check if a note is currently boosted
   * @param noteId Note to check
   * @return isBoosted Whether the note is currently boosted
   * @return timeRemaining Seconds remaining in boost (0 if not boosted)
   */
  function getNoteBoostStatus(bytes32 noteId) public view returns (bool isBoosted, uint64 timeRemaining) {
    NoteData memory note = Note.get(noteId);
    require(note.owner != address(0), "Note does not exist");

    uint64 currentTime = uint64(block.timestamp);

    if (note.boostUntil > currentTime) {
      return (true, note.boostUntil - currentTime);
    } else {
      return (false, 0);
    }
  }

  /**
   * @dev Emergency withdraw function for tip jar owners
   * @param noteId Note whose tip jar to withdraw from
   */
  function withdrawFromTipJar(bytes32 noteId) public {
    NoteData memory note = Note.get(noteId);
    require(_msgSender() == note.tipJar, "Only tip jar owner can withdraw");

    uint256 balance = note.tipJar.balance;
    require(balance > 0, "No funds to withdraw");

    (bool success, ) = _msgSender().call{ value: balance }("");
    require(success, "Withdrawal failed");
  }
}
