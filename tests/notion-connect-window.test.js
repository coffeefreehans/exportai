const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("C:/Users/Administrator/node_modules/playwright");

const projectRoot = path.join(__dirname, "..");

async function run() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-notion-window-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${projectRoot}`,
      `--load-extension=${projectRoot}`
    ]
  });

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
    const extensionId = new URL(worker.url()).host;
    await worker.evaluate(() => new Promise((resolve) => chrome.storage.local.clear(resolve)));

    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await options.locator("#tab-integration").click();

    const connectWindowPromise = context.waitForEvent("page", { timeout: 3000 });
    await options.locator("#notionConnect").click();
    const connectWindow = await connectWindowPromise;
    await connectWindow.waitForLoadState("domcontentloaded");

    assert.strictEqual(
      connectWindow.url(),
      `chrome-extension://${extensionId}/src/notion-connect/notion-connect.html`,
      "Connect Notion must immediately open a dedicated, visible connection window."
    );
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run()
  .then(() => console.log("notion connect window passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
