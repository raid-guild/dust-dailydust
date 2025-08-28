import { getRecord } from "@latticexyz/stash/internal";
import { useRecords } from "@latticexyz/stash/react";
import { useMemo } from "react";
import { hexToString } from "viem";

import { stash, tables } from "@/mud/stash";
import { getDistance, uriToHttp } from "@/utils/helpers";
import type { Post } from "@/utils/types";

import { usePlayerPositionQuery } from "./usePlayerPositionQuery";

export const usePosts = (): {
  articles: Post[];
  notes: Post[];
  posts: Post[];
} => {
  const { data: playerPosition } = usePlayerPositionQuery();

  const posts = useRecords({
    stash,
    table: tables.Post,
  })
    .map((r): Post => {
      const ownerName = getRecord({
        stash,
        table: tables.PlayerName,
        key: { player: r.owner as `0x${string}` },
      })?.name;

      let author = "Anonymous";

      if (ownerName) {
        author = hexToString(ownerName).replace(/\0+$/, "");
      }

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
        author,
        categories: category ? [category] : [],
        content: (typeof r.content === "string"
          ? r.content.split("\n\n")
          : []) as string[],
        coords: anchor
          ? { x: anchor.coordX, y: anchor.coordY, z: anchor.coordZ }
          : null,
        createdAt: r.createdAt,
        coverImage:
          uriToHttp(r.coverImage)[0] || "/assets/placeholder-notext.png",
        distance: null,
        excerpt,
        owner: r.owner,
        rawContent: typeof r.content === "string" ? r.content : "",
        title: r.title,
        type: isArticle ? "article" : "note",
        updatedAt: r.updatedAt,
      };
    })
    .map((p) => ({
      ...p,
      distance:
        p.coords && playerPosition
          ? getDistance(playerPosition, p.coords)
          : null,
    }))
    .sort((a, b) => Number(b.createdAt - a.createdAt));

  const articles = useMemo(
    () => posts.filter((p) => p.type === "article"),
    [posts]
  );
  const notes = useMemo(() => posts.filter((p) => p.type === "note"), [posts]);

  return {
    articles,
    notes,
    posts,
  };
};
