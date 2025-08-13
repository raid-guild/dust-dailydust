import { ArticleCard } from "../components/ArticleCard";
import { localNewsSeed, popularPlaces } from "../dummy-data";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useMemo, useState } from "react";
import { cn } from "../lib/utils";
import { Link } from "react-router-dom";

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
  const [coords, setCoords] = useState<string>("120 64 -40");

  const parsed = useMemo(
    () => parseCoords(coords) ?? { x: 0, y: 64, z: 0 },
    [coords]
  );

  const ranked = useMemo(
    () =>
      [...localNewsSeed]
        .map((n) => ({ ...n, dist: distance(parsed, n.coords) }))
        .sort((a, b) => a.dist - b.dist),
    [parsed]
  );

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
              {popularPlaces.map((p) => (
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
