const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("C:/Users/Administrator/node_modules/playwright");

const projectRoot = path.join(__dirname, "..");
const backgroundSource = fs.readFileSync(path.join(projectRoot, "src", "background", "background.js"), "utf8");
const apiBase = backgroundSource.match(/const API_BASE = "([^"]+)"/)?.[1];
const optionsSource = fs.readFileSync(path.join(projectRoot, "src", "options", "options.js"), "utf8");
const webUrl = optionsSource.match(/const WEB_URL = "([^"]+)"/)?.[1];
assert.ok(apiBase && webUrl);

async function run() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-options-membership-focus-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${projectRoot}`, `--load-extension=${projectRoot}`]
  });
  let membershipCount = 0;
  await context.route(`${apiBase}/api/membership`, (route) => {
    membershipCount += 1;
    const active = membershipCount >= 2;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 200, data: { isMember: active, planType: active ? "YEARLY" : null } })
    });
  });
  await context.route(`${apiBase}/api/settings`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, data: {}, message: "ok" })
  }));
  await context.route(`${webUrl}/?extension_callback=1`, (route) => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<!doctype html><title>ExportAI</title>"
  }));

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
    const extensionId = new URL(worker.url()).host;
    await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.set({
      exportai_access_token: "valid-access-token",
      exportai_user_info: { email: "member@test.com" },
      exportai_membership: { isMember: false, checkedAt: new Date().toISOString() }
    }, resolve)));
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await options.waitForFunction(() => document.querySelector("#accountPlan")?.textContent === "Free account");
    await options.waitForFunction(() => document.querySelector("#status")?.textContent === "Settings synced.");
    assert.strictEqual(membershipCount, 1);

    await options.evaluate(() => window.dispatchEvent(new Event("focus")));
    await options.waitForFunction(() => document.querySelector("#accountPlan")?.textContent === "Yearly member");
    assert.strictEqual(membershipCount, 2, "Focusing settings must force-refresh membership once.");

    const subscriptionPagePromise = context.waitForEvent("page");
    await options.locator("#loginButton").click();
    const subscriptionPage = await subscriptionPagePromise;
    assert.ok(subscriptionPage, "Subscription must open a new browser page.");
    assert.ok(
      optionsSource.includes('openUrl(`${WEB_URL}/?extension_callback=1#pricing`)'),
      "Subscription must target the configured ExportAI pricing URL."
    );
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("options membership focus passed"))
  .catch((error) => { console.error(error); process.exit(1); });
