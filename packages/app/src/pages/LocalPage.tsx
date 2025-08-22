import { encodeBlock } from "@dust/world/internal";
import { useMemo, useState } from "react";

import { useDustClient } from "@/common/useDustClient";
import { usePlayerPositionQuery } from "@/common/usePlayerPositionQuery";
import { usePosts } from "@/common/usePosts";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { POPULAR_PLACES } from "@/utils/constants";
import { getDistance, parseCoords } from "@/utils/helpers";
import type { Post } from "@/utils/types";

export const LocalPage = () => {
  const { data: dustClient } = useDustClient();
  const { articles } = usePosts();
  const { data: playerPosition } = usePlayerPositionQuery();
  const [coords, setCoords] = useState<string>("");

  const onResetCurrentPos = () => {
    if (playerPosition) {
      setCoords(
        `${Math.floor(playerPosition.x)} ${Math.floor(playerPosition.y)} ${Math.floor(playerPosition.z)}`
      );
    }
  };

  const parsedCoords = useMemo(
    () => (coords ? parseCoords(coords) : null),
    [coords]
  );

  const postsByDistance = useMemo(() => {
    if (!coords) return articles;
    return articles
      .filter((a) => !!a.coords)
      .map((p) => ({
        ...p,
        distance:
          p.coords && parsedCoords ? getDistance(parsedCoords, p.coords) : null,
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [articles, coords, parsedCoords]);

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
