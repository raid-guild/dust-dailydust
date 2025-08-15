import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useDustClient } from "@/common/useDustClient";
import { getRecord } from "@latticexyz/stash/internal";
import { useRecords } from "@latticexyz/stash/react";
import { stash, tables } from "@/mud/stash";
import { ARTICLE_PAGE_PATH } from "@/Routes";
import { PinnedAppView } from "./PinnedAppView";

type Props = {
  open: boolean;
  onClose: () => void;
  onUnpin: () => void;
};

const distance = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
) => {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.round(Math.sqrt(dx * dx + dz * dz));
};

export const PinnedApp: React.FC<Props> = ({ open, onClose, onUnpin }) => {
  const { data: dustClient } = useDustClient();
  const navigate = useNavigate();

  const rawPosts = useRecords({ stash, table: tables.Post }) || [];

  // parse posts -> stable array
  const posts = useMemo(() => {
    return (rawPosts as any[])
      .map((r) => {
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

        return {
          id: r.id,
          title: r.title || "Untitled",
          coords: anchor ?? { x: 0, y: 0, z: 0 },
          timestamp: Number(r.createdAt ?? 0),
        };
      })
      .filter(Boolean) as any[];
  }, [rawPosts]);

  const [pos, setPos] = useState<{ x: number; y: number; z: number } | null>(
    null
  );

  // log when rawPosts/posts change
  useEffect(() => {
    // console.log && console.log('[PinnedApp] rawPosts changed', { rawPostsCount: rawPosts.length, postsLength: posts.length });
  }, [rawPosts.length, posts.length]);

  // log when pos changes
  useEffect(() => {
    // console.log && console.log('[PinnedApp] pos changed', { pos });
  }, [pos]);

  const isFetching = useRef(false);
  const posRef = useRef(pos);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const fetchPos = async () => {
    if (!dustClient) return;
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const p = await (dustClient as any).provider.request({
        method: "getPlayerPosition",
        params: { entity: (dustClient as any).appContext?.userAddress },
      });
      if (p && typeof p.x === "number") {
        const next = { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
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
      // ignore
    } finally {
      isFetching.current = false;
    }
  };

  // polling while open AND when dustClient is ready
  useEffect(() => {
    if (!open || !dustClient) return;
    // start polling only once dustClient is available
    fetchPos();
    const id = setInterval(fetchPos, 5000);
    // polling started
    return () => {
      clearInterval(id);
      // polling stopped
    };
    // depend on open and dustClient so we don't poll while client is missing
  }, [open, dustClient]);

  // when posts list changes while open and dustClient is ready, trigger a fetch so closest updates immediately
  useEffect(() => {
    // posts changed effect
    if (open && posts && posts.length && dustClient) {
      fetchPos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length, open, dustClient]);

  // log dustClient readiness and trigger fetch once when it becomes available
  useEffect(() => {
    if (open && dustClient) fetchPos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dustClient]);

  // compute closest article purely (no setState) to avoid update loops
  const closest = useMemo(() => {
    // console.log && console.log("[PinnedApp] computing closest", {
    //   pos,
    //   postsLength: posts.length,
    // });
    if (!pos) return null;
    if (!posts || posts.length === 0) return null;
    const ranked = posts
      .map((p) => ({ ...p, dist: distance(pos, p.coords) }))
      .sort((a, b) => a.dist - b.dist);
    // console.log && console.log("[PinnedApp] closestCandidate", {
    //   candidate: ranked[0],
    // });
    return ranked[0] ?? null;
  }, [pos, posts]);

  // keep a state-backed `closestState` so the UI updates reliably when the memoized
  // `closest` value changes
  const [closestState, setClosestState] = useState<typeof closest>(closest);
  const lastClosestIdRef = useRef<string | null>((closest as any)?.id ?? null);
  useEffect(() => {
    // sync by id
    const nextId = (closest as any)?.id ?? null;
    if (nextId !== lastClosestIdRef.current) {
      setClosestState(closest);
      lastClosestIdRef.current = nextId;
    }
    // we intentionally only depend on `closest` here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closest]);

  if (!open) return null;

  return (
    <div className="fixed top-4 left-4 z-50">
      <PinnedAppView
        closest={closestState ? { id: (closestState as any).id, title: (closestState as any).title } : null}
        onOpenArticle={() => {
          if (closestState) {
            navigate(`${ARTICLE_PAGE_PATH}${(closestState as any).id}`);
            onClose();
          }
        }}
        onUnpin={() => {
          try { localStorage.setItem("pinnedApp", "false"); } catch (e) {}
          onUnpin();
        }}
        onRefresh={() => fetchPos()}
        onClose={onClose}
      />
    </div>
  );
};
