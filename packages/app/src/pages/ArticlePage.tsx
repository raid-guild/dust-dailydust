import { Link, useParams } from "react-router-dom";

import { localNewsSeed, weeklyCurated } from "@/dummy-data";
import { cn } from "@/lib/utils";
import { DISCOVER_PAGE_PATH, FRONT_PAGE_PATH } from "@/Routes";

const getArticleById = (id: string | undefined) => {
  return [...weeklyCurated, ...localNewsSeed].find((a) => a.id === id);
};

const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

export const ArticlePage = () => {
  const { id } = useParams<{ id: string }>();
  const article = getArticleById(id);

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
          {article.section || "Story"}
        </div>
        <h1
          className={cn("font-heading", "text-4xl sm:text-5xl leading-tight")}
        >
          {article.title}
        </h1>

        <div className="flex flex-wrap gap-2 items-center">
          {article.categories?.map((c) => (
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
          {"By "}@{article.author || "anonymous"} {" • "}
          {formatDateTime(article.timestamp)}
        </div>
      </header>

      {article.image ? (
        <div className="border border-neutral-900 my-4 overflow-hidden">
          <img
            alt={article.title}
            className="grayscale object-cover w-full"
            height={720}
            src={article.image}
            width={1200}
          />
        </div>
      ) : null}

      <div
        className={
          "gap-8 leading-relaxed lg:columns-3 md:columns-2 text-[16px] text-neutral-900 [column-fill:_balance]"
        }
      >
        {(article.content && article.content.length > 0
          ? article.content
          : [article.excerpt]
        ).map((p, idx) => (
          <p
            key={idx}
            className={cn(
              "mb-4 break-inside-avoid",
              idx === 0 &&
                "first-letter:text-5xl first-letter:leading-none first-letter:mr-2 first-letter:float-left"
            )}
            style={idx === 0 ? { fontVariantLigatures: "none" } : undefined}
          >
            {p}
          </p>
        ))}
      </div>

      <footer className="border-neutral-900 border-t flex flex-wrap gap-3 items-center justify-between mt-6 pt-3">
        <div className={cn("font-accent", "text-[10px] text-neutral-700")}>
          {`${article.city} • `}
          {`x:${article.coords.x} y:${article.coords.y} z:${article.coords.z}`}
        </div>
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
