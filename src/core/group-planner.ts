import type {
  OrganizationPlan,
  OrganizationSettings,
  TabRecord,
} from "../shared/types";
import { clusterTabs } from "./cluster-tabs";
import { findDuplicateTabIds } from "./duplicate-detector";

/** True when Chrome already has this tab in a tab group. */
function isAlreadyGrouped(tab: TabRecord): boolean {
  return typeof tab.groupId === "number" && tab.groupId >= 0;
}

/**
 * Build an organization plan: duplicates first, then discovery clustering
 * (host / shared tokens / soft hints) for eligible tabs.
 */
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

  if (!settings.groupUngrouped) {
    return {
      keepTabIds: keepTabs.map((tab) => tab.id),
      closeTabIds,
      groups: [],
      ungroupedTabIds: keepTabs.map((tab) => tab.id),
    };
  }

  const eligible: TabRecord[] = [];
  const reserved: number[] = [];
  for (const tab of keepTabs) {
    if (tab.pinned || (settings.preserveGroups && isAlreadyGrouped(tab))) {
      reserved.push(tab.id);
      continue;
    }
    eligible.push(tab);
  }

  const groups = clusterTabs(eligible);
  const claimed = new Set(groups.flatMap((group) => group.tabIds));
  const ungroupedTabIds = [
    ...reserved,
    ...eligible.filter((tab) => !claimed.has(tab.id)).map((tab) => tab.id),
  ];

  return {
    keepTabIds: keepTabs.map((tab) => tab.id),
    closeTabIds,
    groups,
    ungroupedTabIds,
  };
}
