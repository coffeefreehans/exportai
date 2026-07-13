const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("C:/Users/Administrator/node_modules/playwright");

const projectRoot = path.join(__dirname, "..");
const constantsJs = fs.readFileSync(path.join(projectRoot, "src", "shared", "constants.js"), "utf8");
const contentJs = fs.readFileSync(path.join(projectRoot, "src", "content", "content.js"), "utf8");
const uiJs = fs.readFileSync(path.join(projectRoot, "src", "content", "ui-export-button.js"), "utf8");

assert(constantsJs.includes("MSG_GET_INTEGRATION_STATUS"), "constants must expose a content diagnostics message.");
assert(uiJs.includes("createFloatingExportUi"), "floating UI must use an explicit createFloatingExportUi contract.");
assert(!uiJs.includes("createHeaderExportUi"), "floating UI must not keep the old header UI contract.");
assert(!/[瀵閫涓]/.test(uiJs), "floating UI labels must not contain mojibake.");
assert(contentJs.includes("getIntegrationStatus"), "content script must report Integration diagnostics.");
assert(contentJs.includes("MSG_GET_INTEGRATION_STATUS"), "content script must handle Integration diagnostics.");

async function launchExtension() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "exportai-floating-ui-"));
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

  return {
    context,
    extensionId: serviceWorker.url().split("/")[2]
  };
}

async function writeExtensionState(extensionPage, {
  isMember = true,
  showButton = true,
  legacyClaudeButton = showButton
} = {}) {
  await extensionPage.evaluate(({ isMember, showButton, legacyClaudeButton }) => new Promise((resolve) => {
    const settings = {
      showHeaderExportButton: showButton,
      showHeaderExportButtonClaude: legacyClaudeButton,
      integrationSelectedFormats: ["html", "txt"],
      integrationPosition: null,
      autoExportEnabled: false,
      appTheme: "light",
      showExportMulti: true,
      showExportPdf: true,
      showExportMht: true,
      showExportHtml: true,
      showExportTxt: true,
      showExportMd: true,
      showExportDocx: true,
      showExportXlsx: true,
      showExportPng: true
    };
    chrome.storage.local.set({
      exportai_membership: {
        isMember,
        planType: isMember ? "LIFETIME" : null,
        checkedAt: new Date().toISOString()
      },
      "chatExportAi.settings.v1": settings,
      "chatExportAi.settings.manualKeys.v1": Object.keys(settings)
    }, resolve);
  }), { isMember, showButton, legacyClaudeButton });
}

async function getStorage(extensionPage) {
  return extensionPage.evaluate(() => new Promise((resolve) => {
    chrome.storage.local.get(null, resolve);
  }));
}

(async () => {
  const { context, extensionId } = await launchExtension();
  try {
    await context.route("https://claude.ai/**", (route) => route.fulfill({
      status: 200,
      contentType: "text/html",
      body: [
        "<!doctype html>",
        "<html><head><title>Mock Chat - Claude</title></head>",
        "<body><main style=\"min-height:1000px\">",
        "<button data-testid=\"chat-title-button\"><span class=\"truncate\">Mock Chat</span></button>",
        "<article>Hello from a Claude chat whose DOM no longer exposes old message test ids.</article>",
        "</main></body></html>"
      ].join("")
    }));

    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await writeExtensionState(optionsPage, { isMember: true, showButton: true, legacyClaudeButton: false });

    const chatPage = await context.newPage();
    await chatPage.goto("https://claude.ai/chat/test");
    const floatingRoot = chatPage.locator("#ceai-floating-export");
    await floatingRoot.waitFor({ state: "visible", timeout: 5000 });

    const fab = chatPage.locator("#ceai-floating-export .ceai-floating-fab");
    await fab.click();
    await chatPage.locator("#ceai-floating-export .ceai-floating-panel").waitFor({ state: "visible", timeout: 2000 });
    assert.deepStrictEqual(
      await chatPage.locator("#ceai-floating-export input:checked").evaluateAll((nodes) => nodes.map((node) => node.value)),
      ["txt", "html"]
    );

    await chatPage.locator('#ceai-floating-export input[value="txt"]').click({ force: true });
    await chatPage.waitForTimeout(250);
    let storage = await getStorage(optionsPage);
    assert.deepStrictEqual(storage["chatExportAi.settings.v1"].integrationSelectedFormats, ["html"]);

    const boxBefore = await fab.boundingBox();
    await chatPage.mouse.move(boxBefore.x + 10, boxBefore.y + 10);
    await chatPage.mouse.down();
    await chatPage.mouse.move(boxBefore.x + 90, boxBefore.y + 70);
    await chatPage.mouse.up();
    await chatPage.waitForTimeout(250);
    storage = await getStorage(optionsPage);
    assert(storage["chatExportAi.settings.v1"].integrationPosition, "dragging must persist integrationPosition.");

    const diagnostics = await optionsPage.evaluate(() => new Promise((resolve) => {
      chrome.tabs.query({ url: "https://claude.ai/*" }, ([tab]) => {
        chrome.tabs.sendMessage(tab.id, { type: "EXPORTAI_GET_INTEGRATION_STATUS" }, resolve);
      });
    }));
    assert.strictEqual(diagnostics.ok, true);
    assert.strictEqual(diagnostics.visible, true);
    assert.strictEqual(diagnostics.reason, "visible");
    assert.strictEqual(diagnostics.providerId, "claude");
    assert.strictEqual(diagnostics.isChatPage, true);
    assert.strictEqual(diagnostics.isMember, true);

    await writeExtensionState(optionsPage, { isMember: false, showButton: true });
    await chatPage.reload();
    await chatPage.waitForTimeout(1000);
    const freeDiagnostics = await optionsPage.evaluate(() => new Promise((resolve) => {
      chrome.tabs.query({ url: "https://claude.ai/*" }, ([tab]) => {
        chrome.tabs.sendMessage(tab.id, { type: "EXPORTAI_GET_INTEGRATION_STATUS" }, resolve);
      });
    }));
    assert.strictEqual(freeDiagnostics.visible, false);
    assert.strictEqual(freeDiagnostics.reason, "not_member");

    await writeExtensionState(optionsPage, { isMember: true, showButton: false });
    await chatPage.reload();
    await chatPage.waitForTimeout(1000);
    const disabledDiagnostics = await optionsPage.evaluate(() => new Promise((resolve) => {
      chrome.tabs.query({ url: "https://claude.ai/*" }, ([tab]) => {
        chrome.tabs.sendMessage(tab.id, { type: "EXPORTAI_GET_INTEGRATION_STATUS" }, resolve);
      });
    }));
    assert.strictEqual(disabledDiagnostics.visible, false);
    assert.strictEqual(disabledDiagnostics.reason, "disabled_by_settings");

    console.log("integration floating ui passed");
  } finally {
    await context.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
