// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

import { Fragment, FragmentData } from "@dust/world/src/codegen/tables/Fragment.sol";
import { Machine } from "@dust/world/src/codegen/tables/Machine.sol";

import { EntityId, EntityTypeLib } from "@dust/world/src/types/EntityId.sol";
import { Vec3 } from "@dust/world/src/types/Vec3.sol";

function getForceField(EntityId target) view returns (EntityId, EntityId) {
  Vec3 fragmentCoord = target.getPosition().toFragmentCoord();
  EntityId fragment = EntityTypeLib.encodeFragment(fragmentCoord);
  if (!fragment.exists()) return (EntityId.wrap(0), fragment);

  FragmentData memory fragmentData = Fragment.get(fragment);

  bool isActive = fragmentData.forceField.exists()
    && fragmentData.forceFieldCreatedAt == Machine.getCreatedAt(fragmentData.forceField);

  return isActive ? (fragmentData.forceField, fragment) : (EntityId.wrap(0), fragment);
}
