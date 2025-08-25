import { getRecord } from "@latticexyz/stash/internal";
import { useRecords } from "@latticexyz/stash/react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useDustClient } from "@/common/useDustClient";
import { usePosts } from "@/common/usePosts";
import { useWaypoint } from "@/common/useWaypoint";
import { ArticleCard } from "@/components/ArticleCard";
import { PixelDivider } from "@/components/PixelDivider";
import { cn } from "@/lib/utils";
import { stash, tables } from "@/mud/stash";
import { ARTICLE_PAGE_PATH } from "@/Routes";
import type { Post } from "@/utils/types";

export const FrontPage = () => {
  const { data: dustClient } = useDustClient();
  const { articles } = usePosts();
  const { onSetWaypoint } = useWaypoint();

  const frontPageCollection = useRecords({
    stash,
    table: tables.Collection,
  })
    .map((r) => {
      return getRecord({
        stash,
        table: tables.Collection,
        key: { id: r.id as `0x${string}` },
      });
    })
    .sort((a, b) => Number(b?.createdAt ?? 0) - Number(a?.createdAt ?? 0))[0];

  const frontPagePostIds = useMemo(() => {
    return (
      getRecord({
        stash,
        table: tables.CollectionPosts,
        key: { id: frontPageCollection?.id as `0x${string}` },
      })?.posts ?? []
    );
  }, [frontPageCollection]);

  const frontPageArticles = useMemo(() => {
    return (
      articles
        .filter((article) =>
          frontPagePostIds.includes(article.id as `0x${string}`)
        )
        // sort by CollectionPosts original array order
        .sort((a, b) => {
          const aIndex = frontPagePostIds.indexOf(a.id as `0x${string}`);
          const bIndex = frontPagePostIds.indexOf(b.id as `0x${string}`);
          return aIndex - bIndex;
        })
    );
  }, [articles, frontPagePostIds]);

  if (!frontPageCollection)
    return (
      <TopBanner
        title="An Error Occurred"
        description="Please try again later."
      />
    );

  return (
    <section className="p-4 sm:p-6">
      <div className="grid gap-4 sm:gap-6">
        <TopBanner
          title={frontPageCollection.title}
          description={frontPageCollection.description}
        />
        <PixelDivider />
        <div className="lg:grid-cols-3 gap-6 grid grid-cols-1">
          {frontPageArticles[0] && <LeadStory article={frontPageArticles[0]} />}
          <div className="lg:col-span-2 gap-6 grid">
            <div className="gap-6 grid md:grid-cols-2">
              {frontPageArticles.slice(1).map((a) => (
                <div key={a.id} className="border-neutral-900 border-t pt-4">
                  <ArticleCard article={a} />
                  {dustClient && (
                    <button
                      onClick={() => onSetWaypoint(a)}
                      className="mt-2 underline"
                      disabled={!dustClient}
                    >
                      Set Waypoint
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const TopBanner = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <div className="grid gap-3">
      <h1
        className={cn(
          "font-heading",
          "leading-tight lg:text-6xl sm:text-5xl text-center text-4xl"
        )}
      >
        {title}
      </h1>
      <p className="max-w-3xl mx-auto text-center text-neutral-800">
        {description}
      </p>
    </div>
  );
};

const LeadStory = ({ article }: { article: Post }) => {
  const { data: dustClient } = useDustClient();
  const { onSetWaypoint } = useWaypoint();

  return (
    <div className="border border-neutral-900 bg-neutral-50">
      <img
        alt={article.title}
        className="duration-500 grayscale hover:grayscale-0 object-cover w-full"
        decoding="async"
        fetchPriority="high"
        height={800}
        loading="eager"
        src={article.coverImage}
        width={1200}
      />
      <div className="p-4">
        <div
          className={cn(
            "font-accent",
            "mb-1 text-neutral-700 text-[10px] tracking-widest uppercase"
          )}
        >
          Lead Story
        </div>
        <h2 className={cn("font-heading", "text-2xl leading-snug")}>
          <Link
            className="hover:underline cursor-pointer"
            to={`${ARTICLE_PAGE_PATH}${encodeURIComponent(article.id)}`}
          >
            {article.title}
          </Link>
        </h2>
        <p className={"mt-2 text-[15px] leading-relaxed"}>{article.excerpt}</p>
        <div className="gap-2 flex">
          {article.coords && (
            <div
              className={cn("font-accent", "mt-1 text-[10px] text-neutral-700")}
            >
              x:{article.coords.x} y:
              {article.coords.y} z:{article.coords.z}
            </div>
          )}
          {article.coords && dustClient && <div>•</div>}
          {dustClient && (
            <button
              onClick={() => onSetWaypoint(article)}
              className="underline"
              disabled={!dustClient}
            >
              Set Waypoint
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
