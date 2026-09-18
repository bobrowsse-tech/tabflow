import { describe, expect, it } from "vitest";
import { canonicalizeUrl } from "../src/core/canonicalize-url";
import { classifyTab } from "../src/core/classifier";
import { findDuplicateTabIds } from "../src/core/duplicate-detector";

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
});
