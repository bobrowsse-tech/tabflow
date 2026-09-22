import type { Category, Classification, Confidence, TabRecord } from "../shared/types";

/**
 * Soft hint rules: preferred group labels for known domains/terms.
 * Discovery clustering does not require a hint to form a group.
 */
const rules: Array<{ category: Category; terms: string[] }> = [
  {
    category: "AI",
    terms: [
      "chatgpt.com",
      "chat.openai.com",
      "openai.com",
      "gemini.google.com",
      "claude.ai",
      "perplexity.ai",
      "copilot.microsoft.com",
      "mistral.ai",
      "grok.x.ai",
      "chatgpt",
      "google gemini",
    ],
  },
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
      "localhost",
      "vercel.com",
      "stackblitz.",
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
      "teams.microsoft.com",
      "skanska.",
      "intrum.",
    ],
  },
  {
    category: "Research",
    terms: [
      "wikipedia.org",
      "arxiv.org",
      "research",
      "paper",
      "journal",
      "university",
      "universitet",
      "högskola",
      "hogskola",
      "handelshögskolan",
      "handelshogskolan",
      "college",
      "campus",
      "student",
      "utbildning",
      "kursplan",
      "msc ",
      "bsc ",
      ".edu/",
      ".edu?",
      ".ac.uk",
      "su.se",
      "ki.se",
      "kth.se",
      "liu.se",
      "gu.se",
      "uu.se",
      "lu.se",
      "chalmers.se",
      "hhs.se",
      "sh.se",
    ],
  },
  {
    category: "Shopping",
    terms: [
      "amazon.",
      "ebay.",
      "shop",
      "store",
      "cart",
      "product",
      "produkt",
      "köp",
      "pris",
      "elektronik",
      "telefoner",
      "vitvaror",
      "apple.com",
      "samsung.",
      "lg.com",
      "ikea.",
      "zalando.",
      "elgiganten.",
      "mediamarkt.",
      "webhallen.",
      "netonnet.",
      "cdon.",
      "hemnet.",
      "booli.",
      "blocket.",
    ],
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
      "flyg",
      "hotell",
      "resa",
      "sj.se",
      "sas.se",
    ],
  },
  {
    category: "Finance",
    terms: [
      "bank",
      "finance",
      "invest",
      "paypal.",
      "stripe.com",
      "swedbank.",
      "seb.se",
      "handelsbanken.",
      "nordea.",
      "avanza.",
      "nordnet.",
    ],
  },
  {
    category: "Communication",
    terms: [
      "mail.google.com",
      "outlook.live.com",
      "outlook.office.com",
      "messenger.",
      "web.whatsapp.com",
      "messages.google.com",
    ],
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
      "svtplay.",
      "viaplay.",
    ],
  },
  {
    category: "Reading",
    terms: [
      "medium.com",
      "substack.com",
      "blog",
      "article",
      "read",
      "dn.se",
      "svd.se",
      "aftonbladet.",
      "expressen.",
    ],
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

export interface SoftHint {
  label: Category;
  confidence: Confidence;
  reason: string;
}

/** Soft group-label hint from local URL/title signals; null when unknown. */
export function hintForTab(
  tab: Pick<TabRecord, "url" | "title">,
): SoftHint | null {
  const haystack = `${tab.url} ${tab.title}`.toLowerCase();
  const match = rules.find((rule) =>
    rule.terms.some((term) => haystack.includes(term)),
  );
  if (!match) return null;
  const matches = match.terms.filter((term) => haystack.includes(term)).length;
  return {
    label: match.category,
    confidence: matches > 1 ? "high" : "medium",
    reason: `Matched ${match.category.toLowerCase()} signals locally`,
  };
}

/** Classify a tab from local URL and title signals only (soft hint wrapper). */
export function classifyTab(
  tab: Pick<TabRecord, "url" | "title">,
): Classification {
  const hint = hintForTab(tab);
  if (!hint)
    return {
      category: null,
      confidence: "low",
      reason: "No clear local category match",
    };
  return {
    category: hint.label,
    confidence: hint.confidence,
    reason: hint.reason,
  };
}
