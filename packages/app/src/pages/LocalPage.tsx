import { encodeBlock } from "@dust/world/internal";
import { getRecord } from "@latticexyz/stash/internal";
import { useRecords } from "@latticexyz/stash/react";
import { useEffect, useMemo, useState } from "react";

import { useDustClient } from "@/common/useDustClient";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { stash, tables } from "@/mud/stash";
import { POPULAR_PLACES } from "@/utils/constants";
import { getDistance, parseCoords } from "@/utils/helpers";
import type { Post } from "@/utils/types";

export const LocalPage = () => {
  const { data: dustClient } = useDustClient();
  const [currentPos, setCurrentPos] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);
  const [coords, setCoords] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (!dustClient) return;
      try {
        const pos = await dustClient.provider.request({
          method: "getPlayerPosition",
          params: { entity: dustClient.appContext?.userAddress },
        });
        if (pos && typeof pos.x === "number") {
          setCoords(
            `${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}`
          );
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

  // Add helper to explicitly reset coords to current player position
  const onResetCurrentPos = async () => {
    if (!dustClient) return;
    try {
      const pos = await dustClient.provider.request({
        method: "getPlayerPosition",
        params: { entity: dustClient.appContext?.userAddress },
      });
      if (pos && typeof pos.x === "number") {
        setCoords(
          `${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}`
        );
        setCurrentPos({
          x: Math.floor(pos.x),
          y: Math.floor(pos.y),
          z: Math.floor(pos.z),
        });
      } else {
        alert("Could not determine current position");
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to fetch current position", e);
      alert("Failed to fetch current position");
    }
  };

  const parsed = useMemo(
    () => currentPos ?? parseCoords(coords) ?? { x: 0, y: 64, z: 0 },
    [coords, currentPos]
  );

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
        updatedAt: r.updatedAt,
      };
    })
    .filter((r) => r.type === "article")
    .sort((a, b) => Number(b.createdAt - a.createdAt));

  const postsByDistance = useMemo(() => {
    if (!coords) return posts;
    return posts
      .filter((a) => !!a.coords)
      .map((p) => ({
        ...p,
        distance: p.coords ? getDistance(parsed, p.coords) : null,
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [posts, coords, parsed]);

  // Set waypoint for an article by encoding its block coords into an EntityId
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
    <section className="p-4 sm:p-6">
      <div className="gap-6 grid">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className={cn("font-heading", "text-3xl")}>Local News</h1>
            <p
              className={cn(
                "font-accent",
                "text-[10px] text-neutral-700 tracking-widest uppercase"
              )}
            >
              News near your in-game position
            </p>
          </div>
          <form
            aria-label="Set current coordinates"
            className="flex gap-2 items-center"
            onSubmit={(e) => e.preventDefault()}
          >
            <Input
              className="border-neutral-900 w-40"
              onChange={(e) => setCoords(e.target.value)}
              placeholder="x y z"
              value={coords}
            />
            <Button
              className={cn("font-accent", "h-9 px-3 text-[10px]")}
              type="submit"
            >
              Set Position
            </Button>
            <Button
              className={cn("font-accent", "h-9 px-3 text-[10px]")}
              type="button"
              onClick={onResetCurrentPos}
              disabled={!dustClient}
            >
              Reset to my position
            </Button>
          </form>
        </div>

        <Card className="border-neutral-900">
          <CardContent className="p-3">
            <div
              className={cn(
                "font-accent",
                "mb-2 text-[10px] tracking-wider uppercase"
              )}
            >
              Popular Places
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_PLACES.map((p) => (
                <button
                  key={p.name}
                  onClick={() =>
                    setCoords(`${p.coords.x} ${p.coords.y} ${p.coords.z}`)
                  }
                  className="bg-neutral-100 border border-neutral-900 hover:bg-neutral-200 px-2 py-1 rounded-[3px] text-sm"
                  aria-label={`Set coords to ${p.name}`}
                >
                  {p.name} ({p.coords.x} {p.coords.y} {p.coords.z})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="gap-6 grid md:grid-cols-2">
          {postsByDistance.map((a) => (
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
        </div>
      </div>
    </section>
  );
};
