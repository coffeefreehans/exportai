const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("C:/Users/Administrator/node_modules/playwright");

const projectRoot = path.join(__dirname, "..");
const backgroundSource = fs.readFileSync(path.join(projectRoot, "src", "background", "background.js"), "utf8");
const apiBase = backgroundSource.match(/const API_BASE = "([^"]+)"/)?.[1];
assert.ok(apiBase);

const notionResults = [
  { object: "page", id: "work", parent: { type: "workspace", workspace: true }, properties: { title: { title: [{ plain_text: "Work" }] } } },
  { object: "page", id: "life", parent: { type: "workspace", workspace: true }, properties: { title: { title: [{ plain_text: "Life" }] } } },
  { object: "page", id: "project", parent: { type: "page_id", page_id: "work" }, properties: { title: { title: [{ plain_text: "Project" }] } } },
  { object: "page", id: "task", parent: { type: "page_id", page_id: "project" }, properties: { title: { title: [{ plain_text: "Task" }] } } }
];

async function run() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-notion-hierarchy-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${projectRoot}`, `--load-extension=${projectRoot}`]
  });

  await context.route(`${apiBase}/api/membership`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, data: { isMember: false, planType: null }, message: "ok" })
  }));
  await context.route(`${apiBase}/api/settings`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, data: {}, message: "ok" })
  }));
  await context.route(`${apiBase}/api/notion/quota`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, data: { unlimited: false, isMember: false, limit: 3, used: 0, remaining: 3 }, message: "ok" })
  }));
  await context.route("https://api.notion.com/v1/search", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ results: notionResults, has_more: false, next_cursor: null })
  }));

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
    const extensionId = new URL(worker.url()).host;
    await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.clear(() => chrome.storage.local.set({
      exportai_access_token: "valid-token",
      exportai_user_info: { email: "free@example.com" },
      exportai_notion_connection: { accessToken: "notion-token", workspaceName: "Workspace" },
      exportai_notion_inline_flow: true,
      "chatExportAi.settings.v1": { appLanguage: "en" }
    }, resolve))));

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await popup.locator("#notionTargetsView").waitFor({ state: "visible" });
    assert.deepStrictEqual(await popup.locator("#notionTargetList .notion-target-title").allTextContents(), ["Work", "Life"]);
    assert.strictEqual(await popup.locator('#notionTargetList [data-target-id="life"] + .notion-target-drill').count(), 0);
    await popup.locator('.notion-target-row:has([data-target-id="work"]) .notion-target-drill').click();
    assert.deepStrictEqual(await popup.locator("#notionTargetList .notion-target-title").allTextContents(), ["Project"]);
    await popup.locator('.notion-target-row:has([data-target-id="project"]) .notion-target-drill').click();
    assert.deepStrictEqual(await popup.locator("#notionTargetList .notion-target-title").allTextContents(), ["Task"]);
    await popup.locator("#notionLevelBack").click();
    assert.deepStrictEqual(await popup.locator("#notionTargetList .notion-target-title").allTextContents(), ["Project"]);

    await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.set({ exportai_notion_inline_flow: false }, resolve)));
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await options.locator("#tab-integration").click();
    await options.locator('#notionTargetList [data-target-id="work"]').waitFor({ state: "visible" });
    assert.deepStrictEqual(await options.locator("#notionTargetList .notion-settings-title").allTextContents(), ["Work", "Life"]);
    await options.locator('.notion-settings-row:has([data-target-id="work"]) .notion-settings-drill').click();
    assert.deepStrictEqual(await options.locator("#notionTargetList .notion-settings-title").allTextContents(), ["Project"]);
    await options.locator('.notion-settings-row:has([data-target-id="project"]) .notion-settings-drill').click();
    assert.deepStrictEqual(await options.locator("#notionTargetList .notion-settings-title").allTextContents(), ["Task"]);
    await options.locator('#notionTargetList [data-target-id="task"]').click();
    const stored = await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.get(["chatExportAi.settings.v1"], resolve)));
    assert.strictEqual(stored["chatExportAi.settings.v1"].notionTarget.id, "task");
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("notion hierarchy navigation passed"))
  .catch((error) => { console.error(error); process.exit(1); });
