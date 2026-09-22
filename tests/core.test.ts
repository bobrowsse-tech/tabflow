import { describe, expect, it } from "vitest";
import { canonicalizeUrl } from "../src/core/canonicalize-url";
import { classifyTab, hintForTab } from "../src/core/classifier";
import { findDuplicateTabIds } from "../src/core/duplicate-detector";
import { buildPlan } from "../src/core/group-planner";
import { isSignificantToken, tokenizeTab } from "../src/core/tab-tokens";

describe("TabFlow core logic", () => {
  it("canonicalises obvious URL formatting without dropping meaningful query data", () => {
    expect(canonicalizeUrl("HTTPS://Example.com:443/path?a=1#part")).toBe(
      "https://example.com/path?a=1",
    );
  });
  it("treats tracking params, trailing slashes, and www as the same URL", () => {
    expect(
      canonicalizeUrl("https://www.hhs.se/en/program/?utm_source=x#top"),
    ).toBe(canonicalizeUrl("https://hhs.se/en/program/"));
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
  it("marks same-host tabs with the same page title as duplicates", () => {
    expect(
      findDuplicateTabIds([
        {
          id: 1,
          index: 0,
          url: "https://www.hhs.se/en/education/msc-public-policy/",
          title: "MSc in Public Policy - Handelshögskolan",
          pinned: false,
          groupId: -1,
        },
        {
          id: 2,
          index: 1,
          url: "https://www.hhs.se/en/education/msc-public-policy/?utm_source=share",
          title: "MSc in Public Policy - Handelshögskolan",
          pinned: false,
          groupId: -1,
        },
      ]),
    ).toEqual([2]);
  });
  it("does not treat short generic titles on the same host as duplicates", () => {
    expect(
      findDuplicateTabIds([
        {
          id: 1,
          index: 0,
          url: "https://example.com/a",
          title: "Home",
          pinned: false,
          groupId: -1,
        },
        {
          id: 2,
          index: 1,
          url: "https://example.com/b",
          title: "Home",
          pinned: false,
          groupId: -1,
        },
      ]),
    ).toEqual([]);
  });
  it("classifies soft hints from URL and title signals", () => {
    expect(
      classifyTab({
        url: "https://github.com/example/project",
        title: "Project",
      }).category,
    ).toBe("Development");
    expect(
      hintForTab({
        url: "https://chatgpt.com/",
        title: "ChatGPT",
      })?.label,
    ).toBe("AI");
  });
  it("tokenizes titles in any language and guards ubiquitous tokens", () => {
    expect(
      tokenizeTab(
        "https://www.su.se/english/",
        "English - Stockholms universitet",
      ),
    ).toContain("universitet");
    expect(isSignificantToken(2, 4)).toBe(true);
    expect(isSignificantToken(8, 10)).toBe(false);
  });
  it("clusters Swedish universities and AI chats across different hosts", () => {
    const plan = buildPlan([
      {
        id: 1,
        index: 0,
        url: "https://www.su.se/english/",
        title: "English - Stockholms universitet",
        pinned: false,
        groupId: -1,
      },
      {
        id: 2,
        index: 1,
        url: "https://www.hhs.se/en/education/",
        title: "MSc in Public Policy - Handelshögskolan",
        pinned: false,
        groupId: -1,
      },
      {
        id: 3,
        index: 2,
        url: "https://chatgpt.com/",
        title: "ChatGPT",
        pinned: false,
        groupId: -1,
      },
      {
        id: 4,
        index: 3,
        url: "https://gemini.google.com/app",
        title: "Google Gemini",
        pinned: false,
        groupId: -1,
      },
    ]);
    const byTitle = Object.fromEntries(
      plan.groups.map((group) => [group.category, group.tabIds]),
    );
    expect(byTitle.Research).toEqual([1, 2]);
    expect(byTitle.AI).toEqual([3, 4]);
  });
  it("groups mixed shopping sites via soft hints without shared tokens", () => {
    const plan = buildPlan([
      {
        id: 1,
        index: 0,
        url: "https://www.amazon.com/",
        title: "Amazon.com. Spend less. Smile more.",
        pinned: false,
        groupId: -1,
      },
      {
        id: 2,
        index: 1,
        url: "https://www.samsung.com/se/",
        title: "Samsung SE | TV, Telefoner, Vitvaror",
        pinned: false,
        groupId: -1,
      },
    ]);
    expect(plan.groups).toEqual([
      {
        category: "Shopping",
        tabIds: [1, 2],
        confidence: "high",
        reason: "Named from soft category hint",
      },
    ]);
  });
  it("discovers a group from shared tokens when no soft hint exists", () => {
    const plan = buildPlan([
      {
        id: 1,
        index: 0,
        url: "https://alpha.test/a",
        title: "Knäckebröd recipe one",
        pinned: false,
        groupId: -1,
      },
      {
        id: 2,
        index: 1,
        url: "https://beta.test/b",
        title: "Knäckebröd recipe two",
        pinned: false,
        groupId: -1,
      },
    ]);
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]?.category.toLowerCase()).toContain("knäckebröd");
    expect(plan.groups[0]?.tabIds).toEqual([1, 2]);
    expect(plan.groups[0]?.reason).toBe(
      "Named from shared local title tokens",
    );
  });
  it("does not over-merge unrelated hosts that share a common title word", () => {
    const tabs = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      index,
      url: `https://site-${index}.example/path`,
      title: "Overview dashboard panel",
      pinned: false,
      groupId: -1,
    }));
    const plan = buildPlan(tabs);
    expect(plan.groups).toEqual([]);
    expect(plan.ungroupedTabIds).toHaveLength(10);
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
        reason: "Named from soft category hint",
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
  it("treats missing group ids as ungrouped and falls back to same-site groups", () => {
    const tabs = [
      {
        id: 1,
        index: 0,
        url: "https://www.example.com/a",
        title: "A",
        pinned: false,
        groupId: undefined as unknown as number,
      },
      {
        id: 2,
        index: 1,
        url: "https://example.com/b",
        title: "B",
        pinned: false,
        groupId: undefined as unknown as number,
      },
      {
        id: 3,
        index: 2,
        url: "https://other.test/x",
        title: "X",
        pinned: false,
        groupId: -1,
      },
    ];
    const plan = buildPlan(tabs);
    expect(plan.groups).toEqual([
      {
        category: "example.com",
        tabIds: [1, 2],
        confidence: "medium",
        reason: "Matched same site locally",
      },
    ]);
    expect(plan.ungroupedTabIds).toEqual([3]);
  });
  it("scales plan construction for a large window without pairwise comparison", () => {
    const tabs = Array.from({ length: 250 }, (_, index) => ({
      id: index + 1,
      index,
      url: `https://host-${index}.example/tab`,
      title: "Unclassified item",
      pinned: false,
      groupId: -1,
    }));
    const plan = buildPlan(tabs);
    expect(plan.keepTabIds).toHaveLength(250);
    expect(plan.closeTabIds).toEqual([]);
    expect(plan.groups).toEqual([]);
  });
});
