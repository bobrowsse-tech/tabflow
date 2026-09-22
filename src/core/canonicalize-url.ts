/** Tracking and session query keys stripped before duplicate comparison. */
const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "gclsrc",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "ref",
  "referrer",
  "sessionid",
  "sid",
  "ved",
  "ei",
]);

/** Normalize a URL for conservative duplicate detection. */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.port === "80" && url.protocol === "http:") url.port = "";
    if (url.port === "443" && url.protocol === "https:") url.port = "";
    url.hash = "";
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    const kept = [...url.searchParams.entries()]
      .filter(([key]) => {
        const lower = key.toLowerCase();
        return !lower.startsWith("utm_") && !TRACKING_PARAMS.has(lower);
      })
      .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
        leftKey === rightKey
          ? leftValue.localeCompare(rightValue)
          : leftKey.localeCompare(rightKey),
      );
    url.search = "";
    for (const [key, value] of kept) url.searchParams.append(key, value);
    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}
