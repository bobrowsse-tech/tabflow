import type {
  OrganizationResult,
  OrganizationSettings,
  TabRecord,
  UndoGroupSnapshot,
} from "../shared/types";
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
  const storedSettings = await chrome.storage.local.get([
    "preserveGroups",
    "removeDuplicates",
    "groupUngrouped",
  ]);
  const settings: OrganizationSettings = {
    preserveGroups: storedSettings.preserveGroups !== false,
    removeDuplicates: storedSettings.removeDuplicates !== false,
    groupUngrouped: storedSettings.groupUngrouped !== false,
  };
  const plan = buildPlan(tabs, settings);
  const originalGroups: UndoGroupSnapshot[] = await Promise.all(
    (await chrome.tabGroups.query({ windowId })).map(async (group) => ({
      id: group.id,
      title: group.title,
      color: group.color,
      tabIds: tabs
        .filter((tab) => tab.groupId === group.id)
        .map((tab) => tab.id),
    })),
  );
  await chrome.storage.local.set({
    tabflowUndo: {
      windowId,
      closedTabs: tabs.filter((tab) => plan.closeTabIds.includes(tab.id)),
      originalGroups,
      savedAt: Date.now(),
    },
  });
  let partial = false;
  if (plan.closeTabIds.length) await chrome.tabs.remove(plan.closeTabIds);
  let groupsCreated = 0;
  const createdGroupIds: number[] = [];
  for (const group of plan.groups) {
    try {
      const groupId = (await chrome.tabs.group({
        tabIds: nonEmptyTabIds(group.tabIds),
        createProperties: { windowId },
      })) as unknown as number;
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
  const storedUndo = stored.tabflowUndo as Record<string, unknown> | undefined;
  await chrome.storage.local.set({
    tabflowUndo: { ...(storedUndo ?? {}), createdGroupIds },
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
        originalGroups?: UndoGroupSnapshot[];
        createdGroupIds?: number[];
      }
    | undefined;
  if (!snapshot) return false;
  const restoredTabs = new Map<number, number>();
  for (const tab of snapshot.closedTabs) {
    const restored = await chrome.tabs.create({
      windowId: snapshot.windowId,
      url: tab.url,
      index: tab.index,
      pinned: tab.pinned,
    });
    if (typeof restored.id === "number") restoredTabs.set(tab.id, restored.id);
  }
  for (const tab of snapshot.closedTabs) {
    const restoredId = restoredTabs.get(tab.id);
    if (restoredId === undefined || tab.groupId !== -1) continue;
    await chrome.tabs.move(restoredId, {
      windowId: snapshot.windowId,
      index: tab.index,
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
    if (tabIds.length) await chrome.tabs.ungroup(nonEmptyTabIds(tabIds));
  }
  for (const group of snapshot.originalGroups ?? []) {
    const restoredIds = group.tabIds
      .map((tabId) => restoredTabs.get(tabId))
      .filter((id): id is number => typeof id === "number");
    if (!restoredIds.length) continue;
    const existing = await chrome.tabs.query({
      windowId: snapshot.windowId,
      groupId: group.id,
    });
    if (existing.length) {
      await chrome.tabs.group({
        tabIds: nonEmptyTabIds(restoredIds),
        groupId: group.id,
      });
    } else {
      const recreatedGroupId = (await chrome.tabs.group({
        tabIds: nonEmptyTabIds(restoredIds),
        createProperties: { windowId: snapshot.windowId },
      })) as unknown as number;
      await chrome.tabGroups.update(recreatedGroupId, {
        title: group.title,
        color: group.color as GroupColor,
      });
    }
  }
  await chrome.storage.local.remove("tabflowUndo");
  return true;
}

function nonEmptyTabIds(tabIds: number[]): [number, ...number[]] {
  if (!tabIds.length) throw new Error("A Chrome tab group must contain a tab.");
  return tabIds as [number, ...number[]];
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
