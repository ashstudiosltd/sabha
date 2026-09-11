export type Category =
  | "All"
  | "Engineering"
  | "Programming"
  | "Systems"
  | "Career"
  | "Community"
  | "Ideas";

export interface BlogAuthor {
  name: string;
  username: string;
  avatarInitials: string;
  avatarColor: string;
}

export interface BlogPost {
  id: string;
  authorId: string;

  author: BlogAuthor;

  date: string;
  readTime: string;

  title: string;
  excerpt: string;

  content: string[];

  category: Category;

  tags: string[];

  coverImage?: string;

  likes: number;
  comments: number;
}

export interface TrendingItem {
  id: string;
  title: string;
  authorName: string;
  date: string;
}

export const categories: Category[] = [
  "All",
  "Engineering",
  "Programming",
  "Systems",
  "Career",
  "Community",
  "Ideas",
];

export const tags: string[] = [
  "rust",
  "system-design",
  "typescript",
  "career-advice",
  "open-source",
  "distributed-systems",
  "debugging",
  "interviews",
  "architecture",
  "postgres",
];