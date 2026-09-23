# Chrome Web Store listing draft

## Name

CleanMyTabs

## Short description

Organise the current Chrome window locally, remove duplicate tabs, and keep a clear path back.

## Detailed description

CleanMyTabs turns an open-window mess into a clean, understandable set of Chrome tab groups in one deliberate action.

It detects duplicate URLs conservatively, keeps the earliest open copy, groups confident matches into clear categories, preserves existing groups and pinned tabs by default, and offers Undo for the latest operation.

CleanMyTabs works locally in Chrome. It has no account, backend, analytics, telemetry, advertising, or external AI service. URLs, titles, page content, browsing history, cookies, and usage events are not uploaded or shared.

## Permission justification

- `tabs`: Read the currently open tabs in the active window to count tabs, detect duplicates, and classify tabs from their URL and title. CleanMyTabs does not read page content or browsing history.
- `tabGroups`: Create, name, color, and inspect groups in the current window.
- `storage`: Store preferences and the compact latest-operation Undo snapshot locally in Chrome.

## Privacy policy

Use the public repository privacy policy at `docs/privacy.md` as the source for the final publicly hosted privacy-policy URL before submission.

## Store assets

- `docs/store-assets/tabflow-ready.png`
- `docs/store-assets/tabflow-organized.png`
- `src/assets/icon-128.png` as the store icon

## Submission checklist

- [x] Create or select the Chrome Web Store developer account.
- [x] Confirm the final public privacy-policy URL.
- [x] Upload initial package with `manifest.json` at its archive root.
- [x] Upload the 128px store icon and screenshots.
- [x] Complete the privacy practices disclosure.
- [x] Select category, language, regions, and visibility.
- [x] Submit for review (accepted as TabFlow).
- [ ] Upload renamed package `release/cleanmytabs-chrome.zip` (version ≥ previous).
- [ ] Update store listing name/description strings from TabFlow → CleanMyTabs.
- [ ] Submit update for review.
