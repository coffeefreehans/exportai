const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const localStore = {};
const remoteMessages = [];
let failNextSave = false;
let remoteSettingsResponse = null;

globalThis.ChatExportAi = {
  constants: {
    SETTINGS_STORAGE_KEY: "settings",
    SETTINGS_MANUAL_KEYS_STORAGE_KEY: "manualKeys",
    COUNTERS_STORAGE_KEY: "counters",
    MSG_GET_ACCOUNT_SETTINGS: "GET_ACCOUNT_SETTINGS",
    MSG_SAVE_ACCOUNT_SETTINGS: "SAVE_ACCOUNT_SETTINGS"
  },
  defaults: {
    settings: {
      metadataEnabled: true,
      metadataExportedAt: true,
      metadataModel: true,
      metadataUrl: false,
      metadataSummaryChatName: true,
      metadataSummaryMessages: true,
      includeThinking: true,
      showHeaderExportButton: true,
      popupSelectedFormats: ["html", "txt"],
      integrationSelectedFormats: ["html", "txt"],
      autoExportSelectedFormats: ["html"],
      autoExportMode: "change",
      autoExportIntervalSeconds: 10,
      saveMode: "autosave",
      autosaveConflictAction: "overwrite",
      customDownloadFolder: "Chat Export AI",
      exportTimeoutSeconds: 20,
      lastDownloadFilenameByConversation: {},
      htmlPdfAiBorderColor: "#2563eb",
      htmlPdfHumanBorderColor: "#f59e0b",
      exportButtonOrder: ["html", "txt"],
      multiExportPdf: false,
      multiExportMht: false,
      multiExportHtml: true,
      multiExportTxt: true,
      multiExportMd: false,
      multiExportDocx: false,
      multiExportXlsx: false,
      multiExportPng: false
    },
    mergeSettings(incoming) {
      return { ...this.settings, ...(incoming || {}) };
    }
  },
  chromeHelpers: {
    storageGet(keys) {
      const result = {};
      keys.forEach((key) => {
        result[key] = localStore[key];
      });
      return Promise.resolve(result);
    },
    storageSet(value) {
      Object.assign(localStore, value);
      return Promise.resolve(true);
    },
    runtimeSendMessage(message) {
      remoteMessages.push(message);
      if (message.type === "GET_ACCOUNT_SETTINGS") {
        if (remoteSettingsResponse) {
          return Promise.resolve(remoteSettingsResponse);
        }
        return Promise.resolve({ ok: false });
      }
      if (message.type === "SAVE_ACCOUNT_SETTINGS") {
        if (failNextSave) {
          return Promise.resolve({ ok: false, error: "remote save failed" });
        }
        return Promise.resolve({ ok: true, settings: message.payload.settings });
      }
      return Promise.resolve({ ok: true });
    }
  }
};

const storagePath = path.join(__dirname, "..", "src", "shared", "storage.js");
vm.runInThisContext(fs.readFileSync(storagePath, "utf8"), { filename: storagePath });

(async () => {
  const saved = await globalThis.ChatExportAi.storage.saveSettings({
    metadataExportedAt: false,
    metadataModel: false
  });

  assert.strictEqual(saved.metadataExportedAt, false);
  assert.strictEqual(saved.metadataModel, false);
  assert.strictEqual(saved.metadataEnabled, true);
  assert.deepStrictEqual(localStore.manualKeys.sort(), ["metadataExportedAt", "metadataModel"].sort());

  const saveMessage = remoteMessages.find((message) => message.type === "SAVE_ACCOUNT_SETTINGS");
  assert(saveMessage, "settings save must call account sync");
  assert.strictEqual(saveMessage.payload.settings.metadataExportedAt, false);
  assert.strictEqual(saveMessage.payload.settings.metadataModel, false);
  assert.strictEqual(saveMessage.payload.settings.metadataEnabled, true);

  remoteMessages.length = 0;
  const cached = await globalThis.ChatExportAi.storage.getCachedSettings();
  assert.strictEqual(cached.metadataExportedAt, false);
  assert.strictEqual(cached.metadataModel, false);
  assert(!remoteMessages.some((message) => message.type === "GET_ACCOUNT_SETTINGS"));

  failNextSave = true;
  await assert.rejects(
    () => globalThis.ChatExportAi.storage.saveSettings({ metadataUrl: true }),
    /remote save failed/
  );
  assert.strictEqual(localStore.settings.metadataUrl, true, "local settings must be saved even when account sync fails");
  assert.strictEqual(localStore["chatExportAi.settings.pendingSync.v1"], true, "failed account sync should leave a pending sync marker");

  failNextSave = false;
  remoteMessages.length = 0;
  remoteSettingsResponse = { ok: true, settings: { metadataExportedAt: true, metadataModel: true, metadataUrl: false } };
  const retrySynced = await globalThis.ChatExportAi.storage.getSettings();
  assert.strictEqual(retrySynced.metadataUrl, true, "pending local settings should win over stale remote settings");
  const retrySaveMessage = remoteMessages.find((message) => message.type === "SAVE_ACCOUNT_SETTINGS");
  assert(retrySaveMessage, "pending local settings should retry account sync before reading remote settings");
  assert.strictEqual(retrySaveMessage.payload.settings.metadataUrl, true);
  assert.strictEqual(localStore["chatExportAi.settings.pendingSync.v1"], false);

  remoteMessages.length = 0;
  remoteSettingsResponse = { ok: true, settings: {} };
  const localBeforeRemoteBootstrap = await globalThis.ChatExportAi.storage.saveSettings({
    metadataExportedAt: false,
    metadataModel: false
  });
  assert.strictEqual(localBeforeRemoteBootstrap.metadataExportedAt, false);

  remoteMessages.length = 0;
  const bootstrapped = await globalThis.ChatExportAi.storage.getSettings();
  assert.strictEqual(bootstrapped.metadataExportedAt, false);
  assert.strictEqual(bootstrapped.metadataModel, false);
  const bootstrapSaveMessage = remoteMessages.find((message) => message.type === "SAVE_ACCOUNT_SETTINGS");
  assert(bootstrapSaveMessage, "empty account settings should be initialized from local overrides");
  assert.strictEqual(bootstrapSaveMessage.payload.settings.metadataExportedAt, false);
  assert.strictEqual(bootstrapSaveMessage.payload.settings.metadataModel, false);

  console.log("settings storage sync passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
