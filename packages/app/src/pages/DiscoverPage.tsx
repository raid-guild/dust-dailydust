import { useEffect, useMemo, useState } from "react";

import { useRecords, useRecord } from "@latticexyz/stash/react";
import { getRecord } from "@latticexyz/stash/internal";

import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDustClient } from "@/common/useDustClient";
import { encodeBlock } from "@dust/world/internal";
import { stash, tables } from "@/mud/stash";

export const DiscoverPage = () => {
  const { data: dustClient } = useDustClient();
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number; z: number } | null>(null);
  // Read posts from on-chain stash
  const rawPosts = useRecords({ stash, table: tables.Post }) || [];

  // Resolve available categories from on-chain ArticleCategories -> Category table
  const articleCategories = (useRecord({ stash, table: tables.ArticleCategories, key: {} })
    ?.value?.map((c: any) => {
      return getRecord({ stash, table: tables.Category, key: { id: c } })?.value;
    })
    .filter((c: any): c is string => !!c) ?? []) as string[];

  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [authorFilter, setAuthorFilter] = useState<string>("");
  const [dateSort, setDateSort] = useState<'newest'|'oldest'>('newest');

  // Map raw posts into the shape used by ArticleCard
  const posts = useMemo(() => {
    return rawPosts
      .map((r: any) => {
        const isArticle =
          getRecord({ stash, table: tables.IsArticle, key: { id: r.id } })
            ?.value ?? false;

        if (!isArticle) return null;

        const anchorRecord =
          getRecord({ stash, table: tables.PostAnchor, key: { id: r.id } }) ??
          null;
        const anchor = anchorRecord
          ? {
              x: Number(anchorRecord.coordX || 0),
              y: Number(anchorRecord.coordY || 0),
              z: Number(anchorRecord.coordZ || 0),
            }
          : { x: 0, y: 0, z: 0 };

        const excerpt =
          typeof r.content === "string"
            ? (r.content.split("\n\n")[0] || r.content).slice(0, 240)
            : "";

        return {
          id: r.id,
          title: r.title || "Untitled",
          author: r.owner || "",
          categories: (r.categories || []).map((c: any) => {
            const val = getRecord({ stash, table: tables.Category, key: { id: c } })?.value;
            return val ?? String(c);
          }).filter(Boolean),
          city: "",
          content: (typeof r.content === "string" ? r.content.split("\n\n") : []) as string[],
          coords: anchor,
          excerpt,
          image: r.coverImage || "/assets/placeholder-notext.png",
          section: "",
          timestamp: Number(r.createdAt ?? 0),
        };
      })
      .filter(Boolean) as any[];
  }, [rawPosts]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    let results = posts.slice();

    if (selectedCategory) {
      results = results.filter((a) => (a.categories || []).includes(selectedCategory));
    }

    if (authorFilter.trim()) {
      const af = authorFilter.trim().toLowerCase();
      results = results.filter((a) => (a.author || "").toLowerCase().includes(af));
    }

    if (term) {
      results = results.filter(
        (a) =>
          (a.title || "").toLowerCase().includes(term) ||
          (a.excerpt || "").toLowerCase().includes(term) ||
          (a.categories || []).some((cat: string) => cat.toLowerCase().includes(term))
      );
    }

    // sort by date
    results.sort((a, b) => {
      if (dateSort === 'newest') return b.timestamp - a.timestamp;
      return a.timestamp - b.timestamp;
    });

    return results;
  }, [posts, q, selectedCategory, authorFilter, dateSort]);

  const distance = (
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number }
  ) => {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.round(Math.sqrt(dx * dx + dz * dz));
  };

  useEffect(() => {
    (async () => {
      if (!dustClient) return;
      try {
        const pos = await (dustClient as any).provider.request({
          method: "getPlayerPosition",
          params: { entity: (dustClient as any).appContext?.userAddress },
        });
        if (pos && typeof pos.x === "number") {
          setCurrentPos({ x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) });
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [dustClient]);

  const handleSetWaypoint = async (article: any) => {
    if (!dustClient) {
      alert('Wallet/client not ready');
      return;
    }
    const coords = article.coords;
    if (!coords || typeof coords.x !== 'number') {
      alert('Article has no anchor/coordinates to set a waypoint for');
      return;
    }
    try {
      const bx = Math.floor(coords.x);
      const by = Math.floor(coords.y);
      const bz = Math.floor(coords.z);
      const entityId = encodeBlock([bx, by, bz]);

      await (dustClient as any).provider.request({
        method: 'setWaypoint',
        params: { entity: entityId, label: article.title || 'Waypoint' },
      });
    } catch (e) {
      console.warn('Failed to set waypoint', e);
      alert('Failed to set waypoint');
    }
  };

  return (
    <div className="gap-6 p-4 sm:p-6 grid">
      <div className="flex gap-3 items-end justify-between">
        <div>
          <h1 className={cn("font-heading", "text-3xl")}>Discover</h1>
          <p className="text-neutral-700 text-sm">Search all submissions</p>
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
            onChange={(e) => setDateSort(e.target.value as 'newest'|'oldest')}
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
            {filtered.map((a) => (
              <div key={a.id} className="border-neutral-900 border-t pt-3">
                <ArticleCard article={a} />
                <div className={cn("font-accent", "mt-2 text-[10px]")}>
                  {a.coords && currentPos ? (
                    <>
                      Distance: {distance(currentPos, a.coords)} blocks •{" "}
                    </>
                  ) : (
                    a.coords && `x:${a.coords.x} y:${a.coords.y} z:${a.coords.z}`
                  )}
                  <button
                    onClick={() => handleSetWaypoint(a)}
                    className="underline ml-1"
                    disabled={!dustClient}
                  >
                    Set Waypoint
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-neutral-600 text-sm">No results found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
