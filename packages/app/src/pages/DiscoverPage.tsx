import { useMemo, useState } from "react";

import { useCategories } from "@/common/useCategories";
import { useDustClient } from "@/common/useDustClient";
import { usePosts } from "@/common/usePosts";
import { useWaypoint } from "@/common/useWaypoint";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const DiscoverPage = () => {
  const { data: dustClient } = useDustClient();
  const { articles } = usePosts();
  const { articleCategories } = useCategories();
  const { onSetWaypoint } = useWaypoint();

  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [authorFilter, setAuthorFilter] = useState<string>("");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");

  const filteredArticles = useMemo(() => {
    const term = q.trim().toLowerCase();

    let results = articles.slice();

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
  }, [articles, q, selectedCategory, authorFilter, dateSort]);

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
              <div className="text-neutral-600 text-sm">No results found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
