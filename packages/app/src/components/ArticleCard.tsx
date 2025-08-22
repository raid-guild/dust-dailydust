import { useState } from "react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import { ARTICLE_PAGE_PATH } from "@/Routes";
import { uriToHttp } from "@/utils/helpers";
import type { Post } from "@/utils/types";

export const ArticleCard = ({
  article,
  compact = false,
}: {
  article: Post;
  compact?: boolean;
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <article className="relative">
      <h3
        className={cn(
          "font-heading",
          compact ? "text-xl" : "text-2xl",
          "leading-snug"
        )}
      >
        <Link
          className="cursor-pointer hover:underline"
          to={`${ARTICLE_PAGE_PATH}${encodeURIComponent(article.id)}`}
        >
          {article.title}
        </Link>
      </h3>
      <div className="border border-neutral-900 my-2 overflow-hidden relative">
        {/* shimmer placeholder while image loads */}
        {!imgLoaded && (
          <div
            aria-hidden
            className="absolute inset-0 bg-neutral-200"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.2s linear infinite",
            }}
          />
        )}
        <img
          alt={article.title}
          src={uriToHttp(article.coverImage)[0]}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`aspect-video grayscale hover:grayscale-0 object-cover w-full transition-all duration-500 ${
            imgLoaded ? "opacity-100" : "opacity-0"
          }`}
          width={800}
          height={450}
        />
        <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
      </div>
      <p className={"text-[15px] leading-relaxed text-neutral-800"}>
        {article.excerpt}
      </p>
      {article.coords && (
        <div className={cn("font-accent", "mt-1 text-[10px] text-neutral-700")}>
          x:{article.coords.x} y:
          {article.coords.y} z:{article.coords.z}
        </div>
      )}
    </article>
  );
};
