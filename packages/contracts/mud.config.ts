import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  codegen: {
    generateSystemLibraries: true,
  },
  namespace: "thedailydust",
  systems: {
    AdminSystem: {
      openAccess: false,
      deploy: { registerWorldFunctions: false },
    },
    ArticleSystem: {
      openAccess: true,
      deploy: { registerWorldFunctions: false },
    },
    NoteSystem: {
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
    Category: "string", // ID is keccak256 hash of the category name
    Collection: {
      schema: {
        id: "bytes32",
        createdAt: "uint64",
        owner: "address",
        updatedAt: "uint64",
        coverImage: "string", // optional cover image URL
        description: "string",
        title: "string",
      },
      key: ["id"],
    },
    CollectionPosts: {
      schema: {
        id: "bytes32", // Collection ID
        posts: "bytes32[]", // array of Post IDs
      },
      key: ["id"],
    },
    IsArticle: "bool", // ID is Post ID
    IsEditor: "bool", // ID is player ID
    IsEditorPublication: "bool", // ID is collection ID
    IsNote: "bool", // ID is Post ID
    LastEditorPublication: "uint64", // timestamp of last front page publication
    NoteCategories: {
      schema: {
        value: "bytes32[]",
      },
      key: [],
      codegen: {
        dataStruct: false,
      },
    },
    Post: {
      // Used for both a Note and Article
      schema: {
        id: "bytes32",
        createdAt: "uint64",
        owner: "address",
        updatedAt: "uint64",
        content: "string", // textarea string for Note; markdown content for Article, ~4-8KB limit
        coverImage: "string", // optional cover image URL
        title: "string",
        categories: "bytes32[]",
      },
      key: ["id"],
    },
    PostAnchor: {
      schema: {
        id: "bytes32", // Post ID
        entityId: "bytes32", // X,Y,Z coordinates
        coordX: "int32", // optional coord cache for proximity
        coordY: "int32",
        coordZ: "int32",
      },
      key: ["id"],
    },
  },
});
