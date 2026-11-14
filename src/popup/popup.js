(() => {
  const root = globalThis.ChatExportAi;
  const {
    MSG_GET_CHAT_STATUS,
    MSG_EXPORT_CHAT,
    MSG_EXPORT_NOTION,
    MSG_NOTION_CONNECT,
    MSG_NOTION_DISCONNECT,
    MSG_NOTION_TARGETS,
    MSG_NOTION_QUOTA_STATUS,
    EXPORT_FORMATS
  } = root.constants;

  const FS_DIRECTORY_DB_NAME = "exportai-file-system-access";
  const FS_DIRECTORY_STORE_NAME = "handles";
  const FS_DIRECTORY_HANDLE_KEY = "lastDownloadDirectory";
  const NOTION_INLINE_FLOW_KEY = "exportai_notion_inline_flow";
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
  const POPUP_LANGUAGE_TEXT = {
    en: {
      settingsButton: "Settings",
      platform: "Platform",
      filename: "Filename",
      chooseExportFormats: "Choose export formats",
      export: "Export",
      checking: "Checking...",
      noActiveTab: "Unable to detect the current tab.",
      notExportableChat: "This tab does not contain an exportable AI chat.",
      selectAtLeastOne: "Please select at least one format.",
      chooseDirectory: "Choose folder...",
      exporting: "Exporting...",
      exportFailed: "Export failed",
      exportComplete: "Export complete.",
      sendToNotion: "Send to Notion",
      sendToNotionQuota: "Send to Notion · {count} free left today",
      configureNotion: "Set up Notion",
      sendingToNotion: "Sending...",
      sentToNotion: "Sent to Notion.",
      sentToNotionRemaining: "Sent to Notion. {count} free sends left today.",
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
      settingsButton: "\u8bbe\u7f6e",
      platform: "\u5e73\u53f0",
      filename: "\u6587\u4ef6\u540d",
      chooseExportFormats: "\u9009\u62e9\u5bfc\u51fa\u683c\u5f0f",
      export: "\u5bfc\u51fa",
      checking: "\u68c0\u6d4b\u4e2d...",
      noActiveTab: "\u65e0\u6cd5\u68c0\u6d4b\u5f53\u524d\u6807\u7b7e\u9875\u3002",
      notExportableChat: "\u5f53\u524d\u6807\u7b7e\u9875\u4e0d\u662f\u53ef\u5bfc\u51fa\u7684 AI \u5bf9\u8bdd\u3002",
      selectAtLeastOne: "\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u79cd\u683c\u5f0f\u3002",
      chooseDirectory: "\u9009\u62e9\u76ee\u5f55...",
      exporting: "\u5bfc\u51fa\u4e2d...",
      exportFailed: "\u5bfc\u51fa\u5931\u8d25",
      exportComplete: "\u5bfc\u51fa\u5b8c\u6210\u3002",
      sendToNotion: "\u53d1\u9001\u5230 Notion",
      sendToNotionQuota: "\u53d1\u9001\u5230 Notion\uff08\u4eca\u65e5\u514d\u8d39\u5269\u4f59 {count} \u6b21\uff09",
      configureNotion: "\u8bbe\u7f6e Notion",
      sendingToNotion: "\u6b63\u5728\u53d1\u9001...",
      sentToNotion: "\u5df2\u53d1\u9001\u5230 Notion\u3002",
      sentToNotionRemaining: "\u5df2\u53d1\u9001\u5230 Notion\u3002\u4eca\u65e5\u514d\u8d39\u989d\u5ea6\u5269\u4f59 {count} \u6b21\u3002",
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
  const notionFlow = document.getElementById("notionFlow");
  const notionLoginView = document.getElementById("notionLoginView");
  const notionWaitingView = document.getElementById("notionWaitingView");
  const notionTargetsView = document.getElementById("notionTargetsView");
  const notionWaitingTitle = document.getElementById("notionWaitingTitle");
  const notionWaitingText = document.getElementById("notionWaitingText");
  const notionWorkspaceText = document.getElementById("notionWorkspaceText");
  const notionLevelBack = document.getElementById("notionLevelBack");
  const notionBreadcrumb = document.getElementById("notionBreadcrumb");
  const notionTargetList = document.getElementById("notionTargetList");
  const notionEmptyTargets = document.getElementById("notionEmptyTargets");
  const notionFlowStatus = document.getElementById("notionFlowStatus");
  const notionViews = [notionLoginView, notionWaitingView, notionTargetsView];

  let activeTabId = null;
  let currentSettings = null;
  let currentNotionQuota = null;
  let exportInProgress = false;
  let lastNotionUrl = "";
  let notionFlowBusy = false;
  let notionTargets = [];
  let notionTargetParentId = null;
  let notionTargetPath = [];

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
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const key = node.getAttribute("data-i18n-placeholder");
      if (key && dictionary[key]) {
        node.setAttribute("placeholder", dictionary[key]);
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
    if (!currentSettings?.notionTarget?.id) {
      setButtonLabel(notionButton, t("configureNotion"));
      return;
    }
    const remaining = currentNotionQuota?.remaining;
    const label = currentNotionQuota?.unlimited === false && Number.isInteger(remaining)
      ? t("sendToNotionQuota").replace("{count}", String(remaining))
      : t("sendToNotion");
    setButtonLabel(notionButton, label);
  }

  function openUrl(url) {
    if (globalThis.chrome?.tabs?.create) {
      globalThis.chrome.tabs.create({ url });
      return;
    }
    location.href = url;
  }

  function storageGet(keys) {
    return new Promise((resolve) => {
      globalThis.chrome.storage.local.get(keys, (result) => resolve(result || {}));
    });
  }

  function showNotionView(view, message = "", tone = "") {
    notionViews.forEach((item) => { item.hidden = item !== view; });
    notionFlowStatus.textContent = message;
    notionFlowStatus.classList.toggle("is-error", tone === "error");
    notionFlowStatus.classList.toggle("is-success", tone === "success");
  }

  function setMainPopupVisible(visible) {
    summaryNode.hidden = !visible;
    exportPanel.hidden = !visible;
    statusNode.hidden = !visible || !statusTextNode.textContent;
    notionFlow.hidden = visible;
  }

  function normalizeNotionTargets(targets) {
    const values = Array.isArray(targets) ? targets : [];
    const ids = new Set(values.map((target) => String(target?.id || "")).filter(Boolean));
    return values.map((target) => ({
      ...target,
      id: String(target.id || ""),
      parentId: ids.has(String(target.parentId || "")) ? String(target.parentId) : null
    })).filter((target) => target.id);
  }

  function renderNotionTargetLevel(parentId = null, path = []) {
    notionTargetParentId = parentId;
    notionTargetPath = path;
    const selectedId = currentSettings?.notionTarget?.id || "";
    const targets = notionTargets.filter((target) => target.parentId === parentId);
    notionTargetList.replaceChildren();
    targets.forEach((target) => notionTargetList.appendChild(createNotionTargetButton(target, selectedId)));
    notionLevelBack.hidden = !path.length;
    notionBreadcrumb.textContent = path.length ? path.map((item) => item.title).join(" / ") : "全部页面";
    notionEmptyTargets.hidden = Boolean(targets.length);
  }

  function createNotionTargetButton(target, selectedId) {
    const row = document.createElement("div");
    row.className = `notion-target-row${target.id === selectedId ? " is-selected" : ""}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "notion-target-button";
    button.dataset.targetId = target.id;
    button.innerHTML = '<span class="notion-target-icon" aria-hidden="true">▧</span><span class="notion-target-title"></span><span class="notion-target-selected" aria-hidden="true"></span>';
    button.querySelector(".notion-target-title").textContent = target.title || "未命名页面";
    button.querySelector(".notion-target-selected").textContent = target.id === selectedId ? "✓" : "";
    button.addEventListener("click", async () => {
      if (notionFlowBusy) return;
      notionFlowBusy = true;
      const notionTarget = {
        id: target.id,
        type: target.type || "page",
        titleProperty: target.titleProperty || "title",
        title: target.title || "未命名页面"
      };
      try {
        await root.storage.saveSettings({ notionTarget });
        currentSettings = { ...(currentSettings || {}), notionTarget };
        renderNotionTargetLevel(notionTargetParentId, notionTargetPath);
        showNotionView(notionTargetsView, `已选择"${notionTarget.title}"`, "success");
        refreshNotionButtonLabel();
      } catch (error) {
        showNotionView(notionTargetsView, error?.message || "保存位置失败。", "error");
      } finally {
        notionFlowBusy = false;
      }
    });
    row.appendChild(button);
    const hasChildren = notionTargets.some((item) => item.parentId === target.id);
    if (hasChildren) {
      const drillButton = document.createElement("button");
      drillButton.type = "button";
      drillButton.className = "notion-target-drill";
      drillButton.setAttribute("aria-label", `打开 ${target.title || "未命名页面"} 的子页面`);
      drillButton.title = "查看子页面";
      drillButton.textContent = "›";
      drillButton.addEventListener("click", () => {
        renderNotionTargetLevel(target.id, [...notionTargetPath, { id: target.id, title: target.title || "未命名页面" }]);
      });
      row.appendChild(drillButton);
    }
    return row;
  }

  async function loadInlineNotionTargets(workspaceName = "") {
    showNotionView(notionWaitingView, "正在读取 Notion 页面…");
    notionWaitingTitle.textContent = "正在读取 Notion 页面…";
    notionWaitingText.textContent = "读取完成后会在这里显示保存位置";
    const [response, settings, stored] = await Promise.all([
      root.chromeHelpers.runtimeSendMessage({ type: MSG_NOTION_TARGETS }),
      root.storage.getSettings().catch(() => currentSettings || {}),
      storageGet(["exportai_notion_connection"])
    ]);
    if (!response?.ok) {
      showNotionView(notionTargetsView, response?.error || "无法读取 Notion 页面。", "error");
      return;
    }
    notionWorkspaceText.textContent = workspaceName || stored.exportai_notion_connection?.workspaceName || "Notion 工作区";
    currentSettings = settings || currentSettings || {};
    notionTargets = normalizeNotionTargets(response.targets);
    renderNotionTargetLevel(null, []);
    showNotionView(notionTargetsView);
  }

  async function connectInlineNotion() {
    if (notionFlowBusy) return;
    notionFlowBusy = true;
    notionWaitingTitle.textContent = "正在等待 Notion 授权…";
    notionWaitingText.textContent = "授权完成后会自动返回这里";
    showNotionView(notionWaitingView);
    try {
      const response = await root.chromeHelpers.runtimeSendMessage({ type: MSG_NOTION_CONNECT });
      if (!response?.ok) {
        showNotionView(notionLoginView, `Notion 连接失败：${response?.error || "请重试。"}`, "error");
        return;
      }
      await loadInlineNotionTargets(response.workspaceName || "Notion 工作区");
    } finally {
      notionFlowBusy = false;
    }
  }

  async function enterInlineNotionFlow() {
    await root.chromeHelpers.storageSet({ [NOTION_INLINE_FLOW_KEY]: true });
    setMainPopupVisible(false);
    const stored = await storageGet(["exportai_notion_connection"]);
    if (stored.exportai_notion_connection?.accessToken) {
      await loadInlineNotionTargets(stored.exportai_notion_connection.workspaceName || "Notion 工作区");
      return;
    }
    showNotionView(notionLoginView);
  }

  function leaveInlineNotionFlow() {
    root.chromeHelpers.storageSet({ [NOTION_INLINE_FLOW_KEY]: false });
    setMainPopupVisible(true);
    refreshNotionButtonLabel();
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

  function renderFormatOptions(settings) {
    const selected = new Set(normalizePopupSelectedFormats(settings.popupSelectedFormats));
    formatOptionsNode.innerHTML = FORMAT_OPTIONS.map(([format, label]) => {
      const checked = selected.has(format) ? " checked" : "";
      return `<label class="format-option"><input type="checkbox" value="${format}"${checked}><span>${label}</span></label>`;
    }).join("");
  }

  function normalizePopupSelectedFormats(formats) {
    const selected = Array.isArray(formats) && formats.length
      ? formats
      : [EXPORT_FORMATS.TXT, EXPORT_FORMATS.PDF];
    return selected;
  }

  function selectedFormats() {
    return Array.from(formatOptionsNode.querySelectorAll("input:checked"))
      .map((input) => input.value);
  }

  async function saveSelectedFormats() {
    const formats = selectedFormats();
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
        refreshNotionButtonLabel();
      })
      .catch(() => null);
  }

  async function queryActiveTab() {
    const tabs = await root.chromeHelpers.tabsQuery({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  async function loadPopup() {
    exportPanel.hidden = true;
    summaryNode.hidden = true;
    setStatus("");

    currentSettings = typeof root.storage.getCachedSettings === "function"
      ? await root.storage.getCachedSettings()
      : await root.storage.getSettings();
    root.appTheme.applyThemeDocument(currentSettings.appTheme);
    applyLanguage();
    renderFormatOptions(currentSettings);
    refreshNotionButtonLabel();

    const inlineFlowState = await storageGet([NOTION_INLINE_FLOW_KEY]);
    if (inlineFlowState[NOTION_INLINE_FLOW_KEY]) {
      await enterInlineNotionFlow();
      return;
    }

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
    summaryChatNameNode.textContent = response.summary?.fileNameBase || response.summary?.fileName || "-";
    summaryNode.hidden = false;
    exportPanel.hidden = false;
    exportButton.disabled = false;
    notionButton.disabled = false;
    notionButton.title = !currentSettings?.notionTarget?.id ? t("notionSetupHint") : "";
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

  openOptionsButton.addEventListener("click", () => {
    if (globalThis.chrome?.runtime?.openOptionsPage) {
      globalThis.chrome.runtime.openOptionsPage();
      return;
    }
    openUrl(globalThis.chrome.runtime.getURL("src/options/options.html"));
  });
  formatOptionsNode.addEventListener("change", () => {
    saveSelectedFormats();
  });
  exportButton.addEventListener("click", runExport);
  notionButton.addEventListener("click", async () => {
    if (exportInProgress || notionButton.disabled) return;
    if (!currentSettings?.notionTarget?.id) {
      await enterInlineNotionFlow();
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
      const remaining = response.result?.quota?.remaining;
      if (response.result?.quota) currentNotionQuota = response.result.quota;
      const sentMessage = Number.isInteger(remaining)
        ? t("sentToNotionRemaining").replace("{count}", String(remaining))
        : t("sentToNotion");
      setStatus(response.result?.duplicate ? t("alreadySentToNotion") : sentMessage, "success", response.result?.url || "");
    } catch (error) { setStatus(`${t("popupError")}: ${error.message}`, "error"); }
    finally { exportInProgress = false; notionButton.disabled = false; refreshNotionButtonLabel(); }
  });
  document.getElementById("notionBackButton").addEventListener("click", leaveInlineNotionFlow);
  notionLevelBack.addEventListener("click", () => {
    if (!notionTargetPath.length) return;
    const nextPath = notionTargetPath.slice(0, -1);
    const nextParentId = nextPath.length ? nextPath[nextPath.length - 1].id : null;
    renderNotionTargetLevel(nextParentId, nextPath);
  });
  document.getElementById("notionManageAccess").addEventListener("click", connectInlineNotion);
  document.getElementById("notionDisconnect").addEventListener("click", async () => {
    if (notionFlowBusy) return;
    notionFlowBusy = true;
    await root.chromeHelpers.runtimeSendMessage({ type: MSG_NOTION_DISCONNECT });
    await root.storage.saveSettings({ notionTarget: null }).catch(() => null);
    currentSettings = { ...(currentSettings || {}), notionTarget: null };
    notionFlowBusy = false;
    showNotionView(notionLoginView, "Notion 已断开连接。");
  });
  statusActionNode.addEventListener("click", () => { if (lastNotionUrl) openUrl(lastNotionUrl); });

  loadPopup().catch((error) => {
    setStatus(`${t("popupError")}: ${error.message}`);
  });
})();
