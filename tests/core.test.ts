import { describe, expect, it } from "vitest";
import { canonicalizeUrl } from "../src/core/canonicalize-url";
import { classifyTab } from "../src/core/classifier";
import { findDuplicateTabIds } from "../src/core/duplicate-detector";
import { buildPlan } from "../src/core/group-planner";

describe("TabFlow core logic", () => {
  it("canonicalises obvious URL formatting without dropping meaningful query data", () => {
    expect(canonicalizeUrl("HTTPS://Example.com:443/path?a=1#part")).toBe(
      "https://example.com/path?a=1#part",
    );
  });
  it("keeps the earliest tab and marks later duplicates", () => {
    expect(
      findDuplicateTabIds([
        {
          id: 1,
          index: 2,
          url: "https://example.com",
          title: "",
          pinned: false,
          groupId: -1,
        },
        {
          id: 2,
          index: 4,
          url: "https://example.com/",
          title: "",
          pinned: false,
          groupId: -1,
        },
      ]),
    ).toEqual([2]);
  });
  it("classifies locally from URL and title signals", () => {
    expect(
      classifyTab({
        url: "https://github.com/example/project",
        title: "Project",
      }).category,
    ).toBe("Development");
  });
  it("honours organization preferences when building a plan", () => {
    const tabs = [
      {
        id: 1,
        index: 0,
        url: "https://github.com/example/a",
        title: "A",
        pinned: false,
        groupId: -1,
      },
      {
        id: 2,
        index: 1,
        url: "https://github.com/example/a",
        title: "A copy",
        pinned: false,
        groupId: -1,
      },
      {
        id: 3,
        index: 2,
        url: "https://stackoverflow.com/questions/1",
        title: "B",
        pinned: false,
        groupId: -1,
      },
      {
        id: 4,
        index: 3,
        url: "https://example.com",
        title: "Existing",
        pinned: false,
        groupId: 42,
      },
    ];
    const conservative = buildPlan(tabs, {
      preserveGroups: true,
      removeDuplicates: false,
      groupUngrouped: true,
    });
    expect(conservative.closeTabIds).toEqual([]);
    expect(conservative.ungroupedTabIds).toEqual([4]);
    expect(conservative.groups).toEqual([
      {
        category: "Development",
        tabIds: [1, 2, 3],
        confidence: "medium",
        reason: "Matched development signals locally",
      },
    ]);
    const noGrouping = buildPlan(tabs, {
      preserveGroups: true,
      removeDuplicates: true,
      groupUngrouped: false,
    });
    expect(noGrouping.groups).toEqual([]);
    expect(noGrouping.closeTabIds).toEqual([2]);
  });
  it("scales plan construction for a large window without pairwise comparison", () => {
    const tabs = Array.from({ length: 250 }, (_, index) => ({
      id: index + 1,
      index,
      url: `https://example.com/tab-${index}`,
      title: "Unclassified",
      pinned: false,
      groupId: -1,
    }));
    const plan = buildPlan(tabs);
    expect(plan.keepTabIds).toHaveLength(250);
    expect(plan.closeTabIds).toEqual([]);
  });
});
