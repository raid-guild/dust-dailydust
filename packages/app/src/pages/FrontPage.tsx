import { PixelDivider } from "../components/PixelDivider";
import { type Article, ArticleCard } from "../components/ArticleCard";
import { cn } from "../lib/utils";

const weeklyCurated: Article[] = [
  {
    id: "1",
    author: "miner_jim",
    categories: ["Builds", "Culture"],
    city: "Creeperville",
    coords: { x: 100, y: 64, z: 100 },
    excerpt:
      "After a tense town meeting, alder-blocks approved funding to deploy a dedicated squad of iron golems to watch alleyways and unlit rooftops. Merchants say the move will protect their emerald reserves.",
    image: "/assets/news.png",
    section: "Front Page",
    timestamp: 1754960423,
    title: "City Hall Promises Iron Golem Night Patrols",
  },
  {
    id: "2",
    author: "miner_dan",
    categories: ["Creatures", "Culture"],
    city: "Creeperville",
    coords: { x: 100, y: 64, z: 100 },
    excerpt:
      "A chorus of sizzling hisses startled farmers as synchronized creepers performed a surprisingly orderly serenade. No blocks were harmed.",
    image: "/assets/creeper-orchestra-dawn.png",
    section: "Front Page",
    timestamp: 1754961423,
    title: "Creeper Orchestra Surprises Village at Dawn",
  },
  {
    id: "3",
    author: "archi_ivy",
    categories: ["Builds", "Redstone"],
    city: "Birchwood",
    coords: { x: 200, y: 70, z: 200 },
    excerpt:
      "An ambitious bibliophile unveiled a sprawling birchwood library complete with hidden piston bookcases and a lava-lit reading lounge.",
    image: "/assets/birch-library-minecraft.png",
    section: "Front Page",
    timestamp: 1754960700,
    title: "Architect Builds 1:1 Library Using Only Birch",
  },
  {
    id: "4",
    author: "bee_keeper",
    categories: ["Politics", "Nature"],
    city: "Beehive",
    coords: { x: 300, y: 80, z: 300 },
    excerpt:
      "In a hex-ceptional election, Hive 7B-Alpha votes unanimously to appoint a Queen as Mayor, citing 'un-bee-lievable leadership.'",
    image: "/assets/minecraft-bee-city.png",
    section: "Front Page",
    timestamp: 1754961720,
    title: "Four Bees Elect First Queen Mayor",
  },
];

export const FrontPage = () => {
  return (
    <section className="p-4 sm:p-6">
      <div className="grid gap-4 sm:gap-6">
        <TopBanner />
        <PixelDivider />
        <div className="lg:grid-cols-3 gap-6 grid grid-cols-1">
          <LeadStory article={weeklyCurated[0]} />
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
        alt="Retro newspaper inspiration"
        className="grayscale object-cover w-full"
        height={800}
        src="/assets/news.png"
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
          {article.title}
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
