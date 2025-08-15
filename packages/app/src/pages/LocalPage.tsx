import { getRecord } from "@latticexyz/stash/internal";
import { useRecords } from "@latticexyz/stash/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useDustClient } from "@/common/useDustClient";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { stash, tables } from "@/mud/stash";
import { POPULAR_PLACES } from "@/utils/constants";

const distance = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
) => {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.round(Math.sqrt(dx * dx + dz * dz));
};

const parseCoords = (input: string) => {
  // expects "x y z"
  const parts = input.trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return { x: parts[0], y: parts[1], z: parts[2] };
};

export const LocalPage = () => {
  const { data: dustClient } = useDustClient();
  const [coords, setCoords] = useState<string>("120 64 -40");

  useEffect(() => {
    (async () => {
      if (!dustClient) return;
      try {
        const pos = await (dustClient as any).provider.request({
          method: "getPlayerPosition",
          params: { entity: (dustClient as any).appContext?.userAddress },
        });
        if (pos && typeof pos.x === "number") {
          setCoords(
            `${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}`
          );
        }
      } catch (e) {
        // ignore - keep default
      }
    })();
  }, [dustClient]);

  // Add helper to explicitly reset coords to current player position
  const resetToCurrentPosition = async () => {
    if (!dustClient) return;
    try {
      const pos = await (dustClient as any).provider.request({
        method: "getPlayerPosition",
        params: { entity: (dustClient as any).appContext?.userAddress },
      });
      if (pos && typeof pos.x === "number") {
        setCoords(
          `${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}`
        );
      } else {
        alert("Could not determine current position");
      }
    } catch (e) {
      console.warn("Failed to fetch current position", e);
      alert("Failed to fetch current position");
    }
  };

  // Read posts from stash
  const rawPosts = useRecords({ stash, table: tables.Post }) || [];

  const parsed = useMemo(
    () => parseCoords(coords) ?? { x: 0, y: 64, z: 0 },
    [coords]
  );

  const ranked = useMemo(() => {
    const posts = rawPosts
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
          : null;

        const excerpt =
          typeof r.content === "string"
            ? (r.content.split("\n\n")[0] || r.content).slice(0, 240)
            : "";

        return {
          id: r.id,
          title: r.title || "Untitled",
          author: r.owner || "",
          categories: (r.categories || [])
            .map((c: any) => {
              const val = getRecord({
                stash,
                table: tables.Category,
                key: { id: c },
              })?.value;
              return val ?? String(c);
            })
            .filter(Boolean),
          city: "",
          content: (typeof r.content === "string"
            ? r.content.split("\n\n")
            : []) as string[],
          coords: anchor ?? { x: 0, y: 0, z: 0 },
          excerpt,
          image: r.coverImage || "/assets/placeholder-notext.png",
          section: "",
          timestamp: Number(r.createdAt ?? 0),
        };
      })
      .filter(Boolean) as any[];

    return posts
      .map((p) => ({ ...p, dist: distance(parsed, p.coords) }))
      .sort((a, b) => a.dist - b.dist);
  }, [rawPosts, parsed]);

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
              onClick={resetToCurrentPosition}
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
          {ranked.map((a) => (
            <div key={a.id} className="border-neutral-900 border-t pt-3">
              <ArticleCard article={a} />
              <div className={cn("font-accent", "mt-2 text-[10px]")}>
                Distance: {a.dist} blocks •{" "}
                <Link to="/waypoint-in-game" className="underline">
                  Get directions
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
