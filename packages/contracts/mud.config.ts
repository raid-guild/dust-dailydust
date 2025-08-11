import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  codegen: {
    generateSystemLibraries: true,
  },
  // Replace this with a unique namespace (<= 14 chars)
  // rg: raidguild dd: dailydust deployer: ab564f
  namespace: "rg_dd_ab564f",
  systems: {
    NoteSystem: {
      openAccess: true,
      deploy: { registerWorldFunctions: false },
    },
    WaypointSystem: {
      openAccess: true,
      deploy: { registerWorldFunctions: false },
    },
    TipSystem: {
      openAccess: true,
      deploy: { registerWorldFunctions: false },
    },
    CollectionSystem: {
      openAccess: true,
      deploy: { registerWorldFunctions: false },
    },
  },
  tables: {
    Note: {
      schema: {
        noteId: "bytes32",
        owner: "address",
        createdAt: "uint64",
        updatedAt: "uint64",
        tipJar: "address",      // defaults to owner, editable
        boostUntil: "uint64",   // featured until timestamp, 0 if not boosted
        totalTips: "uint256",   // cache for UI display
        title: "string",
        content: "string",      // markdown content, ~4-8KB limit
        tags: "string",         // CSV encoded for MVP
        headerImageUrl: "string", // optional header image URL
      },
      key: ["noteId"],
    },
    NoteLink: {
      schema: {
        noteId: "bytes32",
        entityId: "bytes32",
        linkType: "uint8",      // 0=anchor, 1=mirror, 2=embed, etc.
        coordX: "int32",        // optional coord cache for proximity
        coordY: "int32",
        coordZ: "int32",
      },
      key: ["noteId", "entityId"],
    },
    WaypointGroup: {
      schema: {
        noteId: "bytes32",
        groupId: "uint16",
        color: "uint24",        // hex color for UI hints
        isPublic: "bool",
        name: "string",
      },
      key: ["noteId", "groupId"],
    },
    WaypointStep: {
      schema: {
        noteId: "bytes32",
        groupId: "uint16",
        index: "uint16",
        x: "int32",
        y: "int32",
        z: "int32",
        label: "string",
      },
      key: ["noteId", "groupId", "index"],
    },
    Collection: {
      schema: {
        collectionId: "bytes32",
        owner: "address",
        createdAt: "uint64",
        updatedAt: "uint64",
        featured: "bool",
        title: "string",
        description: "string",
        headerImageUrl: "string",
      },
      key: ["collectionId"],
    },
    CollectionNote: {
      schema: {
        collectionId: "bytes32",
        noteId: "bytes32",
        index: "uint16",
      },
      key: ["collectionId", "noteId"],
    },
  },
});
