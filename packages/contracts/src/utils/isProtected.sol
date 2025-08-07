// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

import { Energy } from "@dust/world/src/codegen/tables/Energy.sol";
import { EntityId } from "@dust/world/src/types/EntityId.sol";

import { getForceField } from "./getForceField.sol";

function isProtected(EntityId target) view returns (bool) {
  (EntityId forceField,) = getForceField(target);
  return forceField.exists() && Energy.getEnergy(forceField) != 0;
}
