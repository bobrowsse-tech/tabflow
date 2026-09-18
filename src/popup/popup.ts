const summary = document.querySelector<HTMLParagraphElement>("#summary")!;
const supporting = document.querySelector<HTMLParagraphElement>("#supporting")!;
const button = document.querySelector<HTMLButtonElement>("#organize")!;
const sweep = document.querySelector<HTMLDivElement>(".status-sweep")!;

async function send<T>(type: string): Promise<T> {
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
  if (button.textContent === "Undo") return;
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
    button.textContent = "Undo";
    button.disabled = false;
    button.onclick = async () => {
      button.disabled = true;
      button.textContent = "Undoing...";
      const undone = await send<{ restored: boolean }>("undo");
      summary.textContent = undone.restored
        ? "Previous organisation undone"
        : "Nothing to undo";
      supporting.textContent =
        "Only the latest TabFlow operation can be undone.";
      button.textContent = "Undo";
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
document
  .querySelector("#settings")!
  .addEventListener("click", () => void chrome.runtime.openOptionsPage());
void loadSummary();
