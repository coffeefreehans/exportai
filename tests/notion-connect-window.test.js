const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("C:/Users/Administrator/node_modules/playwright");

const projectRoot = path.join(__dirname, "..");

async function run() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-notion-window-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${projectRoot}`,
      `--load-extension=${projectRoot}`
    ]
  });
  await context.route("http://localhost:4000/api/membership", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, data: { isMember: true, planType: "YEARLY" } })
  }));

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
    const extensionId = new URL(worker.url()).host;
    await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.set({
      exportai_access_token: "valid-test-token",
      exportai_user_info: { email: "1234@test.com" },
      exportai_membership: { isMember: true, planType: "YEARLY", checkedAt: new Date().toISOString() }
    }, resolve)));

    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await options.locator("#tab-integration").click();

    await options.locator("#notionConnect").click();
    const flowState = await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.get("exportai_notion_inline_flow", resolve)));
    assert.strictEqual(flowState.exportai_notion_inline_flow, true, "Settings must hand off to the original popup flow.");
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await popup.locator("#notionFlow").waitFor({ state: "visible", timeout: 5000 });
    assert.strictEqual(await popup.locator("#notionFlow").isVisible(), true);
    assert.strictEqual(await popup.locator("#notionLoginView").isVisible(), true);
    assert.strictEqual(await popup.locator("#notionEmailForm").isHidden(), true, "The full email form must stay collapsed until the user asks for it.");
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("notion connect window passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
