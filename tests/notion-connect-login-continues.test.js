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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-notion-login-continues-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${projectRoot}`,
      `--load-extension=${projectRoot}`
    ]
  });

  let loginCount = 0;
  let startCount = 0;

  await context.route(`${apiBase}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const reply = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/auth/login") {
      loginCount += 1;
      assert.deepStrictEqual(request.postDataJSON(), { email: "1234@test.com", password: "test-password" });
      return reply(200, {
        code: 200,
        data: {
          accessToken: "fresh-access-token",
          refreshToken: "fresh-refresh-token",
          user: { id: "test-user", email: "1234@test.com", createdAt: new Date(0).toISOString() }
        },
        message: "ok"
      });
    }
    if (url.pathname === "/api/notion/oauth/start") {
      startCount += 1;
      assert.strictEqual(request.headers().authorization, "Bearer fresh-access-token");
      const redirectUri = url.searchParams.get("redirect_uri");
      const state = url.searchParams.get("state");
      return reply(200, {
        code: 200,
        data: {
          authorizationUrl: `https://api.notion.com/v1/oauth/authorize?owner=user&client_id=test-client&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${encodeURIComponent(state)}`
        },
        message: "ok"
      });
    }
    return reply(404, { code: 404, data: null, message: "Unexpected test request." });
  });

  await context.route("https://api.notion.com/v1/oauth/authorize**", (route) => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<!doctype html><title>Notion authorization</title><h1>Authorize ExportAI</h1>"
  }));

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
    const extensionId = new URL(worker.url()).host;
    await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.clear(resolve)));

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/notion-connect/notion-connect.html`);
    await page.locator("#loginEmail").fill("1234@test.com");
    await page.locator("#loginPassword").fill("test-password");
    await page.locator("#loginSubmit").click();

    const deadline = Date.now() + 5000;
    while (startCount < 1 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
    const stored = await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.get([
      "exportai_access_token",
      "exportai_refresh_token",
      "exportai_user_info"
    ], resolve)));

    assert.strictEqual(loginCount, 1, "The connection window must submit ExportAI credentials once.");
    assert.strictEqual(stored.exportai_access_token, "fresh-access-token");
    assert.strictEqual(stored.exportai_refresh_token, "fresh-refresh-token");
    assert.strictEqual(startCount, 1, "Successful ExportAI login must automatically continue to Notion OAuth.");
    assert.match(String(await page.locator("#statusText").textContent()), /Notion/i);
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("notion connect login continues passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
