import type { Confidence, PlannedGroup, TabRecord } from "../shared/types";
import { hintForTab } from "./classifier";
import {
  isSignificantToken,
  tabHost,
  tokenizeTab,
} from "./tab-tokens";

interface TabFeatures {
  id: number;
  host: string | null;
  tokens: string[];
  hint: string | null;
  hintConfidence: Confidence;
}

/** Cluster eligible tabs by shared host, significant tokens, or soft hint. */
export function clusterTabs(tabs: TabRecord[]): PlannedGroup[] {
  if (tabs.length < 2) return [];

  const features: TabFeatures[] = tabs.map((tab) => {
    const hint = hintForTab(tab);
    return {
      id: tab.id,
      host: tabHost(tab.url),
      tokens: tokenizeTab(tab.url, tab.title),
      hint: hint?.label ?? null,
      hintConfidence: hint?.confidence ?? "low",
    };
  });

  const parent = new Map<number, number>();
  for (const feature of features) parent.set(feature.id, feature.id);

  function find(id: number): number {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cursor = id;
    while (cursor !== root) {
      const next = parent.get(cursor)!;
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  }

  function union(a: number, b: number): void {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  }

  const byHost = new Map<string, number[]>();
  const byHint = new Map<string, number[]>();
  const tokenDf = new Map<string, number>();

  for (const feature of features) {
    if (feature.host) {
      const bucket = byHost.get(feature.host) ?? [];
      bucket.push(feature.id);
      byHost.set(feature.host, bucket);
    }
    if (feature.hint) {
      const bucket = byHint.get(feature.hint) ?? [];
      bucket.push(feature.id);
      byHint.set(feature.hint, bucket);
    }
    for (const token of feature.tokens) {
      tokenDf.set(token, (tokenDf.get(token) ?? 0) + 1);
    }
  }

  for (const ids of byHost.values()) {
    for (let i = 1; i < ids.length; i += 1) union(ids[0]!, ids[i]!);
  }
  for (const ids of byHint.values()) {
    for (let i = 1; i < ids.length; i += 1) union(ids[0]!, ids[i]!);
  }

  const featureById = new Map(features.map((feature) => [feature.id, feature]));
  const byToken = new Map<string, number[]>();
  for (const feature of features) {
    for (const token of feature.tokens) {
      if (!isSignificantToken(tokenDf.get(token) ?? 0, features.length))
        continue;
      const bucket = byToken.get(token) ?? [];
      bucket.push(feature.id);
      byToken.set(token, bucket);
    }
  }
  for (const ids of byToken.values()) {
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const left = featureById.get(ids[i]!)!;
        const right = featureById.get(ids[j]!)!;
        if (left.hint && right.hint && left.hint !== right.hint) continue;
        union(ids[i]!, ids[j]!);
      }
    }
  }

  const components = new Map<number, TabFeatures[]>();
  for (const feature of features) {
    const root = find(feature.id);
    const bucket = components.get(root) ?? [];
    bucket.push(feature);
    components.set(root, bucket);
  }

  const groups: PlannedGroup[] = [];
  for (const members of components.values()) {
    if (members.length < 2) continue;
    groups.push(nameCluster(members, tokenDf));
  }
  return groups;
}

/** Pick a Chrome group title from majority hint, best shared token, or host. */
export function nameCluster(
  members: TabFeatures[],
  tokenDf: Map<string, number>,
): PlannedGroup {
  const hintVotes = new Map<string, { count: number; confidence: Confidence }>();
  for (const member of members) {
    if (!member.hint) continue;
    const current = hintVotes.get(member.hint) ?? {
      count: 0,
      confidence: member.hintConfidence,
    };
    current.count += 1;
    if (member.hintConfidence === "high") current.confidence = "high";
    hintVotes.set(member.hint, current);
  }

  let bestHint: string | null = null;
  let bestHintCount = 0;
  let hintConfidence: Confidence = "medium";
  for (const [hint, vote] of hintVotes) {
    if (vote.count > bestHintCount) {
      bestHint = hint;
      bestHintCount = vote.count;
      hintConfidence = vote.confidence;
    }
  }
  if (bestHint && bestHintCount >= Math.ceil(members.length / 2)) {
    return {
      category: bestHint,
      tabIds: members.map((member) => member.id),
      confidence: hintConfidence,
      reason: "Named from soft category hint",
    };
  }

  const tokenPresence = new Map<string, number>();
  for (const member of members) {
    for (const token of member.tokens) {
      tokenPresence.set(token, (tokenPresence.get(token) ?? 0) + 1);
    }
  }
  let bestToken: string | null = null;
  let bestScore = -1;
  for (const [token, presence] of tokenPresence) {
    if (presence < 2) continue;
    const rarity = 1 / (tokenDf.get(token) ?? presence);
    const score = presence * 10 + token.length + rarity;
    if (score > bestScore) {
      bestScore = score;
      bestToken = token;
    }
  }
  if (bestToken) {
    return {
      category: formatTokenTitle(bestToken),
      tabIds: members.map((member) => member.id),
      confidence: "medium",
      reason: "Named from shared local title tokens",
    };
  }

  const hosts = new Set(
    members.map((member) => member.host).filter((host): host is string => Boolean(host)),
  );
  if (hosts.size === 1) {
    const host = [...hosts][0]!;
    return {
      category: host,
      tabIds: members.map((member) => member.id),
      confidence: "medium",
      reason: "Matched same site locally",
    };
  }

  return {
    category: "Related",
    tabIds: members.map((member) => member.id),
    confidence: "medium",
    reason: "Clustered from local tab signals",
  };
}

function formatTokenTitle(token: string): string {
  if (token.length <= 2) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1);
}
