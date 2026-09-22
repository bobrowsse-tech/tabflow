import { findDuplicateTabIds } from "../core/duplicate-detector";
import { organizeWindow, undoLastOrganization } from "../core/organizer";
import type { TabRecord } from "../shared/types";

chrome.runtime.onMessage.addListener(
  (message: { type: string }, sender, sendResponse) => {
    void (async () => {
      const windowId =
        sender.tab?.windowId ?? (await chrome.windows.getLastFocused()).id;
      if (typeof windowId !== "number")
        throw new Error("No active Chrome window found.");
      if (message.type === "organize")
        sendResponse({ ok: true, result: await organizeWindow(windowId) });
      else if (message.type === "undo")
        sendResponse({ ok: true, restored: await undoLastOrganization() });
      else if (message.type === "summary") {
        const chromeTabs = await chrome.tabs.query({ windowId });
        const tabs: TabRecord[] = chromeTabs
          .filter(
            (tab): tab is chrome.tabs.Tab & { id: number; url: string } =>
              Boolean(tab.id && tab.url),
          )
          .map((tab) => ({
            id: tab.id,
            index: tab.index,
            url: tab.url,
            title: tab.title ?? "",
            pinned: Boolean(tab.pinned),
            groupId: tab.groupId ?? -1,
          }));
        const stored = await chrome.storage.local.get("tabflowUndo");
        const undo = stored.tabflowUndo as { windowId?: number } | undefined;
        sendResponse({
          ok: true,
          summary: {
            totalTabs: chromeTabs.length,
            duplicates: findDuplicateTabIds(tabs).length,
            canUndo: Boolean(undo && undo.windowId === windowId),
          },
        });
      }
    })().catch((error: unknown) =>
      sendResponse({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "TabFlow could not complete that action.",
      }),
    );
    return true;
  },
);
