import { Link } from "react-router-dom";

import { type Article, ArticleCard } from "@/components/ArticleCard";
import { PixelDivider } from "@/components/PixelDivider";
import { weeklyCurated } from "@/dummy-data";
import { cn } from "@/lib/utils";
import { ARTICLE_PAGE_PATH } from "@/Routes";

export const FrontPage = () => {
  return (
    <section className="p-4 sm:p-6">
      <div className="grid gap-4 sm:gap-6">
        <TopBanner />
        <PixelDivider />
        <div className="lg:grid-cols-3 gap-6 grid grid-cols-1">
          {weeklyCurated[0] && <LeadStory article={weeklyCurated[0]} />}
          <div className="lg:col-span-2 gap-6 grid">
            <div className="gap-6 grid md:grid-cols-2">
              {weeklyCurated.slice(1).map((a) => (
                <div key={a.id} className="border-neutral-900 border-t pt-4">
                  <ArticleCard article={a} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const TopBanner = () => {
  return (
    <div className="grid gap-3">
      <h1
        className={cn(
          "font-heading",
          "leading-tight lg:text-6xl sm:text-5xl text-center text-4xl"
        )}
      >
        City Hall Promises Iron Golem
      </h1>
      <p className="max-w-3xl mx-auto text-center text-neutral-800">
        Alder-blocks approved funding to deploy a dedicated squad.
      </p>
    </div>
  );
};

const LeadStory = ({ article }: { article: Article }) => {
  return (
    <div className="border border-neutral-900 bg-neutral-50">
      <img
        alt={article.title}
        className="grayscale object-cover w-full"
        decoding="async"
        fetchPriority="high"
        height={800}
        loading="eager"
        src={article.image}
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
        <div className={cn("font-accent", "mt-1 text-[10px] text-neutral-700")}>
          {"Near: "}
          {article.city ? `${article.city} • ` : ""}x:{article.coords.x} y:
          {article.coords.y} z:{article.coords.z}
        </div>
      </div>
    </div>
  );
};
