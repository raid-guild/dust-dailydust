# TipSystem: Tips and Boosts

This document describes how tipping and boosting work on-chain and highlights important caveats.

## Overview
The `TipSystem` contract supports two paid interactions with notes:
- Tips: forward ETH to a note’s tip jar and increment an on-chain counter.
- Boosts: extend a note’s featured visibility window and forward ETH to the note owner.

Relevant tables/fields (from `Note` table):
- `tipJar` (address) – Recipient of tips.
- `totalTips` (uint256) – Aggregate sum of all tips sent (accounting only, not escrow).
- `boostUntil` (uint64) – UNIX timestamp until which the note is considered boosted.

## Flows

### tipNote(noteId) payable
- Require `msg.value > 0` and note exists.
- Forward `msg.value` to `note.tipJar` via low-level call.
- Increment `Note.totalTips` by `msg.value`.
- Emit `TipSent(noteId, tipper, tipJar, amount)`.

Funds are sent immediately to the tip jar; the system contract does not retain tips.

### boostNote(noteId, duration) payable
- Require `msg.value > 0`, `duration > 0`, and note exists.
- Compute `newBoostUntil = max(block.timestamp, note.boostUntil) + duration`.
- Write `Note.boostUntil = newBoostUntil`.
- Forward `msg.value` to `note.owner` (this can be changed to a treasury if desired).
- Emit `NoteBoost(noteId, booster, amount, duration)`.

## Views
- `getTipJarBalance(noteId)`: returns the native ETH balance of the `tipJar` address (not the contract’s balance).
- `getNoteBoostStatus(noteId)`: returns `(isBoosted, timeRemaining)` based on `block.timestamp` and `boostUntil`.

## Caveats and Recommendations

1) No escrow for tips
- Tips are forwarded in the same transaction and do not sit in the system. The on-chain `totalTips` is accounting-only (sum of what has been sent to the tip jar via this system).
- If escrow/withdraw semantics are required, refactor to collect tips in the system contract, track balances per note, and implement withdrawals.

2) `withdrawFromTipJar` is ineffective as written
- Today, tips go directly to the `tipJar` address. The function tries to send `tipJar.balance` from the system contract to `msg.sender`, but that balance is not held by the system; it is held by the `tipJar` account.
- Result: the function will either fail (insufficient system balance) or transfer unrelated ETH (if the system was funded). Recommendation: remove this function unless changing to an escrow model where the system actually holds funds.

3) Checks-Effects-Interactions (CEI) & reentrancy
- `tipNote` updates `totalTips` after the external call to the tip jar. Prefer CEI: update state first, then perform the external call.
- Consider a nonReentrant guard if business logic is expanded.

4) Destination addresses
- Tips go to `tipJar`; boost payments go to `owner`. If the intent is to fund a treasury or splitter, redirect accordingly.

5) Token support
- Only native ETH is supported. For ERC20 tokens, consider a separate flow (permit2, allowance, or `transferFrom`) and explicit accounting.

## Possible Improvements
- Remove or redesign `withdrawFromTipJar` (see #2).
- Apply CEI to `tipNote` and `boostNote` and optionally add a reentrancy guard.
- Add protocol/tax splits (e.g., percentage to treasury).
- Emit additional metadata (e.g., memo/anonymous flag) if needed.
- Add per-tipper stats via a new table if analytics are required.
