import { useMemo, useState } from "react";

import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { localNewsSeed, weeklyCurated } from "@/dummy-data";
import { cn } from "@/lib/utils";

export const DiscoverPage = () => {
  const all = useMemo(() => [...weeklyCurated, ...localNewsSeed], []);

  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    all.forEach((article) => {
      article.categories?.forEach((cat) => categories.add(cat));
    });
    return Array.from(categories).sort();
  }, [all]);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    let results = all;

    if (selectedCategory) {
      results = results.filter((a) => a.categories?.includes(selectedCategory));
    }

    if (term) {
      results = results.filter(
        (a) =>
          a.title.toLowerCase().includes(term) ||
          (a.excerpt ?? "").toLowerCase().includes(term) ||
          (a.categories ?? []).some((cat) => cat.toLowerCase().includes(term))
      );
    }

    return results;
  }, [all, q, selectedCategory]);

  return (
    <div className="gap-6 p-4 sm:p-6 grid">
      <div className="flex gap-3 items-end justify-between">
        <div>
          <h1 className={cn("font-heading", "text-3xl")}>Discover</h1>
          <p className="text-neutral-700 text-sm">Search all submissions</p>
        </div>
        <Input
          className="border-neutral-900 max-w-xs"
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search stories..."
          value={q}
        />
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
        {allCategories.map((category) => (
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
