import { getRecord } from "@latticexyz/stash/internal";
import { useRecords } from "@latticexyz/stash/react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { hexToString } from "viem";

import { useCopy } from "@/common/useCopy";
import { usePosts } from "@/common/usePosts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { stash, tables } from "@/mud/stash";
import { DISCOVER_PAGE_PATH, FRONT_PAGE_PATH } from "@/Routes";
import { formatDate, shortenAddress, uriToHttp } from "@/utils/helpers";
import type { Collection } from "@/utils/types";

export const CollectionPage = () => {
  const { id } = useParams<{ id: string }>();
  const { copyToClipboard } = useCopy();
  const { articles } = usePosts();

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

  const collection = useMemo(
    () => collections.find((p) => p.id === id),
    [id, collections]
  );

  const collectionArticles = useMemo(() => {
    if (!collection) return [];

    return articles.filter((article) =>
      collection.articleIds.includes(article.id)
    );
  }, [collection, articles]);

  if (!collection) {
    return (
      <div className="p-6">
        <h1 className={cn("font-heading", "text-3xl")}>Collection not found</h1>
        <p className="mt-2">
          We couldn&apos;t find that collection. Try the Discover page.
        </p>
        <div className="mt-4">
          <Link className="cursor-pointer underline" to={DISCOVER_PAGE_PATH}>
            Go to Discover
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="p-4 sm:p-6">
      <header className="grid gap-3">
        <div
          className={cn(
            "font-accent",
            "text-neutral-700 text-[10px] uppercase tracking-widest"
          )}
        >
          Collection
        </div>
        <h1
          className={cn("font-heading", " sm:text-5xl text-4xl leading-tight")}
        >
          {collection.title}
        </h1>

        <div className={cn("font-accent", "text-neutral-700 text-[10px]")}>
          {"By "}
          <button
            onClick={() => {
              copyToClipboard(collection.owner);
              toast.success(`Copied ${shortenAddress(collection.owner)}`);
            }}
          >
            @{collection.author}
          </button>
          {" • "}
          {formatDate(collection.createdAt)}
        </div>
      </header>

      <p className="leading-relaxed mb-6 mt-4 text-lg text-neutral-700">
        {collection.description}
      </p>

      {collection.coverImage && (
        <div className="border border-neutral-900 my-4 overflow-hidden">
          <img
            alt={collection.title}
            className="duration-500 grayscale hover:grayscale-0 object-cover transition-all w-full"
            height={720}
            src={collection.coverImage}
            width={1200}
          />
        </div>
      )}

      <div className="space-y-4">
        {collectionArticles.map((article, index) => (
          <Card key={article.id} className="border-neutral-900">
            <CardContent className="p-6">
              <div className="flex gap-6">
                <div
                  className={cn(
                    "font-heading",
                    "font-bold leading-none mt-[-15px] select-none text-neutral-300 text-6xl"
                  )}
                >
                  {index + 1}
                </div>

                <div className="flex-1">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <h2 className={cn("font-heading", "mb-2 text-2xl")}>
                        <Link
                          to={`/articles/${article.id}`}
                          className="hover:underline"
                        >
                          {article.title}
                        </Link>
                      </h2>
                      <p className="text-neutral-700 leading-relaxed mb-3">
                        {article.excerpt}
                      </p>
                      <div className="flex gap-4 items-center text-neutral-600 text-sm">
                        <span
                          className={cn(
                            "font-accent",
                            "text-[10px] uppercase tracking-widest"
                          )}
                        >
                          By {article.author}
                        </span>
                        <span
                          className={cn(
                            "font-accent",
                            "text-[10px] uppercase tracking-widest"
                          )}
                        >
                          {formatDate(article.createdAt)}
                        </span>
                      </div>
                      {article.categories && (
                        <div className="flex gap-1 mt-2">
                          {article.categories.map((category) => (
                            <Badge
                              key={category}
                              className={cn(
                                "font-accent",
                                "px-2 py-0.5 text-[8px]"
                              )}
                              variant="outline"
                            >
                              {category}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {article.coverImage && (
                      <div className="border border-neutral-300 flex-shrink-0 overflow-hidden h-24 w-32">
                        <img
                          alt={article.title}
                          className="grayscale h-full object-cover w-full"
                          height={96}
                          src={article.coverImage || "/placeholder.svg"}
                          width={128}
                        />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-neutral-200 mt-4 pt-4">
                    <Link to={`/articles/${article.id}`}>
                      <Button
                        className={cn("font-accent", "text-[10px]")}
                        size="sm"
                        variant="outline"
                      >
                        Read Full Story
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <footer className="border-neutral-900 border-t flex flex-wrap gap-3 items-center justify-between mt-6 pt-3">
        <div className="flex gap-3">
          <Link to={FRONT_PAGE_PATH} className="underline">
            Front Page
          </Link>
          <Link to={DISCOVER_PAGE_PATH} className="underline">
            Discover
          </Link>
        </div>
      </footer>
    </article>
  );
};
