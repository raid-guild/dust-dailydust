import { cn } from "../lib/utils";

export type Article = {
  id: string;
  author: string;
  categories: string[];
  city: string;
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
        <a className="hover:underline" href={`/story/${article.id}`}>
          {article.title}
        </a>
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
