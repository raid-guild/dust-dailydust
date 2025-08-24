import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { usePlayerPositionQuery } from "@/common/usePlayerPositionQuery";
import { usePosts } from "@/common/usePosts";
import { ARTICLE_PAGE_PATH } from "@/Routes";
import { getDistance } from "@/utils/helpers";
import type { Post } from "@/utils/types";

import { PinnedAppView } from "./PinnedAppView";

type Props = {
  open: boolean;
  onUnpin: () => void;
};

export const PinnedApp: React.FC<Props> = ({ open, onUnpin }) => {
  const navigate = useNavigate();
  const { data: playerPosition } = usePlayerPositionQuery();
  const { articles } = usePosts();

  const closestPost = useMemo(() => {
    if (!playerPosition) return articles[0];
    const articlesByDistance = articles
      .filter((a) => !!a.coords)
      .map((p) => ({
        ...p,
        distance: p.coords ? getDistance(playerPosition, p.coords) : null,
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

    return articlesByDistance[0] ?? articles[0];
  }, [articles, playerPosition]);

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
            onUnpin();
          }
        }}
        onUnpin={() => {
          localStorage.setItem("pinnedApp", "false");
          onUnpin();
        }}
      />
    </div>
  );
};
