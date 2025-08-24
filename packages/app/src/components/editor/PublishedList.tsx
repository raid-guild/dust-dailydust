import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useDustClient } from "@/common/useDustClient";
import { usePlayerEntityId } from "@/common/usePlayerEntityId";
import { usePosts } from "@/common/usePosts";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/helpers";

export const PublishedList = ({
  onEdit,
  renderMarkdownToHtml,
}: {
  onEdit: (id: string) => void;
  renderMarkdownToHtml: (md: string) => string;
}) => {
  const { data: dustClient } = useDustClient();
  const { data: playerAddress } = usePlayerEntityId();
  const { articles } = usePosts();

  const [search, setSearch] = useState("");
  const [locX, setLocX] = useState<string>("");
  const [locY, setLocY] = useState<string>("");
  const [locZ, setLocZ] = useState<string>("");
  const [radius, setRadius] = useState<string>("");

  const clearFilters = () => {
    setSearch("");
    setLocX("");
    setLocY("");
    setLocZ("");
    setRadius("");
  };

  const populateWithCurrentPosition = async () => {
    if (!dustClient) return;
    try {
      const pos = await dustClient.provider.request({
        method: "getPlayerPosition",
        params: { entity: dustClient.appContext?.userAddress },
      });
      if (!pos) return;
      setLocX(String(Math.floor(pos.x)));
      setLocY(String(Math.floor(pos.y)));
      setLocZ(String(Math.floor(pos.z)));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Could not fetch current position", e);
      toast.error("Failed to fetch position");
    }
  };

  const filteredArticles = useMemo(() => {
    const s = search.trim().toLowerCase();
    const hasLoc = locX !== "" || locY !== "" || locZ !== "" || radius !== "";
    const rx = locX === "" ? null : Number(locX);
    const ry = locY === "" ? null : Number(locY);
    const rz = locZ === "" ? null : Number(locZ);
    const rrad = radius === "" ? null : Number(radius);

    return articles.filter((p) => {
      if (!p) return false;
      if (p.owner !== playerAddress) return false;
      if (s) {
        const hay = (p.title || "") + "\n" + (p.content || "");
        if (!hay.toLowerCase().includes(s)) return false;
      }

      if (hasLoc && rrad !== null) {
        if (!p.coords) return false;
        const ax = Number(p.coords.x || 0);
        const ay = Number(p.coords.y || 0);
        const az = Number(p.coords.z || 0);
        const dx = rx !== null ? ax - rx : 0;
        const dy = ry !== null ? ay - ry : 0;
        const dz = rz !== null ? az - rz : 0;
        const dist2 = dx * dx + dy * dy + dz * dz;
        if (dist2 > rrad * rrad) return false;
      } else if (hasLoc && rrad === null) {
        // radius not set but coords provided: treat as exact-match box for provided axes
        if (!p.coords) return false;
        const ax = Number(p.coords.x || 0);
        const ay = Number(p.coords.y || 0);
        const az = Number(p.coords.z || 0);
        if (rx !== null && ax !== rx) return false;
        if (ry !== null && ay !== ry) return false;
        if (rz !== null && az !== rz) return false;
      }

      return true;
    });
  }, [articles, locX, locY, locZ, playerAddress, radius, search]);

  return (
    <div className="grid gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 w-full">
          <input
            placeholder="Search title or content"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-2 py-1 border rounded border-neutral-200"
          />
          <Button size="sm" variant="outline" onClick={clearFilters}>
            Clear
          </Button>
        </div>
        <div className="flex items-center gap-2"></div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          placeholder="x"
          value={locX}
          onChange={(e) => setLocX(e.target.value)}
          className="w-20 px-2 py-1 border rounded border-neutral-200"
        />
        <input
          placeholder="y"
          value={locY}
          onChange={(e) => setLocY(e.target.value)}
          className="w-20 px-2 py-1 border rounded border-neutral-200"
        />
        <input
          placeholder="z"
          value={locZ}
          onChange={(e) => setLocZ(e.target.value)}
          className="w-20 px-2 py-1 border rounded border-neutral-200"
        />
        <input
          placeholder="radius (blocks)"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          className="w-36 px-2 py-1 border rounded border-neutral-200"
        />
        <Button
          size="sm"
          onClick={populateWithCurrentPosition}
          disabled={!dustClient}
        >
          Use my position
        </Button>
        <div className="text-xs text-text-secondary">
          (leave radius empty for exact coords)
        </div>
      </div>

      {filteredArticles.length === 0 ? (
        <div className="p-4 bg-panel border border-neutral-200 rounded">
          No articles match filters.
        </div>
      ) : (
        filteredArticles.map((p) => (
          <div
            key={p.id}
            className="p-3 border border-neutral-200 rounded bg-white"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-heading text-lg">
                  {p.title || "Untitled"}
                </div>
                <div className="text-xs text-text-secondary">
                  By {p.owner === playerAddress ? "you" : p.owner} •{" "}
                  {formatDate(p.updatedAt)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(p.id)}
                >
                  Edit
                </Button>
              </div>
            </div>
            <div className="mt-2 text-[15px] leading-relaxed text-text-primary">
              <div
                className="prose max-w-none overflow-hidden max-h-24"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownToHtml(p.rawContent || ""),
                }}
              />
              {p.coords && (
                <div className="mt-2 text-sm text-text-secondary">
                  Anchor: x:{p.coords.x} y:{p.coords.y} z:{p.coords.z}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
