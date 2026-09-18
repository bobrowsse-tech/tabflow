import type { OrganizationResult, TabRecord } from "../shared/types";
import { buildPlan } from "./group-planner";

export async function organizeWindow(
  windowId: number,
): Promise<OrganizationResult> {
  const chromeTabs = await chrome.tabs.query({ windowId });
  const tabs: TabRecord[] = chromeTabs
    .filter((tab): tab is chrome.tabs.Tab & { id: number; url: string } =>
      Boolean(tab.id && tab.url),
    )
    .map((tab) => ({
      id: tab.id,
      index: tab.index,
      url: tab.url,
      title: tab.title ?? "",
      pinned: Boolean(tab.pinned),
      groupId: tab.groupId,
    }));
  const plan = buildPlan(tabs);
  await chrome.storage.local.set({
    tabflowUndo: {
      windowId,
      closedTabs: tabs.filter((tab) => plan.closeTabIds.includes(tab.id)),
      savedAt: Date.now(),
    },
  });
  let partial = false;
  if (plan.closeTabIds.length) await chrome.tabs.remove(plan.closeTabIds);
  let groupsCreated = 0;
  const createdGroupIds: number[] = [];
  for (const group of plan.groups) {
    try {
      const groupId = await chrome.tabs.group({
        tabIds: group.tabIds,
        createProperties: { windowId },
      });
      await chrome.tabGroups.update(groupId, {
        title: group.category,
        color: colorFor(group.category),
      });
      groupsCreated += 1;
      createdGroupIds.push(groupId);
    } catch {
      partial = true;
    }
  }
  const stored = await chrome.storage.local.get("tabflowUndo");
  await chrome.storage.local.set({
    tabflowUndo: { ...stored.tabflowUndo, createdGroupIds },
  });
  return {
    totalTabs: tabs.length,
    keptTabs: plan.keepTabIds.length,
    duplicatesRemoved: plan.closeTabIds.length,
    groupsCreated,
    leftUngrouped: plan.ungroupedTabIds.length,
    partial,
    ...(partial
      ? {
          error:
            "Chrome prevented one or more tabs from being moved. Your remaining tabs were left unchanged.",
        }
      : {}),
  };
}

export async function undoLastOrganization(): Promise<boolean> {
  const stored = await chrome.storage.local.get("tabflowUndo");
  const snapshot = stored.tabflowUndo as
    | {
        windowId: number;
        closedTabs: TabRecord[];
        createdGroupIds?: number[];
      }
    | undefined;
  if (!snapshot) return false;
  for (const tab of snapshot.closedTabs) {
    await chrome.tabs.create({
      windowId: snapshot.windowId,
      url: tab.url,
      index: tab.index,
      pinned: tab.pinned,
    });
  }
  for (const groupId of snapshot.createdGroupIds ?? []) {
    const tabs = await chrome.tabs.query({
      windowId: snapshot.windowId,
      groupId,
    });
    const tabIds = tabs
      .map((tab) => tab.id)
      .filter((id): id is number => typeof id === "number");
    if (tabIds.length) await chrome.tabs.ungroup(tabIds);
  }
  await chrome.storage.local.remove("tabflowUndo");
  return true;
}

type GroupColor =
  | "blue"
  | "cyan"
  | "purple"
  | "yellow"
  | "green"
  | "grey"
  | "red"
  | "pink";

function colorFor(category: string): GroupColor {
  const colors: Record<string, GroupColor> = {
    Work: "blue",
    Development: "cyan",
    Research: "purple",
    Shopping: "yellow",
    Travel: "green",
    Finance: "blue",
    Communication: "grey",
    Entertainment: "red",
    Reading: "grey",
    Social: "pink",
  };
  return colors[category] ?? "grey";
}
