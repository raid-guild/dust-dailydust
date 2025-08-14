import { resourceToHex } from "@latticexyz/common";
import { getRecord } from "@latticexyz/stash/internal";
import { useRecords } from "@latticexyz/stash/react";
import { useMutation } from "@tanstack/react-query";
import mudConfig from "contracts/mud.config";
import NoteSystemAbi from "contracts/out/NoteSystem.sol/NoteSystem.abi.json";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import type { Abi } from "viem";

import { useDustClient } from "@/common/useDustClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { stash, tables } from "@/mud/stash";

export const BackPage = () => {
  const { data: dustClient } = useDustClient();

  const [form, setForm] = useState({ type: "Offer", title: "", content: "" });

  const notes = useRecords({
    stash,
    table: tables.Post,
  })
    .map((r) => {
      const isNote =
        getRecord({
          stash,
          table: tables.IsNote,
          key: { id: r.id as `0x${string}` },
        })?.value ?? false;
      return {
        id: r.id,
        categories: r.categories,
        content: r.content,
        isNote: isNote,
        title: r.title,
      };
    })
    .filter((r) => r.isNote);

  console.log(notes);

  const createNote = useMutation({
    mutationFn: ({ title, content }: { title: string; content: string }) => {
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
            args: [title, content],
          },
        ],
      });
    },
  });

  const onSubmitListing = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.title || !form.content) return;

      setForm({ type: "Offer", title: "", content: "" });
      console.log("test");
      try {
        await createNote.mutateAsync({
          title: form.title,
          content: form.content,
        });
      } catch (error) {
        console.error("Error creating note:", error);
      }
    },
    [createNote, form]
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
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                value={form.type}
              >
                <option>Offer</option>
                <option>Wanted</option>
                <option>Service</option>
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
        </CardContent>
      </Card>

      <div className="gap-6 grid md:grid-cols-3">
        {notes.map((n) => (
          <div
            key={n.id}
            className="bg-neutral-50 border border-neutral-900 p-3"
          >
            <div
              className={cn(
                "font-accent",
                "text-[10px] text-neutral-700 tracking-widest uppercase"
              )}
            >
              {n.categories.join(", ")}
            </div>
            <h3 className={cn("font-heading", "text-xl")}>{n.title}</h3>
            <p className={"text-[15px] leading-relaxed"}>{n.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
