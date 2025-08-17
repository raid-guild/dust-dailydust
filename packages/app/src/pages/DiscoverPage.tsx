import { encodeBlock } from "@dust/world/internal";
import { getRecord } from "@latticexyz/stash/internal";
import { useRecord, useRecords } from "@latticexyz/stash/react";
import { useEffect, useMemo, useState } from "react";

import { useDustClient } from "@/common/useDustClient";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { stash, tables } from "@/mud/stash";
import { getDistance } from "@/utils/helpers";
import type { Post } from "@/utils/types";

export const DiscoverPage = () => {
  const { data: dustClient } = useDustClient();
  const [currentPos, setCurrentPos] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [authorFilter, setAuthorFilter] = useState<string>("");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");

  const articleCategories = (useRecord({
    stash,
    table: tables.ArticleCategories,
    key: {},
  })
    ?.value?.map((c) => {
      return getRecord({
        stash,
        table: tables.Category,
        key: { id: c },
      })?.value;
    })
    .filter((c): c is string => !!c) ?? []) as string[];

  const posts = useRecords({
    stash,
    table: tables.Post,
  })
    .map((r): Post => {
      const isArticle =
        getRecord({
          stash,
          table: tables.IsArticle,
          key: { id: r.id as `0x${string}` },
        })?.value ?? false;
      let category: null | string = null;

      const anchor =
        getRecord({ stash, table: tables.PostAnchor, key: { id: r.id } }) ??
        null;

      const excerpt =
        typeof r.content === "string"
          ? (r.content.split("\n\n")[0] || r.content).slice(0, 240)
          : "";

      if (r.categories[0]) {
        category =
          getRecord({
            stash,
            table: tables.Category,
            key: { id: r.categories[0] as `0x${string}` },
          })?.value ?? null;
      }

      return {
        id: r.id,
        categories: category ? [category] : [],
        content: (typeof r.content === "string"
          ? r.content.split("\n\n")
          : []) as string[],
        coords: anchor
          ? { x: anchor.coordX, y: anchor.coordY, z: anchor.coordZ }
          : null,
        createdAt: r.createdAt,
        coverImage: r.coverImage || "/assets/placeholder-notext.png",
        distance: null,
        excerpt,
        owner: r.owner,
        title: r.title,
        type: isArticle ? "article" : "note",
      };
    })
    .filter((r) => r.type === "article")
    .map((p) => ({
      ...p,
      distance:
        p.coords && currentPos ? getDistance(currentPos, p.coords) : null,
    }))
    .sort((a, b) => Number(b.createdAt - a.createdAt));

  const filteredPosts = useMemo(() => {
    const term = q.trim().toLowerCase();

    let results = posts.slice();

    if (selectedCategory) {
      results = results.filter((a) =>
        (a.categories || []).includes(selectedCategory)
      );
    }

    if (authorFilter.trim()) {
      const af = authorFilter.trim().toLowerCase();
      results = results.filter((a) =>
        (a.owner || "").toLowerCase().includes(af)
      );
    }

    if (term) {
      results = results.filter(
        (a) =>
          (a.title || "").toLowerCase().includes(term) ||
          (a.excerpt || "").toLowerCase().includes(term) ||
          (a.categories || []).some((cat: string) =>
            cat.toLowerCase().includes(term)
          )
      );
    }

    results.sort((a, b) => {
      if (dateSort === "newest") return Number(b.createdAt - a.createdAt);
      return Number(a.createdAt - b.createdAt);
    });

    return results;
  }, [posts, q, selectedCategory, authorFilter, dateSort]);

  useEffect(() => {
    (async () => {
      if (!dustClient) return;
      try {
        const pos = await dustClient.provider.request({
          method: "getPlayerPosition",
          params: { entity: dustClient.appContext?.userAddress },
        });
        if (pos && typeof pos.x === "number") {
          setCurrentPos({
            x: Math.floor(pos.x),
            y: Math.floor(pos.y),
            z: Math.floor(pos.z),
          });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to fetch current position", e);
      }
    })();
  }, [dustClient]);

  const onSetWaypoint = async (article: Post) => {
    if (!dustClient) {
      alert("Wallet/client not ready");
      return;
    }
    const coords = article.coords;
    if (!coords || typeof coords.x !== "number") {
      alert("Article has no anchor/coordinates to set a waypoint for");
      return;
    }
    try {
      const bx = Math.floor(coords.x);
      const by = Math.floor(coords.y);
      const bz = Math.floor(coords.z);
      const entityId = encodeBlock([bx, by, bz]);

      await dustClient.provider.request({
        method: "setWaypoint",
        params: { entity: entityId, label: article.title || "Waypoint" },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to set waypoint", e);
      alert("Failed to set waypoint");
    }
  };

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
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search stories..."
            value={q}
          />
          <Input
            className="border-neutral-900 max-w-xs"
            onChange={(e) => setAuthorFilter(e.target.value)}
            placeholder="Filter by author..."
            value={authorFilter}
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
            {filteredPosts.map((a) => (
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
            {filteredPosts.length === 0 && (
              <div className="text-neutral-600 text-sm">No results found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
