# DUST Template - Example Programs and Development Guide

This repository contains example programs for DUST that demonstrate different patterns and use cases for smart entities in the game.

## Overview

Programs in DUST are smart contracts that react to world events through hooks. They can be attached to entities like chests, force fields, spawn tiles, and beds to add custom behavior.

## Example Programs

### 1. BaseProgram
**File:** `packages/contracts/src/BaseProgram.sol`

The foundation contract that all programs inherit from. It provides:
- Basic attachment/detachment hooks
- World context management
- Default fallback for unsupported hooks

### 2. ChestProgram
**File:** `packages/contracts/src/ChestProgram.sol`

A minimal chest program template that shows the basic structure for handling transfers.

**Key Features:**
- Implements the `ITransfer` interface
- Empty implementation ready for customization

### 3. ChestCounterProgram
**File:** `packages/contracts/src/ChestCounterProgram.sol`

A chest that only allows transfers when a global counter is odd.

**Key Features:**
- Reads from the global `Counter` table
- Conditionally blocks transfers based on counter value
- Demonstrates interaction with external systems

**How it works:**
1. When a transfer is attempted, it checks the global counter value
2. If the counter is odd, the transfer proceeds
3. If the counter is even, the transfer is blocked
4. Players can increment/decrement the counter using the `CounterSystem`

### 4. CounterSystem
**File:** `packages/contracts/src/systems/CounterSystem.sol`

A simple system that manages a global counter, used by ChestCounterProgram.

**Key Features:**
- `increment()` - Increases counter by 1
- `decrement()` - Decreases counter by 1  
- `setValue(uint256)` - Sets counter to specific value
- `getValue()` - Returns current counter value

**Note:** This is a System, not a Program. It provides callable functions rather than reacting to hooks.

### 5. ForceFieldProgram
**File:** `packages/contracts/src/ForceFieldProgram.sol`

Template for force field programs that can react to various events within their area.

**Available Hooks:**
- `onMine` - When blocks are mined
- `onBuild` - When blocks are built
- `onHit` - When the force field is hit
- `onEnergize` - When energy is added

### 6. SpawnTileProgram
**File:** `packages/contracts/src/SpawnTileProgram.sol`

Template for spawn tile programs that react to player spawning.

**Available Hooks:**
- `onSpawn` - When a player spawns on the tile

### 7. BedProgram
**File:** `packages/contracts/src/BedProgram.sol`

Template for bed programs that react to sleep events.

**Available Hooks:**
- `onSleep` - When a player sleeps
- `onWakeup` - When a player wakes up

## Architecture Patterns

### Program vs System Design

Understanding when to use Programs vs Systems is crucial:

**Programs:**
- React to world events through hooks
- Cannot be called directly
- Must inherit from `IHookInterface`, `System`, and `BaseProgram`
- Examples: ChestProgram, ForceFieldProgram

**Systems:**
- Provide callable functions
- Can be invoked through explorer or other contracts
- Only inherit from `System`
- Examples: CounterSystem

### Configuration Pattern

When programs need configuration that happens outside of hook events, use a separate System:

```solidity
// Program handles reactive logic
contract MyProgram is ITransfer, System, BaseProgram {
    function onTransfer(...) external onlyWorld {
        // Check rules, enforce constraints
    }
}

// System handles configuration
contract MySystem is System {
    function configure(...) external {
        // Set parameters, update tables
    }
}
```

## Getting Started

### Prerequisites
- Node.js v20+
- pnpm
- Foundry (for Solidity compilation)

### Installation
```bash
pnpm install
```

### Building
```bash
cd packages/contracts
pnpm build
```

### Testing
```bash
cd packages/contracts
pnpm test
```

Tests are provided in `packages/contracts/test/`:
- `ChestCounterProgram.t.sol` - Comprehensive tests showing program interaction

Key testing patterns:
- Use generated system libraries (e.g., `counterSystem` from `CounterSystemLib.sol`)
- Never manually deploy systems in tests - MUD handles this
- Test both reverting and non-reverting modes

## Deployment

1. Update namespace in `packages/contracts/mud.config.ts` to something unique
2. Build: `pnpm build`
3. Deploy locally: `pnpm deploy:local`
4. Deploy to mainnet: `pnpm deploy:redstone`

## Attaching Programs

After deployment:
1. Get the entity ID (click MUD icon in-game)
2. Get the program ID from `packages/contracts/.mud/local/systems.json`
3. Attach via explorer or script: `pnpm attach <entity_id> <program_id>`

## Important Notes

### MUD System Detection
Programs MUST explicitly inherit from `System` even if `BaseProgram` already does. MUD's build system only detects direct inheritance.

### Import Patterns
- `TransferData` is automatically available when importing `ITransfer`
- Use generated libraries to interact with deployed systems
- Check existing imports in template programs for reference

### Table Access
All table operations go through generated libraries in `packages/contracts/src/codegen/tables/`

## Project Structure

```
dust-template/
├── packages/
│   ├── contracts/          # Smart contracts
│   │   ├── src/
│   │   │   ├── systems/    # Systems (callable functions)
│   │   │   ├── codegen/    # Generated code (do not edit)
│   │   │   └── *.sol       # Programs and base contracts
│   │   ├── test/           # Tests
│   │   └── mud.config.ts   # MUD configuration
│   └── client/             # Frontend application
└── CLAUDE.md               # Comprehensive development guide
```

## Additional Resources

- [CLAUDE.md](CLAUDE.md) - Comprehensive development guide with detailed examples
- [MUD Documentation](https://mud.dev)
- [DUST Documentation](https://dev.dustproject.org/)
- [Solidity Documentation](https://docs.soliditylang.org)
