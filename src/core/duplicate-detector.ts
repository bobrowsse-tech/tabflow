import type { TabRecord } from "../shared/types";
import { canonicalizeUrl } from "./canonicalize-url";

export function findDuplicateTabIds(tabs: TabRecord[]): number[] {
  const seen = new Set<string>();
  const duplicates: number[] = [];
  for (const tab of [...tabs].sort((left, right) => left.index - right.index)) {
    const key = canonicalizeUrl(tab.url);
    if (seen.has(key)) duplicates.push(tab.id);
    else seen.add(key);
  }
  return duplicates;
}
