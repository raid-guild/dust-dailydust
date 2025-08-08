// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {System} from "@latticexyz/world/src/System.sol";
import {Counter} from "../codegen/tables/Counter.sol";

contract CounterSystem is System {
    function increment() public {
        uint256 currentValue = Counter.getValue();
        Counter.setValue(currentValue + 1);
    }

    function decrement() public {
        uint256 currentValue = Counter.getValue();
        Counter.setValue(currentValue - 1);
    }

    function setValue(uint256 newValue) public {
        Counter.setValue(newValue);
    }

    function getValue() public view returns (uint256) {
        return Counter.getValue();
    }
}

