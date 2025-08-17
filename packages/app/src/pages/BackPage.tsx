import { encodeBlock } from "@dust/world/internal";
import { resourceToHex } from "@latticexyz/common";
import { getRecord } from "@latticexyz/stash/internal";
import { useRecord, useRecords } from "@latticexyz/stash/react";
import { useMutation } from "@tanstack/react-query";
import mudConfig from "contracts/mud.config";
import NoteSystemAbi from "contracts/out/NoteSystem.sol/NoteSystem.abi.json";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Abi } from "viem";

import { useDustClient } from "@/common/useDustClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { stash, tables } from "@/mud/stash";
import { POPULAR_PLACES } from "@/utils/constants";
import { formatDate, getDistance, parseCoords } from "@/utils/helpers";
import type { Post } from "@/utils/types";

export const BackPage = () => {
  const { data: dustClient } = useDustClient();

  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "",
  });
  // Anchor position (block coords) shown in preview and used for best-effort anchor creation
  const [anchorPos, setAnchorPos] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);

  const [coords, setCoords] = useState<string>("");
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [authorFilter, setAuthorFilter] = useState<string>("");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");

  const posts = useRecords({
    stash,
    table: tables.Post,
  })
    .map((r): Post => {
      const isNote =
        getRecord({
          stash,
          table: tables.IsNote,
          key: { id: r.id as `0x${string}` },
        })?.value ?? false;
      let category: null | string = null;

      const anchor =
        getRecord({ stash, table: tables.PostAnchor, key: { id: r.id } }) ??
        null;

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
        excerpt: "",
        owner: r.owner,
        title: r.title,
        type: isNote ? "note" : "article",
      };
    })
    .filter((r) => r.type === "note")
    .sort((a, b) => Number(b.createdAt - a.createdAt));

  const parsedCoords = useMemo(
    () => (coords ? parseCoords(coords) : null),
    [coords]
  );

  const notesByDistance = useMemo(() => {
    if (!parsedCoords) return posts;
    return posts
      .filter((a) => !!a.coords)
      .map((p) => ({
        ...p,
        distance: p.coords ? getDistance(parsedCoords, p.coords) : null,
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [parsedCoords, posts]);

  const filteredNotes = useMemo(() => {
    const term = q.trim().toLowerCase();

    let results = notesByDistance.slice();

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
          (a.categories || []).some((cat: string) =>
            cat.toLowerCase().includes(term)
          )
      );
    }

    if (coords) return results;

    return results.sort((a, b) => {
      if (dateSort === "newest") return Number(b.createdAt - a.createdAt);
      return Number(a.createdAt - b.createdAt);
    });
  }, [coords, notesByDistance, q, selectedCategory, authorFilter, dateSort]);

  const noteCategories = (useRecord({
    stash,
    table: tables.NoteCategories,
    key: {},
  })
    ?.value?.map((c) => {
      return getRecord({
        stash,
        table: tables.Category,
        key: { id: c },
      })?.value;
    })
    .filter((c): c is string => !!c) ?? []) as string[];

  // Fetch current player position (best-effort) to show anchor in preview when creating a new article
  useEffect(() => {
    if (!dustClient) return;

    let cancelled = false;
    (async () => {
      try {
        const pos = await dustClient.provider.request({
          method: "getPlayerPosition",
          params: { entity: dustClient.appContext?.userAddress },
        });
        if (cancelled) return;
        setAnchorPos({
          x: Math.floor(pos.x),
          y: Math.floor(pos.y),
          z: Math.floor(pos.z),
        });
      } catch (e) {
        // preview anchor is optional
        // eslint-disable-next-line no-console
        console.warn("Could not fetch player position for preview anchor", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dustClient]);

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
        setCoords(
          `${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}`
        );
      } else {
        alert("Could not determine current position");
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to fetch current position", e);
      alert("Failed to fetch current position");
    }
  };

  // Set waypoint for an note by encoding its block coords into an EntityId
  const onSetWaypoint = async (note: Post) => {
    if (!dustClient) {
      alert("Wallet/client not ready");
      return;
    }

    const coords = note.coords;
    if (!coords || typeof coords.x !== "number") {
      alert("Note has no anchor/coordinates to set a waypoint for");
      return;
    }

    try {
      const bx = Math.floor(coords.x);
      const by = Math.floor(coords.y);
      const bz = Math.floor(coords.z);
      const entityId = encodeBlock([bx, by, bz]);

      await dustClient.provider.request({
        method: "setWaypoint",
        params: { entity: entityId, label: note.title || "Waypoint" },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to set waypoint", e);
      alert("Failed to set waypoint");
    }
  };

  const createNote = useMutation({
    mutationFn: ({
      title,
      content,
      category,
    }: {
      title: string;
      content: string;
      category: string;
    }) => {
      if (!dustClient) throw new Error("Dust client not connected");
      return dustClient.provider.request({
        method: "systemCall",
        params: [
          {
            systemId: resourceToHex({
              type: "system",
              namespace: mudConfig.namespace,
              name: "NoteSystem",
            }),
            abi: NoteSystemAbi as Abi,
            functionName: "createNote",
            args: [title, content, category],
          },
        ],
      });
    },
  });

  const createNoteWithAnchor = useMutation({
    mutationFn: ({
      title,
      content,
      category,
      anchorPos,
    }: {
      title: string;
      content: string;
      category: string;
      anchorPos: { x: number; y: number; z: number };
    }) => {
      if (!dustClient) throw new Error("Dust client not connected");
      const entityId = encodeBlock([anchorPos.x, anchorPos.y, anchorPos.z]);
      return dustClient.provider.request({
        method: "systemCall",
        params: [
          {
            systemId: resourceToHex({
              type: "system",
              namespace: mudConfig.namespace,
              name: "NoteSystem",
            }),
            abi: NoteSystemAbi as Abi,
            functionName: "createNoteWithAnchor",
            args: [
              title,
              content,
              category,
              entityId,
              anchorPos.x,
              anchorPos.y,
              anchorPos.z,
            ],
          },
        ],
      });
    },
  });

  const onSubmitListing = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.title || !form.content) return;

      setForm({ category: "Offer", title: "", content: "" });
      try {
        if (anchorPos) {
          await createNoteWithAnchor.mutateAsync({
            title: form.title,
            content: form.content,
            category: form.category,
            anchorPos,
          });
        } else {
          await createNote.mutateAsync({
            title: form.title,
            content: form.content,
            category: form.category,
          });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error creating note:", error);
      }
    },
    [anchorPos, createNote, createNoteWithAnchor, form]
  );

  const isDisabled = useMemo(() => {
    return createNote.isPending || !form.title || !form.content;
  }, [createNote.isPending, form.title, form.content]);

  return (
    <section className="gap-6 grid p-4 sm:p-6">
      <div>
        <h1 className={cn("font-heading", "text-3xl")}>
          Back Page — Classifieds
        </h1>
        <p
          className={cn(
            "font-accent",
            "text-[10px] text-neutral-700 tracking-widest uppercase"
          )}
        >
          Looking for something, offering a service, or asking for a story
        </p>
      </div>

      <Card className="border-neutral-900">
        <CardHeader>
          <CardTitle className={cn("font-heading", "text-xl")}>
            Post a Listing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="gap-3 grid" onSubmit={onSubmitListing}>
            <div className="gap-2 grid sm:grid-cols-3">
              <select
                aria-label="Type"
                className={cn(
                  "border-input bg-transparent border border-neutral-900",
                  "h-9 w-full rounded-md px-3 py-1 text-base shadow-xs",
                  "transition-[color,box-shadow] outline-none",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "md:text-sm"
                )}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                value={form.category}
              >
                {noteCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Input
                className="border-neutral-900 sm:col-span-2"
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Title"
                value={form.title}
              />
            </div>
            <Textarea
              className="border-neutral-900 min-h-28"
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Details..."
              value={form.content}
            />
            <Button
              className={cn("font-accent", "h-9 px-3 text-[10px]")}
              disabled={isDisabled}
              type="submit"
            >
              {createNote.isPending ? "Submitting..." : "Submit Listing"}
            </Button>
          </form>
          <footer className="border-neutral-900 border-t flex flex-wrap gap-3 items-center justify-between mt-6 pt-3">
            <div className={"font-accent text-[10px] text-neutral-700"}>
              {anchorPos
                ? `${"Preview anchor"} • x:${anchorPos.x} y:${anchorPos.y} z:${anchorPos.z}`
                : "No anchor"}
            </div>
          </footer>
        </CardContent>
      </Card>

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

      <div className="flex flex-wrap gap-2">
        <Button
          className="border-neutral-900"
          onClick={() => setSelectedCategory("")}
          size="sm"
          variant={selectedCategory === "" ? "default" : "outline"}
        >
          All Categories
        </Button>
        {noteCategories.map((category) => (
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

      <div className="flex gap-2 items-center">
        <Input
          className="border-neutral-900 w-40"
          onChange={(e) => setCoords(e.target.value)}
          placeholder="x y z"
          value={coords}
        />
        <Button
          className={cn("font-accent", "h-9 px-3 text-[10px]")}
          type="button"
          onClick={onResetCurrentPos}
          disabled={!dustClient}
        >
          Reset to my position
        </Button>
      </div>

      <div className="gap-2 grid md:grid-cols-3">
        {filteredNotes.map((n) => (
          <div
            key={n.id}
            className="border border-neutral-900 bg-neutral-50 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              {n.categories[0] && (
                <Badge
                  className={cn(
                    "heading-accent",
                    "text-[9px] uppercase tracking-wider"
                  )}
                >
                  {n.categories[0]}
                </Badge>
              )}
              <span
                className={cn(
                  "font-accent",
                  "text-[9px] text-neutral-600 uppercase tracking-wider"
                )}
              >
                by {n.owner.slice(0, 6)}...{n.owner.slice(-4)}
              </span>
            </div>

            <h3 className={cn("font-heading", "text-lg leading-tight")}>
              {n.title}
            </h3>

            <p className={"text-sm leading-relaxed text-neutral-800"}>
              {n.content}
            </p>

            <div className="align-start flex flex-col space-y-1 text-xs pt-2 border-t border-neutral-300">
              {n.coords && (
                <span
                  className={cn(
                    "font-accent",
                    "text-[9px] text-neutral-600 uppercase tracking-wider"
                  )}
                >
                  x:{n.coords.x} y:{n.coords.y} z:{n.coords.z}
                </span>
              )}
              {dustClient && (
                <div>
                  <button
                    onClick={() => onSetWaypoint(n)}
                    className="underline"
                    disabled={!dustClient}
                  >
                    Set Waypoint
                  </button>
                </div>
              )}
              <span
                className={cn(
                  "heading-accent",
                  "text-[9px] text-neutral-600 uppercase tracking-wider"
                )}
              >
                {formatDate(n.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
