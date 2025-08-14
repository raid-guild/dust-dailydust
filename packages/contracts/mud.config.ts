import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  codegen: {
    generateSystemLibraries: true,
  },
  namespaces: {
    // Core CMS functionality - reusable across implementations
    cms: {
      tables: {
        Article: {
          schema: {
            articleId: "bytes32",
            owner: "address",
            createdAt: "uint64",
            updatedAt: "uint64",
            articleType: "uint8",     // 0=article, 1=classified
            category: "bytes32",      // category hash for broad classification
            title: "string",
            kicker: "string",         // short deck/subhead for previews
            content: "string",        // markdown content, ~4-8KB limit
            headerImageUrl: "string", // optional header image URL
          },
          key: ["articleId"],
        },
        // Through table for efficient querying by article type
        ArticleByType: {
          schema: {
            articleType: "uint8",
            articleId: "bytes32",
            exists: "uint8",         // 1 = exists, simple value field
          },
          key: ["articleType", "articleId"],
        },
        // Category system for broad classification
        Category: {
          schema: {
            categoryHash: "bytes32",
            color: "uint24",         // hex color for UI
            categoryName: "string",
            description: "string",
          },
          key: ["categoryHash"],
        },
        ArticleByCategory: {
          schema: {
            categoryHash: "bytes32",
            articleId: "bytes32",
            exists: "uint8",         // 1 = exists, simple value field
          },
          key: ["categoryHash", "articleId"],
        },
        // For chronological browsing and discovery
        ArticleByDate: {
          schema: {
            date: "uint32",          // YYYYMMDD format
            articleId: "bytes32",
            createdAt: "uint64",     // for ordering within day
          },
          key: ["date", "articleId"],
        },
        // Cross-references between articles
        ArticleReference: {
          schema: {
            fromArticleId: "bytes32",
            toArticleId: "bytes32",
            referenceType: "uint8",  // 0=citation, 1=related, 2=continuation, 3=update
            context: "string",       // optional context or quote
          },
          key: ["fromArticleId", "toArticleId"],
        },
        // Reverse index for finding what references an article
        ReferenceToArticle: {
          schema: {
            toArticleId: "bytes32",
            fromArticleId: "bytes32",
            referenceType: "uint8",
          },
          key: ["toArticleId", "fromArticleId"],
        },
        // Tip system - flexible for future enhancements
        TipJar: {
          schema: {
            articleId: "bytes32",
            recipient: "address",    // who receives tips (defaults to owner)
            totalTips: "uint256",    // cache for UI display
            lastTipAt: "uint64",     // timestamp of last tip
            isActive: "uint8",       // 0=false, 1=true (using uint8 instead of bool)
          },
          key: ["articleId"],
        },
        Tip: {
          schema: {
            articleId: "bytes32",
            tipper: "address",
            amount: "uint256",
            currency: "address",     // ERC20 token address (0x0 for native)
            timestamp: "uint64",
            message: "string",       // optional tip message
          },
          key: ["articleId", "tipper", "timestamp"],
        },
        // Future: tip splits across multiple recipients
        TipSplit: {
          schema: {
            articleId: "bytes32",
            recipient: "address",
            percentage: "uint16",    // basis points (10000 = 100%)
            isActive: "uint8",       // 0=false, 1=true (using uint8 instead of bool)
          },
          key: ["articleId", "recipient"],
        },
        // Boost system - paid promotion with flexible mechanics
        Boost: {
          schema: {
            articleId: "bytes32",
            booster: "address",      // who paid for the boost
            amount: "uint256",       // amount paid
            currency: "address",     // payment token
            boostType: "uint8",      // 0=time-based, 1=impression-based, 2=click-based
            startTime: "uint64",     // when boost becomes active
            endTime: "uint64",       // when boost expires
            totalImpressions: "uint256", // for impression-based boosts
            totalClicks: "uint256",      // for click-based boosts
            isActive: "uint8",       // 0=false, 1=true (using uint8 instead of bool)
          },
          key: ["articleId", "booster", "startTime"],
        },
        // Index for finding currently boosted articles
        ActiveBoost: {
          schema: {
            endTime: "uint64",       // for efficient cleanup of expired boosts
            articleId: "bytes32",
            booster: "address",
            startTime: "uint64",
            exists: "uint8",         // 1 = exists, simple value field
          },
          key: ["endTime", "articleId", "booster", "startTime"],
        },
        // Aggregated boost status per article (cache for UI)
        BoostStatus: {
          schema: {
            articleId: "bytes32",
            totalBoostAmount: "uint256",
            boostUntil: "uint64",    // highest endTime of active boosts
            activeBoostCount: "uint16",
            isCurrentlyBoosted: "uint8", // 0=false, 1=true (using uint8 instead of bool)
          },
          key: ["articleId"],
        },
        // Tag system with proper normalization
        Tag: {
          schema: {
            tagHash: "bytes32",
            tagString: "string",
          },
          key: ["tagHash"],
        },
        ArticleTag: {
          schema: {
            articleId: "bytes32",
            tagHash: "bytes32",
          },
          key: ["articleId", "tagHash"],
        },
        // Reverse index for tag-based queries
        TagArticle: {
          schema: {
            tagHash: "bytes32",
            articleId: "bytes32",
            exists: "uint8",         // 1 = exists, simple value field
          },
          key: ["tagHash", "articleId"],
        },
        Collection: {
          schema: {
            collectionId: "bytes32",
            owner: "address",
            createdAt: "uint64",
            updatedAt: "uint64",
            collectionType: "uint8", // 0=regular, 1=frontpage, 2=special
            featured: "uint8",       // 0=false, 1=true (using uint8 instead of bool)
            title: "string",
            description: "string",
            headerImageUrl: "string",
            extra: "string",         // optional JSON/metadata for layouts
          },
          key: ["collectionId"],
        },
        // Index for finding collections by type (especially frontpage)
        CollectionByType: {
          schema: {
            collectionType: "uint8",
            createdAt: "uint64",     // for finding most recent frontpage
            collectionId: "bytes32",
          },
          key: ["collectionType", "createdAt", "collectionId"],
        },
        CollectionArticle: {
          schema: {
            collectionId: "bytes32",
            index: "uint16",
            articleId: "bytes32",
          },
          key: ["collectionId", "index"],
        },
        // Reverse index for article-to-collections lookup
        ArticleCollection: {
          schema: {
            articleId: "bytes32",
            collectionId: "bytes32",
            exists: "uint8",         // 1 = exists, simple value field
          },
          key: ["articleId", "collectionId"],
        },
      },
      systems: {
        ArticleSystem: {
          openAccess: true,
          deploy: { registerWorldFunctions: false },
        },
        TipSystem: {
          openAccess: true,
          deploy: { registerWorldFunctions: false },
        },
        BoostSystem: {
          openAccess: true,
          deploy: { registerWorldFunctions: false },
        },
        CollectionSystem: {
          openAccess: true,
          deploy: { registerWorldFunctions: false },
        },
        TagSystem: {
          openAccess: true,
          deploy: { registerWorldFunctions: false },
        },
        CategorySystem: {
          openAccess: true,
          deploy: { registerWorldFunctions: false },
        },
        SearchSystem: {
          openAccess: true,
          deploy: { registerWorldFunctions: false },
        },
        ReferenceSystem: {
          openAccess: true,
          deploy: { registerWorldFunctions: false },
        },
      },
    },
    // Daily Dust specific implementation
    dailydust: {
      tables: {
        // Editor roles for front page management
        EditorRole: {
          schema: {
            user: "address",
            role: "uint8",           // 0=editor, 1=admin, 2=owner
            grantedBy: "address",
            grantedAt: "uint64",
          },
          key: ["user"],
        },
        // Authorized external programs that can trigger boosts
        AuthorizedBooster: {
          schema: {
            programAddress: "address",
            programType: "uint8",    // 0=forcefield, 1=quest, 2=event, etc.
            maxBoostAmount: "uint256",
            grantedBy: "address",
            grantedAt: "uint64",
            isActive: "uint8",       // 0=false, 1=true (using uint8 instead of bool)
          },
          key: ["programAddress"],
        },
        // Daily Dust specific configuration and metadata
        DustConfig: {
          schema: {
            configKey: "bytes32",
            value: "string",         // JSON or simple string values
          },
          key: ["configKey"],
        },
        // Featured/promoted articles for the daily digest
        FeaturedArticle: {
          schema: {
            date: "uint32",          // YYYYMMDD format
            slot: "uint8",           // position in daily digest (0-9)
            articleId: "bytes32",
          },
          key: ["date", "slot"],
        },
        // Reverse index for checking if article is featured
        ArticleFeatured: {
          schema: {
            articleId: "bytes32",
            date: "uint32",
            slot: "uint8",
          },
          key: ["articleId", "date"],
        },
        // Minecraft-specific article linking to world entities
        ArticleLink: {
          schema: {
            articleId: "bytes32",
            entityId: "bytes32",
            linkType: "uint8",       // 0=anchor, 1=mirror, 2=embed, etc.
            coordX: "int32",         // optional coord cache for proximity
            coordY: "int32",
            coordZ: "int32",
            extra: "string",         // optional JSON/metadata (projection, offsets, etc.)
          },
          key: ["articleId", "entityId"],
        },
        // Reverse index for entity-based queries
        LinkByEntity: {
          schema: {
            entityId: "bytes32",
            articleId: "bytes32",
            linkType: "uint8",
          },
          key: ["entityId", "articleId"],
        },
        // Waypoint groups for spatial navigation
        WaypointGroup: {
          schema: {
            articleId: "bytes32",
            groupId: "uint16",
            color: "uint24",         // hex color for UI hints
            isPublic: "uint8",       // 0=false, 1=true (using uint8 instead of bool)
            name: "string",
            description: "string",   // optional group description/deck
          },
          key: ["articleId", "groupId"],
        },
        // Individual waypoint steps within groups
        WaypointStep: {
          schema: {
            articleId: "bytes32",
            groupId: "uint16",
            index: "uint16",
            x: "int32",
            y: "int32",
            z: "int32",
            label: "string",
          },
          key: ["articleId", "groupId", "index"],
        },
      },
      systems: {
        DustSystem: {
          openAccess: true,
          deploy: { registerWorldFunctions: false },
        },
        WaypointSystem: {
          openAccess: true,
          deploy: { registerWorldFunctions: false },
        },
        FeaturedSystem: {
          openAccess: true,
          deploy: { registerWorldFunctions: false },
        },
        EditorSystem: {
          openAccess: false,       // restricted access for role management
          deploy: { registerWorldFunctions: false },
        },
      },
    },
  },
});
