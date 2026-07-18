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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-popup-notion-setup-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${projectRoot}`, `--load-extension=${projectRoot}`]
  });

  await context.route(`${apiBase}/api/membership`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, data: { isMember: true, planType: "YEARLY" }, message: "ok" })
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

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    const pageCountBefore = context.pages().length;
    await popup.locator("#notionButton").click();
    await popup.waitForTimeout(100);

    assert.strictEqual(context.pages().length, pageCountBefore, "Send to Notion must stay in the current ExportAI popup.");
    assert.ok(await popup.locator("#notionFlow").isVisible(), "Inline Notion setup must be visible.");
    assert.ok(await popup.locator("#notionLoginView").isVisible(), "Inline setup must show login choices first.");
    assert.ok(await popup.locator("#exportPanel").isHidden(), "Export controls are temporarily hidden during inline setup.");
    assert.match(await popup.locator("#notionGoogleLogin").textContent(), /使用 Google 登录/);
    assert.ok(await popup.locator("#notionEmailToggle").isVisible(), "Email login must remain available.");
    assert.ok(await popup.locator("#notionEmailForm").isHidden(), "Email login should stay collapsed until requested.");
    await popup.locator("#notionBackButton").click();
    assert.ok(await popup.locator("#exportPanel").isVisible(), "Back must restore the original export popup.");
    assert.strictEqual(await popup.locator(".format-option").count(), 8, "All eight export formats must remain available.");
    assert.ok(await popup.locator("#exportButton").isVisible(), "Local export must remain available.");
    assert.ok(await popup.locator("#notionButton").isVisible(), "Send to Notion must remain available.");
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("popup notion setup action passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
