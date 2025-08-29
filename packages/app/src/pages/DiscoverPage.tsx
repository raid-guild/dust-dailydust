import { getRecord } from "@latticexyz/stash/internal";
import { useRecords } from "@latticexyz/stash/react";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import { hexToString } from "viem";

import { useCategories } from "@/common/useCategories";
import { useDustClient } from "@/common/useDustClient";
import { usePosts } from "@/common/usePosts";
import { useWaypoint } from "@/common/useWaypoint";
import { ArticleCard } from "@/components/ArticleCard";
import { CollectionCard } from "@/components/CollectionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { stash, tables } from "@/mud/stash";
import { uriToHttp } from "@/utils/helpers";
import type { Collection } from "@/utils/types";

type ContentType = "articles" | "collections";

export const DiscoverPage = () => {
  const { data: dustClient } = useDustClient();
  const { articles } = usePosts();
  const { articleCategories } = useCategories();
  const { onSetWaypoint } = useWaypoint();

  const [searchQuery, setSearchQuery] = useState("");
  const [contentType, setContentType] = useState<ContentType>("articles");

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");

  const collections = useRecords({
    stash,
    table: tables.Collection,
  })
    .map((r): Collection => {
      const ownerName = getRecord({
        stash,
        table: tables.PlayerName,
        key: { player: r.owner as `0x${string}` },
      })?.name;

      let author = "Anonymous";

      if (ownerName) {
        const decoded = hexToString(ownerName).replace(/\0+$/, "").trim();
        if (decoded) author = decoded;
      }

      const articleIds = (getRecord({
        stash,
        table: tables.CollectionPosts,
        key: { id: r.id as `0x${string}` },
      })?.posts ?? []) as string[];

      return {
        id: r.id,
        articleIds,
        author,
        coverImage:
          uriToHttp(r.coverImage)[0] || "/assets/placeholder-notext.png",
        createdAt: r.createdAt,
        description: r.description,
        owner: r.owner,
        title: r.title,
        updatedAt: r.updatedAt,
      };
    })
    .sort((a, b) => Number(b.createdAt - a.createdAt));

  const filteredArticles = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    let results = articles.slice();

    if (term) {
      results = new Fuse(articles, {
        keys: ["author", "categories", "excerpt", "title"],
        includeScore: true,
      })
        .search(term)
        .map((res) => res.item);
    }

    results.sort((a, b) => {
      if (dateSort === "newest") return Number(b.createdAt - a.createdAt);
      return Number(a.createdAt - b.createdAt);
    });

    return results;
  }, [articles, searchQuery, dateSort]);

  const filteredCollections = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();

    let results = collections.slice();

    if (term) {
      results = new Fuse(collections, {
        keys: ["author", "description", "title"],
        includeScore: true,
      })
        .search(term)
        .map((res) => res.item);
    }

    results.sort((a, b) => {
      if (dateSort === "newest") return Number(b.createdAt - a.createdAt);
      return Number(a.createdAt - b.createdAt);
    });

    return results;
  }, [collections, searchQuery, dateSort]);

  return (
    <div className="gap-6 p-4 sm:p-6 grid">
      <div className="flex gap-3 items-end justify-between">
        <div>
          <h1 className={cn("font-heading", "text-3xl")}>Discover</h1>
          <p className="text-neutral-700 text-sm">Search all articles</p>
        </div>

        <div className="flex gap-2 items-end">
          <Input
            className="border-neutral-900 max-w-xs"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stories..."
            value={searchQuery}
          />
          <select
            className={cn(
              "border-input bg-transparent border border-neutral-900",
              "h-9 rounded-md px-2 text-sm"
            )}
            value={dateSort}
            onChange={(e) => setDateSort(e.target.value as "newest" | "oldest")}
            aria-label="Sort by date"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      <div className="flex gap-1 border-b border-neutral-300">
        <button
          className={cn(
            "font-accent",
            "border-b-2 px-4 py-2 text-[10px] uppercase tracking-widest transition-colors",
            contentType === "articles"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          )}
          onClick={() => setContentType("articles")}
        >
          Articles
        </button>
        <button
          className={cn(
            "font-accent",
            "border-b-2 px-4 py-2 text-[10px] uppercase tracking-widest transition-colors",
            contentType === "collections"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          )}
          onClick={() => setContentType("collections")}
        >
          Collections
        </button>
      </div>

      {contentType === "articles" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            <Button
              className="border-neutral-900"
              onClick={() => setSelectedCategory("")}
              size="sm"
              variant={selectedCategory === "" ? "default" : "outline"}
            >
              All Categories
            </Button>
            {articleCategories.map((category) => (
              <Button
                key={category}
                className="border-neutral-900"
                onClick={() => setSelectedCategory(category)}
                size="sm"
                variant={selectedCategory === category ? "default" : "outline"}
              >
                {category}
              </Button>
            ))}
          </div>

          <Card className="border-neutral-900">
            <CardContent className="p-4">
              <div className="gap-6 grid md:grid-cols-2">
                {filteredArticles.map((a) => (
                  <div key={a.id} className="border-neutral-900 border-t pt-3">
                    <ArticleCard article={a} />
                    {a.distance !== null && (
                      <div className={cn("font-accent", "mt-2 text-[10px]")}>
                        Distance: {a.distance} blocks{" "}
                        {dustClient && (
                          <span>
                            •{" "}
                            <button
                              onClick={() => onSetWaypoint(a)}
                              className="underline"
                              disabled={!dustClient}
                            >
                              Set Waypoint
                            </button>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {filteredArticles.length === 0 && (
                  <div className="text-neutral-600 text-sm">
                    No results found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {contentType === "collections" && (
        <Card className="border-neutral-900">
          <CardContent className="p-4">
            <div className="gap-6 grid md:grid-cols-2">
              {filteredCollections.map((a) => (
                <div key={a.id} className="border-neutral-900 border-t pt-3">
                  <CollectionCard collection={a} />
                </div>
              ))}
              {filteredCollections.length === 0 && (
                <div className="text-neutral-600 text-sm">
                  No results found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
