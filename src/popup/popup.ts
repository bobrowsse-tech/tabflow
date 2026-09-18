const summary = document.querySelector<HTMLParagraphElement>("#summary")!;
const supporting = document.querySelector<HTMLParagraphElement>("#supporting")!;
const button = document.querySelector<HTMLButtonElement>("#organize")!;
const sweep = document.querySelector<HTMLDivElement>(".status-sweep")!;
const demoMode =
  new URLSearchParams(window.location.search).get("demo") === "1";

function applyTheme(theme: string | undefined): void {
  if (theme === "Light" || theme === "Dark") {
    document.documentElement.dataset.theme = theme.toLowerCase();
  } else {
    delete document.documentElement.dataset.theme;
  }
}

async function loadTheme(): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const values = await chrome.storage.local.get("theme");
    applyTheme(typeof values.theme === "string" ? values.theme : undefined);
    return;
  }
  applyTheme(window.localStorage.getItem("tabflow:theme") ?? undefined);
}

async function send<T>(type: string): Promise<T> {
  if (demoMode) {
    if (type === "summary") {
      return { ok: true, summary: { totalTabs: 27, duplicates: 4 } } as T;
    }
    if (type === "organize") {
      return {
        ok: true,
        result: {
          keptTabs: 23,
          duplicatesRemoved: 4,
          groupsCreated: 5,
          leftUngrouped: 3,
        },
      } as T;
    }
    return { ok: true, restored: true } as T;
  }
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    throw new Error("Open TabFlow from Chrome to inspect the current window.");
  }
  const response = await chrome.runtime.sendMessage({ type });
  if (!response?.ok)
    throw new Error(
      response?.error ?? "TabFlow could not complete that action.",
    );
  return response as T;
}

async function loadSummary() {
  try {
    const response = await send<{
      summary: { totalTabs: number; duplicates: number };
    }>("summary");
    if (response.summary.totalTabs <= 1) {
      summary.textContent = "Nothing to organise";
      supporting.textContent = "Open a few tabs and TabFlow can clean them up.";
      button.disabled = true;
      return;
    }
    summary.textContent = `${response.summary.totalTabs} tabs · ${response.summary.duplicates} duplicates`;
    supporting.textContent = response.summary.duplicates
      ? `${response.summary.duplicates} duplicate tab${response.summary.duplicates === 1 ? "" : "s"} will be closed.`
      : "Current window";
  } catch (error) {
    summary.textContent =
      error instanceof Error
        ? error.message
        : "Could not read the current window.";
    button.disabled = true;
  }
}

button.addEventListener("click", async () => {
  if (button.dataset.action === "undo") return;
  button.disabled = true;
  button.textContent = "Organising...";
  summary.textContent = "Organising...";
  supporting.textContent = "Everything stays on this device.";
  sweep.classList.add("processing");
  try {
    const response = await send<{
      result: {
        keptTabs: number;
        duplicatesRemoved: number;
        groupsCreated: number;
        leftUngrouped: number;
      };
    }>("organize");
    const result = response.result;
    sweep.classList.remove("processing");
    sweep.classList.add("done");
    summary.textContent = "Workspace organised";
    supporting.textContent = `${result.keptTabs} tabs kept · ${result.duplicatesRemoved} duplicates removed · ${result.groupsCreated} groups created${result.leftUngrouped ? ` · ${result.leftUngrouped} left ungrouped` : ""}`;
    button.dataset.action = "undo";
    button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M9 7H5v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10.5A7 7 0 1 0 8 5.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Undo</span>`;
    button.disabled = false;
    button.onclick = async () => {
      button.disabled = true;
      button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M9 7H5v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10.5A7 7 0 1 0 8 5.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Undoing...</span>`;
      const undone = await send<{ restored: boolean }>("undo");
      summary.textContent = undone.restored
        ? "Previous organisation undone"
        : "Nothing to undo";
      supporting.textContent =
        "Only the latest TabFlow operation can be undone.";
      button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M9 7H5v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10.5A7 7 0 1 0 8 5.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Undo</span>`;
    };
  } catch (error) {
    sweep.classList.remove("processing");
    summary.textContent =
      error instanceof Error
        ? error.message
        : "TabFlow could not complete that action.";
    button.textContent = "Try again";
    button.disabled = false;
  }
});
document.querySelector("#settings")!.addEventListener("click", () => {
  if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
    void chrome.runtime.openOptionsPage();
    return;
  }
  window.location.href = "../settings/index.html";
});
void loadSummary();
void loadTheme();

export {};
