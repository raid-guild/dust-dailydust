import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  codegen: {
    generateSystemLibraries: true,
  },
  // Replace this with a unique namespace (<= 14 chars)
  // rg: raidguild dd: dailydust deployer: ab564f
  namespace: "rg_dd_0002",
  systems: {
    NoteSystem: {
      openAccess: true,
      deploy: { registerWorldFunctions: false },
    },
    WaypointSystem: {
      openAccess: true,
      deploy: { registerWorldFunctions: false },
    },
    CollectionSystem: {
      openAccess: true,
      deploy: { registerWorldFunctions: false },
    },
  },
  tables: {
    ArticleCategories: {
      schema: {
        value: "bytes32[]",
      },
      key: [],
      codegen: {
        dataStruct: false,
      },
    },
    ArticleMetadata: {
      schema: {
        id: "bytes32", // Post ID
        createdAt: "uint64",
        owner: "address",
        updatedAt: "uint64",
        content: "string", // markdown content, ~4-8KB limit
        title: "string",
        coverImage: "string", // optional cover image URL
      },
      key: ["id"],
    },
    Category: "string", // ID is keccak256 hash of the category name
    Collection: {
      schema: {
        id: "bytes32",
        createdAt: "uint64",
        owner: "address",
        updatedAt: "uint64",
        description: "string",
        title: "string",
      },
      key: ["id"],
    },
    CollectionPost: {
      schema: {
        collectionId: "bytes32",
        noteId: "bytes32",
        index: "uint16",
      },
      key: ["collectionId", "noteId"],
    },
    NoteCategories: {
      schema: {
        value: "bytes32[]",
      },
      key: [],
      codegen: {
        dataStruct: false,
      },
    },
    NoteLink: {
      schema: {
        noteId: "bytes32",
        entityId: "bytes32",
        coordX: "int32", // optional coord cache for proximity
        coordY: "int32",
        coordZ: "int32",
        linkType: "uint8", // 0=anchor, 1=mirror, 2=embed, etc.
        extra: "string", // optional JSON/metadata (projection, offsets, etc.)
      },
      key: ["noteId", "entityId"],
    },
    Post: {
      // Used for both a Note and Article
      schema: {
        id: "bytes32",
        createdAt: "uint64",
        owner: "address",
        updatedAt: "uint64",
        content: "string", // textarea string for Note; markdown content for Article, ~4-8KB limit
        title: "string",
        categories: "bytes32[]",
      },
      key: ["id"],
    },
    WaypointGroup: {
      schema: {
        noteId: "bytes32",
        color: "uint24", // hex color for UI hints
        groupId: "uint16",
        isPublic: "bool",
        description: "string", // optional group description/deck
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
  },
});
