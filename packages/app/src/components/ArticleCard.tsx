import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import { ARTICLE_PAGE_PATH } from "@/Routes";

export type Article = {
  id: string;
  author: string;
  categories: string[];
  city: string;
  content: string[];
  coords: { x: number; y: number; z: number };
  excerpt: string;
  image: string;
  section: string;
  timestamp: number;
  title: string;
};

export const ArticleCard = ({
  article,
  compact = false,
}: {
  article: Article;
  compact?: boolean;
}) => {
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
      <div className="border border-neutral-900 my-2 overflow-hidden">
        <img
          alt={article.title}
          src={article.image}
          className="aspect-video grayscale object-cover w-full"
          width={800}
          height={450}
        />
      </div>
      <p className={"text-[15px] leading-relaxed text-neutral-800"}>
        {article.excerpt}
      </p>
      <div className={cn("font-accent", "mt-1 text-[10px] text-neutral-700")}>
        {"Near: "}
        {article.city ? `${article.city} • ` : ""}x:{article.coords.x} y:
        {article.coords.y} z:{article.coords.z}
      </div>
    </article>
  );
};
