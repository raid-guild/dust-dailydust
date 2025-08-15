import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useRecords } from "@latticexyz/stash/react";
import { getRecord } from "@latticexyz/stash/internal";
import { stash, tables } from "@/mud/stash";
import { useDustClient } from "@/common/useDustClient";
import { encodeBlock } from "@dust/world/internal";

import { localNewsSeed, weeklyCurated } from "@/dummy-data";
import { cn } from "@/lib/utils";
import { DISCOVER_PAGE_PATH, FRONT_PAGE_PATH } from "@/Routes";

const getArticleById = (id: string | undefined) => {
  return [...weeklyCurated, ...localNewsSeed].find((a) => a.id === id);
};

const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

export const ArticlePage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: dustClient } = useDustClient();
  const article = getArticleById(id);

  // Try to resolve article from on-chain stash if it's not part of the local seeds
  const rawPosts = useRecords({ stash, table: tables.Post }) || [];

  // Set waypoint for the currently viewed article (uses block-entity encoding)
  const handleSetWaypoint = async (art: any) => {
    if (!dustClient) {
      alert('Wallet/client not ready');
      return;
    }

    const coords = art?.coords;
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
        params: { entity: entityId, label: art.title || 'Waypoint' },
      });
    } catch (e) {
      console.warn('Failed to set waypoint', e);
      alert('Failed to set waypoint');
    }
  };

  const stashArticle = useMemo(() => {
    if (!id) return null;
    const r: any = rawPosts.find((p: any) => String(p.id) === id);
    if (!r) return null;

    const isArticle =
      getRecord({ stash, table: tables.IsArticle, key: { id: r.id } })?.value ?? false;
    if (!isArticle) return null;

    const anchorRecord =
      getRecord({ stash, table: tables.PostAnchor, key: { id: r.id } }) ?? null;
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
  }, [rawPosts, id]);

  const finalArticle = article ?? stashArticle;

  if (!finalArticle) {
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
          {finalArticle.section || "Story"}
        </div>
        <h1
          className={cn("font-heading", "text-4xl sm:text-5xl leading-tight")}
        >
          {finalArticle.title}
        </h1>

        <div className="flex flex-wrap gap-2 items-center">
          {finalArticle.categories?.map((c: string) => (
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
          {"By "}@{finalArticle.author || "anonymous"} {" • "}
          {formatDateTime(finalArticle.timestamp)}
        </div>
      </header>

      {finalArticle.image ? (
        <div className="border border-neutral-900 my-4 overflow-hidden">
          <img
            alt={finalArticle.title}
            className="grayscale object-cover w-full"
            height={720}
            src={finalArticle.image}
            width={1200}
          />
        </div>
      ) : null}

      <div
        className={
          "gap-8 leading-relaxed lg:columns-3 md:columns-2 text-[16px] text-neutral-900 [column-fill:_balance]"
        }
      >
        {(finalArticle.content && finalArticle.content.length > 0
          ? finalArticle.content
          : [finalArticle.excerpt]
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
        <div className={cn("font-accent", "text-[10px] text-neutral-700")}>
          {`${finalArticle.city} • `}
          {`x:${finalArticle.coords.x} y:${finalArticle.coords.y} z:${finalArticle.coords.z}`}
          {" • "}
          <button
            onClick={() => handleSetWaypoint(finalArticle)}
            className="underline"
            disabled={!dustClient}
          >
            Set Waypoint
          </button>
        </div>
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
