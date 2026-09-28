# Changesets

User-facing changes get a changeset before they merge (`npx changeset`).

Pushing that to `main` opens a "chore: version packages" pull request. Merging it bumps `package.json` and `src/manifest.json` together, then the release workflow uploads that version to the Chrome Web Store.
