# DustNotes Implementation Plan

## Project Overview

**Goal**: Build a Notion-style notes + waypoints system for the DUST world that allows players to create, share, and discover rich markdown notes with optional waypoint routes.

**Current Foundation**: We have a working waypoint manager with localStorage persistence, DUST client integration, and clean UI patterns.

## Current State Analysis

### ✅ What We Have (Waypoint Manager)
- Working waypoint manager with localStorage persistence
- DUST client integration with proper `encodeBlock` usage  
- Clean UI patterns and feedback systems
- Import/export functionality for waypoints
- Category-based organization
- Entity ID generation from coordinates
- Proper error handling and user feedback

### 📝 What We Need to Build
- Note creation and editing system (markdown)
- Note-to-entity linking system
- Local draft management
- Tipping and boosting system
- On-chain MUD tables and systems
- Enhanced waypoint integration with notes

## Implementation Strategy

### Following DUST Template Patterns

**Component Structure:**
```
src/
  components/
    NotesTab.tsx          // Main notes interface (new)
    NoteEditor.tsx        // Markdown editor (new)
    NoteCard.tsx          // Individual note display (new)
    WaypointsTab.tsx      // Existing, enhanced for integration
  hooks/
    useNotes.ts           // Note management (new)
    useDrafts.ts          // Local draft management (new)
    useWaypoints.ts       // Existing, enhanced
  common/
    useDustClient.ts      // Existing DUST integration
```

**MUD Integration Patterns:**
- Follow existing table patterns in `mud.config.ts`
- Use same import structure: `@dust/world/src/types/`
- Implement systems following `BaseProgram.sol` pattern
- Use proper entity ID encoding with `encodeBlock`

**State Management Patterns:**
- localStorage for drafts (like current waypoints)
- MUD client for on-chain data
- React hooks for state management
- Same feedback/toast patterns as waypoint manager

## Phase-by-Phase Implementation

### Phase 1: Data Layer Foundation (Day 1 Morning)

**1.1 MUD Tables Setup**

Add to `mud.config.ts`:

```typescript
tables: {
  // Existing tables...
  
  Note: {
    schema: {
      noteId: "bytes32",
      owner: "address", 
      title: "string",
      content: "string",     // markdown, ~4-8KB limit
      tags: "string",        // CSV encoded for MVP
      createdAt: "uint64",
      updatedAt: "uint64", 
      tipJar: "address",     // defaults to owner
      boostUntil: "uint64",  // featured until timestamp
      totalTips: "uint256"   // cache for UI
    },
    key: ["noteId"]
  },
  
  NoteLink: {
    schema: {
      noteId: "bytes32",
      entityId: "bytes32", 
      linkType: "uint8",     // 0=anchor, 1=mirror, etc
      coordX: "int32",       // optional coord cache
      coordY: "int32",
      coordZ: "int32"
    },
    key: ["noteId", "entityId"]
  },
  
  WaypointGroup: {
    schema: {
      noteId: "bytes32",
      groupId: "uint16",
      name: "string",
      color: "uint24",       // hex color for UI
      isPublic: "bool"
    },
    key: ["noteId", "groupId"] 
  },
  
  WaypointStep: {
    schema: {
      noteId: "bytes32", 
      groupId: "uint16",
      index: "uint16",
      x: "int32",
      y: "int32", 
      z: "int32",
      label: "string"
    },
    key: ["noteId", "groupId", "index"]
  }
}
```

**1.2 Contract Systems**

Following existing patterns from `ChestProgram.sol`:

- `NoteSystem.sol` - CRUD operations for notes
- `WaypointSystem.sol` - manage waypoint groups/steps  
- `TipSystem.sol` - handle tips and boosts

### Phase 2: Core Note Management (Day 1 Afternoon)

**2.1 Note Hook & State Management**

Create `useNotes.ts` following `useWaypoints.ts` pattern:

```typescript
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  owner: string;
  tipJar: string;
  createdAt: number;
  updatedAt: number;
  boostUntil: number;
  totalTips: number;
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Similar localStorage + MUD patterns as useWaypoints
}
```

**2.2 Note Editor Component**

- Markdown textarea with preview
- Tags input (CSV for MVP)
- Title and content validation  
- Draft autosave to localStorage
- Publish/update buttons

**2.3 Notes List Component**

- Filter tabs: Nearby, Global, Featured, Mine
- Card-based layout with title, preview, tags
- Integration with DUST client for position queries

### Phase 3: Integration Features (Day 2 Morning)

**3.1 Entity Linking System**

- Detect app context from DUST client
- UI for linking notes to current entity
- Display linked notes banner when viewing entities

**3.2 Enhanced Waypoint Integration** 

- Migrate standalone waypoints to note-attached waypoint groups
- Update import/export to include note metadata
- Display waypoint groups within note cards

**3.3 Search and Discovery**

- Tag-based filtering (client-side CSV parsing)
- Proximity-based note discovery using cached coordinates
- Featured/boosted notes with countdown display

### Phase 4: Economic Features (Day 2 Afternoon)

**4.1 Tipping System**

- Simple ETH tipping to note tip jar
- Tip amount input with validation
- Success feedback and tip total updates

**4.2 Boost/Featured System**

- Boost duration selection (1h, 6h, 24h)
- ETH payment for featuring
- Featured notes priority display with timer

**4.3 Polish and Registration**

- UI/UX consistency with waypoint manager
- App registration in DUST ecosystem
- Final testing and demo preparation

## Technical Adaptations

### Key Changes from Original Spec

**Simplified for MVP:**
- Single payment token (ETH) for tips/boosts
- CSV string for tags instead of separate table
- Client-side proximity filtering initially  
- Basic markdown editor (textarea + preview)

**Enhanced from Current Implementation:**
- Connect waypoint groups to notes instead of standalone
- Add note context to waypoint creation
- Unified import/export for notes + waypoints
- Maintain existing localStorage persistence patterns

### Integration Points

**With Existing Waypoint Manager:**
- Enhance `useWaypoints.ts` to support note association
- Update `WaypointsTab.tsx` to show note context
- Maintain backward compatibility for existing waypoints

**With DUST Client:**
- Use `dustClient.appContext.entityId` for note linking
- Get player position for proximity queries
- Use `encodeBlock` for coordinate-to-entity conversion

**With MUD System:**
- Follow existing program patterns for contract integration
- Use same error handling and transaction patterns
- Maintain consistency with existing table structures

## Development Priorities

### Must Have (Core MVP)
1. ✅ Note CRUD with markdown - **COMPLETED**
   - ✅ useNotes hook with localStorage persistence
   - ✅ useDrafts hook with autosave functionality  
   - ✅ NoteEditor component with markdown textarea
   - ✅ NoteList component with filtering
   - ✅ NotesManager for orchestration
2. ✅ Local drafts with autosave - **COMPLETED**
   - ✅ Draft creation, editing, and persistence
   - ✅ Automatic saving with 1-second delay
   - ✅ Draft recovery and management
3. ✅ Entity linking from DUST context - **IN PROGRESS**
   - ✅ Basic entity ID support in notes
   - 🔄 DUST client integration (partial)
4. ✅ Basic waypoint integration - **COMPLETED** 
   - ✅ WaypointNoteLinker component
   - ✅ Integration with existing localStorage waypoints
   - ✅ Waypoint creation from note editor
5. 🔄 Simple tipping system - **PLANNED**

### Should Have (Polish)
1. 🎯 Boost/featured system
2. 🎯 Tag filtering and search
3. 🎯 Proximity-based discovery
4. 🎯 Import/export functionality

### Could Have (Stretch)
1. 🌟 Advanced markdown features
2. 🌟 Multiple payment tokens
3. 🌟 Complex waypoint routing
4. 🌟 Arweave/IPFS integration

## Testing & Review Strategy

### Testing Waypoints by Phase

**Phase 1: Data Layer Foundation**
- ✅ **Contract Compilation**: All Solidity contracts compile without errors
- ✅ **Table Schema Validation**: MUD tables generate correctly with proper types
- ✅ **Basic Contract Tests**: Unit tests for core system functions
- ✅ **Gas Estimation**: Ensure operations stay within reasonable gas limits
- ✅ **Integration Smoke Test**: Contracts deploy and basic functions callable

**Phase 2: Core Note Management**
- ✅ **Hook Testing**: `useNotes` hook manages state correctly
- ✅ **localStorage Persistence**: Notes save/load correctly across sessions
- ✅ **Component Rendering**: Note editor and list components render without errors
- ✅ **Form Validation**: Title/content validation works properly
- ✅ **Draft Autosave**: Drafts save automatically and restore correctly
- ✅ **Waypoint Integration**: WaypointNoteLinker component bridges notes and waypoints

**Phase 3: Integration Features**
- ✅ **DUST Client Integration**: Entity context detected and used correctly
- ✅ **Waypoint Migration**: Existing waypoints preserved and enhanced
- ✅ **Note-Waypoint Linking**: Notes can attach/detach waypoint groups
- ✅ **Search Functionality**: Tag filtering and proximity search work
- ✅ **Import/Export**: JSON import/export maintains data integrity

**Phase 4: Economic Features**
- ✅ **Tipping Flow**: ETH tips sent correctly to tip jars
- ✅ **Boost System**: Notes boost correctly with proper duration
- ✅ **Featured Display**: Boosted notes appear in featured section
- ✅ **Transaction Handling**: Proper error handling for failed transactions
- ✅ **UI Feedback**: Loading states and success/error messages work

### Testing Categories

**Unit Tests**
```typescript
// Contract tests (Foundry)
packages/contracts/test/
  NoteSystem.t.sol         // Note CRUD operations
  WaypointSystem.t.sol     // Waypoint group management
  TipSystem.t.sol          // Tipping and boost functionality

// React hook tests (Vitest)
packages/app/src/hooks/__tests__/
  useNotes.test.ts         // Note state management
  useDrafts.test.ts        // Draft persistence
  useWaypoints.test.ts     // Enhanced waypoint functionality
```

**Integration Tests**
```typescript
// End-to-end user flows
packages/app/src/__tests__/integration/
  note-creation.test.ts    // Create → Draft → Publish flow
  waypoint-linking.test.ts // Note ↔ Waypoint association
  entity-context.test.ts   // DUST client integration
  economic-flows.test.ts   // Tip and boost workflows
```

**Manual Testing Checklist**

**Core Functionality**
- [ ] Create new note with markdown content
- [ ] Save draft and restore after refresh
- [ ] Publish note to blockchain
- [ ] Edit existing note
- [ ] Delete note
- [ ] Create waypoint group attached to note
- [ ] Import/export waypoint data

**Integration Flows**
- [ ] Open app from entity context (e.g., Sign)
- [ ] Link note to current entity
- [ ] View notes linked to entity
- [ ] Search notes by tags
- [ ] Filter notes by proximity
- [ ] Migrate existing standalone waypoints

**Economic Features**
- [ ] Tip note creator with ETH
- [ ] Boost note to featured section
- [ ] View featured notes with countdown
- [ ] Verify tip totals update correctly

**Error Handling**
- [ ] Handle DUST client connection failures
- [ ] Handle blockchain transaction failures
- [ ] Handle localStorage quota exceeded
- [ ] Handle malformed import data
- [ ] Handle network connectivity issues

### Review Checkpoints

**Code Review Gates**

**Phase 1 Review: Data Layer**
- [ ] MUD table schemas follow DUST patterns
- [ ] Contract security review (access controls, overflow protection)
- [ ] Gas optimization review
- [ ] Documentation for all public functions
- [ ] Test coverage > 80% for critical paths

**Phase 2 Review: Core Features**
- [ ] React components follow established patterns
- [ ] State management consistency with existing code
- [ ] Accessibility standards met
- [ ] Error handling comprehensive
- [ ] Performance review (no unnecessary re-renders)

**Phase 3 Review: Integration**
- [ ] DUST client integration follows best practices
- [ ] Backward compatibility with existing waypoints verified
- [ ] Data migration strategy tested
- [ ] Cross-component communication clean
- [ ] User experience flows validated

**Phase 4 Review: Polish & Launch**
- [ ] Security audit of economic features
- [ ] Performance testing under load
- [ ] Mobile responsiveness verified
- [ ] Final user acceptance testing
- [ ] Production deployment checklist

### Quality Assurance Process

**Continuous Integration**
```yaml
# .github/workflows/test.yml
name: Test & Review
on: [push, pull_request]

jobs:
  contracts:
    - Compile Solidity contracts
    - Run Foundry tests
    - Check gas usage reports
    
  frontend:
    - TypeScript type checking
    - Lint code with ESLint
    - Run React component tests
    - Build production bundle
    
  integration:
    - Start local testnet
    - Deploy contracts
    - Run end-to-end tests
    - Performance benchmarks
```

**Pre-Deployment Checklist**
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint violations
- [ ] Bundle size within limits
- [ ] Performance metrics met
- [ ] Security scan clean
- [ ] User acceptance sign-off

### Performance Targets

**Frontend Performance**
- [ ] Initial page load < 3 seconds
- [ ] Note creation/editing responsive < 100ms
- [ ] Search results < 500ms
- [ ] Bundle size < 1MB gzipped

**Blockchain Performance**
- [ ] Note creation < 200k gas
- [ ] Waypoint operations < 100k gas
- [ ] Tip transactions < 50k gas
- [ ] Contract deployment < 2M gas

**Data Limits**
- [ ] Note content < 8KB
- [ ] Tags < 500 characters
- [ ] Waypoint groups < 50 steps
- [ ] localStorage usage < 5MB

### Risk Mitigation

**Technical Risks**
- **Risk**: localStorage quota exceeded
  - **Mitigation**: Implement cleanup of old drafts, warn users near limit
- **Risk**: Gas price spikes making transactions expensive
  - **Mitigation**: Gas estimation UI, batched operations where possible
- **Risk**: DUST client API changes
  - **Mitigation**: Abstract client integration, version compatibility checks

**User Experience Risks**
- **Risk**: Data loss during draft editing
  - **Mitigation**: Frequent autosave, offline detection, recovery UI
- **Risk**: Confusing migration from standalone waypoints
  - **Mitigation**: Clear migration UI, preview mode, undo option
- **Risk**: Economic features too complex
  - **Mitigation**: Progressive disclosure, clear tooltips, sensible defaults

## File Structure Plan

```
packages/
  contracts/
    src/
      NoteSystem.sol          // Note CRUD operations
      WaypointSystem.sol      // Waypoint group management  
      TipSystem.sol           // Tipping and boost functionality
      
  app/
    src/
      components/
        App.tsx               // Updated with new tabs
        NotesTab.tsx          // Main notes interface
        NoteEditor.tsx        // Markdown editor
        NoteCard.tsx          // Individual note display
        WaypointsTab.tsx      // Enhanced existing component
      hooks/
        useNotes.ts           // Note state management
        useDrafts.ts          // Local draft persistence
        useWaypoints.ts       // Enhanced existing hook
      common/
        // Existing DUST integration files
```

## Migration Strategy

### From Current Waypoint Manager

1. **Preserve existing functionality** - All current waypoint features remain
2. **Add note association** - Extend waypoints to optionally link to notes
3. **Enhance import/export** - Support both standalone and note-linked waypoints
4. **Gradual integration** - Notes can exist without waypoints, waypoints can exist without notes

### localStorage Data Migration

```typescript
// Existing: "dust-waypoints" 
// New: "dust-notes", "dust-drafts", "dust-note-waypoints"

// Migration function to associate existing waypoints with notes
function migrateWaypoints() {
  const existingWaypoints = localStorage.getItem("dust-waypoints");
  // Option to convert to note-linked waypoints or keep standalone
}
```

## Current Implementation Status (Phase 2+ Complete!)

### ✅ Successfully Implemented
- **Complete Notes System**: Full CRUD with localStorage persistence
- **Draft Management**: Auto-saving drafts with recovery
- **Tab-Based UI**: Clean integration with existing waypoint manager  
- **Waypoint Integration**: Bridge between notes and localStorage waypoints
- **Component Architecture**: Follows established DUST patterns
- **TypeScript Safety**: Full type safety with proper interfaces

### 🔄 In Progress  
- **DUST Client Integration**: Entity context detection
- **Enhanced Filtering**: Tag-based search and discovery
- **Economic Features**: Tipping and boost systems

### 📝 Ready for Testing
Users can now:
- ✅ Create and edit notes with markdown content
- ✅ Auto-save drafts while editing  
- ✅ Switch between published notes and drafts
- ✅ Link waypoints to notes via modal interface
- ✅ Create new waypoints from note editor
- ✅ Use tab navigation between notes and waypoints

## Success Metrics

### Technical Success
- ✅ All existing waypoint functionality preserved
- ✅ New note functionality working end-to-end
- ✅ Clean integration between notes and waypoints
- ✅ Proper DUST client integration with entity context

### User Experience Success  
- ✅ Intuitive tab-based navigation
- ✅ Responsive UI with proper loading states
- ✅ Consistent feedback and error handling
- ✅ Smooth draft-to-publish workflow

### Product Success
- ✅ Notes can be created, edited, and shared
- ✅ Waypoint routes enhance note content
- ✅ Entity linking provides spatial context
- ✅ Economic features (tips/boosts) function properly

This implementation plan leverages our solid waypoint manager foundation while building the note system incrementally, following established patterns and maintaining clean separation of concerns.
