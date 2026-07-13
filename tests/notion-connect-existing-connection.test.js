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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-notion-existing-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${projectRoot}`,
      `--load-extension=${projectRoot}`
    ]
  });
  let oauthStartCount = 0;
  await context.route(`${apiBase}/api/notion/oauth/start**`, (route) => {
    oauthStartCount += 1;
    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ code: 500, data: null, message: "OAuth should not restart." }) });
  });

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
    const extensionId = new URL(worker.url()).host;
    await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.set({
      exportai_access_token: "valid-access-token",
      exportai_notion_connection: { accessToken: "notion-token", workspaceName: "Jacky workspace" }
    }, resolve)));

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/notion-connect/notion-connect.html`);
    await page.locator("#successPanel").waitFor({ state: "visible", timeout: 3000 });

    assert.strictEqual(oauthStartCount, 0, "An existing Notion connection must not restart OAuth.");
    assert.match(String(await page.locator("#workspaceText").textContent()), /Jacky workspace/);
    assert.strictEqual(await page.locator("#chooseTargetButton").isVisible(), true, "Connected users must be able to continue to destination selection.");
    const optionsPagePromise = context.waitForEvent("page", { timeout: 3000 });
    await page.locator("#chooseTargetButton").click();
    const optionsPage = await optionsPagePromise;
    await optionsPage.waitForLoadState("domcontentloaded");
    assert.strictEqual(optionsPage.url(), `chrome-extension://${extensionId}/src/options/options.html?tab=integration`);
    assert.strictEqual(await optionsPage.locator("#panel-integration").isVisible(), true);
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("notion connect existing connection passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
