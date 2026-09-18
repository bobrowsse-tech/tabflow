export function canonicalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    if (url.port === "80" && url.protocol === "http:") url.port = "";
    if (url.port === "443" && url.protocol === "https:") url.port = "";
    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}
