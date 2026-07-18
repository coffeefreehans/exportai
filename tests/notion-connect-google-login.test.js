const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("C:/Users/Administrator/node_modules/playwright");

const projectRoot = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "manifest.json"), "utf8"));
assert.match(manifest.oauth2?.client_id || "", /\.apps\.googleusercontent\.com$/);
assert.deepStrictEqual(manifest.oauth2?.scopes, ["openid", "email", "profile"]);
const backgroundSource = fs.readFileSync(path.join(projectRoot, "src", "background", "background.js"), "utf8");
const apiBase = backgroundSource.match(/const API_BASE = "([^"]+)"/)?.[1];
assert.ok(apiBase, "The extension API base must be discoverable for the browser test.");

async function run() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-notion-google-login-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${projectRoot}`,
      `--load-extension=${projectRoot}`
    ]
  });

  let googleLoginCount = 0;
  let notionStartCount = 0;
  await context.route(`${apiBase}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const reply = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/auth/google") {
      googleLoginCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 250));
      assert.deepStrictEqual(request.postDataJSON(), { accessToken: "google-access-token" });
      return reply(200, {
        code: 200,
        data: {
          accessToken: "exportai-access-token",
          refreshToken: "exportai-refresh-token",
          user: { id: "google-user", email: "google-user@example.com", createdAt: new Date(0).toISOString() }
        },
        message: "ok"
      });
    }
    if (url.pathname === "/api/notion/oauth/start") {
      notionStartCount += 1;
      assert.strictEqual(request.headers().authorization, "Bearer exportai-access-token");
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
    const identityOverridden = await worker.evaluate(() => {
      chrome.identity.getAuthToken = (_details, callback) => callback({ token: "google-access-token" });
      return new Promise((resolve) => chrome.identity.getAuthToken({ interactive: false }, (result) => resolve(result?.token === "google-access-token")));
    });
    assert.strictEqual(identityOverridden, true, "The test must control the Google identity response.");

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/notion-connect/notion-connect.html`);
    await page.locator("#googleLoginButton").click();
    await page.locator("#waitingPanel").waitFor({ state: "visible", timeout: 3000 });
    assert.match(String(await page.locator("#waitingPanel h1").textContent()), /Google/i);

    const deadline = Date.now() + 5000;
    while ((googleLoginCount < 1 || notionStartCount < 1) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const stored = await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.get([
      "exportai_access_token",
      "exportai_refresh_token",
      "exportai_user_info"
    ], resolve)));

    assert.strictEqual(googleLoginCount, 1, "Google login must exchange the Google token with ExportAI once.");
    assert.strictEqual(stored.exportai_access_token, "exportai-access-token");
    assert.strictEqual(stored.exportai_refresh_token, "exportai-refresh-token");
    assert.strictEqual(stored.exportai_user_info.email, "google-user@example.com");
    assert.strictEqual(notionStartCount, 1, "Successful Google login must continue to Notion authorization.");
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("notion connect Google login passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
