import type React from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { classifiedsSeed } from "@/dummy-data";
import { cn } from "@/lib/utils";

type Post = { id: string; type: string; title: string; body: string };

export const BackPage = () => {
  const [posts, setPosts] = useState<Post[]>(classifiedsSeed);
  const [form, setForm] = useState({ type: "Offer", title: "", body: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.body) return;
    setPosts((p) => [
      { id: Math.random().toString(36).slice(2), ...form },
      ...p,
    ]);
    setForm({ type: "Offer", title: "", body: "" });
  };

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
          <form className="gap-3 grid" onSubmit={submit}>
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
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Details..."
              value={form.body}
            />
            <Button
              className={cn("font-accent", "h-9 px-3 text-[10px]")}
              type="submit"
            >
              Submit Listing
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="gap-6 grid md:grid-cols-3">
        {posts.map((p) => (
          <div
            key={p.id}
            className="bg-neutral-50 border border-neutral-900 p-3"
          >
            <div
              className={cn(
                "font-accent",
                "text-[10px] text-neutral-700 tracking-widest uppercase"
              )}
            >
              {p.type}
            </div>
            <h3 className={cn("font-heading", "text-xl")}>{p.title}</h3>
            <p className={"text-[15px] leading-relaxed"}>{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
