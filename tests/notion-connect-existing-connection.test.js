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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-notion-existing-"));
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
    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ code: 500, data: null, message: "OAuth should not restart." }) });
  });
  await context.route("https://api.notion.com/v1/search", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ results: [
      { object: "page", id: "life-page", url: "https://notion.so/life", properties: { title: { title: [{ plain_text: "生活" }] } } },
      { object: "page", id: "work-page", url: "https://notion.so/work", properties: { title: { title: [{ plain_text: "工作" }] } } }
    ] })
  }));

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
    const extensionId = new URL(worker.url()).host;
    await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.set({
      exportai_access_token: "valid-access-token",
      exportai_notion_connection: { accessToken: "notion-token", workspaceName: "Jacky workspace" }
    }, resolve)));

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/notion-connect/notion-connect.html`);
    await page.locator("#targetsPanel").waitFor({ state: "visible", timeout: 3000 });
    await page.waitForFunction(() => document.querySelector("#workspaceText")?.textContent?.includes("Jacky workspace"));

    assert.strictEqual(oauthStartCount, 0, "An existing Notion connection must not restart OAuth.");
    assert.match(String(await page.locator("#workspaceText").textContent()), /Jacky workspace/);
    assert.deepStrictEqual(await page.locator(".target-title").allTextContents(), ["生活", "工作"]);
    await page.locator('.target-button[data-target-id="work-page"]').click();
    const stored = await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.get(["chatExportAi.settings.v1"], resolve)));
    assert.strictEqual(stored["chatExportAi.settings.v1"].notionTarget.id, "work-page");
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("notion connect existing connection passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
