(() => {
  const root = globalThis.ChatExportAi;
  const {
    MSG_GET_CHAT_STATUS,
    MSG_EXPORT_CHAT,
    MSG_EXPORT_NOTION,
    MSG_CHECK_MEMBERSHIP,
    EXPORT_FORMATS
  } = root.constants;

  const WEB_URL = "https://exportai.nexscp.com";
  const FS_DIRECTORY_DB_NAME = "exportai-file-system-access";
  const FS_DIRECTORY_STORE_NAME = "handles";
  const FS_DIRECTORY_HANDLE_KEY = "lastDownloadDirectory";
  const FORMAT_OPTIONS = [
    [EXPORT_FORMATS.TXT, "TXT"],
    [EXPORT_FORMATS.PDF, "PDF"],
    [EXPORT_FORMATS.MHT, "MHT"],
    [EXPORT_FORMATS.HTML, "HTML"],
    [EXPORT_FORMATS.MD, "MD"],
    [EXPORT_FORMATS.DOCX, "DOCX"],
    [EXPORT_FORMATS.XLSX, "XLSX"],
    [EXPORT_FORMATS.PNG, "PNG"]
  ];
  const FREE_EXPORT_FORMATS = new Set([EXPORT_FORMATS.TXT, EXPORT_FORMATS.PDF]);
  const POPUP_LANGUAGE_TEXT = {
    en: {
      accountButton: "Account",
      settingsButton: "Settings",
      signInPrompt: "Please sign in to ExportAI before exporting.",
      signIn: "Sign in",
      platform: "Platform",
      filename: "Filename",
      chooseExportFormats: "Choose export formats",
      export: "Export",
      notSignedIn: "Not signed in",
      sessionExpired: "Your ExportAI login expired. Please sign in again.",
      signedIn: "Signed in",
      checking: "Checking...",
      noActiveTab: "Unable to detect the current tab.",
      notExportableChat: "This tab does not contain an exportable AI chat.",
      selectAtLeastOne: "Please select at least one format.",
      paidFormatUnavailable: "Free accounts can export TXT and PDF only. Upgrade to use other formats.",
      chooseDirectory: "Choose folder...",
      exporting: "Exporting...",
      exportFailed: "Export failed",
      exportComplete: "Export complete.",
      sendToNotion: "Send to Notion",
      configureNotion: "Set up Notion",
      sendingToNotion: "Sending...",
      sentToNotion: "Sent to Notion.",
      alreadySentToNotion: "Already sent to Notion.",
      openInNotion: "Open in Notion",
      notionSetupHint: "Connect Notion and choose a destination in Settings.",
      directoryDbOpenError: "Unable to open directory permission storage.",
      directorySaveError: "Unable to save directory permission.",
      directoryPickerUnsupported: "This browser does not support choosing one folder for multiple files. Please use a current Chrome or Edge.",
      directoryPermissionDenied: "Directory write permission was not granted.",
      popupError: "Popup error"
    },
    "zh-CN": {
      accountButton: "\u8d26\u53f7",
      settingsButton: "\u8bbe\u7f6e",
      signInPrompt: "\u5bfc\u51fa\u524d\u8bf7\u5148\u767b\u5f55 ExportAI\u3002",
      signIn: "\u767b\u5f55",
      platform: "\u5e73\u53f0",
      filename: "\u6587\u4ef6\u540d",
      chooseExportFormats: "\u9009\u62e9\u5bfc\u51fa\u683c\u5f0f",
      export: "\u5bfc\u51fa",
      notSignedIn: "\u672a\u767b\u5f55",
      sessionExpired: "ExportAI \u767b\u5f55\u5df2\u8fc7\u671f\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55\u3002",
      signedIn: "\u5df2\u767b\u5f55",
      checking: "\u68c0\u6d4b\u4e2d...",
      noActiveTab: "\u65e0\u6cd5\u68c0\u6d4b\u5f53\u524d\u6807\u7b7e\u9875\u3002",
      notExportableChat: "\u5f53\u524d\u6807\u7b7e\u9875\u4e0d\u662f\u53ef\u5bfc\u51fa\u7684 AI \u5bf9\u8bdd\u3002",
      selectAtLeastOne: "\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u79cd\u683c\u5f0f\u3002",
      paidFormatUnavailable: "\u514d\u8d39\u8d26\u53f7\u4ec5\u652f\u6301 TXT \u548c PDF \u5bfc\u51fa\uff0c\u5176\u4ed6\u683c\u5f0f\u9700\u8981\u4f1a\u5458\u3002",
      chooseDirectory: "\u9009\u62e9\u76ee\u5f55...",
      exporting: "\u5bfc\u51fa\u4e2d...",
      exportFailed: "\u5bfc\u51fa\u5931\u8d25",
      exportComplete: "\u5bfc\u51fa\u5b8c\u6210\u3002",
      sendToNotion: "\u53d1\u9001\u5230 Notion",
      configureNotion: "\u8bbe\u7f6e Notion",
      sendingToNotion: "\u6b63\u5728\u53d1\u9001...",
      sentToNotion: "\u5df2\u53d1\u9001\u5230 Notion\u3002",
      alreadySentToNotion: "\u8be5\u5bf9\u8bdd\u5df2\u53d1\u9001\u5230 Notion\u3002",
      openInNotion: "\u5728 Notion \u4e2d\u6253\u5f00",
      notionSetupHint: "\u8bf7\u5148\u5728\u8bbe\u7f6e\u4e2d\u8fde\u63a5 Notion \u5e76\u9009\u62e9\u9ed8\u8ba4\u4f4d\u7f6e\u3002",
      directoryDbOpenError: "\u65e0\u6cd5\u6253\u5f00\u76ee\u5f55\u6743\u9650\u5b58\u50a8\u3002",
      directorySaveError: "\u65e0\u6cd5\u4fdd\u5b58\u76ee\u5f55\u6743\u9650\u3002",
      directoryPickerUnsupported: "\u5f53\u524d\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u4e00\u6b21\u9009\u62e9\u76ee\u5f55\u4fdd\u5b58\u591a\u4e2a\u6587\u4ef6\u3002\u8bf7\u4f7f\u7528\u65b0\u7248 Chrome/Edge\u3002",
      directoryPermissionDenied: "\u672a\u6388\u4e88\u76ee\u5f55\u5199\u5165\u6743\u9650\u3002",
      popupError: "Popup \u9519\u8bef"
    }
  };

  const accountText = document.getElementById("accountText");
  const loginPanel = document.getElementById("loginPanel");
  const goLoginButton = document.getElementById("goLoginButton");
  const loginButton = document.getElementById("loginButton");
  const openOptionsButton = document.getElementById("openOptions");
  const statusNode = document.getElementById("status");
  const statusTextNode = document.getElementById("statusText");
  const statusActionNode = document.getElementById("statusAction");
  const summaryNode = document.getElementById("summary");
  const summaryProviderNode = document.getElementById("summaryProvider");
  const summaryChatNameNode = document.getElementById("summaryChatName");
  const exportPanel = document.getElementById("exportPanel");
  const formatOptionsNode = document.getElementById("formatOptions");
  const exportButton = document.getElementById("exportButton");
  const notionButton = document.getElementById("notionButton");

  let activeTabId = null;
  let currentSettings = null;
  let currentMembership = { isMember: false };
  let exportInProgress = false;
  let lastNotionUrl = "";

  function normalizeLanguage(value) {
    return String(value || "").toLowerCase() === "zh-cn" ? "zh-CN" : "en";
  }

  function t(key) {
    const language = normalizeLanguage(currentSettings && currentSettings.appLanguage);
    return POPUP_LANGUAGE_TEXT[language]?.[key] || POPUP_LANGUAGE_TEXT.en[key] || key;
  }

  function applyLanguage() {
    const language = normalizeLanguage(currentSettings && currentSettings.appLanguage);
    const dictionary = POPUP_LANGUAGE_TEXT[language] || POPUP_LANGUAGE_TEXT.en;
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (key && dictionary[key]) {
        node.textContent = dictionary[key];
      }
    });
    document.querySelectorAll("[data-i18n-title]").forEach((node) => {
      const key = node.getAttribute("data-i18n-title");
      if (key && dictionary[key]) {
        node.setAttribute("title", dictionary[key]);
      }
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
      const key = node.getAttribute("data-i18n-aria-label");
      if (key && dictionary[key]) {
        node.setAttribute("aria-label", dictionary[key]);
      }
    });
  }

  function setStatus(message, tone = "", actionUrl = "") {
    const text = String(message || "");
    statusTextNode.textContent = text;
    statusNode.hidden = !text;
    statusNode.classList.toggle("is-success", tone === "success");
    statusNode.classList.toggle("is-error", tone === "error");
    lastNotionUrl = String(actionUrl || "");
    statusActionNode.hidden = !lastNotionUrl;
  }

  function setButtonLabel(button, label) {
    const labelNode = button?.querySelector?.("span[data-i18n], #notionButtonLabel");
    if (labelNode) labelNode.textContent = String(label || "");
    else if (button) button.textContent = String(label || "");
  }

  function refreshNotionButtonLabel() {
    setButtonLabel(notionButton, currentSettings?.notionTarget?.id ? t("sendToNotion") : t("configureNotion"));
  }

  function openUrl(url) {
    if (globalThis.chrome?.tabs?.create) {
      globalThis.chrome.tabs.create({ url });
      return;
    }
    location.href = url;
  }

  function openNotionConnectWindow() {
    const url = globalThis.chrome.runtime.getURL("src/notion-connect/notion-connect.html");
    if (globalThis.chrome?.windows?.create) {
      globalThis.chrome.windows.create({ url, type: "popup", width: 420, height: 640, focused: true });
      return;
    }
    openUrl(url);
  }

  function storageGet(keys) {
    return new Promise((resolve) => {
      globalThis.chrome.storage.local.get(keys, (result) => resolve(result || {}));
    });
  }

  function openDirectoryDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(FS_DIRECTORY_DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(FS_DIRECTORY_STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(t("directoryDbOpenError")));
    });
  }

  async function saveDirectoryHandle(directoryHandle) {
    const db = await openDirectoryDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FS_DIRECTORY_STORE_NAME, "readwrite");
      tx.objectStore(FS_DIRECTORY_STORE_NAME).put(directoryHandle, FS_DIRECTORY_HANDLE_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error(t("directorySaveError")));
    });
  }

  async function chooseDirectoryForAskMode() {
    if (typeof showDirectoryPicker !== "function") {
      throw new Error(t("directoryPickerUnsupported"));
    }

    const directoryHandle = await showDirectoryPicker({
      mode: "readwrite",
      id: "exportai-download-directory"
    });
    if (typeof directoryHandle.requestPermission === "function") {
      const permission = await directoryHandle.requestPermission({ mode: "readwrite" });
      if (permission !== "granted") {
        throw new Error(t("directoryPermissionDenied"));
      }
    }
    await saveDirectoryHandle(directoryHandle);
  }

  async function getAuthState() {
    const stored = await storageGet(["exportai_access_token", "exportai_user_info"]);
    const token = stored.exportai_access_token || "";
    let user = null;
    try {
      user = typeof stored.exportai_user_info === "string"
        ? JSON.parse(stored.exportai_user_info)
        : stored.exportai_user_info;
    } catch (_error) {
      user = null;
    }
    return { token, user };
  }

  async function queryActiveTab() {
    const tabs = await root.chromeHelpers.tabsQuery({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  async function getMembership(forceRefresh = false) {
    const response = await root.chromeHelpers.runtimeSendMessage({
      type: MSG_CHECK_MEMBERSHIP,
      payload: { forceRefresh }
    });
    return response?.ok ? response : { isMember: false };
  }

  function isFormatAllowedForMembership(format) {
    return Boolean(currentMembership?.isMember) || FREE_EXPORT_FORMATS.has(format);
  }

  function normalizePopupSelectedFormats(formats) {
    const selected = Array.isArray(formats) && formats.length
      ? formats
      : [EXPORT_FORMATS.TXT, EXPORT_FORMATS.PDF];
    const allowed = selected.filter((format) => isFormatAllowedForMembership(format));
    return allowed.length ? allowed : [EXPORT_FORMATS.TXT];
  }

  function renderFormatOptions(settings) {
    const selected = new Set(normalizePopupSelectedFormats(settings.popupSelectedFormats));
    formatOptionsNode.innerHTML = FORMAT_OPTIONS.map(([format, label]) => {
      const locked = !isFormatAllowedForMembership(format);
      const checked = !locked && selected.has(format) ? " checked" : "";
      const paidOnlyAttr = locked ? ' data-paid-only="true"' : "";
      const lockedClass = locked ? " is-locked" : "";
      const lockMarkup = locked ? '<span class="lock-mark" aria-hidden="true">🔒</span>' : "";
      return `<label class="format-option${lockedClass}"${paidOnlyAttr} title="${locked ? t("paidFormatUnavailable") : ""}"><input type="checkbox" value="${format}"${checked}><span>${label}</span>${lockMarkup}</label>`;
    }).join("");
  }

  function selectedFormats() {
    return Array.from(formatOptionsNode.querySelectorAll("input:checked"))
      .map((input) => input.value);
  }

  async function saveSelectedFormats() {
    const formats = selectedFormats().filter((format) => isFormatAllowedForMembership(format));
    if (!formats.length) {
      return;
    }

    currentSettings = {
      ...(currentSettings || {}),
      popupSelectedFormats: formats
    };
    root.storage.saveSettings({ popupSelectedFormats: formats }).catch(() => null);
  }

  function refreshSettingsInBackground() {
    root.storage.getSettings()
      .then((settings) => {
        currentSettings = settings;
        root.appTheme.applyThemeDocument(settings.appTheme);
        applyLanguage();
        renderFormatOptions(settings);
      })
      .catch(() => null);
  }

  async function loadPopup() {
    exportPanel.hidden = true;
    summaryNode.hidden = true;
    loginPanel.hidden = true;
    setStatus("");

    const authPromise = getAuthState();
    currentSettings = typeof root.storage.getCachedSettings === "function"
      ? await root.storage.getCachedSettings()
      : await root.storage.getSettings();
    root.appTheme.applyThemeDocument(currentSettings.appTheme);
    applyLanguage();
    renderFormatOptions(currentSettings);

    const auth = await authPromise;
    if (!auth.token) {
      accountText.textContent = t("notSignedIn");
      loginPanel.hidden = false;
      return;
    }

    accountText.textContent = auth.user?.email || t("signedIn");
    currentMembership = await getMembership(true).catch(() => ({ isMember: false }));
    const refreshedAuth = await getAuthState();
    if (!refreshedAuth.token) {
      accountText.textContent = t("notSignedIn");
      loginPanel.hidden = false;
      summaryNode.hidden = true;
      exportPanel.hidden = true;
      setStatus(t("sessionExpired"), "error");
      return;
    }
    renderFormatOptions(currentSettings);
    summaryProviderNode.textContent = t("checking");
    summaryChatNameNode.textContent = t("checking");
    summaryNode.hidden = false;
    exportPanel.hidden = false;
    exportButton.disabled = true;
    setButtonLabel(exportButton, t("checking"));
    refreshSettingsInBackground();

    const tab = await queryActiveTab();
    if (!tab || typeof tab.id !== "number") {
      setStatus(t("noActiveTab"));
      activeTabId = null;
      exportButton.disabled = true;
      setButtonLabel(exportButton, t("export"));
      return;
    }

    activeTabId = tab.id;
    const response = await root.chromeHelpers.tabsSendMessage(activeTabId, { type: MSG_GET_CHAT_STATUS });
    if (!response || !response.supported || !response.isChatPage || !response.messageCount) {
      setStatus(t("notExportableChat"));
      activeTabId = null;
      summaryProviderNode.textContent = "-";
      summaryChatNameNode.textContent = "-";
      exportButton.disabled = true;
      setButtonLabel(exportButton, t("export"));
      return;
    }

    summaryProviderNode.textContent = response.summary?.providerName || response.providerName || "-";
    summaryChatNameNode.textContent = response.summary?.fileName || response.summary?.fileNameBase || "-";
    summaryNode.hidden = false;
    exportPanel.hidden = false;
    exportButton.disabled = false;
    notionButton.disabled = !currentMembership?.isMember;
    notionButton.title = !currentMembership?.isMember ? t("paidFormatUnavailable") : (!currentSettings?.notionTarget?.id ? t("notionSetupHint") : "");
    refreshNotionButtonLabel();
    setButtonLabel(exportButton, t("export"));
    setStatus("");
  }

  async function runExport() {
    if (exportInProgress || activeTabId === null) {
      return;
    }

      const formats = selectedFormats();
      if (!formats.length) {
        setStatus(t("selectAtLeastOne"));
        return;
      }
      const disallowed = formats.filter((format) => !isFormatAllowedForMembership(format));
      if (disallowed.length) {
        setStatus(t("paidFormatUnavailable"));
        renderFormatOptions(currentSettings || {});
        return;
      }

    const useDirectoryPicker = currentSettings?.saveMode === "ask";
    exportInProgress = true;
    exportButton.disabled = true;
    setStatus("");

    try {
      if (useDirectoryPicker) {
        setButtonLabel(exportButton, t("chooseDirectory"));
        await chooseDirectoryForAskMode();
      }

      setButtonLabel(exportButton, t("exporting"));
      await saveSelectedFormats();
      const response = await root.chromeHelpers.tabsSendMessage(activeTabId, {
        type: MSG_EXPORT_CHAT,
        payload: {
          format: EXPORT_FORMATS.MULTI,
          formats,
          mode: "manual",
          output: useDirectoryPicker ? "directory" : "download"
        }
      });
      if (!response?.ok) {
        throw new Error(response?.error || t("exportFailed"));
      }
      setStatus(t("exportComplete"), "success");
    } catch (error) {
      setStatus(`${t("popupError")}: ${error.message}`, "error");
    } finally {
      exportInProgress = false;
      exportButton.disabled = false;
      setButtonLabel(exportButton, t("export"));
    }
  }

  goLoginButton.addEventListener("click", () => openUrl(`${WEB_URL}/login?return=/account&extension_callback=1`));
  loginButton.addEventListener("click", () => openUrl(`${WEB_URL}/account?extension_callback=1`));
  openOptionsButton.addEventListener("click", () => {
    if (globalThis.chrome?.runtime?.openOptionsPage) {
      globalThis.chrome.runtime.openOptionsPage();
      return;
    }
    openUrl(globalThis.chrome.runtime.getURL("src/options/options.html"));
  });
  formatOptionsNode.addEventListener("click", (event) => {
    const option = event.target?.closest?.(".format-option");
    if (!option || !option.dataset.paidOnly) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openUrl(`${WEB_URL}/#pricing`);
  });
  formatOptionsNode.addEventListener("change", (event) => {
    const option = event.target?.closest?.(".format-option");
    if (option?.dataset.paidOnly) {
      const input = option.querySelector("input");
      if (input) input.checked = false;
      return;
    }
    saveSelectedFormats();
  });
  exportButton.addEventListener("click", runExport);
  notionButton.addEventListener("click", async () => {
    if (exportInProgress || notionButton.disabled) return;
    if (!currentSettings?.notionTarget?.id) {
      openNotionConnectWindow();
      setStatus(t("notionSetupHint"));
      return;
    }
    if (activeTabId === null) {
      setStatus(t("noActiveTab"), "error");
      return;
    }
    exportInProgress = true;
    notionButton.disabled = true;
    setButtonLabel(notionButton, t("sendingToNotion"));
    try {
      const response = await root.chromeHelpers.tabsSendMessage(activeTabId, { type: MSG_EXPORT_NOTION });
      if (!response?.ok) throw new Error(response?.error || "Notion export failed");
      setStatus(response.result?.duplicate ? t("alreadySentToNotion") : t("sentToNotion"), "success", response.result?.url || "");
    } catch (error) { setStatus(`${t("popupError")}: ${error.message}`, "error"); }
    finally { exportInProgress = false; notionButton.disabled = false; refreshNotionButtonLabel(); }
  });
  statusActionNode.addEventListener("click", () => { if (lastNotionUrl) openUrl(lastNotionUrl); });

  loadPopup().catch((error) => {
    setStatus(`${t("popupError")}: ${error.message}`);
  });
})();
