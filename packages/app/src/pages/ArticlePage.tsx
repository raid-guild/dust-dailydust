import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { useCopy } from "@/common/useCopy";
import { useDustClient } from "@/common/useDustClient";
import { usePosts } from "@/common/usePosts";
import { useWaypoint } from "@/common/useWaypoint";
import { cn } from "@/lib/utils";
import { DISCOVER_PAGE_PATH, FRONT_PAGE_PATH } from "@/Routes";
import { formatDate, shortenAddress } from "@/utils/helpers";
import { renderMarkdownToHtml } from "@/utils/markdown";

export const ArticlePage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: dustClient } = useDustClient();
  const { copyToClipboard } = useCopy();
  const { articles } = usePosts();
  const { onSetWaypoint } = useWaypoint();

  const article = useMemo(
    () => articles.find((p) => p.id === id),
    [id, articles]
  );

  if (!article) {
    return (
      <div className="p-6">
        <h1 className={cn("font-heading", "text-3xl")}>Story not found</h1>
        <p className="mt-2">
          We couldn&apos;t find that article. Try the Discover page.
        </p>
        <div className="mt-4">
          <Link className="cursor-pointer underline" to={DISCOVER_PAGE_PATH}>
            Go to Discover
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="p-4 sm:p-6">
      <header className="grid gap-3">
        <div
          className={cn(
            "font-accent",
            "text-[10px] text-neutral-700 uppercase tracking-widest"
          )}
        >
          Article
        </div>
        <h1
          className={cn("font-heading", "text-4xl sm:text-5xl leading-tight")}
        >
          {article.title}
        </h1>

        <div className="flex flex-wrap gap-2 items-center">
          {article.categories?.map((c: string) => (
            <span
              key={c}
              className={cn(
                "font-accent",
                "bg-neutral-100 border border-neutral-900 px-2 py-1 rounded-[3px] text-[10px] tracking-wider uppercase"
              )}
            >
              {c}
            </span>
          ))}
        </div>

        <div className={cn("font-accent", "text-[10px] text-neutral-700")}>
          {"By "}
          <button
            onClick={() => {
              copyToClipboard(article.owner);
              toast.success(`Copied ${shortenAddress(article.owner)}`);
            }}
          >
            @{article.author}
          </button>
          {" • "}
          {formatDate(article.createdAt)}
        </div>
      </header>

      {article.coverImage && (
        <div className="border border-neutral-900 my-4 overflow-hidden">
          <img
            alt={article.title}
            className="duration-500 grayscale hover:grayscale-0 object-cover transition-all w-full"
            height={720}
            src={article.coverImage}
            width={1200}
          />
        </div>
      )}

      <div
        className={
          "gap-8 leading-relaxed lg:columns-3 md:columns-2 text-[16px] text-neutral-900 [column-fill:_balance]"
        }
      >
        {/* Render article content as markdown with proper styling */}
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{
            __html: renderMarkdownToHtml(article.rawContent || article.excerpt),
          }}
        />
      </div>

      <footer className="border-neutral-900 border-t flex flex-wrap gap-3 items-center justify-between mt-6 pt-3">
        {dustClient && article.coords && (
          <div className={cn("font-accent", "text-[10px] text-neutral-700")}>
            {`x:${article.coords.x} y:${article.coords.y} z:${article.coords.z}`}
            {" • "}
            <button
              onClick={() => onSetWaypoint(article)}
              className="underline"
            >
              Set Waypoint
            </button>
          </div>
        )}
        <div className="flex gap-3">
          <Link to={FRONT_PAGE_PATH} className="underline">
            Front Page
          </Link>
          <Link to={DISCOVER_PAGE_PATH} className="underline">
            Discover
          </Link>
        </div>
      </footer>
    </article>
  );
};
