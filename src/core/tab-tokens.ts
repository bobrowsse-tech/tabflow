/** Tiny multilingual stopwords and path noise excluded from clustering tokens. */
const STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "but",
  "for",
  "from",
  "have",
  "home",
  "html",
  "http",
  "https",
  "index",
  "into",
  "med",
  "och",
  "page",
  "that",
  "the",
  "this",
  "with",
  "www",
  "your",
  "att",
  "det",
  "den",
  "för",
  "till",
  "som",
  "på",
  "av",
  "en",
  "ett",
  "und",
  "der",
  "die",
  "das",
  "les",
  "des",
  "une",
  "pour",
]);

const TOKEN_RE = /[\p{L}\p{N}]{4,}/gu;

/** Hostname key for same-site grouping, or null for non-http(s) tabs. */
export function tabHost(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Tokenize a tab's title and URL path into significant local words
 * (any language; length ≥ 4; stopwords and pure numbers dropped).
 */
export function tokenizeTab(url: string, title: string): string[] {
  let path = "";
  try {
    path = new URL(url).pathname;
  } catch {
    path = "";
  }
  const haystack = `${title} ${path}`;
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const match of haystack.matchAll(TOKEN_RE)) {
    const token = match[0].toLowerCase();
    if (STOPWORDS.has(token)) continue;
    if (/^\d+$/.test(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

/**
 * True when a token appears often enough to link tabs but not so often
 * that it would glue most of the window together.
 */
export function isSignificantToken(
  documentFrequency: number,
  eligibleCount: number,
): boolean {
  if (documentFrequency < 2) return false;
  if (eligibleCount <= 5) return true;
  return documentFrequency / eligibleCount <= 0.4;
}
