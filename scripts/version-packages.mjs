import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

execFileSync("npx", ["changeset", "version"], { stdio: "inherit" });

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
if (!/^\d+\.\d+\.\d+(\.\d+)?$/.test(pkg.version)) {
  console.error(
    `Chrome Web Store versions are 1 to 4 numbers separated by dots. Got ${pkg.version}.`,
  );
  process.exit(1);
}

const manifestPath = "src/manifest.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.version = pkg.version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Set src/manifest.json version to ${pkg.version}`);
