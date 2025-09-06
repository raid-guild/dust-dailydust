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
    Creators: {
      schema: {
        value: "address[]",
      },
      key: [],
      codegen: {
        dataStruct: false,
      },
    },
    DevContributors: {
      schema: {
        value: "address[]",
      },
      key: [],
      codegen: {
        dataStruct: false,
      },
    },
    Editors: {
      schema: {
        value: "address[]",
      },
      key: [],
      codegen: {
        dataStruct: false,
      },
    },
    IsArticle: "bool", // ID is Post ID
    IsEditor: "bool", // ID is player ID
    IsEditorPublication: "bool", // ID is collection ID
    IsNote: "bool", // ID is Post ID
    LatestEditorPublication: {
      schema: {
        value: "uint64",
      },
      key: [],
      codegen: {
        dataStruct: false,
      },
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
    TipCounter: "uint256", // ID is Post ID
    // These details are of the tip before it is split between receivers
    TipDetails: {
      schema: {
        id: "bytes32", // ID is keccak256(tipperAddress, postId, timestamp)
        amount: "uint256", // Amount tipped
        createdAt: "uint64", // Timestamp of when the tip was made
        postId: "bytes32", // Post ID
        tipper: "address", // Address of the user who tipped
        tokenAddress: "address", // Address of the token used for tipping (e.g., PESOS, RAID, USDC)
      },
      key: ["id"],
      type: "offchainTable",
    },
    // If Tipper has already tipped a post, don't increment the TipCounter
    Tipper: {
      schema: {
        playerId: "bytes32", // use encodePlayerEntityId
        postId: "bytes32",
        tipped: "bool",
      },
      key: ["playerId", "postId"],
      codegen: { dataStruct: false },
    },
    // These details are of the tip after it is split between receivers
    TipReceipt: {
      schema: {
        id: "bytes32", // ID is keccak256(tipperAddress, postId, timestamp, receiver)
        amount: "uint256", // Amount received (as opposed to what was tipped)
        createdAt: "uint64", // Timestamp of when the tip was made
        postId: "bytes32", // Post ID
        receiver: "address", // Address of the user who received the tip (post owner)
        tipper: "address", // Address of the user who tipped
        tokenAddress: "address", // Address of the token used for tipping (e.g., PESOS, RAID, USDC)
      },
      key: ["id"],
      type: "offchainTable",
    },
    Treasury: {
      schema: {
        value: "address",
      },
      key: [],
      codegen: {
        dataStruct: false,
      },
    },
  },
});
