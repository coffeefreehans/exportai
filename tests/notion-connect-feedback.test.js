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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-notion-feedback-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${projectRoot}`,
      `--load-extension=${projectRoot}`
    ]
  });

  await context.route(`${apiBase}/**`, (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ code: 401, data: null, message: "Login expired. Please sign in again." })
  }));

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
    const extensionId = new URL(worker.url()).host;

    await worker.evaluate(() => new Promise((resolve) => {
      chrome.storage.local.set({
        exportai_access_token: "expired-access-token",
        exportai_refresh_token: "expired-refresh-token",
        exportai_user_info: { email: "1234@test.com" },
        exportai_membership: { isMember: true, planType: "YEARLY", checkedAt: new Date(0).toISOString() }
      }, resolve);
    }));

    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await page.locator("#tab-integration").click();
    const connectWindowPromise = context.waitForEvent("page", { timeout: 3000 });
    await page.locator("#notionConnect").click();
    const connectWindow = await connectWindowPromise;
    await connectWindow.locator("#loginPanel").waitFor({ state: "visible", timeout: 5000 });

    const localStatus = await connectWindow.locator("#statusText").textContent();
    assert.match(
      String(localStatus),
      /expired|sign in|log in|登录|登陆|过期/i,
      "A failed Notion connection must show an actionable message inside the dedicated connection window."
    );
    assert.deepStrictEqual(pageErrors, [], "The settings page must not throw while handling an expired login.");
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("notion connect feedback passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
