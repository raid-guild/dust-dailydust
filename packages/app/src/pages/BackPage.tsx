import { encodeBlock } from "@dust/world/internal";
import { resourceToHex } from "@latticexyz/common";
import { useMutation } from "@tanstack/react-query";
import mudConfig from "contracts/mud.config";
import NoteSystemAbi from "contracts/out/NoteSystem.sol/NoteSystem.abi.json";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Abi } from "viem";

import { useCategories } from "@/common/useCategories";
import { useDustClient } from "@/common/useDustClient";
import { usePlayerPositionQuery } from "@/common/usePlayerPositionQuery";
import { usePosts } from "@/common/usePosts";
import { NoteCard } from "@/components/NoteCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { POPULAR_PLACES } from "@/utils/constants";
import { getDistance, parseCoords } from "@/utils/helpers";

export const BackPage = () => {
  const { data: dustClient } = useDustClient();
  const { data: playerPosition } = usePlayerPositionQuery();
  const { notes } = usePosts();
  const { noteCategories } = useCategories();

  const [isNewNoteDialogOpen, setIsNewNoteDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "",
  });

  const [showPosFilters, setShowPosFilters] = useState(false);

  const [coords, setCoords] = useState<string>("");
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [authorFilter, setAuthorFilter] = useState<string>("");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");

  const parsedCoords = useMemo(
    () => (coords ? parseCoords(coords) : null),
    [coords]
  );

  const notesByDistance = useMemo(() => {
    if (!parsedCoords) return notes;
    return notes
      .filter((a) => !!a.coords)
      .map((p) => ({
        ...p,
        distance: p.coords ? getDistance(parsedCoords, p.coords) : null,
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [notes, parsedCoords]);

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

  useEffect(() => {
    setForm((f) => ({
      ...f,
      category: noteCategories[0] ?? "",
    }));
  }, [noteCategories]);

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

      try {
        if (playerPosition) {
          await createNoteWithAnchor.mutateAsync({
            title: form.title,
            content: form.content,
            category: form.category,
            anchorPos: playerPosition,
          });
        } else {
          await createNote.mutateAsync({
            title: form.title,
            content: form.content,
            category: form.category,
          });
        }

        setForm({ category: "", title: "", content: "" });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error creating note:", error);

        toast.error("Error Creating Note", {
          description: (error as Error).message,
        });
      }
    },
    [createNote, createNoteWithAnchor, form, playerPosition]
  );

  const isDisabled = useMemo(() => {
    return createNote.isPending || !form.title || !form.content;
  }, [createNote.isPending, form.title, form.content]);

  return (
    <section className="gap-4 grid p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
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
            Making a request, offering a service, and more...
          </p>
        </div>
        <div>
          <Button
            className="border-neutral-900"
            onClick={() => setIsNewNoteDialogOpen(true)}
            size="sm"
          >
            New Note
          </Button>
        </div>
      </div>

      {isNewNoteDialogOpen && (
        <div className="fixed flex inset-0 items-start justify-center p-4 sm:items-center z-50">
          <div
            className="absolute bg-black/50 inset-0"
            onClick={() => setIsNewNoteDialogOpen(false)}
          />
          <div className="max-w-4xl mx-auto relative w-full">
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
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
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
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      placeholder="Title"
                      value={form.title}
                    />
                  </div>
                  <Textarea
                    className="border-neutral-900 min-h-28"
                    onChange={(e) =>
                      setForm({ ...form, content: e.target.value })
                    }
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
                    {playerPosition
                      ? `${"Preview anchor"} • x:${playerPosition.x} y:${playerPosition.y} z:${playerPosition.z}`
                      : "No anchor"}
                  </div>
                </footer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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

      <div className="flex gap-2 items-center">
        <Button
          className="border-neutral-900"
          onClick={() => setShowPosFilters(!showPosFilters)}
          size="sm"
          variant={showPosFilters ? "default" : "outline"}
        >
          {showPosFilters ? "Hide Position Filters" : "Show Position Filters"}
        </Button>
      </div>

      {showPosFilters && (
        <>
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
        </>
      )}

      <div className="gap-2 grid md:grid-cols-3">
        {filteredNotes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </section>
  );
};
