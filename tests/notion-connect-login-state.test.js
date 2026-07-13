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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-notion-login-state-"));
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
    return route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ code: 401, data: null, message: "Expired token" })
    });
  });

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
    const extensionId = new URL(worker.url()).host;
    await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.set({
      exportai_access_token: "stale-access-token"
    }, resolve)));

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/notion-connect/notion-connect.html`);

    assert.strictEqual(await page.locator("#loginPanel").isVisible(), true, "Signed-out users must see the login form inside the connection window.");
    assert.strictEqual(await page.locator("#googleLoginButton").isVisible(), true, "The account step must offer Google login.");
    assert.match(String(await page.locator("#googleLoginButton").textContent()), /Google/i);
    assert.strictEqual(await page.locator("#loginEmail").getAttribute("type"), "email");
    assert.strictEqual(await page.locator("#loginPassword").getAttribute("type"), "password");
    assert.match(String(await page.locator("#statusText").textContent()), /login|登录/i);
    assert.strictEqual(oauthStartCount, 0, "A stored token must never start Notion authorization before the user chooses an account.");
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("notion connect login state passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
