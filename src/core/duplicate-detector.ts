import type { TabRecord } from "../shared/types";
import { canonicalizeUrl } from "./canonicalize-url";
import { tabHost } from "./tab-tokens";

/** Return later tab ids that duplicate an earlier tab by URL or same-host title. */
export function findDuplicateTabIds(tabs: TabRecord[]): number[] {
  const seenUrls = new Set<string>();
  const seenHostTitles = new Set<string>();
  const duplicates: number[] = [];
  for (const tab of [...tabs].sort((left, right) => left.index - right.index)) {
    const urlKey = canonicalizeUrl(tab.url);
    const host = tabHost(tab.url);
    const titleKey = hostTitleKey(host, tab.title);
    const urlDup = seenUrls.has(urlKey);
    const titleDup = titleKey !== null && seenHostTitles.has(titleKey);
    if (urlDup || titleDup) duplicates.push(tab.id);
    else {
      seenUrls.add(urlKey);
      if (titleKey) seenHostTitles.add(titleKey);
    }
  }
  return duplicates;
}

/** Same-host + identical non-trivial title is treated as a duplicate page. */
function hostTitleKey(host: string | null, title: string): string | null {
  const normalized = title.trim().replace(/\s+/g, " ").toLowerCase();
  if (!host || normalized.length < 12) return null;
  return `${host}::${normalized}`;
}
