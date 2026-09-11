// Static mock data for the Devvrats Blogs UI.
// No backend, no database — this file is the single source of sample content.

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
  avatarColor: string; // used as a subtle solid background for the initials avatar
}

export interface BlogPost {
  id: string;
  author: BlogAuthor;
  date: string; // pre-formatted, e.g. "Sep 3"
  readTime: string; // e.g. "6 min read"
  title: string;
  excerpt: string;
  content: string[]; // full-article paragraphs, shown in the expanded card view
  category: Category;
  tags: string[];
  coverImage?: string; // optional cover, omitted for text-first posts
  likes: number;
  comments: number;
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

export const blogPosts: BlogPost[] = [
  {
    id: "1",
    author: {
      name: "Aditi Rao",
      username: "aditirao",
      avatarInitials: "AR",
      avatarColor: "#2F4B3C",
    },
    date: "Sep 8",
    readTime: "7 min read",
    title: "Why we rewrote Devvrats' search in Rust",
    excerpt:
      "Our Elasticsearch cluster was costing more to babysit than it was saving us in query time. Here's what changed when we moved to a purpose-built Rust index, and the three assumptions that turned out to be wrong.",
    content: [
      "We didn't set out to replace Elasticsearch. The plan was to tune our way out of the problem — smaller shards, better mappings, a caching layer in front of the hot queries. Six weeks in, we were still paging someone every time reindexing overlapped with peak traffic.",
      "The rewrite started as a two-day spike: could a flat, memory-mapped index in Rust answer our actual query patterns, which turned out to be far narrower than what Elasticsearch was built for? It could, and it did it in about a tenth of the memory.",
      "Three assumptions broke along the way. We assumed we needed fuzzy matching everywhere — we didn't, only on two fields. We assumed reindexing had to be online — batching it into a nightly job removed most of our incidents. And we assumed rewriting search meant rewriting ranking, when in practice our ranking logic barely changed at all.",
    ],
    category: "Engineering",
    tags: ["rust", "architecture"],
    coverImage:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
    likes: 214,
    comments: 38,
  },
  {
    id: "2",
    author: {
      name: "Karan Mehta",
      username: "karanm",
      avatarInitials: "KM",
      avatarColor: "#6E4B2A",
    },
    date: "Sep 7",
    readTime: "4 min read",
    title: "The case for boring technology",
    excerpt:
      "Every new tool promises to save you time. Most of them cost it instead. A short argument for choosing the stack you can debug at 3am over the one that looks good in a blog post.",
    content: [
      "Boring technology has a bad reputation. It sounds like a euphemism for not trying, for settling, for shipping the same Postgres-and-a-monolith stack you shipped five years ago because nobody had the energy to learn something new.",
      "But every team has a limited budget of novelty. Spend it on your product, not your plumbing. The teams I've seen move fastest treat their infrastructure choices almost conservatively — proven databases, well-understood queues, frameworks with a decade of production scars — and save their appetite for risk for the one or two places it actually differentiates them.",
      "The tell is what happens at 3am. When the boring stack breaks, there's a Stack Overflow answer, a colleague who's seen it before, a runbook that already exists. When the exciting stack breaks, you're reading the source code of a library that shipped its 0.9 release last month.",
    ],
    category: "Ideas",
    tags: ["architecture"],
    likes: 341,
    comments: 52,
  },
  {
    id: "3",
    author: {
      name: "Sana Iqbal",
      username: "sana.codes",
      avatarInitials: "SI",
      avatarColor: "#3B4C6B",
    },
    date: "Sep 6",
    readTime: "9 min read",
    title: "How I prepared for system design interviews",
    excerpt:
      "Not another checklist. This is the actual six-week plan I followed, including the two mock interviews that made me rewrite my approach to estimating capacity from scratch.",
    content: [
      "Most system design advice is a list of topics — load balancers, caching, sharding — with no sense of order or depth. I wanted a plan with a start and an end date, so I gave myself six weeks and treated it like a course I was teaching myself.",
      "Weeks one and two were just reading real architecture write-ups from companies that publish them, and re-drawing their diagrams from memory the next day. Weeks three and four were capacity estimation drills — back-of-envelope math until it stopped feeling like a trick and started feeling like arithmetic.",
      "The two mock interviews in week five were the most useful hours of the whole plan. Both times I over-engineered the first draft, and both times the feedback was the same: start smaller, and justify every component before you add it. I redid my estimation approach around that one note and it changed how every later interview went.",
    ],
    category: "Career",
    tags: ["interviews", "system-design"],
    coverImage:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80",
    likes: 502,
    comments: 71,
  },
  {
    id: "4",
    author: {
      name: "Rohan Verma",
      username: "rverma",
      avatarInitials: "RV",
      avatarColor: "#7A2E2E",
    },
    date: "Sep 5",
    readTime: "11 min read",
    title: "Understanding consistent hashing from first principles",
    excerpt:
      "Most explanations start with the ring and skip the problem it solves. We'll build one up from a naive modulo hash, watch it fall apart under a single node failure, and fix it step by step.",
    content: [
      "Start with the obvious approach: hash the key, mod by the number of nodes, and route there. It works, right up until a node joins or leaves. Then almost every key maps somewhere new, and your cache hit rate falls off a cliff at the worst possible moment.",
      "Consistent hashing fixes this by hashing nodes onto the same ring as keys, so a key only ever cares about its nearest neighbor going clockwise. Remove a node and only the keys that belonged to it need to move — everyone else's mapping stays exactly where it was.",
      "The part most explanations skip is why you need virtual nodes. A handful of physical nodes placed randomly on a ring gives you a lumpy, uneven distribution. Give each physical node a hundred virtual positions instead, and the load balances out almost by accident.",
    ],
    category: "Systems",
    tags: ["distributed-systems", "architecture"],
    likes: 288,
    comments: 24,
  },
  {
    id: "5",
    author: {
      name: "Priya Nair",
      username: "priyanair",
      avatarInitials: "PN",
      avatarColor: "#4B4B4B",
    },
    date: "Sep 4",
    readTime: "5 min read",
    title: "A style guide for TypeScript I actually enforce",
    excerpt:
      "Most style guides are aspirational. This one only contains rules our linter enforces, because the rest just becomes a document nobody reads during review.",
    content: [
      "We used to have a twelve-page TypeScript style guide. Nobody read it past the first page, and every review still turned into a debate about naming conventions the doc supposedly already settled.",
      "So we deleted everything that wasn't enforced by a lint rule, and turned the rest into actual rules with autofixes. What was left fit on one page: no default exports, no any without a comment explaining why, discriminated unions over optional-field soup.",
      "The size of the guide isn't really the point. The point is that a rule nobody enforces isn't a rule, it's a suggestion — and suggestions don't survive a deadline.",
    ],
    category: "Programming",
    tags: ["typescript"],
    coverImage:
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&q=80",
    likes: 176,
    comments: 19,
  },
  {
    id: "6",
    author: {
      name: "Devansh Gupta",
      username: "devansh.g",
      avatarInitials: "DG",
      avatarColor: "#2F4B3C",
    },
    date: "Sep 3",
    readTime: "6 min read",
    title: "Six months into open source: what I learned",
    excerpt:
      "I shipped my first real PR to a project with 40,000 stars and got it merged in a day. I also had three PRs sit unreviewed for months. Both taught me something about how maintainers actually work.",
    content: [
      "The PR that got merged in a day was small — a genuine bug fix with a failing test attached, in a file the maintainer clearly knew well. The three that sat untouched were feature additions, exactly the kind of change that needs a maintainer to context-switch into a decision they didn't ask to make.",
      "That gap taught me more about open source than any contributing guide did. Maintainers aren't ignoring you; they're triaging, and a small, well-scoped fix will almost always beat a large, well-intentioned feature for their attention.",
      "Six months in, my advice to anyone starting out is unglamorous: find the bug reports with no response, reproduce them properly, and fix the smallest thing that closes the issue. It's not the contribution you imagined making, but it's the one that actually gets merged.",
    ],
    category: "Community",
    tags: ["open-source"],
    likes: 163,
    comments: 27,
  },
  {
    id: "7",
    author: {
      name: "Meera Iyer",
      username: "meera.iyer",
      avatarInitials: "MI",
      avatarColor: "#6E4B2A",
    },
    date: "Sep 2",
    readTime: "8 min read",
    title: "Notes on debugging a memory leak in production",
    excerpt:
      "The heap graph looked fine for six hours, then climbed for six minutes and paged the whole team. A walkthrough of the leak, the wrong turns we took, and the one flag that gave it away.",
    content: [
      "The graph was almost insultingly calm for six hours — a flat, healthy sawtooth from routine garbage collection. Then, without any deploy or traffic spike we could find, it started climbing and didn't come back down.",
      "Our first two guesses were wrong. We suspected a connection pool leak, then a growing in-memory cache with no eviction policy. Both were red herrings that cost us most of an afternoon before we went back to first principles and took an actual heap snapshot instead of guessing from metrics.",
      "The real cause was a listener we registered on every request and never cleaned up — invisible in normal load testing because it only compounds over hours, not minutes. The flag that gave it away was almost embarrassingly simple: object count by type, sorted descending. It was the first row.",
    ],
    category: "Engineering",
    tags: ["debugging", "postgres"],
    likes: 229,
    comments: 33,
  },
  {
    id: "8",
    author: {
      name: "Arjun Pillai",
      username: "arjunp",
      avatarInitials: "AP",
      avatarColor: "#3B4C6B",
    },
    date: "Sep 1",
    readTime: "5 min read",
    title: "Junior engineers should write more design docs",
    excerpt:
      "Not because anyone will read them closely, but because writing one forces you to notice the three decisions you were about to make by accident.",
    content: [
      "The pushback I hear most from junior engineers is that nobody reads their design docs closely, so why bother writing one. That's usually true, and it's also not the point.",
      "Writing the doc is what forces the decisions into the open. I've caught more bad assumptions while typing a design doc than in any review someone else gave me — because explaining a choice to an imagined reader is a different mental mode than just writing the code that implements it.",
      "The three decisions worth naming explicitly are almost always the ones you'd otherwise make by default: what happens on failure, what the interface looks like to the next person who touches it, and what you're deliberately choosing not to build yet. Write those three down and the rest of the doc can be short.",
    ],
    category: "Career",
    tags: ["career-advice"],
    likes: 197,
    comments: 21,
  },
];

export interface TrendingItem {
  id: string;
  title: string;
  authorName: string;
  date: string;
}

export const trendingBlogs: TrendingItem[] = [
  { id: "t1", title: "The case for boring technology", authorName: "Karan Mehta", date: "Sep 7" },
  { id: "t2", title: "How I prepared for system design interviews", authorName: "Sana Iqbal", date: "Sep 6" },
  { id: "t3", title: "Understanding consistent hashing from first principles", authorName: "Rohan Verma", date: "Sep 5" },
  { id: "t4", title: "Notes on debugging a memory leak in production", authorName: "Meera Iyer", date: "Sep 2" },
  { id: "t5", title: "Why we rewrote Devvrats' search in Rust", authorName: "Aditi Rao", date: "Sep 8" },
];