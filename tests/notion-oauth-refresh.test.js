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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-notion-oauth-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${projectRoot}`,
      `--load-extension=${projectRoot}`
    ]
  });

  let refreshCount = 0;
  let startCount = 0;
  let redirectUri = "";
  let oauthState = "";

  await context.route(`${apiBase}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (url.pathname === "/api/membership") {
      return json(200, { code: 200, data: { isMember: true, planType: "YEARLY" }, message: "ok" });
    }
    if (url.pathname === "/api/auth/refresh") {
      refreshCount += 1;
      return json(200, { code: 200, data: { accessToken: "fresh-access-token", refreshToken: "fresh-refresh-token" }, message: "ok" });
    }
    if (url.pathname === "/api/notion/oauth/start") {
      startCount += 1;
      if (request.headers().authorization !== "Bearer fresh-access-token") {
        return json(401, { code: 401, data: null, message: "Login expired." });
      }
      redirectUri = url.searchParams.get("redirect_uri") || "";
      oauthState = url.searchParams.get("state") || "";
      return json(200, {
        code: 200,
        data: { authorizationUrl: `https://api.notion.com/v1/oauth/authorize?state=${encodeURIComponent(oauthState)}` },
        message: "ok"
      });
    }
    if (url.pathname === "/api/notion/oauth/exchange") {
      assert.strictEqual(request.headers().authorization, "Bearer fresh-access-token");
      return json(200, {
        code: 200,
        data: { accessToken: "notion-access-token", workspaceName: "Test workspace" },
        message: "ok"
      });
    }
    return json(404, { code: 404, data: null, message: "Unexpected test request." });
  });

  await context.route("https://api.notion.com/v1/oauth/authorize**", async (route) => {
    assert.ok(redirectUri, "OAuth start must provide a redirect URI before opening Notion.");
    await route.fulfill({
      status: 302,
      headers: { location: `${redirectUri}?code=test-code&state=${encodeURIComponent(oauthState)}` },
      body: ""
    });
  });

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
      exportai_access_token: "expired-access-token",
      exportai_refresh_token: "valid-refresh-token",
      exportai_user_info: { email: "1234@test.com" },
      exportai_membership: { isMember: true, planType: "YEARLY", checkedAt: new Date().toISOString() }
    }, resolve)));

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await page.locator("#tab-integration").click();
    const connectWindowPromise = context.waitForEvent("page", { timeout: 3000 });
    await page.locator("#notionConnect").click();
    const connectWindow = await connectWindowPromise;
    await connectWindow.locator("#loginPanel").waitFor({ state: "visible", timeout: 3000 });

    assert.strictEqual(refreshCount, 0, "Stored account data must not refresh until the user chooses that account.");
    assert.strictEqual(startCount, 0, "Stored account data must not start Notion authorization automatically.");
    assert.match(String(await connectWindow.locator("#continueAccountButton").textContent()), /1234@test\.com/);
    await connectWindow.locator("#continueAccountButton").click();
    const deadline = Date.now() + 10000;
    while (startCount < 2 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));

    assert.strictEqual(refreshCount, 1, "Expired ExportAI access must be refreshed exactly once.");
    assert.strictEqual(startCount, 2, "Notion OAuth start must retry after refreshing the account token.");
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("notion oauth refresh passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
