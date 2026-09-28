# CleanMyTabs

CleanMyTabs is a privacy-first Chrome extension that turns the current window into a clean, understandable set of tab groups in one deliberate action.

## Principles

- Organisation happens locally in Chrome. There is no backend, account, analytics, telemetry, or external AI service.
- Existing groups and pinned tabs are preserved by default.
- Duplicate survivors are deterministic: the earliest open tab stays, later duplicates are closed only after the user starts organisation.
- Groups are discovered locally from same-site tabs, shared title/URL tokens, and soft domain hints; singletons stay ungrouped.

## Development

```sh
npm install
npm run check
npm run package
```

Load `dist/` through `chrome://extensions` with Developer mode enabled. Re-run `npm run build` after source changes.
`npm run package` creates `release/cleanmytabs-chrome.zip` with `manifest.json` at the archive root.

## Release

Pushes to `main` run [`.github/workflows/release.yml`](.github/workflows/release.yml), the same version-then-publish flow used for DryGuard.

1. Add a changeset for a user-facing change: `npx changeset`.
2. Merging that to `main` opens a pull request titled `chore: version packages`.
3. Merging the version pull request bumps `package.json` and `src/manifest.json` together, builds `release/cleanmytabs-chrome.zip`, uploads it to the Chrome Web Store, and tags `vX.Y.Z`.

The upload is skipped when that version tag already exists, and when the private GitHub Actions store credentials are missing. Those credentials are maintainer-only and are not documented in this public repository.

A push to `main` with no pending changeset publishes the current version. If that version is already on the store, add a changeset and merge the version pull request first so the manifest version increases.

For a visual browser-only walkthrough without Chrome permissions, open `dist/popup/index.html?demo=1` after building. The demo simulates the ready, organised, and Undo states without changing real tabs.

## Documentation

Public product and engineering documentation is in [`docs/`](docs/). Maintainer notes that must remain local to the checkout are in [`docs/local-only/`](docs/local-only/) and are excluded from Git.

## Privacy

CleanMyTabs does not transmit URLs, domains, titles, tab IDs, page contents, cookies, browsing history, or usage events. See [`docs/privacy.md`](docs/privacy.md).
