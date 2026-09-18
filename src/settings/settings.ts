const keys = [
  "preserveGroups",
  "removeDuplicates",
  "groupUngrouped",
  "naming",
  "confidence",
  "theme",
] as const;
const saved = document.querySelector<HTMLParagraphElement>("#saved")!;
void chrome.storage.local.get(keys).then((values) => {
  for (const key of keys) {
    const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(
      `[data-key="${key}"]`,
    );
    if (!input || values[key] === undefined) continue;
    if (input instanceof HTMLInputElement) input.checked = Boolean(values[key]);
    else input.value = String(values[key]);
  }
});
for (const input of Array.from(
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-key]"),
))
  input.addEventListener("change", () => {
    const key = input.dataset.key!;
    const value =
      input instanceof HTMLInputElement ? input.checked : input.value;
    void chrome.storage.local.set({ [key]: value }).then(() => {
      saved.textContent = "Saved locally";
      window.setTimeout(() => {
        saved.textContent = "";
      }, 1400);
    });
  });
