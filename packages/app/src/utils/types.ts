export type Post = {
  id: string;
  categories: string[];
  content: string[];
  coords: { x: number; y: number; z: number } | null;
  coverImage: string;
  createdAt: bigint;
  distance: number | null;
  excerpt: string;
  owner: string;
  title: string;
  type: PostType;
};

export type PostType = "article" | "note";
