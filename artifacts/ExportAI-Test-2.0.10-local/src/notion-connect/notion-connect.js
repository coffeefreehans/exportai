(() => {
  const root = globalThis.ChatExportAi;
  const loginPanel = document.getElementById("loginPanel");
  const waitingPanel = document.getElementById("waitingPanel");
  const oauthPanel = document.getElementById("oauthPanel");
  const targetsPanel = document.getElementById("targetsPanel");
  const statusText = document.getElementById("statusText");
  const loginForm = document.getElementById("emailLoginForm");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginSubmit = document.getElementById("loginSubmit");
  const googleLoginButton = document.getElementById("googleLoginButton");
  const continueAccountButton = document.getElementById("continueAccountButton");
  const emailLoginToggle = document.getElementById("emailLoginToggle");
  const workspaceText = document.getElementById("workspaceText");
  const targetList = document.getElementById("targetList");
  const emptyTargets = document.getElementById("emptyTargets");
  const addAccessButton = document.getElementById("addAccessButton");
  const disconnectButton = document.getElementById("disconnectButton");
  const panels = [loginPanel, waitingPanel, oauthPanel, targetsPanel];
  let busy = false;

  function showPanel(panel, message = "", tone = "") {
    panels.forEach((item) => { item.hidden = item !== panel; });
    statusText.textContent = message;
    statusText.classList.toggle("is-error", tone === "error");
    statusText.classList.toggle("is-success", tone === "success");
  }

  function storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, (value) => resolve(value || {})));
  }

  function runtimeSendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { ok: false, error: "ExportAI 没有返回结果。" });
      });
    });
  }

  function isAccountAuthError(message) {
    return /未授权|登录|login|sign in|expired|refresh token|unauthorized|401/i.test(String(message || ""));
  }

  async function showLogin(message = "") {
    const auth = await storageGet(["exportai_access_token", "exportai_user_info"]);
    const email = auth.exportai_user_info?.email || "";
    continueAccountButton.hidden = !(auth.exportai_access_token && email);
    continueAccountButton.textContent = email ? `继续使用 ${email}` : "继续当前账号";
    const displayMessage = message || "请选择 ExportAI 登录方式，然后继续连接 Notion。";
    showPanel(loginPanel, displayMessage, message ? "error" : "");
  }

  async function connectNotion() {
    if (busy) return;
    busy = true;
    showPanel(oauthPanel);
    try {
      const response = await runtimeSendMessage({ type: "EXPORTAI_NOTION_CONNECT" });
      if (!response?.ok) {
        if (isAccountAuthError(response?.error)) {
          await showLogin("ExportAI 登录已过期，请重新登录后继续。");
        } else {
          await showLogin(`Notion 连接失败：${response?.error || "请重试。"}`);
        }
        return;
      }
      await loadTargets(response.workspaceName || "Notion 工作区");
    } finally {
      busy = false;
    }
  }

  async function loginAndContinue(event) {
    event.preventDefault();
    if (busy) return;
    busy = true;
    loginSubmit.disabled = true;
    showPanel(waitingPanel, "正在登录 ExportAI…");
    try {
      const response = await runtimeSendMessage({
        type: "EXPORTAI_ACCOUNT_LOGIN",
        payload: { email: loginEmail.value.trim(), password: loginPassword.value }
      });
      loginPassword.value = "";
      if (!response?.ok) {
        await showLogin(response?.error || "ExportAI 登录失败，请重试。");
        return;
      }
    } finally {
      loginSubmit.disabled = false;
      busy = false;
    }
    await connectNotion();
  }

  async function googleLoginAndContinue() {
    if (busy) return;
    busy = true;
    googleLoginButton.disabled = true;
    showPanel(waitingPanel);
    try {
      const response = await runtimeSendMessage({ type: "EXPORTAI_ACCOUNT_GOOGLE_LOGIN" });
      if (!response?.ok) {
        await showLogin(response?.error || "Google 登录未完成，请重试。");
        return;
      }
    } finally {
      googleLoginButton.disabled = false;
      busy = false;
    }
    await connectNotion();
  }

  function targetButton(target, selectedId) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `target-button${target.id === selectedId ? " is-selected" : ""}`;
    button.dataset.targetId = target.id;
    button.innerHTML = '<span class="target-icon" aria-hidden="true">▧</span><span class="target-title"></span><span class="target-chevron" aria-hidden="true">›</span>';
    button.querySelector(".target-title").textContent = target.title || "未命名页面";
    button.addEventListener("click", () => selectTarget(target, button));
    return button;
  }

  async function selectTarget(target, button) {
    if (busy) return;
    busy = true;
    const notionTarget = {
      id: target.id,
      type: target.type || "page",
      titleProperty: target.titleProperty || "title",
      title: target.title || "未命名页面"
    };
    try {
      await root.storage.saveSettings({ notionTarget });
    } catch (error) {
      if (!error?.localSettings) {
        busy = false;
        showPanel(targetsPanel, error?.message || "保存位置失败。", "error");
        return;
      }
    }
    targetList.querySelectorAll(".target-button").forEach((item) => item.classList.toggle("is-selected", item === button));
    showPanel(targetsPanel, `已选择“${notionTarget.title}”，可以返回 ExportAI 发送内容。`, "success");
    busy = false;
  }

  async function loadTargets(workspaceName = "") {
    showPanel(targetsPanel, "正在加载可用页面…");
    const [response, settings] = await Promise.all([
      runtimeSendMessage({ type: "EXPORTAI_NOTION_TARGETS" }),
      root.storage.getSettings().catch(() => ({ notionTarget: null }))
    ]);
    if (!response?.ok) {
      if (isAccountAuthError(response?.error)) {
        await showLogin("ExportAI 登录已过期，请重新登录后继续。");
      } else {
        showPanel(targetsPanel, response?.error || "无法读取 Notion 页面。", "error");
      }
      return;
    }
    const stored = await storageGet(["exportai_notion_connection"]);
    workspaceText.textContent = workspaceName || stored.exportai_notion_connection?.workspaceName || "Notion 工作区";
    targetList.replaceChildren();
    (response.targets || []).forEach((target) => targetList.appendChild(targetButton(target, settings?.notionTarget?.id)));
    emptyTargets.hidden = Boolean(response.targets?.length);
    showPanel(targetsPanel);
  }

  async function disconnectNotion() {
    if (busy) return;
    busy = true;
    await runtimeSendMessage({ type: "EXPORTAI_NOTION_DISCONNECT" });
    await root.storage.saveSettings({ notionTarget: null }).catch(() => null);
    busy = false;
    await showLogin("Notion 已断开连接。重新连接时会再次显示官方授权页面。");
  }

  async function init() {
    const auth = await storageGet(["exportai_access_token", "exportai_user_info", "exportai_notion_connection"]);
    if (auth.exportai_notion_connection?.accessToken) {
      await loadTargets(auth.exportai_notion_connection.workspaceName || "Notion 工作区");
      return;
    }
    await showLogin();
  }

  loginForm.addEventListener("submit", loginAndContinue);
  googleLoginButton.addEventListener("click", googleLoginAndContinue);
  continueAccountButton.addEventListener("click", connectNotion);
  emailLoginToggle.addEventListener("click", () => {
    loginForm.hidden = !loginForm.hidden;
    emailLoginToggle.textContent = loginForm.hidden ? "使用邮箱登录" : "收起邮箱登录";
    if (!loginForm.hidden) loginEmail.focus();
  });
  addAccessButton.addEventListener("click", connectNotion);
  disconnectButton.addEventListener("click", disconnectNotion);
  document.getElementById("openSettingsButton").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/options/options.html?tab=integration") });
  });
  document.getElementById("closeButton").addEventListener("click", () => window.close());
  document.getElementById("cancelButton").addEventListener("click", () => window.close());

  init().catch((error) => showLogin(error?.message || "连接初始化失败。"));
})();
