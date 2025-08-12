import type { Article } from "./components/ArticleCard";

export const weeklyCurated: Article[] = [
  {
    id: "1",
    author: "miner_jim",
    categories: ["Builds", "Culture"],
    city: "Creeperville",
    content: [
      "Artists praised the fair's 'temporal impermanence' while gallery owners complained that price tags kept teleporting away.",
      "The fair will conclude when the curator decides you looked long enough.",
    ],
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
    content: [
      "Villagers woke to an unusual symphony—soft hisses rising in harmony like steam from a cauldron. Eyewitnesses counted at least six creepers gathered by the wheat fields, aligning in a semicircle before performing what one farmer described as 'a surprisingly tasteful crescendo.'",
      "While no explosions occurred, the Golem Guild has issued guidance on audience etiquette: maintain a respectful distance, avoid sudden movements, and keep flint and steel tucked away.",
      "Local composer note_block_nora claims responsibility, citing a new technique that 'converts sizzle into sizzle-phony' using carefully timed note blocks hidden under soil.",
    ],
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
    content: [
      "The new library, measuring exactly one villager-nod to scale, features a redstone-driven catalog system. Patrons request a title; pistons thunk, lanterns flicker, and a lectern slides forward with the correct volume.",
      "Critics argue that a birch-only palette is 'a choice.' The architect counters: 'Birch is a lifestyle. Birch is a manifesto.'",
    ],
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
    content: [
      "The beekeeping district erupted in celebratory buzzing as the newly elected Queen Mayor took her seat—hex-shaped, naturally. Honey futures surged 3 combs on the news.",
      "Opponents worry about sticky policy. Supporters say the hive's new buzz-iness tax will sweeten public coffers.",
    ],
    coords: { x: 300, y: 80, z: 300 },
    excerpt:
      "In a hex-ceptional election, Hive 7B-Alpha votes unanimously to appoint a Queen as Mayor, citing 'un-bee-lievable leadership.'",
    image: "/assets/minecraft-bee-city.png",
    section: "Front Page",
    timestamp: 1754961720,
    title: "Four Bees Elect First Queen Mayor",
  },
];
