const keys = [
  "preserveGroups",
  "removeDuplicates",
  "groupUngrouped",
  "naming",
  "confidence",
  "theme",
] as const;
const saved = document.querySelector<HTMLParagraphElement>("#saved")!;
const extensionStorage =
  typeof chrome !== "undefined" && chrome.storage?.local
    ? chrome.storage.local
    : undefined;

function readPreviewValue(key: string): string | boolean | undefined {
  const value = window.localStorage.getItem(`tabflow:${key}`);
  if (value === null) return undefined;
  return value === "true" || value === "false" ? value === "true" : value;
}

const valuesPromise = extensionStorage
  ? extensionStorage.get(keys)
  : Promise.resolve(
      Object.fromEntries(
        keys.map((key) => [key, readPreviewValue(key)]),
      ) as Partial<Record<(typeof keys)[number], string | boolean | undefined>>,
    );

void valuesPromise.then((values) => {
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
    const save = extensionStorage
      ? extensionStorage.set({ [key]: value })
      : Promise.resolve(
          window.localStorage.setItem(`tabflow:${key}`, String(value)),
        );
    void save.then(() => {
      saved.textContent = "Saved locally";
      window.setTimeout(() => {
        saved.textContent = "";
      }, 1400);
    });
  });
