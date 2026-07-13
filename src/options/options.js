(() => {
  const root = globalThis.ChatExportAi;
  const { EXPORT_FORMATS, MSG_CHECK_MEMBERSHIP, MSG_NOTION_DISCONNECT, MSG_NOTION_STATUS, MSG_NOTION_TARGETS } = root.constants;
  const WEB_URL = "https://exportai.nexscp.com";
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
  const accountEmailNode = document.getElementById("accountEmail");
  const accountPlanNode = document.getElementById("accountPlan");
  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const integrationFormatsNode = document.getElementById("integrationFormats");
  const autoExportFormatsNode = document.getElementById("autoExportFormats");
  const notionConnectButton = document.getElementById("notionConnect");
  const notionDisconnectButton = document.getElementById("notionDisconnect");
  const notionTargetNode = document.getElementById("notionTarget");
  const notionStatusNode = document.getElementById("notionStatus");
  const notionStatusTextNode = document.getElementById("notionStatusText");
  const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
  const tabPanels = Array.from(document.querySelectorAll("[data-panel]"));
  const AUTH_KEYS = [
    "exportai_access_token",
    "exportai_refresh_token",
    "exportai_user_info",
    "exportai_membership"
  ];
  const AUTH_LOGOUT_KEY = "exportai_auth_logout_at";
  const LANGUAGE_TEXT = {
    en: {
      notionConnect: "Connect",
      notionDisconnect: "Disconnect",
      notionNotConnected: "Not connected",
      notionConnectedTo: "Connected to {workspace}",
      notionDefaultDestination: "Default destination",
      notionConnectFirst: "Connect Notion first",
      notionChooseDestination: "Choose a page or database",
      notionPrivacy: "Chat content is sent directly from your browser to Notion. ExportAI does not store message content.",
      title: "ExportAI Settings",
      accountButton: "Account",
      logoutButton: "Logout",
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
      paid: "Paid",
      paidActive: "Paid active",
      inPageExportButton: "In-page export button",
      enableFloatingExport: "Enable draggable floating export",
      exportRuntime: "Export runtime",
      enableAutoExport: "Enable auto export",
      autoExportMode: "Auto export mode",
      onChange: "On change",
      everyNMinutes: "Every N minutes",
      intervalMinutes: "Interval minutes",
      autoExportManualSeedHint: "Auto export starts only after you manually export this conversation once. It reuses that saved filename and overwrites it silently.",
      freeAccount: "Free account",
      lifetimeMember: "Lifetime member",
      yearlyMember: "Yearly member",
      monthlyMember: "Monthly member",
      paidMember: "Paid member",
      signedIn: "Signed in",
      notSignedIn: "Not signed in",
      signInToSync: "Sign in to sync settings",
      initialStatus: "Local settings will load first, then sync to your account.",
      settingsSynced: "Settings synced.",
      localLoaded: "Local settings loaded. Syncing account in background..."
    },
    "zh-CN": {
      notionConnect: "\u8fde\u63a5",
      notionDisconnect: "\u65ad\u5f00\u8fde\u63a5",
      notionNotConnected: "\u672a\u8fde\u63a5",
      notionConnectedTo: "\u5df2\u8fde\u63a5\u5230 {workspace}",
      notionDefaultDestination: "\u9ed8\u8ba4\u4fdd\u5b58\u4f4d\u7f6e",
      notionConnectFirst: "\u8bf7\u5148\u8fde\u63a5 Notion",
      notionChooseDestination: "\u9009\u62e9\u9875\u9762\u6216\u6570\u636e\u5e93",
      notionPrivacy: "\u5bf9\u8bdd\u5185\u5bb9\u7531\u6d4f\u89c8\u5668\u76f4\u63a5\u53d1\u9001\u5230 Notion\uff0cExportAI \u4e0d\u5b58\u50a8\u6b63\u6587\u3002",
      title: "ExportAI 设置",
      accountButton: "账号",
      logoutButton: "退出",
      tabGeneral: "通用",
      tabExport: "导出",
      tabFiles: "文件",
      tabIntegration: "集成",
      generalTitle: "通用",
      appTheme: "主题",
      themeAuto: "自动",
      themeLight: "浅色",
      themeDark: "深色",
      language: "语言",
      reasoningTime: "推理与时间",
      includeThinking: "导出可见推理",
      includeThinkingDuration: "导出推理耗时",
      includeMessageTime: "导出消息时间",
      referencesAttachments: "引用与附件",
      userAttachments: "用户附件",
      assistantUserRefs: "助手引用的用户文件",
      assistantGeneratedFiles: "助手生成的文件",
      webReferences: "网络引用",
      exportTitle: "导出",
      txtExport: "TXT 导出",
      humanName: "用户名称",
      aiName: "AI 名称",
      textFormatting: "文本格式",
      cleanText: "纯文本",
      multilineStyle: "多行样式",
      tab: "缩进",
      name: "名称",
      none: "无",
      metadata: "元数据",
      enableMetadata: "启用元数据",
      exportTitleToggle: "导出标题",
      date: "日期",
      model: "模型",
      url: "URL",
      chatName: "对话名称",
      messageCount: "消息数量",
      filesTitle: "文件",
      downloadBehavior: "下载行为",
      downloadFolder: "保存到下载文件夹",
      customSubfolder: "保存到下载目录内的自定义子文件夹",
      askLocation: "询问保存位置",
      customSubfolderLabel: "自定义子文件夹",
      conflictAction: "冲突处理",
      overwrite: "覆盖",
      keepBoth: "保留两个",
      integrationTitle: "集成",
      paid: "付费",
      paidActive: "付费已激活",
      inPageExportButton: "页面内导出按钮",
      enableFloatingExport: "启用可拖动浮动导出",
      exportRuntime: "导出运行时",
      enableAutoExport: "启用自动导出",
      autoExportMode: "自动导出模式",
      onChange: "内容变化时",
      everyNMinutes: "每 N 分钟",
      intervalMinutes: "间隔分钟数",
      autoExportManualSeedHint: "自动导出只会在当前对话手动导出过一次后启动，并复用上次保存的文件名静默覆盖。",
      freeAccount: "免费账号",
      lifetimeMember: "永久会员",
      yearlyMember: "年度会员",
      monthlyMember: "月度会员",
      paidMember: "付费会员",
      signedIn: "已登录",
      notSignedIn: "未登录",
      signInToSync: "登录后同步设置",
      initialStatus: "先加载本地设置，然后同步到账号。",
      settingsSynced: "设置已同步。",
      localLoaded: "本地设置已加载，正在同步账号..."
    }
  };
  let currentSettings = null;
  let membership = { isMember: false };
  let saveTimer = null;
  let settingsReady = false;
  let applyingSettings = false;
  let hasLocalEditsSinceRefresh = false;

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
    updateAccountHeader(lastAuthState, membership);
  }

  let lastAuthState = null;

  function storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, (result) => resolve(result || {})));
  }

  async function getAuthState() {
    const stored = await storageGet(["exportai_access_token", "exportai_user_info"]);
    let user = null;
    try {
      user = typeof stored.exportai_user_info === "string"
        ? JSON.parse(stored.exportai_user_info)
        : stored.exportai_user_info;
    } catch (_error) {
      user = null;
    }
    return { token: stored.exportai_access_token || "", user };
  }

  async function getMembership(forceRefresh = false) {
    const response = await root.chromeHelpers.runtimeSendMessage({
      type: MSG_CHECK_MEMBERSHIP,
      payload: { forceRefresh }
    });
    return response?.ok
      ? { ...response, isFresh: forceRefresh }
      : { isMember: false, isFresh: forceRefresh };
  }

  async function getCachedMembership() {
    const stored = await storageGet(["exportai_membership"]);
    return stored.exportai_membership
      ? { ...stored.exportai_membership, isFresh: false }
      : { isMember: false, isFresh: false };
  }

  function formatPlanLabel(value) {
    const planType = String(value || "").toUpperCase();
    if (planType === "LIFETIME") return t("lifetimeMember");
    if (planType === "YEARLY") return t("yearlyMember");
    if (planType === "MONTHLY") return t("monthlyMember");
    return t("paidMember");
  }

  function updateAccountHeader(auth, currentMembership) {
    lastAuthState = auth || lastAuthState;
    const email = auth?.user?.email || t("signedIn");
    const plan = currentMembership?.isMember
      ? formatPlanLabel(currentMembership.planType)
      : t("freeAccount");
    accountEmailNode.textContent = email;
    accountPlanNode.textContent = plan;
    if (logoutButton) logoutButton.hidden = !auth?.token;
    const paidBadge = document.getElementById("paidBadge");
    if (paidBadge) {
      paidBadge.textContent = currentMembership?.isMember ? t("paidActive") : t("paid");
    }
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
    notionTargetNode.disabled = !status?.connected || !membership.isMember;
    if (!status?.connected) {
      notionTargetNode.replaceChildren(new Option(t("notionConnectFirst"), ""));
      return;
    }
    const response = await root.chromeHelpers.runtimeSendMessage({ type: MSG_NOTION_TARGETS });
    if (!response?.ok) throw new Error(response?.error || "Could not load Notion destinations.");
    notionTargetNode.replaceChildren();
    notionTargetNode.add(new Option(t("notionChooseDestination"), ""));
    response.targets.forEach((target) => {
      const option = new Option(target.title, target.id);
      option.dataset.type = target.type;
      option.dataset.titleProperty = target.titleProperty || "title";
      notionTargetNode.add(option);
    });
    if (currentSettings?.notionTarget?.id) notionTargetNode.value = currentSettings.notionTarget.id;
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

  function healBlankCheckboxSnapshot(settings) {
    const defaultSettings = root.defaults?.settings || {};
    const visibleDefaultTrueKeys = [
      "includeThinking",
      "showUserAttachmentNames",
      "showAssistantUserAttachmentReferences",
      "showAssistantGeneratedAttachmentReferences",
      "metadataEnabled",
      "includeExportTitle",
      "metadataExportedAt",
      "metadataModel",
      "metadataSummaryChatName",
      "metadataSummaryMessages"
    ];
    const allVisibleDefaultsCleared = visibleDefaultTrueKeys.every((key) => defaultSettings[key] === true && settings[key] === false);

    if (!allVisibleDefaultsCleared) {
      return settings;
    }

    const next = { ...settings };
    visibleDefaultTrueKeys.forEach((key) => {
      next[key] = defaultSettings[key];
    });
    if (!String(next.humanName || "").trim()) {
      next.humanName = defaultSettings.humanName;
    }
    if (!String(next.aiCustomName || "").trim()) {
      next.aiCustomName = defaultSettings.aiCustomName;
    }
    if (!Array.isArray(next.popupSelectedFormats) || !next.popupSelectedFormats.length) {
      next.popupSelectedFormats = defaultSettings.popupSelectedFormats;
    }
    if (!Array.isArray(next.integrationSelectedFormats) || !next.integrationSelectedFormats.length) {
      next.integrationSelectedFormats = defaultSettings.integrationSelectedFormats;
    }
    if (!Array.isArray(next.autoExportSelectedFormats) || !next.autoExportSelectedFormats.length) {
      next.autoExportSelectedFormats = defaultSettings.autoExportSelectedFormats;
    }
    return next;
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
      if (settings.notionTarget?.id) notionTargetNode.value = settings.notionTarget.id;
      setChecked("showHeaderExportButton", settings.showHeaderExportButton);
      setChecked("autoExportEnabled", AUTO_EXPORT_FEATURE_ENABLED && settings.autoExportEnabled);
      setValue("autoExportMode", settings.autoExportMode);
      setValue("autoExportIntervalSeconds", autoExportIntervalMinutesFromSeconds(settings.autoExportIntervalSeconds));
      renderFormatGroup(integrationFormatsNode, "integrationFormat", settings.integrationSelectedFormats);
      renderFormatGroup(autoExportFormatsNode, "autoExportFormat", settings.autoExportSelectedFormats);

      const shouldLockPaid = membership.isFresh === true && !membership.isMember;
      const paidControls = document.querySelectorAll(".paid-card input, .paid-card select");
      paidControls.forEach((node) => {
        node.disabled = shouldLockPaid;
      });
      document.querySelector(".paid-card")?.classList.toggle("is-locked", shouldLockPaid);
      document.querySelector(".paid-card")?.classList.toggle("is-active-member", Boolean(membership.isMember));
    } finally {
      applyingSettings = false;
    }
  }

  function readSettings() {
    const saveMode = form.querySelector('input[name="saveMode"]:checked')?.value || "autosave";
    const isMember = Boolean(membership.isMember);
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
      notionTarget: notionTargetNode.value ? { id: notionTargetNode.value, type: notionTargetNode.selectedOptions[0]?.dataset.type || "page", titleProperty: notionTargetNode.selectedOptions[0]?.dataset.titleProperty || "title", title: notionTargetNode.selectedOptions[0]?.textContent || "" } : (currentSettings?.notionTarget || null),
      showHeaderExportButton: isMember
        ? document.getElementById("showHeaderExportButton").checked
        : Boolean(currentSettings?.showHeaderExportButton),
      showHeaderExportButtonChatgpt: isMember
        ? document.getElementById("showHeaderExportButton").checked
        : Boolean(currentSettings?.showHeaderExportButtonChatgpt ?? currentSettings?.showHeaderExportButton),
      showHeaderExportButtonClaude: isMember
        ? document.getElementById("showHeaderExportButton").checked
        : Boolean(currentSettings?.showHeaderExportButtonClaude ?? currentSettings?.showHeaderExportButton),
      showHeaderExportButtonGemini: isMember
        ? document.getElementById("showHeaderExportButton").checked
        : Boolean(currentSettings?.showHeaderExportButtonGemini ?? currentSettings?.showHeaderExportButton),
      showHeaderExportButtonDeepseek: isMember
        ? document.getElementById("showHeaderExportButton").checked
        : Boolean(currentSettings?.showHeaderExportButtonDeepseek ?? currentSettings?.showHeaderExportButton),
      showHeaderExportButtonGrok: isMember
        ? document.getElementById("showHeaderExportButton").checked
        : Boolean(currentSettings?.showHeaderExportButtonGrok ?? currentSettings?.showHeaderExportButton),
      autoExportEnabled: false,
      autoExportMode: document.getElementById("autoExportMode").value,
      autoExportIntervalSeconds: autoExportIntervalSecondsFromMinutes(document.getElementById("autoExportIntervalSeconds").value),
      integrationSelectedFormats: isMember
        ? selectedFormats("integrationFormat")
        : (currentSettings?.integrationSelectedFormats || []),
      autoExportSelectedFormats: isMember
        ? selectedFormats("autoExportFormat")
        : (currentSettings?.autoExportSelectedFormats || [])
    };
  }

  function scheduleSave() {
    if (!settingsReady || applyingSettings) {
      return;
    }

    hasLocalEditsSinceRefresh = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        if (!settingsReady || applyingSettings) {
          return;
        }

        currentSettings = await root.storage.saveSettings(readSettings());
        root.appTheme.applyThemeDocument(currentSettings.appTheme);
        hasLocalEditsSinceRefresh = false;
        setStatus(t("settingsSynced"));
      } catch (error) {
        if (error?.localSettings) {
          currentSettings = error.localSettings;
          root.appTheme.applyThemeDocument(currentSettings.appTheme);
        }
        setStatus(`Saved locally. Account sync failed: ${error.message}`);
      }
    }, 350);
  }

  async function refreshAccountStateInBackground(auth) {
    try {
      membership = await getMembership(true);
      updateAccountHeader(auth, membership);

      let settings = await root.storage.getSettings();
      const healedSettings = healBlankCheckboxSnapshot(settings);
      if (healedSettings !== settings) {
        try {
          settings = await root.storage.saveSettings(healedSettings);
        } catch (error) {
          settings = error?.localSettings || healedSettings;
        }
      }

      if (!hasLocalEditsSinceRefresh) {
        root.appTheme.applyThemeDocument(settings.appTheme);
        applySettings(settings);
      }
      await refreshNotion().catch((error) => {
        notionStatusTextNode.textContent = error.message;
        notionStatusNode.classList.add("is-disconnected");
      });
      setStatus(t("settingsSynced"));
    } catch (error) {
      setStatus(`Local settings loaded. Account sync failed: ${error.message}`);
    }
  }

  async function init() {
    const auth = await getAuthState();
    if (!auth.token) {
      accountEmailNode.textContent = t("notSignedIn");
      accountPlanNode.textContent = t("signInToSync");
      if (logoutButton) logoutButton.hidden = true;
      form.querySelectorAll("input, select").forEach((node) => { node.disabled = true; });
      return;
    }

    membership = await getCachedMembership();
    updateAccountHeader(auth, membership);

    let settings = await root.storage.getCachedSettings();
    const healedSettings = healBlankCheckboxSnapshot(settings);
    if (healedSettings !== settings) {
      settings = healedSettings;
      root.storage.saveSettings(healedSettings).catch(() => null);
    }

    root.appTheme.applyThemeDocument(settings.appTheme);
    applySettings(settings);
    settingsReady = true;
    setStatus(t("localLoaded"));
    refreshAccountStateInBackground(auth);
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
  loginButton.addEventListener("click", () => openUrl(`${WEB_URL}/account?extension_callback=1`));
  logoutButton?.addEventListener("click", () => {
    chrome.storage.local.set({ [AUTH_LOGOUT_KEY]: new Date().toISOString() }, () => {
      chrome.storage.local.remove(AUTH_KEYS, () => {
        location.reload();
      });
    });
  });
  notionConnectButton?.addEventListener("click", openNotionConnectWindow);
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
