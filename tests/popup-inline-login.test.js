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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-popup-inline-login-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${projectRoot}`, `--load-extension=${projectRoot}`]
  });
  let loginCount = 0;
  await context.route(`${apiBase}/api/auth/login`, async (route) => {
    loginCount += 1;
    const payload = route.request().postDataJSON();
    assert.deepStrictEqual(payload, { email: "1234@test.com", password: "test-password" });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 200,
        data: {
          accessToken: "inline-access-token",
          refreshToken: "inline-refresh-token",
          user: { email: "1234@test.com" }
        },
        message: "ok"
      })
    });
  });
  await context.route(`${apiBase}/api/membership`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, data: { isMember: true, planType: "YEARLY" } })
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
      "chatExportAi.settings.v1": { appLanguage: "zh-CN" }
    }, resolve))));
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await popup.locator("#exportPanel").waitFor({ state: "visible" });

    assert.strictEqual(await popup.locator("#loginPanel").isHidden(), true, "Signed-out popup must keep the export home as the default view.");
    assert.strictEqual(await popup.locator("#formatOptions .format-option").count(), 8, "The export home must keep all eight formats visible.");
    assert.strictEqual(await popup.locator('#formatOptions [data-paid-only="true"]').count(), 0, "Temporary unlock must make all eight formats selectable.");
    assert.strictEqual(await popup.locator("#notionButton").isEnabled(), true, "Temporary unlock must enable Notion for free accounts.");
    const pageCountBeforeLogin = context.pages().length;
    await popup.locator("#loginButton").click();
    await popup.locator("#popupLoginForm").waitFor({ state: "visible" });
    assert.strictEqual(context.pages().length, pageCountBeforeLogin, "Account login must open inside the current popup.");

    assert.strictEqual(await popup.locator(".popup-login-heading h2").textContent(), "登录 ExportAI");
    assert.ok(await popup.locator("#popupGoogleLogin").isVisible(), "Google login must stay inside the popup.");
    const registerPagePromise = context.waitForEvent("page");
    await popup.locator("#popupRegisterLink").click();
    const registerPage = await registerPagePromise;
    assert.match(registerPage.url(), /\/register\?return=\/account&extension_callback=1$/);
    await registerPage.close();

    const forgotPagePromise = context.waitForEvent("page");
    await popup.locator("#popupForgotPassword").click();
    const forgotPage = await forgotPagePromise;
    assert.match(forgotPage.url(), /\/forgot-password$/);
    await forgotPage.close();

    await popup.locator("#popupLoginEmail").fill("1234@test.com");
    await popup.locator("#popupLoginPassword").fill("test-password");
    await popup.locator("#popupLoginSubmit").click();
    await popup.locator("#loginPanel").waitFor({ state: "hidden", timeout: 5000 });
    assert.strictEqual(loginCount, 1);
    assert.strictEqual(await popup.locator("#accountText").textContent(), "1234@test.com");
    const stored = await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.get([
      "exportai_access_token",
      "exportai_refresh_token",
      "exportai_user_info"
    ], resolve)));
    assert.strictEqual(stored.exportai_access_token, "inline-access-token");
    assert.strictEqual(stored.exportai_refresh_token, "inline-refresh-token");
    assert.strictEqual(stored.exportai_user_info.email, "1234@test.com");

    const pageCountBeforeAccount = context.pages().length;
    await popup.locator("#loginButton").click();
    await popup.locator("#accountPanel").waitFor({ state: "visible" });
    assert.strictEqual(context.pages().length, pageCountBeforeAccount, "Signed-in account icon must not open another page.");
    assert.strictEqual(await popup.locator("#popupAccountEmail").textContent(), "1234@test.com");
    assert.strictEqual(await popup.locator("#popupAccountPlan").textContent(), "\u5e74\u5ea6\u4f1a\u5458");
    assert.ok(await popup.locator("#popupSubscriptionButton").isVisible(), "Inline account panel must keep the subscription action.");
    assert.ok(await popup.locator("#popupLogoutButton").isVisible(), "Inline account panel must keep logout.");
    await popup.locator("#accountBackButton").click();
    await popup.locator("#accountPanel").waitFor({ state: "hidden" });
    await popup.locator("#exportPanel").waitFor({ state: "visible" });
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("popup inline login passed"))
  .catch((error) => { console.error(error); process.exit(1); });
