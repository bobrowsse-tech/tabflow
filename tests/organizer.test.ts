import { afterEach, describe, expect, it, vi } from "vitest";
import { organizeWindow, undoLastOrganization } from "../src/core/organizer";

const tabs = [
  {
    id: 1,
    index: 0,
    url: "https://github.com/example/project",
    title: "Project",
    pinned: false,
    groupId: -1,
  },
  {
    id: 2,
    index: 1,
    url: "https://github.com/example/project",
    title: "Project copy",
    pinned: false,
    groupId: -1,
  },
  {
    id: 3,
    index: 2,
    url: "https://stackoverflow.com/questions/1",
    title: "Development question",
    pinned: false,
    groupId: -1,
  },
  {
    id: 4,
    index: 3,
    url: "https://docs.google.com/document/1",
    title: "Project notes",
    pinned: false,
    groupId: -1,
  },
  {
    id: 5,
    index: 4,
    url: "https://notion.so/project",
    title: "Project workspace",
    pinned: false,
    groupId: -1,
  },
  {
    id: 6,
    index: 5,
    url: "https://example.com/pinned",
    title: "Pinned",
    pinned: true,
    groupId: -1,
  },
  {
    id: 7,
    index: 6,
    url: "https://reddit.com/r/example",
    title: "Existing group",
    pinned: false,
    groupId: 42,
  },
];

function installChromeMock(
  options: { failGrouping?: boolean } = {},
  sourceTabs = tabs,
) {
  const storage = new Map<string, unknown>();
  const removed: number[][] = [];
  const created: Array<{ url?: string; index?: number; pinned?: boolean }> = [];
  const grouped: Array<{
    tabIds: number[];
    windowId: number;
    groupIds?: number[];
  }> = [];
  const updated: Array<{ groupId: number; title?: string; color?: string }> =
    [];
  const ungrouped: number[][] = [];
  let nextGroupId = 100;
  vi.stubGlobal("chrome", {
    action: {
      setBadgeText: vi.fn(async () => undefined),
      setBadgeBackgroundColor: vi.fn(async () => undefined),
    },
    tabGroups: {
      TAB_GROUP_ID_NONE: -1,
      query: vi.fn(async () => [{ id: 42, title: "Existing", color: "red" }]),
      update: vi.fn(async (groupId, details) => {
        if (options.failGrouping) throw new Error("group failed");
        updated.push({ groupId, ...details });
      }),
    },
    tabs: {
      query: vi.fn(
        async ({ groupId }: { windowId: number; groupId?: number }) => {
          if (groupId === undefined) return sourceTabs;
          const createdGroup = grouped.find((entry) =>
            entry.groupIds?.includes(groupId),
          );
          return createdGroup
            ? sourceTabs.filter((tab) => createdGroup.tabIds.includes(tab.id))
            : sourceTabs.filter((tab) => tab.groupId === groupId);
        },
      ),
      remove: vi.fn(async (tabIds: number[]) => {
        removed.push(tabIds);
      }),
      group: vi.fn(
        async ({
          tabIds,
          createProperties,
          groupId: existingGroupId,
        }: {
          tabIds: number[];
          createProperties?: { windowId: number };
          groupId?: number;
        }) => {
          if (options.failGrouping) throw new Error("group failed");
          if (existingGroupId !== undefined) {
            grouped.push({
              tabIds,
              windowId: createProperties?.windowId ?? 7,
              groupIds: [existingGroupId],
            });
            return existingGroupId;
          }
          const groupId = nextGroupId++;
          grouped.push({
            tabIds,
            windowId: createProperties!.windowId,
            groupIds: [groupId],
          });
          return groupId;
        },
      ),
      create: vi.fn(async (details) => {
        created.push(details);
        return { id: 200 + created.length };
      }),
      move: vi.fn(async () => undefined),
      ungroup: vi.fn(async (tabIds: number[]) => {
        ungrouped.push(tabIds);
      }),
    },
    storage: {
      local: {
        set: vi.fn(async (values) => {
          for (const [key, value] of Object.entries(values))
            storage.set(key, value);
        }),
        get: vi.fn(async (key: string | string[]) =>
          Array.isArray(key)
            ? Object.fromEntries(
                key.map((entry) => [entry, storage.get(entry)]),
              )
            : { [key]: storage.get(key) },
        ),
        remove: vi.fn(async (key: string) => {
          storage.delete(key);
        }),
      },
    },
  });
  return { removed, created, grouped, updated, ungrouped, storage };
}

afterEach(() => vi.unstubAllGlobals());

describe("Chrome organization simulation", () => {
  it("closes later duplicates, groups confident tabs, and preserves protected tabs", async () => {
    const mock = installChromeMock();

    const result = await organizeWindow(7);

    expect(result).toMatchObject({
      totalTabs: 7,
      keptTabs: 6,
      duplicatesRemoved: 1,
      groupsCreated: 2,
      leftUngrouped: 2,
      partial: false,
    });
    expect(mock.removed).toEqual([[2]]);
    expect(
      mock.grouped.map(({ tabIds, windowId }) => ({ tabIds, windowId })),
    ).toEqual([
      { tabIds: [1, 3], windowId: 7 },
      { tabIds: [4, 5], windowId: 7 },
    ]);
    expect(mock.updated.map(({ title, color }) => ({ title, color }))).toEqual([
      { title: "Development", color: "cyan" },
      { title: "Work", color: "blue" },
    ]);
    expect(result.leftUngrouped).toBe(2);

    expect(await undoLastOrganization()).toBe(true);
    expect(mock.created).toEqual([
      {
        windowId: 7,
        url: "https://github.com/example/project",
        index: 1,
        pinned: false,
      },
    ]);
    expect(mock.ungrouped).toEqual([
      [1, 3],
      [4, 5],
    ]);
  });

  it("reports a partial result when Chrome rejects grouping", async () => {
    const mock = installChromeMock({ failGrouping: true });

    const result = await organizeWindow(7);

    expect(result.partial).toBe(true);
    expect(result.groupsCreated).toBe(0);
    expect(result.error).toContain("Chrome prevented");
    expect(mock.removed).toEqual([[2]]);
  });

  it("honours disabled duplicate removal and grouping settings", async () => {
    const mock = installChromeMock();
    await chrome.storage.local.set({
      removeDuplicates: false,
      groupUngrouped: false,
    });

    const result = await organizeWindow(7);

    expect(result.duplicatesRemoved).toBe(0);
    expect(result.groupsCreated).toBe(0);
    expect(mock.removed).toEqual([]);
    expect(mock.grouped).toEqual([]);
  });
});
