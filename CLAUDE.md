# Dust Programs Development Guide

## How Programs Work

Programs in DUST are smart contracts that react to world events through hooks. They use the MUD framework.

### Concepts
- **Systems**: Contract logic that modifies the world state
- **Tables**: On-chain data storage defined through schemas
- **Hooks**: Functions that execute when specific world events occur (e.g., block placement, hitting a force field)

### Program Lifecycle
1. **Registration**: Programs are registered under a namespace within the world
2. **Event Listening**: Programs implement specific hooks
3. **Execution**: When actions happen in the world, registered programs execute their logic
4. **State Modification**: Programs can modify world state through system calls

## Data Schema Configuration

### Adding Tables in mud.config.ts

```typescript
// In mud.config.ts
export default defineWorld({
  tables: {
    Owner: {
      schema: {
        entity: "EntityId",
        owner: "address",
      },
      key: ["entity"],
    },
    // Add more tables as needed
  },
});
```

### DUST Types
- `EntityId` - Represents all unique entities in the game (players, blocks, tools)
    - Import from `@dust/world/src/types/EntityId.sol`
- `ObjectType` - The type of an entity
    - Import from `@dust/world/src/types/ObjectType.sol`

## Build Process

### Generating Code from Schema

After modifying `mud.config.ts`, run:

```bash
pnpm build
```

This command:
1. Reads your schema definitions from `mud.config.ts`
2. Generates Solidity table and system libraries
4. Compiles the Solidity code using Foundry (`forge build`)

Generated files appear in:
- `src/codegen/` - Solidity table libraries
- `src/codegen/tables/` - Solidity table libraries
- `src/codegen/world/` - World interface updates

## Deployment

### Local Development

1. Start local chain (from repo root):
```bash
pnpm dev
```

2. Deploy contracts (from contracts package):
```bash
cd packages/contracts
pnpm deploy:local
```

### Mainnet Deployment

1. Set environment variables:
```bash
export PRIVATE_KEY="your-private-key"
```

2. Deploy (from contracts package):
```bash
cd packages/contracts
pnpm deploy:redstone
```

## Writing Programs

### Program Inheritance Structure

Every program should inherit from the appropriate base classes:

1. **BaseProgram** - Provides common functionality for all programs
2. **System** - Required for MUD system integration
3. **Interface(s)** - The specific hooks your program responds to (e.g., ITransfer for chests)

### Basic Program Structure (some template programs can be found in the contracts package)

```solidity

// Modify the existing BaseProgram onAttach and onDetach hooks

import { Owner } from "./codegen/tables/Owner.sol";

abstract contract BaseProgram is IAttachProgram, IDetachProgram, System, WorldConsumer(Constants.DUST_WORLD) {
  function onAttachProgram(HookContext calldata ctx) public virtual override onlyWorld {
    Owner.set(ctx.target, ctx.caller.getPlayerAddress());
  }

  function onDetachProgram(HookContext calldata ctx) public virtual override onlyWorld {
    // Only revert if revertOnFailure is set, otherwise we wouldn't reach the cleanup
    if (ctx.revertOnFailure) {
        // ctx.target is the chest
        // ctx.caller is the player
        // The revert reason will be displayed in the client
        require(Owner.get(ctx.target) == ctx.caller.getPlayerAddress(), "Only the owner can use this chest");
    }

    // Always perform cleanup!
    Owner.deleteRecord(ctx.target);
  }
```


```solidity
// Import program interfaces and HookContext struct from @dust/world package
import { HookContext, ITransfer } from "@dust/world/src/ProgramHooks.sol";

import { Owner } from "./codegen/tables/Owner.sol";

contract MyChestProgram is ITransfer, System, BaseProgram {

    // React to transferring stuff from/to chest's inventory
    function onTransfer(
        HookContext calldata ctx,
        TransferData calldata transfer
    ) public {
        // Only revert if revertOnFailure is set
        if (ctx.revertOnFailure) {
            // ctx.target is the chest
            // ctx.caller is the player
            // The revert reason will be displayed in the client
            require(Owner.get(ctx.target) == ctx.caller.getPlayerAddress(), "Only the owner can use this chest");
        }

        // Perform state changes / cleanup if needed
        // Assuming a SomeTable table with schema EntityId -> uint256
        SomeTable.set(ctx.target, 123);
    }

    // ...
}
```

### Accessing Tables

```typescript
// In mud.config.ts
export default defineWorld({
  tables: {
    Owner: {
      schema: {
        entity: "EntityId",
        owner: "address",
      },
      key: ["entity"],
    },
    SomeOtherTable: {
      schema: {
        chest: "EntityId",
        value: "uint256",
        someOtherValue: "bytes32"
      },
      key: ["chest"],
    },
  },
});
```


```solidity
import { SomeOtherTable, SomeOtherTableData } from "./codegen/tables/SomeOtherTable.sol";

// Read specific field
uint256 value = SomeOtherTable.getValue(ctx.target);

// Read both value and someOtherValue into a struct
SomeOtherTableData memory data = SomeOtherTable.get(ctx.target);
// Then access fields from the struct
data.value;

// Write specific field
SomeOtherTable.setValue(ctx.target, newValue);

// Write all values at once by using the SomeOtherTableData struct
SomeOtherTable.set(ctx.target, data);

// Delete entire record for the target entity id
SomeOtherTable.deleteRecord(ctx.target);
```

### Helper Functions and Utilities

#### Getting Player Address from EntityId
```solidity
// Get the player's address from ctx.caller
address playerAddress = ctx.caller.getPlayerAddress();
```

#### Working with Object Types
```solidity
import { ObjectType, ObjectTypes } from "@dust/world/src/types/ObjectType.sol";

// Common object types
ObjectTypes.WheatSeed  // For wheat seeds
ObjectTypes.Dirt       // For dirt blocks
mine.objectType.isLeaf()  // Check if a block is a leaf type

// Compare object types
if (transfer.deposits[0].objectType == ObjectTypes.WheatSeed) {
    // Handle wheat seed deposits
}
```

#### Accessing DUST World Tables
```solidity
// Death table - tracks player deaths
import { Death } from "@dust/world/src/codegen/tables/Death.sol";
uint256 deathCount = Death.getDeaths(ctx.caller);

// EntityTypeLib - convert between EntityId and player addresses
import { EntityTypeLib } from "@dust/world/src/types/EntityId.sol";
EntityId playerId = EntityTypeLib.encodePlayer(playerAddress);
```

#### Working with Transfer Data
```solidity
// TransferData structure contains deposits and withdrawals
function onTransfer(HookContext calldata ctx, TransferData calldata transfer) external {
    // Check deposits
    if (transfer.deposits.length > 0) {
        for (uint i = 0; i < transfer.deposits.length; i++) {
            ObjectType itemType = transfer.deposits[i].objectType;
            uint256 amount = transfer.deposits[i].amount;
            // Process deposit
        }
    }

    // Check withdrawals
    if (transfer.withdrawals.length > 0) {
        // Handle withdrawals
    }
}
```

#### Common Patterns

1. **Owner Tracking**:
```solidity
import { Owner } from "./codegen/tables/Owner.sol";

// Set owner on attach
function onAttachProgram(HookContext calldata ctx) public override onlyWorld {
    Owner.set(ctx.target, ctx.caller.getPlayerAddress());
}

// Check ownership
require(Owner.get(ctx.target) == ctx.caller.getPlayerAddress(), "Not owner");

// Clear owner on detach
Owner.deleteRecord(ctx.target);
```

2. **State Management**:
```solidity
// Track boolean states
GameActive.set(ctx.target, true);

// Track counters
uint256 currentCount = Counter.get(ctx.target);
Counter.set(ctx.target, currentCount + 1);

// Track lists (using multiple records with composite keys)
```

## Data Access Patterns & Best Practices

### Table Design Patterns

1. **Single Entity Storage**:
```solidity
// For data tied to a single entity
tables: {
  EntityData: {
    schema: {
      entity: "EntityId",
      value: "uint256",
    },
    key: ["entity"],
  },
}
```

2. **Composite Key Storage**:
```solidity
// For relationships between entities
tables: {
  Relationship: {
    schema: {
      entity1: "EntityId",
      entity2: "EntityId",
      data: "bytes32",
    },
    key: ["entity1", "entity2"],
  },
}
```

3. **Player-Entity Mapping**:
```solidity
// For player-specific data per entity
tables: {
  PlayerData: {
    schema: {
      entity: "EntityId",
      player: "address",
      value: "uint256",
    },
    key: ["entity", "player"],
  },
}
```

### Array Storage Pattern

For storing lists of players or entities:
```solidity
// Define an array table
tables: {
  PlayerList: {
    schema: {
      players: "address[]",
    },
    key: [],  // No key means single record
  },
}

// In Solidity
import { PlayerList } from "./codegen/tables/PlayerList.sol";

// Add to array
PlayerList.push(newPlayer);

// Get entire array
address[] memory players = PlayerList.get();

// Iterate through array
for (uint256 i = 0; i < players.length; i++) {
    // Process each player
}
```

### Best Practices

1. **Always Handle ctx.revertOnFailure**:
```solidity
function onTransfer(HookContext calldata ctx, TransferData calldata) external {
  // Only enforce rules when revertOnFailure is true
  if (ctx.revertOnFailure) {
    require(someCondition, "Error message");
  }
  // Perform state updates regardless
  updateState();
}
```

2. **Clean Up in onDetachProgram**:
```solidity
function onDetachProgram(HookContext calldata ctx) public override {
  // Always clean up data, even without reverting
  MyTable.deleteRecord(ctx.target);
  // Clear any related tables
  RelatedTable.deleteRecord(ctx.target);
}
```

3. **Initialize State in onAttachProgram**:
```solidity
function onAttachProgram(HookContext calldata ctx) public override {
  // Set initial state
  GameState.set(ctx.target, false);
  Owner.set(ctx.target, ctx.caller.getPlayerAddress());
}
```

4. **Use Memory for Complex Reads**:
```solidity
// Read once into memory for multiple accesses
GameStateData memory gameData = GameState.get(ctx.target);
if (gameData.active && gameData.playerCount > 0) {
  // Use gameData multiple times without re-reading
}
```

5. **Namespace Collision Prevention**:
- Always use a unique namespace in mud.config.ts
- Check existing namespaces before deploying (worst case it will just fail)

## Development Workflow

### Typical Development Cycle

1. **Define Schema**: Edit `mud.config.ts` to add/modify tables
2. **Generate Code**: Run `pnpm build` to generate TypeScript/Solidity code
3. **Write Logic**: Implement systems/programs in `src/systems/`
4. **Test Locally**: Use `pnpm dev` for local testing
5. **Deploy**: Deploy to target network
6. **Initialize**: Run post-deploy scripts

### Common Commands

```bash
# Install dependencies
pnpm install

# Generate code from schema (in contracts package)
pnpm build

# Start local development (at the root of the repo)
pnpm dev

# Run tests (in contracts package)
pnpm test

# Deploy contracts (within the contracts package)
pnpm deploy:local
pnpm deploy:redstone

# Clean build artifacts (if you have issues)
forge clean && pnpm build
```

### Attaching Programs to Entities

Programs must be attached to entities to become active:

1. **Get the Entity ID**: Click the MUD icon when interacting with an entity in-game
2. **Get the Program ID**: You can find them in `./packages/contracts/.mud/local/systems.json`
3. **Attach via the Explorer**: Use the updateProgram function in the interact tab
4. **Or via Script**: Use `pnpm attach <entity id> <program id>`

The player can get the entity id for a smart entity (chests, forcefields, etc) by clicking the MUD icon at the top when the native UI opens for the object, and selecting the "EntityId" field.

## Program Hooks

### Hook Context Structure

Every hook receives a `HookContext` struct containing:
```solidity
struct HookContext {
    EntityId caller;        // The entity that triggered the hook (usually the player)
    EntityId target;        // The entity the program is attached to, for which the hook is being called
    bool revertOnFailure;   // Whether to revert the action if hook fails
    bytes extraData;        // Additional data passed to the hook (usually empty)
}
```

### Important Hook Patterns

1. **Conditional Reverting**: Only revert if `ctx.revertOnFailure` is true
2. **Cleanup**: Always perform cleanup in detach hooks, even without reverting
3. **Access Control**: Use hook context to determine if an action should be allowed

### Available Hooks

Programs can react to various world events. Each type of entity can react to different events:

#### Universal Hooks (All Programs)
- `onAttachProgram(HookContext ctx)` - Called when the program is attached to an entity
- `onDetachProgram(HookContext ctx)` - Called when the program is detached from an entity

#### Chest Hooks
- `onTransfer(HookContext ctx, TransferData transfer)` - Called when items are transferred to/from the chest
  ```solidity
  struct TransferData {
      SlotData[] deposits;    // Items being deposited
      SlotData[] withdrawals; // Items being withdrawn
  }

  struct SlotData {
      ObjectType objectType;  // Type of item
      uint256 amount;        // Quantity
  }
  ```
- `onOpen(HookContext ctx)` - Called when the chest is opened
- `onClose(HookContext ctx)` - Called when the chest is closed

#### Force Field Hooks
- `onMine(HookContext ctx, MineData mine)` - Called when a block is mined within the force field
  ```solidity
  struct MineData {
      EntityId entity;       // The entity that was mined
      EntityId tool;        // Tool used for mining
      Vec3 coord;          // Coordinates where mining occurred
      ObjectType objectType; // Type of object mined
  }
  ```
- `onBuild(HookContext ctx, BuildData build)` - Called when a block is built within the force field
  ```solidity
  struct BuildData {
      EntityId entity;        // The entity being built
      Vec3 coord;            // Build coordinates
      ObjectType slotType;   // Slot type used
      ObjectType objectType; // Object type being built
      Orientation orientation; // Direction/rotation
  }
  ```
- `onHit(HookContext ctx, HitData hit)` - Called when the force field is hit
  ```solidity
  struct HitData {
      EntityId tool;    // Tool/weapon used
      uint128 damage;   // Amount of damage
  }
  ```
- `onEnergize(HookContext ctx, EnergizeData energize)` - Called when the force field is energized
  ```solidity
  struct EnergizeData {
      uint128 amount;   // Energy amount
  }
  ```
- `onAddFragment(HookContext ctx, AddFragmentData fragment)` - Called when a fragment is added
  ```solidity
  struct AddFragmentData {
      EntityId added;   // The fragment entity that was added
  }
  ```
- `onRemoveFragment(HookContext ctx, RemoveFragmentData fragment)` - Called when a fragment is removed
  ```solidity
  struct RemoveFragmentData {
      EntityId removed; // The fragment entity that was removed
  }
  ```
- `validateProgram(HookContext ctx, ProgramData program)` - Validates if a `program` can be attached to `programmed`. In this case, `ctx.target` is the force field
  ```solidity
  struct ProgramData {
      EntityId programmed;  // Entity being programmed
      ProgramId program;    // Program being attached
  }
  ```

#### Spawn Tile Hooks
- `onSpawn(HookContext ctx, SpawnData spawn)` - Called when a player spawns on the tile
  ```solidity
  struct SpawnData {
      uint128 energy;  // Energy amount
      Vec3 coord;     // Spawn coordinates
  }
  ```

#### Bed Hooks
- `onSleep(HookContext ctx)` - Called when a player sleeps in the bed
- `onWakeup(HookContext ctx)` - Called when a player wakes up from the bed



## Example Programs

### Simple Owner-Only Chest

This program restricts chest access to the player who attached it:

```solidity
// In mud.config.ts, add:
tables: {
  ChestOwner: {
    schema: {
      chest: "EntityId",
      owner: "address",
    },
    key: ["chest"],
  },
}

// In OwnerChest.sol:
contract OwnerChest is ITransfer, System, BaseProgram {
  import { ChestOwner } from "./codegen/tables/ChestOwner.sol";

  function onAttachProgram(HookContext calldata ctx) public override onlyWorld {
    ChestOwner.set(ctx.target, ctx.caller.getPlayerAddress());
  }

  function onDetachProgram(HookContext calldata ctx) public override onlyWorld {
    ChestOwner.deleteRecord(ctx.target);
  }

  function onTransfer(HookContext calldata ctx, TransferData calldata) external onlyWorld {
    if (ctx.revertOnFailure) {
      require(
        ChestOwner.getOwner(ctx.target) == ctx.caller.getPlayerAddress(),
        "Only owner can access"
      );
    }
  }
}
```

### Mining Restriction Force Field

This program allows only specific block types to be mined:

```solidity
// In mud.config.ts:
tables: {
  AllowedBlocks: {
    schema: {
      forcefield: "EntityId",
      blockType: "ObjectType",
      allowed: "bool",
    },
    key: ["forcefield", "blockType"],
  },
}

// In MiningRestriction.sol:
import { AllowedBlocks } from "./codegen/tables/AllowedBlocks.sol";

contract MiningRestriction is IMine, System, BaseProgram {
  function onMine(HookContext calldata ctx, MineData calldata mine) external view onlyWorld {
    if (ctx.revertOnFailure) {
      require(
        AllowedBlocks.getAllowed(ctx.target, mine.objectType),
        "Cannot mine this block type"
      );
    }
  }
}
```

### Spleef Arena Example

A complete working example of a Spleef-style game using death count tracking:

```typescript
// mud.config.ts:
tables: {
  Participant: {
    schema: {
      player: "address",
      deathCount: "uint256",  // Death count when they joined
      isSet: "bool",
    },
    key: ["player"],
  },
  Depositors: {
    schema: {
      depositors: "address[]",  // List of all participants
    },
    key: [],
  },
}
```

```solidity
// SpleefChest.sol - Entry fee chest and winner withdrawal:
import { Death } from "@dust/world/src/codegen/tables/Death.sol";
import { EntityTypeLib } from "@dust/world/src/types/EntityId.sol";
import { ObjectTypes } from "@dust/world/src/types/ObjectType.sol";
import { Depositors } from "./codegen/tables/Depositors.sol";
import { Participant, ParticipantData } from "./codegen/tables/Participant.sol";

contract SpleefChest is ITransfer, System, BaseProgram {
  function onTransfer(HookContext calldata ctx, TransferData calldata transfer) external onlyWorld {
    if (!ctx.revertOnFailure) return;

    address player = ctx.caller.getPlayerAddress();
    ParticipantData memory data = Participant.get(player);

    // Handle withdrawals (winner takes all)
    if (transfer.withdrawals.length > 0) {
      require(data.isSet, "You are not part of the game!");
      address[] memory depositors = Depositors.get();

      // Check if all other players are dead
      for (uint256 i = 0; i < depositors.length; i++) {
        address otherPlayer = depositors[i];
        uint256 currentDeaths = Death.getDeaths(EntityTypeLib.encodePlayer(otherPlayer));
        require(
          otherPlayer == player || currentDeaths > Participant.getDeathCount(otherPlayer),
          "Game is still ongoing! Kill them all!"
        );
      }
      return;
    }

    // Handle deposits (entry fee)
    require(!data.isSet, "Already deposited!");
    require(transfer.deposits.length == 1, "Only one wheat seeds deposit is allowed");
    require(transfer.deposits[0].objectType == ObjectTypes.WheatSeed, "Only wheat seeds");
    require(transfer.deposits[0].amount >= 5, "At least 5 wheat seeds required");

    // Register participant with their current death count
    Participant.set(player, Death.getDeaths(ctx.caller), true);
    Depositors.push(player);
  }
}
```

```solidity
// SpleefArena.sol - Force field controlling the arena:
contract SpleefArena is IMine, IBuild, System, BaseProgram {
  function onMine(HookContext calldata ctx, MineData calldata mine) external view onlyWorld {
    if (!ctx.revertOnFailure) return;

    address player = ctx.caller.getPlayerAddress();

    // Only participants can mine
    require(Participant.getIsSet(player), "You are not part of the game!");

    // Can only mine leaves (spleef blocks)
    require(mine.objectType.isLeaf(), "Can only mine leaves!");
  }

  function onBuild(HookContext calldata ctx, BuildData calldata) external view onlyWorld {
    if (!ctx.revertOnFailure) return;

    // No building allowed in the arena
    revert("Building is not allowed in the arena!");
  }
}
```

**How it works:**
1. Players deposit 5 wheat seeds to enter the game
2. Their death count is recorded when they join
3. Players can only mine leaves within the force field
4. Last player alive (others have increased death count) can withdraw all wheat seeds

## Troubleshooting

### Common Issues

**Build fails after schema change**
- Rebuild (including MUD codegen): `pnpm build`
- Clean and rebuild if issues persist: `forge clean && pnpm build`

**Deployment fails**
- Check account balance
- Verify RPC connection
- Ensure PRIVATE_KEY is set correctly
- Check if namespace is already taken

**Attaching program fails**
- Check error message and transaction traces (`cast run --rpc-url https://rpc.redstonechain.com <tx hash>`)
- Check any permissions implemented by the program
- Ensure you're close enough to the entity in-game
- Verify the program was deployed successfully

**Program not working as intended**
- Ensure program is attached by checking the EntityProgram table in the explorer (https://explorer.mud.dev/redstone/worlds/0x253eb85B3C953bFE3827CC14a151262482E7189C/explore)
- Check the data of the tables registered under your namespace
- Verify hook implementations match expected signatures
- Check if `ctx.revertOnFailure` is being handled correctly

**"Hook not supported" error**
- Entity type doesn't support that specific hook
- Check you're implementing the correct interface for your entity type
- Ensure fallback function is properly configured

**Table access errors**
- Ensure tables are imported from the correct codegen path
- Run `pnpm build` after any schema changes
- Check table keys match what you defined in mud.config.ts

**Player address issues**
- Use `ctx.caller.getPlayerAddress()` to get the player's address
- EntityId and address are different - always convert when needed

## Additional Resources

- MUD Documentation: https://mud.dev
- Solidity Documentation: https://docs.soliditylang.org
- Dust docs: https://dev.dustproject.org/
- Project Scripts: See `package.json` for all available commands
