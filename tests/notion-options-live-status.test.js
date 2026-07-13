const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("C:/Users/Administrator/node_modules/playwright");

const projectRoot = path.join(__dirname, "..");
const backgroundSource = fs.readFileSync(path.join(projectRoot, "src", "background", "background.js"), "utf8");
const apiBase = backgroundSource.match(/const API_BASE = "([^"]+)"/)?.[1];
assert.ok(apiBase, "The extension API base must be discoverable for the browser test.");

async function run() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-notion-live-status-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${projectRoot}`,
      `--load-extension=${projectRoot}`
    ]
  });

  await context.route(`${apiBase}/api/membership`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, data: { isMember: true, planType: "YEARLY" }, message: "ok" })
  }));
  await context.route("https://api.notion.com/v1/search", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ results: [] })
  }));

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
    const extensionId = new URL(worker.url()).host;
    await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.set({
      exportai_access_token: "valid-access-token",
      exportai_user_info: { email: "1234@test.com" },
      exportai_membership: { isMember: true, planType: "YEARLY", checkedAt: new Date().toISOString() }
    }, resolve)));

    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await options.locator("#tab-integration").click();
    await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.set({
      exportai_notion_connection: { accessToken: "notion-token", workspaceName: "Jacky workspace" }
    }, resolve)));

    await options.waitForFunction(() => document.querySelector("#notionStatusText")?.textContent?.includes("Jacky workspace"));
    assert.strictEqual(await options.locator("#notionConnect").isHidden(), true);
    assert.strictEqual(await options.locator("#notionDisconnect").isVisible(), true);
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("notion options live status passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
