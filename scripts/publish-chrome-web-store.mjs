import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import chromeWebstoreUpload from "chrome-webstore-upload";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = JSON.parse(readFileSync("src/manifest.json", "utf8"));
const tag = `v${pkg.version}`;

if (manifest.version !== pkg.version) {
  console.error(
    `src/manifest.json is ${manifest.version} and package.json is ${pkg.version}. Run npm run version-packages so they match.`,
  );
  process.exit(1);
}

function noteChangesetsOutput(event) {
  const outputPath = process.env.CHANGESETS_OUTPUT;
  if (!outputPath) return;
  appendFileSync(outputPath, event ? `${JSON.stringify(event)}\n` : "");
}

function tagExists() {
  try {
    execFileSync("git", ["rev-parse", "--verify", `refs/tags/${tag}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (tagExists()) {
  console.log(`${tag} already exists. Skipping the Chrome Web Store upload.`);
  noteChangesetsOutput();
  process.exit(0);
}

const extensionId = process.env.CHROME_EXTENSION_ID;
const publisherId = process.env.CHROME_PUBLISHER_ID;
const clientId = process.env.CHROME_CLIENT_ID;
const clientSecret = process.env.CHROME_CLIENT_SECRET;
const refreshToken = process.env.CHROME_REFRESH_TOKEN;

if (!extensionId || !publisherId || !clientId || !clientSecret || !refreshToken) {
  console.log(
    "Chrome Web Store credentials are not set in this environment. Skipping upload.",
  );
  noteChangesetsOutput();
  process.exit(0);
}

execFileSync("npm", ["run", "package"], { stdio: "inherit" });

const store = chromeWebstoreUpload({
  extensionId,
  publisherId,
  clientId,
  clientSecret,
  refreshToken,
});
const token = await store.fetchToken();
const uploaded = await store.uploadExisting("release/cleanmytabs-chrome.zip", token);
if (uploaded.uploadState !== "SUCCEEDED") {
  console.error(`Chrome Web Store upload did not succeed: ${uploaded.uploadState}`);
  process.exit(1);
}

const published = await store.publish("DEFAULT_PUBLISH", token);
console.log(`Submitted ${published.name} (${published.itemId}) for review. State: ${published.state}`);
noteChangesetsOutput({ type: "git-tag", tag, packageName: pkg.name });
