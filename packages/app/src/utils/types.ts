export type Post = {
  id: string;
  author: string;
  categories: string[];
  content: string[];
  coords: { x: number; y: number; z: number } | null;
  coverImage: string;
  createdAt: bigint;
  distance: number | null;
  excerpt: string;
  owner: string;
  rawContent: string;
  title: string;
  type: PostType;
  updatedAt: bigint;
};

export type PostType = "article" | "note";
