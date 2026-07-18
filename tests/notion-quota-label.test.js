const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("C:/Users/Administrator/node_modules/playwright");

const projectRoot = path.join(__dirname, "..");
const backgroundSource = fs.readFileSync(path.join(projectRoot, "src", "background", "background.js"), "utf8");
const apiBase = backgroundSource.match(/const API_BASE = "([^"]+)"/)?.[1];
assert.ok(apiBase);

async function run() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-notion-quota-label-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${projectRoot}`, `--load-extension=${projectRoot}`]
  });
  let paid = false;

  await context.route(`${apiBase}/api/membership`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, data: { isMember: paid, planType: paid ? "YEARLY" : null }, message: "ok" })
  }));
  await context.route(`${apiBase}/api/notion/quota`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      code: 200,
      data: paid
        ? { unlimited: true, isMember: true, limit: null, used: null, remaining: null }
        : { unlimited: false, isMember: false, limit: 3, used: 1, remaining: 2 },
      message: "ok"
    })
  }));
  await context.route(`${apiBase}/api/settings`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, data: {}, message: "ok" })
  }));

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
    const extensionId = new URL(worker.url()).host;
    await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.clear(() => chrome.storage.local.set({
      exportai_access_token: "valid-token",
      exportai_user_info: { email: "free@example.com" },
      "chatExportAi.settings.v1": {
        appLanguage: "zh-CN",
        notionTarget: { id: "target", type: "page", titleProperty: "title", title: "Target" }
      }
    }, resolve))));

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await popup.locator("#exportPanel").waitFor({ state: "visible" });
    assert.match(String(await popup.locator("#notionButtonLabel").textContent()), /\u4eca\u65e5\u514d\u8d39\u5269\u4f59\s*2\s*\u6b21/);

    paid = true;
    await popup.reload();
    await popup.locator("#exportPanel").waitFor({ state: "visible" });
    assert.strictEqual(await popup.locator("#notionButtonLabel").textContent(), "\u53d1\u9001\u5230 Notion");

    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await options.locator("#tab-integration").click();
    assert.strictEqual(await options.locator("#panel-integration h2").textContent(), "\u96c6\u6210");
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("notion quota label passed"))
  .catch((error) => { console.error(error); process.exit(1); });
