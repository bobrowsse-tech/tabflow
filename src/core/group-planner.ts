import type {
  OrganizationPlan,
  OrganizationSettings,
  TabRecord,
} from "../shared/types";
import { classifyTab } from "./classifier";
import { findDuplicateTabIds } from "./duplicate-detector";

export function buildPlan(
  tabs: TabRecord[],
  settings: OrganizationSettings = {
    preserveGroups: true,
    removeDuplicates: true,
    groupUngrouped: true,
  },
): OrganizationPlan {
  const closeTabIds = settings.removeDuplicates
    ? findDuplicateTabIds(tabs)
    : [];
  const closeSet = new Set(closeTabIds);
  const keepTabs = tabs.filter((tab) => !closeSet.has(tab.id));
  const grouped = new Map<
    string,
    { tabIds: number[]; confidence: "high" | "medium"; reason: string }
  >();
  const ungroupedTabIds: number[] = [];

  for (const tab of keepTabs) {
    if (tab.pinned || (settings.preserveGroups && tab.groupId !== -1)) {
      ungroupedTabIds.push(tab.id);
      continue;
    }
    if (!settings.groupUngrouped) {
      ungroupedTabIds.push(tab.id);
      continue;
    }
    const classification = classifyTab(tab);
    if (!classification.category || classification.confidence === "low") {
      ungroupedTabIds.push(tab.id);
      continue;
    }
    const current = grouped.get(classification.category) ?? {
      tabIds: [],
      confidence: classification.confidence,
      reason: classification.reason,
    };
    current.tabIds.push(tab.id);
    if (classification.confidence === "high") current.confidence = "high";
    grouped.set(classification.category, current);
  }

  const groups = [...grouped.entries()]
    .filter(([, group]) => group.tabIds.length >= 2)
    .map(([category, group]) => ({ category: category as never, ...group }));
  for (const group of grouped.values()) {
    if (group.tabIds.length < 2) ungroupedTabIds.push(...group.tabIds);
  }
  return {
    keepTabIds: keepTabs.map((tab) => tab.id),
    closeTabIds,
    groups,
    ungroupedTabIds,
  };
}
