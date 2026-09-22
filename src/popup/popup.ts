const summary = document.querySelector<HTMLParagraphElement>("#summary")!;
const supporting = document.querySelector<HTMLParagraphElement>("#supporting")!;
const button = document.querySelector<HTMLButtonElement>("#organize")!;
const cancel = document.querySelector<HTMLButtonElement>("#cancel")!;
const sweep = document.querySelector<HTMLDivElement>(".status-sweep")!;
const organizeButtonMarkup = button.innerHTML;
const undoButtonMarkup = `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M9 7H5v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10.5A7 7 0 1 0 8 5.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Undo</span>`;
const demoMode =
  new URLSearchParams(window.location.search).get("demo") === "1";
let duplicateCount = 0;
let confirmationShown = false;

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
      return {
        ok: true,
        summary: { totalTabs: 27, duplicates: 4, canUndo: false },
      } as T;
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

function enterUndoMode(detail: string): void {
  confirmationShown = false;
  cancel.hidden = true;
  sweep.classList.add("done");
  summary.textContent = "Workspace organised";
  supporting.textContent = detail;
  button.dataset.action = "undo";
  button.innerHTML = undoButtonMarkup;
  button.disabled = false;
}

async function performUndo(): Promise<void> {
  button.disabled = true;
  button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M9 7H5v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10.5A7 7 0 1 0 8 5.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Undoing...</span>`;
  try {
    const undone = await send<{ restored: boolean }>("undo");
    summary.textContent = undone.restored
      ? "Previous organisation undone"
      : "Nothing to undo";
    supporting.textContent = "Only the latest TabFlow operation can be undone.";
  } catch (error) {
    summary.textContent =
      error instanceof Error
        ? error.message
        : "TabFlow could not complete that action.";
  }
  button.dataset.action = "";
  button.innerHTML = organizeButtonMarkup;
  button.disabled = false;
  sweep.classList.remove("done");
  await loadSummary();
}

async function loadSummary() {
  try {
    const response = await send<{
      summary: { totalTabs: number; duplicates: number; canUndo: boolean };
    }>("summary");
    confirmationShown = false;
    cancel.hidden = true;
    if (response.summary.canUndo) {
      enterUndoMode(
        "Chrome closed this popup when tabs changed. Undo is still available here.",
      );
      return;
    }
    button.dataset.action = "";
    button.innerHTML = organizeButtonMarkup;
    sweep.classList.remove("done");
    if (response.summary.totalTabs <= 1) {
      summary.textContent = "Nothing to organise";
      supporting.textContent = "Open a few tabs and TabFlow can clean them up.";
      button.disabled = true;
      return;
    }
    button.disabled = false;
    summary.textContent = `${response.summary.totalTabs} tabs · ${response.summary.duplicates} duplicates`;
    duplicateCount = response.summary.duplicates;
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
  if (button.dataset.action === "undo") {
    await performUndo();
    return;
  }
  if (duplicateCount > 0 && !confirmationShown) {
    confirmationShown = true;
    summary.textContent = `${duplicateCount} duplicate tab${duplicateCount === 1 ? "" : "s"} will be closed.`;
    supporting.textContent = "The earliest open copy of each URL will be kept.";
    cancel.hidden = false;
    return;
  }
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
        error?: string;
      };
    }>("organize");
    const result = response.result;
    sweep.classList.remove("processing");
    const detail = [
      `${result.keptTabs} tabs kept`,
      `${result.duplicatesRemoved} duplicates removed`,
      `${result.groupsCreated} groups created`,
      result.leftUngrouped ? `${result.leftUngrouped} left ungrouped` : "",
      result.error ?? "",
      result.groupsCreated === 0 && !result.error
        ? "Need two or more matching tabs to form a group."
        : "",
      "Re-open TabFlow to undo if this popup closes.",
    ]
      .filter(Boolean)
      .join(" · ");
    enterUndoMode(detail);
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
cancel.addEventListener("click", () => {
  confirmationShown = false;
  cancel.hidden = true;
  void loadSummary();
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
