# DUST Template - Waypoint Manager & Development Guide

This repository contains a DUST application template with a local storage-based waypoint management system, demonstrating practical patterns for DUST app development.

## Features

### 🗺️ **Waypoint Manager**
- **Local Storage**: Personal waypoints stored in browser localStorage (no blockchain needed)
- **Current Position**: Create waypoints at your current in-game position
- **Dustkit Integration**: Set waypoints directly in the DUST client
- **Full CRUD**: Create, view, update, and delete waypoints
- **Persistent Data**: Waypoints persist between sessions

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

### 3. ForceFieldProgram
**File:** `packages/contracts/src/ForceFieldProgram.sol`

Template for force field programs that can react to various events within their area.

**Available Hooks:**
- `onMine` - When blocks are mined
- `onBuild` - When blocks are built
- `onHit` - When the force field is hit
- `onEnergize` - When energy is added

### 4. SpawnTileProgram
**File:** `packages/contracts/src/SpawnTileProgram.sol`

Template for spawn tile programs that react to player spawning.

**Available Hooks:**
- `onSpawn` - When a player spawns on the tile

### 5. BedProgram
**File:** `packages/contracts/src/BedProgram.sol`

Template for bed programs that react to sleep events.

**Available Hooks:**
- `onSleep` - When a player sleeps
- `onWakeup` - When a player wakes up

## Architecture Patterns

### **Local Storage vs Smart Contracts**

This template demonstrates when to use different storage approaches:

**Local Storage (Waypoints):**
- ✅ Personal data that doesn't need to be shared
- ✅ Fast, immediate updates
- ✅ No gas costs or blockchain complexity
- ✅ Perfect for user preferences, settings, personal notes
- ❌ Not accessible from other devices
- ❌ Can't be shared with other players

**Smart Contracts (Program Templates):**
- ✅ Shared global state
- ✅ Persistent across all devices
- ✅ Can interact with other contracts/programs
- ✅ Verifiable and transparent
- ❌ Gas costs for transactions
- ❌ Slower update times
- ❌ More complex development

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
- Examples: Custom management systems, configuration handlers

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

The template includes example program contracts that demonstrate DUST development patterns.

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
│   └── app/                # Frontend application
│       ├── src/
│       │   ├── components/ # React components (WaypointsTab)
│       │   ├── hooks/      # Custom hooks (useWaypoints)
│       │   ├── common/     # Shared utilities
│       │   └── mud/        # MUD integration
│       └── public/
│           └── dust-app.json # App manifest
└── CLAUDE.md               # Comprehensive development guide
```

## Key Files

- **`useWaypoints.ts`** - Local storage hook for waypoint management
- **`WaypointsTab.tsx`** - Waypoint manager UI component  
- **`App.tsx`** - Main app component
- **`dust-app.json`** - DUST app manifest/configuration

## Getting Started with Development

### 1. Clone and Setup
```bash
git clone <repository-url>
cd dust-template
pnpm install
```

### 2. Start Development
```bash
cd packages/app
pnpm dev
```

### 3. Preview in DUST
Open: `https://alpha.dustproject.org?debug-app=http://localhost:3000/dust-app.json`

### 4. Build Your Features
- Add new components in `packages/app/src/components/`
- Create custom hooks in `packages/app/src/hooks/`
- Add smart contracts in `packages/contracts/src/` (if needed)

## Development Patterns

### Local Storage for Personal Data
Use the `useWaypoints` pattern for:
- User preferences and settings
- Personal notes and bookmarks
- Local game state
- Quick prototyping

### Smart Contracts for Shared State
Use MUD programs/systems for:
- Player interactions
- Global game mechanics
- Persistent world state
- Economic systems

## Additional Resources

- [CLAUDE.md](CLAUDE.md) - Comprehensive development guide with detailed examples
- [MUD Documentation](https://mud.dev)
- [DUST Documentation](https://dev.dustproject.org/)
- [Solidity Documentation](https://docs.soliditylang.org)
