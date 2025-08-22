import { getRecord } from "@latticexyz/stash/internal";
import { useRecords } from "@latticexyz/stash/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDustClient } from "@/common/useDustClient";
import { stash, tables } from "@/mud/stash";
import { ARTICLE_PAGE_PATH } from "@/Routes";
import { getDistance } from "@/utils/helpers";
import type { Post } from "@/utils/types";

import { PinnedAppView } from "./PinnedAppView";

type Props = {
  open: boolean;
  onClose: () => void;
  onUnpin: () => void;
};

export const PinnedApp: React.FC<Props> = ({ open, onClose, onUnpin }) => {
  const { data: dustClient } = useDustClient();
  const navigate = useNavigate();

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

  const [pos, setPos] = useState<{ x: number; y: number; z: number } | null>(
    null
  );

  // log when pos changes
  useEffect(() => {
    // console.log && console.log('[PinnedApp] pos changed', { pos });
  }, [pos]);

  const isFetching = useRef(false);
  const posRef = useRef(pos);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const fetchPos = useCallback(async () => {
    if (!dustClient) return;
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const p = await dustClient.provider.request({
        method: "getPlayerPosition",
        params: { entity: dustClient.appContext?.userAddress },
      });
      if (p && typeof p.x === "number") {
        const next = {
          x: Math.floor(p.x),
          y: Math.floor(p.y),
          z: Math.floor(p.z),
        };
        if (
          !posRef.current ||
          posRef.current.x !== next.x ||
          posRef.current.y !== next.y ||
          posRef.current.z !== next.z
        ) {
          setPos(next);
          posRef.current = next;
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[PinnedApp] fetchPos error", e);
    } finally {
      isFetching.current = false;
    }
  }, [dustClient]);

  useEffect(() => {
    if (!open || !dustClient) return;
    fetchPos();
    const id = setInterval(fetchPos, 5000);
    return () => {
      clearInterval(id);
    };
  }, [dustClient, fetchPos, open]);

  // when posts list changes while open and dustClient is ready, trigger a fetch so closest updates immediately
  useEffect(() => {
    if (open && posts.length && dustClient) {
      fetchPos();
    }
  }, [fetchPos, open, posts.length, dustClient]);

  const closestPost = useMemo(() => {
    if (!pos) return posts[0];
    const postsByDistance = posts
      .filter((a) => !!a.coords)
      .map((p) => ({
        ...p,
        distance: p.coords ? getDistance(pos, p.coords) : null,
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

    return postsByDistance[0] ?? null;
  }, [pos, posts]);

  // keep a state-backed `closestState` so the UI updates reliably when the memoized
  // `closest` value changes
  const [closestState, setClosestState] = useState<Post | null>(closestPost);
  const lastClosestIdRef = useRef<string | null>(closestPost?.id ?? null);
  useEffect(() => {
    const nextId = closestPost?.id ?? null;
    if (nextId !== lastClosestIdRef.current) {
      setClosestState(closestPost);
      lastClosestIdRef.current = nextId;
    }
  }, [closestPost]);

  if (!open) return null;

  return (
    <div className="fixed top-4 left-4 z-50">
      <PinnedAppView
        closest={
          closestState
            ? {
                id: closestState.id,
                title: closestState.title,
              }
            : null
        }
        onOpenArticle={() => {
          if (closestState) {
            navigate(`${ARTICLE_PAGE_PATH}${closestState.id}`);
            onClose();
          }
        }}
        onUnpin={() => {
          localStorage.setItem("pinnedApp", "false");
          onUnpin();
        }}
        onRefresh={() => fetchPos()}
        onClose={onClose}
      />
    </div>
  );
};
