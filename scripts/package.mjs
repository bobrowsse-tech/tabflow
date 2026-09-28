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
const zipPath = "release/cleanmytabs-chrome.zip";
// zip (not ditto) so the same archive is produced on macOS and on GitHub's Linux runners.
await exec("zip", ["-r", "-X", "-q", `../${zipPath}`, ".", "-x", "*.DS_Store"], { cwd: "dist" });
const { stdout: listing } = await exec("unzip", ["-Z1", zipPath], { encoding: "utf8" });
if (!listing.split("\n").includes("manifest.json")) {
  throw new Error("manifest.json is not at the root of release/cleanmytabs-chrome.zip");
}
await chmod(zipPath, 0o644);
console.log("Created release/cleanmytabs-chrome.zip");
