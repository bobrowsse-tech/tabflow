import { execFile } from "node:child_process";
import { chmod, cp, mkdir, rm } from "node:fs/promises";
import { promisify } from "node:util";

const exec = promisify(execFile);
const iconSizes = [16, 32, 48, 128];

await exec("npm", ["run", "build"]);
await mkdir("dist/assets", { recursive: true });
for (const size of iconSizes) {
  await cp(`src/assets/icon-${size}.png`, `dist/assets/icon-${size}.png`);
}

await rm("release", { recursive: true, force: true });
await mkdir("release", { recursive: true });
await exec(
  "ditto",
  [
    "-c",
    "-k",
    "--sequesterRsrc",
    "--norsrc",
    ".",
    "../release/tabflow-chrome.zip",
  ],
  { cwd: "dist" },
);
await chmod("release/tabflow-chrome.zip", 0o644);
console.log("Created release/tabflow-chrome.zip");
