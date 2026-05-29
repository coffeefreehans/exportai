const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("C:/Users/Administrator/node_modules/playwright");

const projectRoot = path.join(__dirname, "..");

async function launchExtension() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-auth-sync-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${projectRoot}`,
      `--load-extension=${projectRoot}`
    ]
  });
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker", { timeout: 10000 });
  }
  return { context, extensionId: serviceWorker.url().split("/")[2] };
}

async function getExtensionStorage(extensionPage, keys = null) {
  return extensionPage.evaluate((requestedKeys) => new Promise((resolve) => {
    chrome.storage.local.get(requestedKeys, resolve);
  }), keys);
}

(async () => {
  const { context, extensionId } = await launchExtension();
  try {
    await context.route("http://localhost:3002/**", (route) => route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body><h1>ExportAI Web</h1></body></html>"
    }));

    const extensionPage = await context.newPage();
    await extensionPage.goto(`chrome-extension://${extensionId}/src/options/options.html`);

    await extensionPage.evaluate(() => new Promise((resolve) => {
      chrome.storage.local.set({
        exportai_access_token: "plugin-token",
        exportai_refresh_token: "plugin-refresh",
        exportai_user_info: { email: "plugin@test.com" },
        exportai_membership: { isMember: true, planType: "LIFETIME" }
      }, resolve);
    }));

    const page = await context.newPage();
    await page.goto("http://localhost:3002/account");
    await page.waitForTimeout(800);
    let localState = await page.evaluate(() => ({
      token: localStorage.getItem("exportai_access_token"),
      user: JSON.parse(localStorage.getItem("exportai_user_info") || "null"),
      membership: JSON.parse(localStorage.getItem("exportai_membership") || "null")
    }));
    assert.strictEqual(localState.token, "plugin-token", "plugin login must sync to web localStorage.");
    assert.strictEqual(localState.user.email, "plugin@test.com");
    assert.strictEqual(localState.membership.isMember, true);

    await page.evaluate(() => {
      localStorage.setItem("exportai_access_token", "web-token");
      localStorage.setItem("exportai_refresh_token", "web-refresh");
      localStorage.setItem("exportai_user_info", JSON.stringify({ email: "web@test.com" }));
      localStorage.setItem("exportai_membership", JSON.stringify({ isMember: true, planType: "LIFETIME" }));
    });
    await page.waitForTimeout(1400);
    let stored = await getExtensionStorage(extensionPage, [
      "exportai_access_token",
      "exportai_refresh_token",
      "exportai_user_info",
      "exportai_membership"
    ]);
    assert.strictEqual(stored.exportai_access_token, "web-token", "web login must sync token to extension.");
    assert.strictEqual(stored.exportai_user_info.email, "web@test.com");
    assert.strictEqual(stored.exportai_membership.isMember, true, "web membership must sync to extension.");

    await extensionPage.evaluate(() => new Promise((resolve) => {
      chrome.storage.local.set({ exportai_auth_logout_at: new Date().toISOString() }, () => {
        chrome.storage.local.remove([
          "exportai_access_token",
          "exportai_refresh_token",
          "exportai_user_info",
          "exportai_membership"
        ], resolve);
      });
    }));
    await page.waitForTimeout(800);
    localState = await page.evaluate(() => ({
      token: localStorage.getItem("exportai_access_token"),
      membership: localStorage.getItem("exportai_membership")
    }));
    assert.strictEqual(localState.token, null, "extension logout must clear web token.");
    assert.strictEqual(localState.membership, null, "extension logout must clear web membership.");

    await page.evaluate(() => {
      localStorage.setItem("exportai_access_token", "web-token-2");
      localStorage.setItem("exportai_refresh_token", "web-refresh-2");
      localStorage.setItem("exportai_user_info", JSON.stringify({ email: "web2@test.com" }));
      localStorage.setItem("exportai_membership", JSON.stringify({ isMember: true, planType: "LIFETIME" }));
    });
    await page.waitForTimeout(1400);
    await page.evaluate(() => {
      localStorage.removeItem("exportai_access_token");
      localStorage.removeItem("exportai_refresh_token");
      localStorage.removeItem("exportai_user_info");
      localStorage.removeItem("exportai_membership");
    });
    await page.waitForTimeout(1400);
    stored = await getExtensionStorage(extensionPage, [
      "exportai_access_token",
      "exportai_membership",
      "exportai_auth_logout_at"
    ]);
    assert.strictEqual(stored.exportai_access_token, undefined, "web logout must clear extension token.");
    assert.strictEqual(stored.exportai_membership, undefined, "web logout must clear extension membership.");
    assert(stored.exportai_auth_logout_at, "web logout must set extension logout marker.");

    console.log("web auth bridge sync passed");
  } finally {
    await context.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
