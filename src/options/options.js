(() => {
  const root = globalThis.ChatExportAi;
  const { EXPORT_FORMATS, MSG_NOTION_DISCONNECT, MSG_NOTION_STATUS, MSG_NOTION_TARGETS } = root.constants;
  const AUTO_EXPORT_FEATURE_ENABLED = false;
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

  const form = document.getElementById("settingsForm");
  const statusNode = document.getElementById("status");
  const integrationFormatsNode = document.getElementById("integrationFormats");
  const autoExportFormatsNode = document.getElementById("autoExportFormats");
  const notionConnectButton = document.getElementById("notionConnect");
  const notionDisconnectButton = document.getElementById("notionDisconnect");
  const notionTargetNode = document.getElementById("notionTarget");
  const notionTargetBrowser = document.getElementById("notionTargetBrowser");
  const notionTargetBack = document.getElementById("notionTargetBack");
  const notionTargetPathNode = document.getElementById("notionTargetPath");
  const notionTargetListNode = document.getElementById("notionTargetList");
  const notionTargetEmptyNode = document.getElementById("notionTargetEmpty");
  const notionStatusNode = document.getElementById("notionStatus");
  const notionStatusTextNode = document.getElementById("notionStatusText");
  const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
  const tabPanels = Array.from(document.querySelectorAll("[data-panel]"));
  const LANGUAGE_TEXT = {
    en: {
      notionConnect: "Connect",
      notionDisconnect: "Disconnect",
      notionNotConnected: "Not connected",
      notionConnectedTo: "Connected to {workspace}",
      notionDefaultDestination: "Default destination",
      notionConnectFirst: "Connect Notion first",
      notionChooseDestination: "Choose a page or database",
      notionAllPages: "All pages",
      notionBackLevel: "Back one level",
      notionNoPages: "No pages at this level",
      notionPrivacy: "Chat content is sent directly from your browser to Notion. ExportAI does not store message content.",
      title: "ExportAI Settings",
      tabGeneral: "General",
      tabExport: "Export",
      tabFiles: "Files",
      tabIntegration: "Integration",
      generalTitle: "General",
      appTheme: "App theme",
      themeAuto: "Auto",
      themeLight: "Light",
      themeDark: "Dark",
      language: "Language",
      reasoningTime: "Reasoning and time",
      includeThinking: "Export visible reasoning",
      includeThinkingDuration: "Export reasoning duration",
      includeMessageTime: "Export message time",
      referencesAttachments: "References and attachments",
      userAttachments: "User attachments",
      assistantUserRefs: "Assistant references to user files",
      assistantGeneratedFiles: "Assistant generated files",
      webReferences: "Web references",
      exportTitle: "Export",
      txtExport: "TXT Export",
      humanName: "Human name",
      aiName: "AI name",
      textFormatting: "Text formatting",
      cleanText: "Clean text",
      multilineStyle: "Multiline style",
      tab: "Tab",
      name: "Name",
      none: "None",
      metadata: "Metadata",
      enableMetadata: "Enable metadata",
      exportTitleToggle: "Export title",
      date: "Date",
      model: "Model",
      url: "URL",
      chatName: "Chat name",
      messageCount: "Message count",
      filesTitle: "Files",
      downloadBehavior: "Download behavior",
      downloadFolder: "To download folder",
      customSubfolder: "To custom subfolder (inside Downloads)",
      askLocation: "Ask for location",
      customSubfolderLabel: "Custom subfolder",
      conflictAction: "Conflict action",
      overwrite: "Overwrite",
      keepBoth: "Keep both",
      integrationTitle: "Integration",
      inPageExportButton: "In-page export button",
      enableFloatingExport: "Enable draggable floating export",
      exportRuntime: "Export runtime",
      enableAutoExport: "Enable auto export",
      autoExportMode: "Auto export mode",
      onChange: "On change",
      everyNMinutes: "Every N minutes",
      intervalMinutes: "Interval minutes",
      autoExportManualSeedHint: "Auto export starts only after you manually export this conversation once. It reuses that saved filename and overwrites it silently.",
      initialStatus: "Settings are stored locally.",
      settingsSynced: "Settings saved.",
      localLoaded: "Settings loaded."
    },
    "zh-CN": {
      notionConnect: "\u8fde\u63a5",
      notionDisconnect: "\u65ad\u5f00\u8fde\u63a5",
      notionNotConnected: "\u672a\u8fde\u63a5",
      notionConnectedTo: "\u5df2\u8fde\u63a5\u5230 {workspace}",
      notionDefaultDestination: "\u9ed8\u8ba4\u4fdd\u5b58\u4f4d\u7f6e",
      notionConnectFirst: "\u8bf7\u5148\u8fde\u63a5 Notion",
      notionChooseDestination: "\u9009\u62e9\u9875\u9762\u6216\u6570\u636e\u5e93",
      notionAllPages: "\u5168\u90e8\u9875\u9762",
      notionBackLevel: "\u8fd4\u56de\u4e0a\u4e00\u7ea7",
      notionNoPages: "\u5f53\u524d\u5c42\u7ea7\u6ca1\u6709\u9875\u9762",
      notionPrivacy: "\u5bf9\u8bdd\u5185\u5bb9\u7531\u6d4f\u89c8\u5668\u76f4\u63a5\u53d1\u9001\u5230 Notion\uff0cExportAI \u4e0d\u5b58\u50a8\u6b63\u6587\u3002",
      title: "ExportAI \u8bbe\u7f6e",
      tabGeneral: "\u901a\u7528",
      tabExport: "\u5bfc\u51fa",
      tabFiles: "\u6587\u4ef6",
      tabIntegration: "\u96c6\u6210",
      generalTitle: "\u901a\u7528",
      appTheme: "\u4e3b\u9898",
      themeAuto: "\u81ea\u52a8",
      themeLight: "\u6d45\u8272",
      themeDark: "\u6df1\u8272",
      language: "\u8bed\u8a00",
      reasoningTime: "\u63a8\u7406\u4e0e\u65f6\u95f4",
      includeThinking: "\u5bfc\u51fa\u53ef\u89c1\u63a8\u7406",
      includeThinkingDuration: "\u5bfc\u51fa\u63a8\u7406\u8017\u65f6",
      includeMessageTime: "\u5bfc\u51fa\u6d88\u606f\u65f6\u95f4",
      referencesAttachments: "\u5f15\u7528\u4e0e\u9644\u4ef6",
      userAttachments: "\u7528\u6237\u9644\u4ef6",
      assistantUserRefs: "\u52a9\u624b\u5f15\u7528\u7684\u7528\u6237\u6587\u4ef6",
      assistantGeneratedFiles: "\u52a9\u624b\u751f\u6210\u7684\u6587\u4ef6",
      webReferences: "\u7f51\u7edc\u5f15\u7528",
      exportTitle: "\u5bfc\u51fa",
      txtExport: "TXT \u5bfc\u51fa",
      humanName: "\u7528\u6237\u540d\u79f0",
      aiName: "AI \u540d\u79f0",
      textFormatting: "\u6587\u672c\u683c\u5f0f",
      cleanText: "\u7eaf\u6587\u672c",
      multilineStyle: "\u591a\u884c\u6837\u5f0f",
      tab: "\u7f29\u8fdb",
      name: "\u540d\u79f0",
      none: "\u65e0",
      metadata: "\u5143\u6570\u636e",
      enableMetadata: "\u542f\u7528\u5143\u6570\u636e",
      exportTitleToggle: "\u5bfc\u51fa\u6807\u9898",
      date: "\u65e5\u671f",
      model: "\u6a21\u578b",
      url: "URL",
      chatName: "\u5bf9\u8bdd\u540d\u79f0",
      messageCount: "\u6d88\u606f\u6570\u91cf",
      filesTitle: "\u6587\u4ef6",
      downloadBehavior: "\u4e0b\u8f7d\u884c\u4e3a",
      downloadFolder: "\u4fdd\u5b58\u5230\u4e0b\u8f7d\u6587\u4ef6\u5939",
      customSubfolder: "\u4fdd\u5b58\u5230\u4e0b\u8f7d\u76ee\u5f55\u5185\u7684\u81ea\u5b9a\u4e49\u5b50\u6587\u4ef6\u5939",
      askLocation: "\u8be2\u95ee\u4fdd\u5b58\u4f4d\u7f6e",
      customSubfolderLabel: "\u81ea\u5b9a\u4e49\u5b50\u6587\u4ef6\u5939",
      conflictAction: "\u51b2\u7a81\u5904\u7406",
      overwrite: "\u8986\u76d6",
      keepBoth: "\u4fdd\u7559\u4e24\u4e2a",
      integrationTitle: "\u96c6\u6210",
      inPageExportButton: "\u9875\u9762\u5185\u5bfc\u51fa\u6309\u94ae",
      enableFloatingExport: "\u542f\u7528\u53ef\u62d6\u52a8\u6d6e\u52a8\u5bfc\u51fa",
      exportRuntime: "\u5bfc\u51fa\u8fd0\u884c\u65f6",
      enableAutoExport: "\u542f\u7528\u81ea\u52a8\u5bfc\u51fa",
      autoExportMode: "\u81ea\u52a8\u5bfc\u51fa\u6a21\u5f0f",
      onChange: "\u5185\u5bb9\u53d8\u5316\u65f6",
      everyNMinutes: "\u6bcf N \u5206\u949f",
      intervalMinutes: "\u95f4\u9694\u5206\u949f\u6570",
      autoExportManualSeedHint: "\u81ea\u52a8\u5bfc\u51fa\u53ea\u4f1a\u5728\u5f53\u524d\u5bf9\u8bdd\u624b\u52a8\u5bfc\u51fa\u8fc7\u4e00\u6b21\u540e\u542f\u52a8\uff0c\u5e76\u590d\u7528\u4e0a\u6b21\u4fdd\u5b58\u7684\u6587\u4ef6\u540d\u9759\u9ed8\u8986\u76d6\u3002",
      initialStatus: "\u8bbe\u7f6e\u5b58\u50a8\u5728\u672c\u5730\u3002",
      settingsSynced: "\u8bbe\u7f6e\u5df2\u4fdd\u5b58\u3002",
      localLoaded: "\u8bbe\u7f6e\u5df2\u52a0\u8f7d\u3002"
    }
  };
  let currentSettings = null;
  let saveTimer = null;
  let settingsReady = false;
  let applyingSettings = false;
  let notionTargets = [];
  let notionTargetParentId = null;
  let notionTargetPath = [];

  function openUrl(url) {
    if (globalThis.chrome?.tabs?.create) {
      globalThis.chrome.tabs.create({ url });
      return;
    }
    location.href = url;
  }

  async function openNotionConnectWindow() {
    await root.chromeHelpers.storageSet({ exportai_notion_inline_flow: true });
    if (globalThis.chrome?.action?.openPopup) {
      try {
        await globalThis.chrome.action.openPopup();
        return;
      } catch (_error) {
        // Fall through to the same popup page when openPopup is unavailable.
      }
    }
    openUrl(globalThis.chrome.runtime.getURL("src/popup/popup.html"));
  }

  function setStatus(message) {
    statusNode.textContent = message || "";
  }

  function normalizeLanguage(value) {
    return String(value || "").toLowerCase() === "zh-cn" ? "zh-CN" : "en";
  }

  function t(key) {
    const language = normalizeLanguage(currentSettings?.appLanguage);
    return LANGUAGE_TEXT[language]?.[key] || LANGUAGE_TEXT.en[key] || key;
  }

  function applyLanguage(languageValue) {
    const language = normalizeLanguage(languageValue);
    const dictionary = LANGUAGE_TEXT[language] || LANGUAGE_TEXT.en;
    document.documentElement.lang = language;
    document.title = dictionary.title || LANGUAGE_TEXT.en.title;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (key && dictionary[key]) {
        node.textContent = dictionary[key];
      }
    });
  }

  function renderFormatGroup(node, name, selectedFormats) {
    const selected = new Set(selectedFormats || []);
    node.innerHTML = FORMAT_OPTIONS.map(([format, label]) => {
      const checked = selected.has(format) ? " checked" : "";
      return `<label class="format-pill"><input type="checkbox" name="${name}" value="${format}"${checked}>${label}</label>`;
    }).join("");
  }

  function activateTab(tabName) {
    const nextTab = String(tabName || "general");
    tabButtons.forEach((button) => {
      const isActive = button.dataset.tab === nextTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.tabIndex = isActive ? 0 : -1;
    });
    tabPanels.forEach((panel) => {
      const isActive = panel.dataset.panel === nextTab;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });
  }

  function selectedFormats(name) {
    return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
  }

  function setChecked(id, value) {
    const node = document.getElementById(id);
    if (node) node.checked = Boolean(value);
  }

  function setValue(id, value) {
    const node = document.getElementById(id);
    if (node) node.value = value ?? "";
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
    notionTargetListNode.replaceChildren();
    notionTargetBack.hidden = !path.length;
    notionTargetBack.title = t("notionBackLevel");
    notionTargetBack.setAttribute("aria-label", t("notionBackLevel"));
    notionTargetPathNode.textContent = path.length ? path.map((item) => item.title).join(" / ") : t("notionAllPages");
    notionTargetEmptyNode.textContent = t("notionNoPages");
    notionTargetEmptyNode.hidden = Boolean(targets.length);

    targets.forEach((target) => {
      const row = document.createElement("div");
      row.className = `notion-settings-row${target.id === selectedId ? " is-selected" : ""}`;
      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = "notion-settings-select";
      selectButton.dataset.targetId = target.id;
      selectButton.innerHTML = '<span class="notion-settings-icon" aria-hidden="true">▧</span><span class="notion-settings-title"></span><span class="notion-settings-check" aria-hidden="true"></span>';
      selectButton.querySelector(".notion-settings-title").textContent = target.title || "Untitled page";
      selectButton.querySelector(".notion-settings-check").textContent = target.id === selectedId ? "✓" : "";
      selectButton.addEventListener("click", async () => {
        const notionTarget = {
          id: target.id,
          type: target.type || "page",
          titleProperty: target.titleProperty || "title",
          title: target.title || "Untitled page"
        };
        currentSettings = await root.storage.saveSettings({ notionTarget });
        notionTargetNode.value = notionTarget.id;
        renderNotionTargetLevel(notionTargetParentId, notionTargetPath);
        setStatus(`${t("notionDefaultDestination")}: ${notionTarget.title}`);
      });
      row.appendChild(selectButton);

      const hasChildren = notionTargets.some((item) => item.parentId === target.id);
      if (hasChildren) {
        const drillButton = document.createElement("button");
        drillButton.type = "button";
        drillButton.className = "notion-settings-drill";
        drillButton.title = t("notionChooseDestination");
        drillButton.setAttribute("aria-label", `${t("notionChooseDestination")}: ${target.title || "Untitled page"}`);
        drillButton.textContent = "›";
        drillButton.addEventListener("click", () => {
          renderNotionTargetLevel(target.id, [...notionTargetPath, { id: target.id, title: target.title || "Untitled page" }]);
        });
        row.appendChild(drillButton);
      }
      notionTargetListNode.appendChild(row);
    });
  }

  async function refreshNotion() {
    const status = await root.chromeHelpers.runtimeSendMessage({ type: MSG_NOTION_STATUS });
    const connected = Boolean(status?.connected);
    const workspaceName = status?.workspaceName || "Notion";
    notionStatusTextNode.textContent = connected
      ? t("notionConnectedTo").replace("{workspace}", workspaceName)
      : t("notionNotConnected");
    notionStatusNode.classList.toggle("is-disconnected", !connected);
    notionConnectButton.hidden = Boolean(status?.connected);
    notionDisconnectButton.hidden = !status?.connected;
    notionTargetNode.disabled = !status?.connected;
    notionTargetBrowser.classList.toggle("is-disabled", !status?.connected);
    if (!status?.connected) {
      notionTargets = [];
      notionTargetNode.value = "";
      notionTargetListNode.replaceChildren();
      notionTargetBack.hidden = true;
      notionTargetPathNode.textContent = t("notionConnectFirst");
      notionTargetEmptyNode.textContent = t("notionConnectFirst");
      notionTargetEmptyNode.hidden = false;
      return;
    }
    const response = await root.chromeHelpers.runtimeSendMessage({ type: MSG_NOTION_TARGETS });
    if (!response?.ok) throw new Error(response?.error || "Could not load Notion destinations.");
    notionTargets = normalizeNotionTargets(response.targets);
    notionTargetNode.value = currentSettings?.notionTarget?.id || "";
    renderNotionTargetLevel(null, []);
  }

  function showNotionError(message) {
    const text = String(message || "Notion connection failed.");
    notionStatusTextNode.textContent = text;
    notionStatusNode.classList.add("is-disconnected");
    setStatus(text);
  }

  function autoExportIntervalMinutesFromSeconds(value) {
    const seconds = Number(value);
    const safeSeconds = Number.isFinite(seconds) ? seconds : 60;
    return Math.max(1, Math.min(1440, Math.round(safeSeconds / 60)));
  }

  function autoExportIntervalSecondsFromMinutes(value) {
    const minutes = Number(value);
    const safeMinutes = Number.isFinite(minutes) ? minutes : 1;
    return Math.max(1, Math.min(1440, Math.round(safeMinutes))) * 60;
  }

  function applySettings(settings) {
    applyingSettings = true;
    currentSettings = settings;
    try {
      setValue("appTheme", settings.appTheme);
      setValue("appLanguage", settings.appLanguage);
      applyLanguage(settings.appLanguage);
      setChecked("includeThinking", settings.includeThinking);
      setChecked("includeThinkingDuration", settings.includeThinkingDuration);
      setChecked("includeMessageTime", settings.includeMessageTime);
      setChecked("showUserAttachmentNames", settings.showUserAttachmentNames);
      setChecked("showAssistantUserAttachmentReferences", settings.showAssistantUserAttachmentReferences);
      setChecked("showAssistantGeneratedAttachmentReferences", settings.showAssistantGeneratedAttachmentReferences);
      setChecked("showAssistantWebReferences", settings.showAssistantWebReferences);
      setValue("humanName", settings.humanName);
      setValue("aiCustomName", settings.aiCustomName);
      setValue("textFormatting", settings.textFormatting);
      setValue("multilineFormat", settings.multilineFormat);
      setChecked("metadataEnabled", settings.metadataEnabled);
      setChecked("includeExportTitle", settings.includeExportTitle);
      setChecked("metadataExportedAt", settings.metadataExportedAt);
      setChecked("metadataModel", settings.metadataModel);
      setChecked("metadataUrl", settings.metadataUrl);
      setChecked("metadataSummaryChatName", settings.metadataSummaryChatName);
      setChecked("metadataSummaryMessages", settings.metadataSummaryMessages);
      const saveMode = form.querySelector(`input[name="saveMode"][value="${settings.saveMode}"]`);
      if (saveMode) saveMode.checked = true;
      setValue("customDownloadFolder", settings.customDownloadFolder);
      setValue("autosaveConflictAction", settings.autosaveConflictAction);
      notionTargetNode.value = settings.notionTarget?.id || "";
      if (notionTargets.length) renderNotionTargetLevel(notionTargetParentId, notionTargetPath);
      setChecked("showHeaderExportButton", settings.showHeaderExportButton);
      setChecked("autoExportEnabled", AUTO_EXPORT_FEATURE_ENABLED && settings.autoExportEnabled);
      setValue("autoExportMode", settings.autoExportMode);
      setValue("autoExportIntervalSeconds", autoExportIntervalMinutesFromSeconds(settings.autoExportIntervalSeconds));
      renderFormatGroup(integrationFormatsNode, "integrationFormat", settings.integrationSelectedFormats);
      renderFormatGroup(autoExportFormatsNode, "autoExportFormat", settings.autoExportSelectedFormats);
    } finally {
      applyingSettings = false;
    }
  }

  function readSettings() {
    const saveMode = form.querySelector('input[name="saveMode"]:checked')?.value || "autosave";
    return {
      ...(currentSettings || {}),
      appTheme: document.getElementById("appTheme").value,
      appLanguage: document.getElementById("appLanguage").value,
      includeThinking: document.getElementById("includeThinking").checked,
      includeThinkingDuration: document.getElementById("includeThinkingDuration").checked,
      includeMessageTime: document.getElementById("includeMessageTime").checked,
      showUserAttachmentNames: document.getElementById("showUserAttachmentNames").checked,
      showAssistantUserAttachmentReferences: document.getElementById("showAssistantUserAttachmentReferences").checked,
      showAssistantGeneratedAttachmentReferences: document.getElementById("showAssistantGeneratedAttachmentReferences").checked,
      showAssistantWebReferences: document.getElementById("showAssistantWebReferences").checked,
      humanName: document.getElementById("humanName").value,
      aiCustomName: document.getElementById("aiCustomName").value,
      textFormatting: document.getElementById("textFormatting").value,
      multilineFormat: document.getElementById("multilineFormat").value,
      metadataEnabled: document.getElementById("metadataEnabled").checked,
      includeExportTitle: document.getElementById("includeExportTitle").checked,
      metadataExportedAt: document.getElementById("metadataExportedAt").checked,
      metadataDeviceUser: false,
      metadataFolder: false,
      metadataTitle: false,
      metadataModel: document.getElementById("metadataModel").checked,
      metadataUrl: document.getElementById("metadataUrl").checked,
      metadataSummaryProvider: false,
      metadataSummaryChatName: document.getElementById("metadataSummaryChatName").checked,
      metadataSummaryMessages: document.getElementById("metadataSummaryMessages").checked,
      metadataStartTime: false,
      metadataEndTime: false,
      metadataDuration: false,
      saveMode,
      customDownloadFolder: document.getElementById("customDownloadFolder").value,
      autosaveConflictAction: document.getElementById("autosaveConflictAction").value,
      notionTarget: currentSettings?.notionTarget || null,
      showHeaderExportButton: document.getElementById("showHeaderExportButton").checked,
      showHeaderExportButtonChatgpt: document.getElementById("showHeaderExportButton").checked,
      showHeaderExportButtonClaude: document.getElementById("showHeaderExportButton").checked,
      showHeaderExportButtonGemini: document.getElementById("showHeaderExportButton").checked,
      showHeaderExportButtonDeepseek: document.getElementById("showHeaderExportButton").checked,
      showHeaderExportButtonGrok: document.getElementById("showHeaderExportButton").checked,
      autoExportEnabled: false,
      autoExportMode: document.getElementById("autoExportMode").value,
      autoExportIntervalSeconds: autoExportIntervalSecondsFromMinutes(document.getElementById("autoExportIntervalSeconds").value),
      integrationSelectedFormats: selectedFormats("integrationFormat"),
      autoExportSelectedFormats: selectedFormats("autoExportFormat")
    };
  }

  function scheduleSave() {
    if (!settingsReady || applyingSettings) {
      return;
    }

    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        if (!settingsReady || applyingSettings) {
          return;
        }

        currentSettings = await root.storage.saveSettings(readSettings());
        root.appTheme.applyThemeDocument(currentSettings.appTheme);
        setStatus(t("settingsSynced"));
      } catch (error) {
        if (error?.localSettings) {
          currentSettings = error.localSettings;
          root.appTheme.applyThemeDocument(currentSettings.appTheme);
        }
        setStatus(`Save failed: ${error.message}`);
      }
    }, 350);
  }

  async function init() {
    let settings = await root.storage.getCachedSettings();

    root.appTheme.applyThemeDocument(settings.appTheme);
    applySettings(settings);
    settingsReady = true;
    setStatus(t("localLoaded"));
    refreshNotion().catch((error) => {
      notionStatusTextNode.textContent = error.message;
      notionStatusNode.classList.add("is-disconnected");
    });
  }

  form.addEventListener("input", scheduleSave);
  form.addEventListener("change", scheduleSave);
  document.getElementById("appLanguage")?.addEventListener("change", (event) => {
    currentSettings = {
      ...(currentSettings || {}),
      appLanguage: event.target.value
    };
    applyLanguage(event.target.value);
  });
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });
  notionConnectButton?.addEventListener("click", openNotionConnectWindow);
  notionTargetBack?.addEventListener("click", () => {
    if (!notionTargetPath.length) return;
    const nextPath = notionTargetPath.slice(0, -1);
    const nextParentId = nextPath.length ? nextPath[nextPath.length - 1].id : null;
    renderNotionTargetLevel(nextParentId, nextPath);
  });
  notionDisconnectButton?.addEventListener("click", async () => {
    await root.chromeHelpers.runtimeSendMessage({ type: MSG_NOTION_DISCONNECT });
    currentSettings = await root.storage.saveSettings({ notionTarget: null });
    await refreshNotion();
  });
  globalThis.chrome?.storage?.onChanged?.addListener?.((changes, areaName) => {
    if (areaName !== "local" || !changes.exportai_notion_connection) return;
    refreshNotion().catch((error) => showNotionError(error?.message || "Could not refresh Notion connection."));
  });

  const requestedTab = new URL(location.href).searchParams.get("tab");
  if (requestedTab && tabButtons.some((button) => button.dataset.tab === requestedTab)) {
    activateTab(requestedTab);
  }

  init().catch((error) => setStatus(`Settings page error: ${error.message}`));
})();
