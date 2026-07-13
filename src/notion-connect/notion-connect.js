(() => {
  const loginPanel = document.getElementById("loginPanel");
  const progressPanel = document.getElementById("progressPanel");
  const successPanel = document.getElementById("successPanel");
  const statusText = document.getElementById("statusText");
  const loginForm = document.getElementById("loginForm");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginSubmit = document.getElementById("loginSubmit");
  const workspaceText = document.getElementById("workspaceText");
  let connecting = false;

  function showPanel(panel, message, isError = false) {
    loginPanel.hidden = panel !== loginPanel;
    progressPanel.hidden = panel !== progressPanel;
    successPanel.hidden = panel !== successPanel;
    statusText.textContent = message || "";
    statusText.classList.toggle("is-error", isError);
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
        resolve(response || { ok: false, error: "No response from ExportAI." });
      });
    });
  }

  async function connectNotion() {
    if (connecting) return;
    connecting = true;
    showPanel(progressPanel, "正在打开 Notion 授权窗口...");
    try {
      const response = await runtimeSendMessage({ type: "EXPORTAI_NOTION_CONNECT" });
      if (!response?.ok) {
        const auth = await storageGet(["exportai_access_token"]);
        showPanel(loginPanel, response?.error || "Notion 连接失败，请重试。", true);
        if (auth.exportai_access_token) loginSubmit.textContent = "重新登录并重试";
        return;
      }
      workspaceText.textContent = response.workspaceName || "Notion 工作区";
      showPanel(successPanel, "授权完成，可以返回 ExportAI 设置。");
    } finally {
      connecting = false;
    }
  }

  async function loginAndContinue(event) {
    event.preventDefault();
    loginSubmit.disabled = true;
    showPanel(progressPanel, "正在登录 ExportAI...");
    try {
      const response = await runtimeSendMessage({
        type: "EXPORTAI_ACCOUNT_LOGIN",
        payload: { email: loginEmail.value.trim(), password: loginPassword.value }
      });
      loginPassword.value = "";
      if (!response?.ok) {
        showPanel(loginPanel, response?.error || "ExportAI 登录失败。", true);
        return;
      }
      await connectNotion();
    } finally {
      loginSubmit.disabled = false;
    }
  }

  async function init() {
    const auth = await storageGet(["exportai_access_token", "exportai_notion_connection"]);
    if (auth.exportai_notion_connection?.accessToken) {
      workspaceText.textContent = auth.exportai_notion_connection.workspaceName || "Notion 工作区";
      showPanel(successPanel, "Notion 已连接，请继续选择默认保存位置。");
      return;
    }
    if (!auth.exportai_access_token) {
      showPanel(loginPanel, "请先登录 ExportAI，然后继续连接 Notion。");
      return;
    }
    await connectNotion();
  }

  loginForm.addEventListener("submit", loginAndContinue);
  document.getElementById("closeButton").addEventListener("click", () => window.close());
  document.getElementById("cancelButton").addEventListener("click", () => window.close());
  document.getElementById("chooseTargetButton").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/options/options.html?tab=integration") });
    window.close();
  });
  init().catch((error) => showPanel(loginPanel, error.message || "连接初始化失败。", true));
})();
