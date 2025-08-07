// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

import { isProtected } from "./isProtected.sol";
import { EntityId } from "@dust/world/src/types/EntityId.sol";

function isSafeCall(EntityId target) view returns (bool) {
  return !isProtected(target);
}
