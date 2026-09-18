import type { Category, Classification, TabRecord } from "../shared/types";

const rules: Array<{ category: Category; terms: string[] }> = [
  {
    category: "Development",
    terms: [
      "github.com",
      "gitlab.com",
      "stackoverflow.com",
      "npmjs.com",
      "developer",
      "javascript",
      "typescript",
      "python",
      "api",
    ],
  },
  {
    category: "Work",
    terms: [
      "docs.google.com",
      "notion.so",
      "slack.com",
      "linear.app",
      "office.com",
      "figma.com",
      "asana.com",
    ],
  },
  {
    category: "Research",
    terms: ["wikipedia.org", "arxiv.org", "research", "paper", "journal"],
  },
  {
    category: "Shopping",
    terms: ["amazon.", "ebay.", "shop", "store", "cart", "product"],
  },
  {
    category: "Travel",
    terms: [
      "booking.com",
      "airbnb.",
      "tripadvisor.",
      "flight",
      "hotel",
      "travel",
    ],
  },
  {
    category: "Finance",
    terms: ["bank", "finance", "invest", "paypal.", "stripe.com"],
  },
  {
    category: "Communication",
    terms: ["mail.google.com", "outlook.live.com", "messenger.", "chat"],
  },
  {
    category: "Entertainment",
    terms: [
      "youtube.com",
      "netflix.com",
      "spotify.com",
      "twitch.tv",
      "movie",
      "music",
    ],
  },
  {
    category: "Reading",
    terms: ["medium.com", "substack.com", "blog", "article", "read"],
  },
  {
    category: "Social",
    terms: [
      "facebook.com",
      "instagram.com",
      "linkedin.com",
      "reddit.com",
      "x.com",
      "twitter.com",
    ],
  },
];

export function classifyTab(
  tab: Pick<TabRecord, "url" | "title">,
): Classification {
  const haystack = `${tab.url} ${tab.title}`.toLowerCase();
  const match = rules.find((rule) =>
    rule.terms.some((term) => haystack.includes(term)),
  );
  if (!match)
    return {
      category: null,
      confidence: "low",
      reason: "No clear local category match",
    };
  const matches = match.terms.filter((term) => haystack.includes(term)).length;
  return {
    category: match.category,
    confidence: matches > 1 ? "high" : "medium",
    reason: `Matched ${match.category.toLowerCase()} signals locally`,
  };
}
