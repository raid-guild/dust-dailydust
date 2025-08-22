import { encodeBlock } from "@dust/world/internal";
import { getRecord } from "@latticexyz/stash/internal";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { hexToString, zeroAddress } from "viem";

import { useCopy } from "@/common/useCopy";
import { useDustClient } from "@/common/useDustClient";
import { usePosts } from "@/common/usePosts";
import { cn } from "@/lib/utils";
import { stash, tables } from "@/mud/stash";
import { DISCOVER_PAGE_PATH, FRONT_PAGE_PATH } from "@/Routes";
import { formatDate, shortenAddress, uriToHttp } from "@/utils/helpers";
import type { Post } from "@/utils/types";

export const ArticlePage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: dustClient } = useDustClient();
  const { copyToClipboard } = useCopy();
  const { articles } = usePosts();

  // Set waypoint for the currently viewed article (uses block-entity encoding)
  const onSetWaypoint = async (art: Post) => {
    if (!dustClient) {
      alert("Wallet/client not ready");
      return;
    }

    const coords = art?.coords;
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
        params: { entity: entityId, label: art.title || "Waypoint" },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to set waypoint", e);
      alert("Failed to set waypoint");
    }
  };

  const article = useMemo(
    () => articles.find((p) => p.id === id),
    [id, articles]
  );

  const author = useMemo(() => {
    const ownerUsername = getRecord({
      stash,
      table: tables.PlayerName,
      key: { player: (article?.owner ?? zeroAddress) as `0x${string}` },
    })?.name;

    if (ownerUsername) {
      return hexToString(ownerUsername).replace(/\0+$/, "");
    }
    return "Anonymous";
  }, [article?.owner]);

  if (!article) {
    return (
      <div className="p-6">
        <h1 className={cn("font-heading", "text-3xl")}>Story not found</h1>
        <p className="mt-2">
          We couldn&apos;t find that article. Try the Discover page.
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
            "text-[10px] text-neutral-700 uppercase tracking-widest"
          )}
        >
          Article
        </div>
        <h1
          className={cn("font-heading", "text-4xl sm:text-5xl leading-tight")}
        >
          {article.title}
        </h1>

        <div className="flex flex-wrap gap-2 items-center">
          {article.categories?.map((c: string) => (
            <span
              key={c}
              className={cn(
                "font-accent",
                "bg-neutral-100 border border-neutral-900 px-2 py-1 rounded-[3px] text-[10px] tracking-wider uppercase"
              )}
            >
              {c}
            </span>
          ))}
        </div>

        <div className={cn("font-accent", "text-[10px] text-neutral-700")}>
          {"By "}
          <button
            onClick={() => {
              copyToClipboard(article.owner);
              toast.success(`Copied ${shortenAddress(article.owner)}`);
            }}
          >
            @{author}
          </button>
          {" • "}
          {formatDate(article.createdAt)}
        </div>
      </header>

      {article.coverImage && (
        <div className="border border-neutral-900 my-4 overflow-hidden">
          <img
            alt={article.title}
            className="duration-500 grayscale hover:grayscale-0 object-cover transition-all w-full"
            height={720}
            src={uriToHttp(article.coverImage)[0]}
            width={1200}
          />
        </div>
      )}

      <div
        className={
          "gap-8 leading-relaxed lg:columns-3 md:columns-2 text-[16px] text-neutral-900 [column-fill:_balance]"
        }
      >
        {(article.content && article.content.length > 0
          ? article.content
          : [article.excerpt]
        ).map((p, idx) => (
          <p
            key={idx}
            className={cn(
              "mb-4 break-inside-avoid",
              idx === 0 &&
                "first-letter:text-5xl first-letter:leading-none first-letter:mr-2 first-letter:float-left"
            )}
            style={idx === 0 ? { fontVariantLigatures: "none" } : undefined}
          >
            {p}
          </p>
        ))}
      </div>

      <footer className="border-neutral-900 border-t flex flex-wrap gap-3 items-center justify-between mt-6 pt-3">
        {dustClient && article.coords && (
          <div className={cn("font-accent", "text-[10px] text-neutral-700")}>
            {`x:${article.coords.x} y:${article.coords.y} z:${article.coords.z}`}
            {" • "}
            <button
              onClick={() => onSetWaypoint(article)}
              className="underline"
            >
              Set Waypoint
            </button>
          </div>
        )}
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
