import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

await build({
  entryPoints: {
    "background/service-worker": "src/background/service-worker.ts",
    "popup/popup": "src/popup/popup.ts",
    "settings/settings": "src/settings/settings.ts",
  },
  bundle: true,
  format: "iife",
  outdir: "dist",
  sourcemap: true,
  target: "es2022",
});

await cp("src/manifest.json", "dist/manifest.json");
await cp("src/popup/index.html", "dist/popup/index.html");
await cp("src/popup/styles.css", "dist/popup/styles.css");
await cp("src/settings/index.html", "dist/settings/index.html");
await cp("src/settings/styles.css", "dist/settings/styles.css");
await cp("src/assets", "dist/assets", { recursive: true });
