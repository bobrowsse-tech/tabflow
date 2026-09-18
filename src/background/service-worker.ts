import { organizeWindow, undoLastOrganization } from "../core/organizer";

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
        const tabs = await chrome.tabs.query({ windowId });
        const urls = new Set<string>();
        let duplicates = 0;
        for (const tab of tabs) {
          const url = tab.url ?? "";
          if (urls.has(url)) duplicates += 1;
          else urls.add(url);
        }
        sendResponse({
          ok: true,
          summary: { totalTabs: tabs.length, duplicates },
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
