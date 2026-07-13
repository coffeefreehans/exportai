/*
 * Service worker for downloads and background-only browser operations.
 * PDF rendering uses a hidden extension tab + Chrome's print engine
 * so the exported PDF keeps HTML styling and selectable text.
 */
(() => {
  const MSG_DOWNLOAD_FILE = "CHAT_EXPORT_AI_DOWNLOAD_FILE";
  const MSG_CAPTURE_TAB_MHTML = "CHAT_EXPORT_AI_CAPTURE_TAB_MHTML";
  const MSG_RENDER_HTML_TO_PDF = "CHAT_EXPORT_AI_RENDER_HTML_TO_PDF";
  const MSG_WARMUP_PDF_RENDERER = "CHAT_EXPORT_AI_WARMUP_PDF_RENDERER";
  const MSG_GET_CHAT_STATUS = "CHAT_EXPORT_AI_GET_CHAT_STATUS";
  const MSG_EXPORT_CHAT = "CHAT_EXPORT_AI_EXPORT_CHAT";
  const MSG_AUTO_EXPORT_CHAT = "CHAT_EXPORT_AI_AUTO_EXPORT_CHAT";
  const MSG_SET_ACTION_ICON_THEME = "CHAT_EXPORT_AI_SET_ACTION_ICON_THEME";
  const MSG_CHECK_MEMBERSHIP = "CHECK_MEMBERSHIP";
  const MSG_GET_ACCOUNT_SETTINGS = "EXPORTAI_GET_ACCOUNT_SETTINGS";
  const MSG_SAVE_ACCOUNT_SETTINGS = "EXPORTAI_SAVE_ACCOUNT_SETTINGS";
  const MSG_WRITE_FILES_TO_DIRECTORY = "EXPORTAI_WRITE_FILES_TO_DIRECTORY";
  const MSG_WRITE_FILE_TO_DIRECTORY_CHUNK = "EXPORTAI_WRITE_FILE_TO_DIRECTORY_CHUNK";
  const PORT_WRITE_DIRECTORY_FILE = "EXPORTAI_WRITE_DIRECTORY_FILE_PORT";
  const MSG_NOTION_CONNECT = "EXPORTAI_NOTION_CONNECT";
  const MSG_NOTION_DISCONNECT = "EXPORTAI_NOTION_DISCONNECT";
  const MSG_NOTION_STATUS = "EXPORTAI_NOTION_STATUS";
  const MSG_NOTION_TARGETS = "EXPORTAI_NOTION_TARGETS";
  const MSG_NOTION_CREATE_PAGE = "EXPORTAI_NOTION_CREATE_PAGE";
  const NOTION_STORAGE_KEY = "exportai_notion_connection";
  const NOTION_VERSION = "2026-03-11";

  const PORT_PDF_RENDER_TAB = "CHAT_EXPORT_AI_PDF_RENDER_TAB_PORT";
  const MSG_PDF_TAB_LOAD_HTML = "CHAT_EXPORT_AI_PDF_TAB_LOAD_HTML";
  const MSG_PDF_TAB_HTML_READY = "CHAT_EXPORT_AI_PDF_TAB_HTML_READY";

  const PDF_RENDER_TAB_PATH = "src/background/pdf-render-tab.html";
  const API_BASE = "https://exportai.nexscp.com";
  const MEMBERSHIP_STORAGE_KEY = "exportai_membership";
  const FS_DIRECTORY_DB_NAME = "exportai-file-system-access";
  const FS_DIRECTORY_STORE_NAME = "handles";
  const FS_DIRECTORY_HANDLE_KEY = "lastDownloadDirectory";
  const DEFAULT_EXPORT_TIMEOUT_MS = 20000;
  const MAX_EXPORT_TIMEOUT_MS = 20000;
  const AUTO_EXPORT_TAB_TIMEOUT_MS = 60000;
  const PDF_RENDER_TAB_IDLE_CLOSE_MS = 45000;

  const ACTION_ICON_PATHS = {
    default: {
      16: "src/assets/robot-download-16.png",
      32: "src/assets/robot-download-32.png",
      48: "src/assets/robot-download-48.png",
      128: "src/assets/robot-download-128.png"
    },
    light: {
      16: "src/assets/robot-download-light-16.png",
      32: "src/assets/robot-download-light-32.png",
      48: "src/assets/robot-download-light-48.png",
      128: "src/assets/robot-download-light-128.png"
    },
    dark: {
      16: "src/assets/robot-download-dark-16.png",
      32: "src/assets/robot-download-dark-32.png",
      48: "src/assets/robot-download-dark-48.png",
      128: "src/assets/robot-download-dark-128.png"
    }
  };

  let pdfRenderQueue = Promise.resolve();
  let pdfRenderTabId = null;
  let pdfRenderTabPort = null;
  let pdfRenderTabInitPromise = null;
  let pdfRenderTabIdleTimerId = null;
  let pdfRenderTabPortWaiters = [];

  const pendingPdfTabLoads = new Map();

  function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  }

  function textToDataUrl(content, mimeType) {
    const safeMimeType = mimeType || "application/octet-stream";
    const bytes = new TextEncoder().encode(String(content || ""));
    return "data:" + safeMimeType + ";base64," + bytesToBase64(bytes);
  }

  async function blobToDataUrl(blob) {
    const buffer = await blob.arrayBuffer();
    const safeMimeType = blob.type || "application/octet-stream";
    return "data:" + safeMimeType + ";base64," + bytesToBase64(new Uint8Array(buffer));
  }

  function normalizeDownloadFilename(filename) {
    const rawValue = String(filename || "chat-export");
    const normalized = rawValue.normalize ? rawValue.normalize("NFC") : rawValue;
    const pathSegments = normalized
      .replace(/\\/g, "/")
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .filter((segment) => segment !== "." && segment !== "..")
      .map((segment) => {
        return segment
          .replace(/[<>:"|?*\u0000-\u001F]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      })
      .filter(Boolean);

    if (!pathSegments.length) {
      return "chat-export";
    }

    return pathSegments.join("/");
  }

  function normalizeConflictAction(value) {
    return value === "uniquify" ? "uniquify" : "overwrite";
  }

  function downloadByUrl(url, filename, saveAs = false, conflictAction = "overwrite") {
    return new Promise((resolve, reject) => {
      const downloadOptions = {
        url,
        filename: normalizeDownloadFilename(filename),
        saveAs: Boolean(saveAs)
      };

      if (!saveAs) {
        downloadOptions.conflictAction = normalizeConflictAction(conflictAction);
      }

      chrome.downloads.download(downloadOptions, (downloadId) => {
        const error = chrome.runtime.lastError;

        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve({
          ok: true,
          downloadId
        });
      });
    });
  }

  function storageGet(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => resolve(result || {}));
    });
  }

  function storageSet(value) {
    return new Promise((resolve) => {
      chrome.storage.local.set(value, () => resolve(true));
    });
  }

  function storageRemove(keys) {
    return new Promise((resolve) => chrome.storage.local.remove(keys, () => resolve(true)));
  }

  async function notionRequest(path, options = {}) {
    const stored = await storageGet([NOTION_STORAGE_KEY]);
    const token = stored[NOTION_STORAGE_KEY]?.accessToken;
    if (!token) throw new Error("Notion is not connected.");
    const response = await fetch(`https://api.notion.com/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || `Notion request failed (${response.status}).`);
    return body;
  }

  async function connectNotion() {
    if (!chrome.identity?.launchWebAuthFlow) throw new Error("This browser does not support Notion authorization.");
    const redirectUri = chrome.identity.getRedirectURL("notion");
    const state = crypto.randomUUID();
    const account = await storageGet(["exportai_access_token"]);
    const accountToken = account.exportai_access_token;
    if (!accountToken) throw new Error("Sign in to ExportAI before connecting Notion.");
    const accountHeaders = { Authorization: `Bearer ${accountToken}` };
    const startResponse = await fetch(`${API_BASE}/api/notion/oauth/start?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`, { headers: accountHeaders });
    const startBody = await startResponse.json();
    if (!startResponse.ok || !startBody?.data?.authorizationUrl) throw new Error(startBody?.message || "Could not start Notion authorization.");
    const callbackUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url: startBody.data.authorizationUrl, interactive: true }, (url) => {
        const error = chrome.runtime.lastError;
        if (error || !url) reject(new Error(error?.message || "Notion authorization was cancelled."));
        else resolve(url);
      });
    });
    const callback = new URL(callbackUrl);
    if (callback.searchParams.get("state") !== state) throw new Error("Invalid Notion authorization state.");
    const code = callback.searchParams.get("code");
    if (!code) throw new Error(callback.searchParams.get("error") || "Notion did not return an authorization code.");
    const exchangeResponse = await fetch(`${API_BASE}/api/notion/oauth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...accountHeaders },
      body: JSON.stringify({ code, redirectUri })
    });
    const exchangeBody = await exchangeResponse.json();
    if (!exchangeResponse.ok || !exchangeBody?.data?.accessToken) throw new Error(exchangeBody?.message || "Could not finish Notion authorization.");
    const connection = exchangeBody.data;
    await storageSet({ [NOTION_STORAGE_KEY]: connection });
    return { ok: true, connected: true, workspaceName: connection.workspaceName || "Notion" };
  }

  async function getNotionTargets() {
    const body = await notionRequest("/search", { method: "POST", body: JSON.stringify({ page_size: 100, sort: { direction: "descending", timestamp: "last_edited_time" } }) });
    const targets = (body.results || []).filter((item) => item.object === "page" || item.object === "data_source").map((item) => ({
      id: item.id,
      type: item.object === "data_source" ? "data_source" : "page",
      titleProperty: item.object === "data_source" ? (Object.entries(item.properties || {}).find(([, property]) => property?.type === "title")?.[0] || "Name") : "title",
      title: item.object === "data_source"
        ? (item.title || []).map((part) => part.plain_text || "").join("") || "Untitled database"
        : Object.values(item.properties || {}).flatMap((property) => property?.title || []).map((part) => part.plain_text || "").join("") || "Untitled page",
      url: item.url || ""
    }));
    return { ok: true, targets };
  }

  async function createNotionPage(payload = {}) {
    const target = payload.target || {};
    const parent = target.type === "data_source" ? { type: "data_source_id", data_source_id: target.id } : { type: "page_id", page_id: target.id };
    const requestId = String(payload.requestId || "");
    const stored = await storageGet([`exportai_notion_export_${requestId}`]);
    if (requestId && stored[`exportai_notion_export_${requestId}`]?.url) return { ok: true, duplicate: true, ...stored[`exportai_notion_export_${requestId}`] };
    const titleProperty = target.type === "data_source" ? String(target.titleProperty || "Name") : "title";
    const page = await notionRequest("/pages", { method: "POST", body: JSON.stringify({ parent, properties: { [titleProperty]: { type: "title", title: [{ type: "text", text: { content: String(payload.title || "AI conversation").slice(0, 2000) } }] } }, children: (payload.blocks || []).slice(0, 100) }) });
    const remaining = (payload.blocks || []).slice(100);
    for (let index = 0; index < remaining.length; index += 100) {
      await notionRequest(`/blocks/${page.id}/children`, { method: "PATCH", body: JSON.stringify({ children: remaining.slice(index, index + 100) }) });
    }
    const result = { pageId: page.id, url: page.url };
    if (requestId) await storageSet({ [`exportai_notion_export_${requestId}`]: result });
    return { ok: true, ...result };
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function openDirectoryDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(FS_DIRECTORY_DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(FS_DIRECTORY_STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open directory database."));
    });
  }

  async function getStoredDirectoryHandle() {
    const db = await openDirectoryDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FS_DIRECTORY_STORE_NAME, "readonly");
      const request = tx.objectStore(FS_DIRECTORY_STORE_NAME).get(FS_DIRECTORY_HANDLE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Could not read saved directory."));
    });
  }

  function dataUrlToBlob(dataUrl, mimeType = "application/octet-stream") {
    const value = String(dataUrl || "");
    const match = value.match(/^data:([^,]*),(.*)$/i);
    if (!match) {
      return new Blob([value], { type: mimeType });
    }

    const meta = match[1] || "";
    const type = meta.split(";")[0] || mimeType;
    const body = match[2] || "";
    if (/;base64/i.test(meta)) {
      const binary = atob(body);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return new Blob([bytes], { type });
    }

    return new Blob([decodeURIComponent(body)], { type });
  }

  function base64ToBytes(base64) {
    const binary = atob(String(base64 || ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  async function getWritableFileHandle(directoryHandle, filename) {
    const segments = normalizeDownloadFilename(filename).split("/").filter(Boolean);
    const fileName = segments.pop() || "chat-export";
    let currentDirectory = directoryHandle;
    for (const segment of segments) {
      currentDirectory = await currentDirectory.getDirectoryHandle(segment, { create: true });
    }
    return currentDirectory.getFileHandle(fileName, { create: true });
  }

  async function assertDirectoryWritablePermission(directoryHandle) {
    if (typeof directoryHandle.queryPermission !== "function") {
      return;
    }

    const permission = await directoryHandle.queryPermission({ mode: "readwrite" });
    if (permission === "granted") {
      return;
    }

    if (permission === "denied") {
      throw new Error("保存目录权限已被浏览器拒绝。请重新手动导出并选择目录。");
    }

    if (typeof directoryHandle.requestPermission === "function") {
      try {
        const requestedPermission = await directoryHandle.requestPermission({ mode: "readwrite" });
        if (requestedPermission === "granted") {
          return;
        }
      } catch (_error) {
        // Some Chrome contexts cannot show a permission prompt from the service worker.
      }
    }
  }

  function isFileSystemPermissionError(error) {
    const name = String(error?.name || "");
    const message = String(error?.message || "");
    return /NotAllowedError|SecurityError/i.test(name)
      || /permission|denied|not allowed/i.test(message);
  }

  async function createWritableForSavedDirectoryFile(directoryHandle, filename, options) {
    try {
      const fileHandle = await getWritableFileHandle(directoryHandle, filename);
      return await fileHandle.createWritable(options);
    } catch (error) {
      if (isFileSystemPermissionError(error)) {
        throw new Error("保存目录权限已失效。请在 Ask for location 手动导出时重新选择目录。");
      }

      throw error;
    }
  }

  async function writeFilesToSavedDirectory(files) {
    const directoryHandle = await getStoredDirectoryHandle();
    if (!directoryHandle) {
      throw new Error("未保存下载目录。请先在 Ask for location 手动导出时选择一次目录。");
    }

    await assertDirectoryWritablePermission(directoryHandle);

    const written = [];
    for (const file of Array.isArray(files) ? files : []) {
      if (!file?.filename) {
        continue;
      }

      const blob = file.dataUrl
        ? dataUrlToBlob(file.dataUrl, file.mimeType)
        : new Blob([String(file.content || "")], { type: file.mimeType || "text/plain;charset=utf-8" });
      const writable = await createWritableForSavedDirectoryFile(directoryHandle, file.filename);
      await writable.write(blob);
      await writable.close();
      written.push(file.filename);
    }

    return { ok: true, written };
  }

  async function writeDirectoryChunk(payload) {
    const action = String(payload?.action || "");
    const transferId = String(payload?.transferId || "");
    if (!transferId) {
      throw new Error("Missing transfer id.");
    }

    const filename = String(payload?.filename || "");
    if (!filename) {
      throw new Error("Missing filename for directory write.");
    }

    const directoryHandle = await getStoredDirectoryHandle();
    if (!directoryHandle) {
      throw new Error("未保存下载目录。请先在 Ask for location 手动导出时选择一次目录。");
    }

    if (action === "start") {
      await assertDirectoryWritablePermission(directoryHandle);
      const writable = await createWritableForSavedDirectoryFile(directoryHandle, filename);
      await writable.truncate(0);
      await writable.close();
      return { ok: true, transferId };
    }

    if (action === "chunk") {
      const writable = await createWritableForSavedDirectoryFile(directoryHandle, filename, { keepExistingData: true });
      await writable.write({
        type: "write",
        position: Number(payload.offset || 0),
        data: base64ToBytes(payload.chunk)
      });
      await writable.close();
      return { ok: true, transferId, bytes: Number(payload.bytes || 0) };
    }

    if (action === "end") {
      return { ok: true, written: [filename], transferId };
    }

    if (action === "abort") {
      return { ok: true };
    }

    throw new Error("Unsupported directory write chunk action.");
  }

  function postDirectoryPortMessage(port, message) {
    try {
      port.postMessage(message);
    } catch (_error) {
      // The content script may have navigated away while a large export was writing.
    }
  }

  function setupDirectoryWritePort(port) {
    let writable = null;
    let filename = "";
    let closed = false;
    let queue = Promise.resolve();

    const closeWritable = async () => {
      if (!writable) {
        return;
      }

      const currentWritable = writable;
      writable = null;
      await currentWritable.close().catch(() => {});
    };

    const handleMessage = async (message) => {
      const seq = message?.seq;
      const action = String(message?.action || "");

      if (closed) {
        throw new Error("Directory write port is closed.");
      }

      if (action === "start") {
        await closeWritable();
        filename = String(message?.filename || "");
        if (!filename) {
          throw new Error("Missing filename for directory write.");
        }

        const directoryHandle = await getStoredDirectoryHandle();
        if (!directoryHandle) {
          throw new Error("No saved download directory. Please choose a folder once in Ask for location mode.");
        }

        await assertDirectoryWritablePermission(directoryHandle);
        writable = await createWritableForSavedDirectoryFile(directoryHandle, filename);
        postDirectoryPortMessage(port, { seq, ok: true });
        return;
      }

      if (action === "chunk") {
        if (!writable) {
          throw new Error("Directory write has not started.");
        }

        await writable.write(base64ToBytes(message?.chunk));
        postDirectoryPortMessage(port, { seq, ok: true, bytes: Number(message?.bytes || 0) });
        return;
      }

      if (action === "end") {
        await closeWritable();
        postDirectoryPortMessage(port, { seq, ok: true, written: filename ? [filename] : [] });
        return;
      }

      if (action === "abort") {
        closed = true;
        await closeWritable();
        postDirectoryPortMessage(port, { seq, ok: true });
        return;
      }

      throw new Error("Unsupported directory write action.");
    };

    port.onMessage.addListener((message) => {
      queue = queue
        .then(() => handleMessage(message))
        .catch(async (error) => {
          await closeWritable();
          postDirectoryPortMessage(port, {
            seq: message?.seq,
            ok: false,
            error: error?.message || "Directory write failed."
          });
        });
    });

    port.onDisconnect.addListener(() => {
      closed = true;
      queue = queue.finally(() => closeWritable());
    });
  }

  async function getAccessToken() {
    const stored = await storageGet(["exportai_access_token"]);
    return stored.exportai_access_token || "";
  }

  async function getRefreshToken() {
    const stored = await storageGet(["exportai_refresh_token"]);
    return stored.exportai_refresh_token || "";
  }

  async function refreshAuthTokens() {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return "";
    }

    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });
    const json = await response.json().catch(() => null);

    if (!response.ok || json?.code >= 400 || !json?.data?.accessToken) {
      await new Promise((resolve) => {
        chrome.storage.local.remove([
          "exportai_access_token",
          "exportai_refresh_token",
          "exportai_user_info"
        ], () => resolve(true));
      });
      throw new Error(json?.message || "Login expired. Please log in again.");
    }

    const nextTokens = {
      exportai_access_token: json.data.accessToken
    };
    if (json.data.refreshToken) {
      nextTokens.exportai_refresh_token = json.data.refreshToken;
    }
    await storageSet(nextTokens);

    return json.data.accessToken;
  }

  async function apiRequest(path, options = {}) {
    const token = await getAccessToken();
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      const refreshedToken = await refreshAuthTokens();
      if (refreshedToken) {
        headers.Authorization = `Bearer ${refreshedToken}`;
        response = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers
        });
      }
    }

    const json = await response.json().catch(() => null);
    if (!response.ok || json?.code >= 400) {
      throw new Error(json?.message || `Request failed: ${response.status}`);
    }
    return json;
  }

  async function refreshMembershipStatus() {
    const token = await getAccessToken();
    if (!token) {
      const stored = await storageGet([MEMBERSHIP_STORAGE_KEY]);
      const cached = stored[MEMBERSHIP_STORAGE_KEY];
      if (cached && typeof cached === "object" && cached.isMember) {
        const preserved = {
          ...cached,
          checkedAt: cached.checkedAt || new Date().toISOString(),
          stale: true,
          error: "No access token available; using cached membership."
        };
        await storageSet({ [MEMBERSHIP_STORAGE_KEY]: preserved });
        return preserved;
      }

      const anonymous = {
        isMember: false,
        planType: null,
        expiresAt: null,
        checkedAt: new Date().toISOString()
      };
      await storageSet({ [MEMBERSHIP_STORAGE_KEY]: anonymous });
      return anonymous;
    }

    try {
      const result = await apiRequest("/api/membership", { method: "GET" });
      const data = result?.data || {};
      const membership = {
        isMember: Boolean(data.isMember),
        planType: data.planType || null,
        expiresAt: data.expiresAt || null,
        checkedAt: new Date().toISOString()
      };
      await storageSet({ [MEMBERSHIP_STORAGE_KEY]: membership });
      return membership;
    } catch (error) {
      const stored = await storageGet([MEMBERSHIP_STORAGE_KEY]);
      const cached = stored[MEMBERSHIP_STORAGE_KEY];
      if (cached && typeof cached === "object") {
        const preserved = {
          ...cached,
          checkedAt: cached.checkedAt || new Date().toISOString(),
          stale: true,
          error: error?.message || "Membership refresh failed."
        };
        await storageSet({ [MEMBERSHIP_STORAGE_KEY]: preserved });
        return preserved;
      }

      const fallback = {
        isMember: false,
        planType: null,
        expiresAt: null,
        checkedAt: new Date().toISOString(),
        stale: true,
        error: error?.message || "Membership refresh failed."
      };
      await storageSet({ [MEMBERSHIP_STORAGE_KEY]: fallback });
      return fallback;
    }
  }

  async function getMembershipStatus(forceRefresh = false) {
    if (forceRefresh) {
      return refreshMembershipStatus();
    }

    const stored = await storageGet([MEMBERSHIP_STORAGE_KEY]);
    const cached = stored[MEMBERSHIP_STORAGE_KEY];
    const checkedAtMs = cached?.checkedAt ? Date.parse(cached.checkedAt) : 0;
    if (cached && Date.now() - checkedAtMs < 30 * 60 * 1000) {
      return cached;
    }
    return refreshMembershipStatus();
  }

  async function getAccountSettings() {
    const result = await apiRequest("/api/settings", { method: "GET" });
    return { ok: true, ...(result?.data || {}) };
  }

  async function saveAccountSettings(settings) {
    const result = await apiRequest("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ settings: settings || {} })
    });
    return { ok: true, ...(result?.data || {}) };
  }

  async function downloadPdfData(base64Data, filename, saveAs = false, conflictAction = "overwrite") {
    return downloadByUrl(
      "data:application/pdf;base64," + base64Data,
      filename,
      saveAs,
      conflictAction
    );
  }

  function normalizeTimeoutMs(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return DEFAULT_EXPORT_TIMEOUT_MS;
    }

    return Math.min(MAX_EXPORT_TIMEOUT_MS, Math.max(1000, Math.round(numericValue)));
  }

  function withTimeout(promise, timeoutMs, message) {
    return new Promise((resolve, reject) => {
      const timerId = setTimeout(() => {
        reject(new Error(message));
      }, timeoutMs);

      Promise.resolve(promise)
        .then((value) => {
          clearTimeout(timerId);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timerId);
          reject(error);
        });
    });
  }

  function enqueuePdfTask(task) {
    const queued = pdfRenderQueue.then(task, task);
    pdfRenderQueue = queued.catch(() => {});
    return queued;
  }

  function buildPdfRequestId() {
    return `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createTab(options) {
    return new Promise((resolve, reject) => {
      chrome.tabs.create(options, (tab) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve(tab);
      });
    });
  }

  function getTab(tabId) {
    return new Promise((resolve) => {
      if (!Number.isInteger(tabId)) {
        resolve(null);
        return;
      }

      chrome.tabs.get(tabId, (tab) => {
        const error = chrome.runtime.lastError;
        if (error || !tab) {
          resolve(null);
          return;
        }

        resolve(tab);
      });
    });
  }

  function getWindow(windowId) {
    return new Promise((resolve) => {
      if (!Number.isInteger(windowId) || !chrome.windows?.get) {
        resolve(null);
        return;
      }

      chrome.windows.get(windowId, (windowInfo) => {
        const error = chrome.runtime.lastError;
        if (error || !windowInfo) {
          resolve(null);
          return;
        }

        resolve(windowInfo);
      });
    });
  }

  async function isSenderActiveFocusedTab(sender) {
    const senderTabId = Number(sender?.tab?.id);
    if (!Number.isInteger(senderTabId)) {
      return false;
    }

    const tab = await getTab(senderTabId);
    if (!tab || !tab.active) {
      return false;
    }
    const windowInfo = await getWindow(tab.windowId);
    return Boolean(windowInfo?.focused);
  }

  function removeTab(tabId) {
    return new Promise((resolve) => {
      if (!Number.isInteger(tabId)) {
        resolve();
        return;
      }

      chrome.tabs.remove(tabId, () => {
        // Ignore races where the tab has already closed.
        resolve();
      });
    });
  }

  function waitForTabComplete(tabId, timeoutMs) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timeoutId = null;

      const finalize = (fn, value) => {
        if (settled) {
          return;
        }

        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        chrome.tabs.onUpdated.removeListener(onUpdated);
        fn(value);
      };

      const onUpdated = (updatedTabId, changeInfo) => {
        if (updatedTabId !== tabId || changeInfo.status !== "complete") {
          return;
        }

        finalize(resolve);
      };

      timeoutId = setTimeout(() => {
        finalize(reject, new Error("Timed out while loading the hidden PDF render tab."));
      }, timeoutMs);

      chrome.tabs.get(tabId, (tab) => {
        const getError = chrome.runtime.lastError;
        if (getError || !tab) {
          finalize(reject, new Error("PDF render tab is not available."));
          return;
        }

        if (tab.status === "complete") {
          finalize(resolve);
          return;
        }

        chrome.tabs.onUpdated.addListener(onUpdated);
      });
    });
  }

  function sendTabMessage(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve(response);
      });
    });
  }

  async function waitForContentScriptReady(tabId, timeoutMs) {
    const startedAt = Date.now();
    let lastError = null;

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const response = await sendTabMessage(tabId, { type: MSG_GET_CHAT_STATUS });
        if (response && response.supported) {
          return response;
        }
      } catch (error) {
        lastError = error;
      }

      await delay(250);
    }

    throw new Error(lastError?.message || "Timed out waiting for temporary export tab.");
  }

  async function runBackgroundAutoExport(payload, sender) {
    if (!(await isSenderActiveFocusedTab(sender))) {
      return {
        ok: true,
        skipped: true,
        reason: "inactive_tab"
      };
    }

    const url = String(payload?.url || "");
    const formats = Array.isArray(payload?.formats) ? payload.formats : [];
    if (!url || !/^https?:\/\//i.test(url)) {
      throw new Error("Missing valid URL for background auto export.");
    }
    if (!formats.length) {
      throw new Error("Background auto export requires at least one format.");
    }

    let tabId = null;
    try {
      const tab = await createTab({
        url,
        active: false
      });
      tabId = tab?.id;
      if (!Number.isInteger(tabId)) {
        throw new Error("Could not create temporary auto export tab.");
      }

      const timeoutMs = AUTO_EXPORT_TAB_TIMEOUT_MS;
      await waitForTabComplete(tabId, timeoutMs);
      await waitForContentScriptReady(tabId, timeoutMs);
      const response = await sendTabMessage(tabId, {
        type: MSG_EXPORT_CHAT,
        payload: {
          format: "multi",
          formats,
          mode: "auto-background"
        }
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Temporary auto export tab failed.");
      }

      return {
        ok: true,
        tabId,
        result: response.result
      };
    } finally {
      await removeTab(tabId);
    }
  }

  function rejectPdfTabPortWaiters(error) {
    const waiters = pdfRenderTabPortWaiters.slice();
    pdfRenderTabPortWaiters = [];

    waiters.forEach((waiter) => {
      try {
        waiter.reject(error);
      } catch (_ignored) {
        // Ignore waiter listener failures.
      }
    });
  }

  function resolvePdfTabPortWaiters(port, tabId) {
    const remaining = [];

    pdfRenderTabPortWaiters.forEach((waiter) => {
      if (waiter.tabId !== tabId) {
        remaining.push(waiter);
        return;
      }

      try {
        waiter.resolve(port);
      } catch (_ignored) {
        // Ignore waiter listener failures.
      }
    });

    pdfRenderTabPortWaiters = remaining;
  }

  function waitForPdfRenderTabPort(tabId, timeoutMs) {
    if (pdfRenderTabPort && pdfRenderTabId === tabId) {
      return Promise.resolve(pdfRenderTabPort);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pdfRenderTabPortWaiters = pdfRenderTabPortWaiters.filter((waiter) => waiter !== entry);
        reject(new Error("Timed out while connecting to hidden PDF render tab."));
      }, timeoutMs);

      const entry = {
        tabId,
        resolve: (port) => {
          clearTimeout(timeoutId);
          resolve(port);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      };

      pdfRenderTabPortWaiters.push(entry);
    });
  }

  function rejectPendingPdfTabLoads(error) {
    const pending = Array.from(pendingPdfTabLoads.values());
    pendingPdfTabLoads.clear();

    pending.forEach((entry) => {
      clearTimeout(entry.timeoutId);
      entry.reject(error);
    });
  }

  function clearPdfRenderTabIdleTimer() {
    if (!pdfRenderTabIdleTimerId) {
      return;
    }

    clearTimeout(pdfRenderTabIdleTimerId);
    pdfRenderTabIdleTimerId = null;
  }

  async function closePdfRenderTab() {
    clearPdfRenderTabIdleTimer();

    const tabIdToClose = pdfRenderTabId;
    pdfRenderTabId = null;
    pdfRenderTabPort = null;

    rejectPendingPdfTabLoads(new Error("Hidden PDF render tab closed before completion."));
    rejectPdfTabPortWaiters(new Error("Hidden PDF render tab closed before connection."));

    if (Number.isInteger(tabIdToClose)) {
      await removeTab(tabIdToClose);
    }
  }

  function schedulePdfRenderTabIdleClose() {
    clearPdfRenderTabIdleTimer();
    pdfRenderTabIdleTimerId = setTimeout(() => {
      void closePdfRenderTab();
    }, PDF_RENDER_TAB_IDLE_CLOSE_MS);
  }

  async function ensurePdfRenderTab(timeoutMs) {
    clearPdfRenderTabIdleTimer();

    if (pdfRenderTabInitPromise) {
      return withTimeout(
        pdfRenderTabInitPromise,
        timeoutMs,
        "Timed out while preparing hidden PDF render tab."
      );
    }

    pdfRenderTabInitPromise = (async () => {
      if (Number.isInteger(pdfRenderTabId)) {
        const existingTab = await getTab(pdfRenderTabId);
        if (existingTab) {
          if (existingTab.status !== "complete") {
            await waitForTabComplete(pdfRenderTabId, timeoutMs);
          }

          await waitForPdfRenderTabPort(pdfRenderTabId, timeoutMs);
          return pdfRenderTabId;
        }

        pdfRenderTabId = null;
        pdfRenderTabPort = null;
      }

      const renderTabUrl = chrome.runtime.getURL(PDF_RENDER_TAB_PATH);
      const createdTab = await createTab({
        url: renderTabUrl,
        active: false
      });

      const createdTabId = Number(createdTab?.id);
      if (!Number.isInteger(createdTabId)) {
        throw new Error("Could not create hidden PDF render tab.");
      }

      pdfRenderTabId = createdTabId;
      pdfRenderTabPort = null;

      await waitForTabComplete(createdTabId, timeoutMs);
      await waitForPdfRenderTabPort(createdTabId, timeoutMs);
      return createdTabId;
    })();

    try {
      return await withTimeout(
        pdfRenderTabInitPromise,
        timeoutMs,
        "Timed out while creating hidden PDF render tab."
      );
    } finally {
      pdfRenderTabInitPromise = null;
    }
  }

  function requestPdfTabHtmlLoad(html, timeoutMs) {
    const requestId = buildPdfRequestId();

    return new Promise((resolve, reject) => {
      const port = pdfRenderTabPort;
      if (!port || !Number.isInteger(pdfRenderTabId)) {
        reject(new Error("Hidden PDF render tab is not connected."));
        return;
      }

      const timeoutId = setTimeout(() => {
        pendingPdfTabLoads.delete(requestId);
        reject(new Error("Timed out while preparing HTML inside hidden PDF render tab."));
      }, timeoutMs);

      pendingPdfTabLoads.set(requestId, {
        timeoutId,
        resolve,
        reject
      });

      try {
        port.postMessage({
          type: MSG_PDF_TAB_LOAD_HTML,
          payload: {
            requestId,
            html: String(html || "")
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        pendingPdfTabLoads.delete(requestId);
        reject(new Error(String(error?.message || "Failed to send HTML to hidden PDF render tab.")));
      }
    });
  }

  function debuggerAttach(tabId) {
    return new Promise((resolve, reject) => {
      chrome.debugger.attach({ tabId }, "1.3", () => {
        const error = chrome.runtime.lastError;
        if (error) {
          if (/already attached/i.test(String(error.message || ""))) {
            resolve();
            return;
          }

          reject(new Error(error.message));
          return;
        }

        resolve();
      });
    });
  }

  function debuggerDetach(tabId) {
    return new Promise((resolve) => {
      chrome.debugger.detach({ tabId }, () => {
        resolve();
      });
    });
  }

  function debuggerSendCommand(tabId, method, params = {}) {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve(result || {});
      });
    });
  }

  async function printPdfFromRenderTab(tabId, timeoutMs) {
    return withTimeout(
      (async () => {
        let attached = false;

        try {
          await debuggerAttach(tabId);
          attached = true;

          await debuggerSendCommand(tabId, "Page.enable");
          await debuggerSendCommand(tabId, "Emulation.setEmulatedMedia", {
            media: "print"
          });

          const result = await debuggerSendCommand(tabId, "Page.printToPDF", {
            printBackground: true,
            preferCSSPageSize: true,
            marginTop: 0,
            marginBottom: 0,
            marginLeft: 0,
            marginRight: 0,
            transferMode: "ReturnAsBase64"
          });

          const base64Data = String(result?.data || "");
          if (!base64Data) {
            throw new Error("Page.printToPDF returned empty data.");
          }

          return base64Data;
        } finally {
          if (attached) {
            await debuggerDetach(tabId).catch(() => {});
          }
        }
      })(),
      timeoutMs,
      "Timed out while rendering PDF with the hidden print tab."
    );
  }

  async function renderHtmlToPdf(payload) {
    if (!payload || !payload.filename || !payload.html) {
      throw new Error("Missing HTML or filename for PDF rendering.");
    }

    const timeoutMs = normalizeTimeoutMs(payload.timeoutMs);
    return enqueuePdfTask(async () => {
      try {
        const tabId = await ensurePdfRenderTab(timeoutMs);
        await requestPdfTabHtmlLoad(payload.html, timeoutMs);
        const base64Data = await printPdfFromRenderTab(tabId, timeoutMs);

        if (payload.returnDataUrl) {
          return {
            ok: true,
            filename: payload.filename,
            dataUrl: "data:application/pdf;base64," + base64Data
          };
        }

        if (payload.writeToDirectory) {
          return writeFilesToSavedDirectory([{
            filename: payload.filename,
            mimeType: "application/pdf",
            dataUrl: "data:application/pdf;base64," + base64Data
          }]);
        }

        return downloadPdfData(
          base64Data,
          payload.filename,
          payload.mode === "auto" ? false : payload.saveAs,
          payload.mode === "auto" ? "overwrite" : payload.conflictAction
        );
      } finally {
        schedulePdfRenderTabIdleClose();
      }
    });
  }

  async function warmupPdfRenderer(payload) {
    const timeoutMs = normalizeTimeoutMs(payload?.timeoutMs);

    return enqueuePdfTask(async () => {
      await ensurePdfRenderTab(timeoutMs);
      schedulePdfRenderTabIdleClose();
      return { ok: true };
    });
  }

  function downloadBlobContent(payload) {
    if (!payload || !payload.filename) {
      return Promise.reject(new Error("Missing filename for download."));
    }

    if (payload.dataUrl) {
      // Auto export policy: saveAs: false and conflictAction: "overwrite".
      return downloadByUrl(
        payload.dataUrl,
        payload.filename,
        payload.mode === "auto" ? false : payload.saveAs,
        payload.mode === "auto" ? "overwrite" : payload.conflictAction
      );
    }

    return downloadByUrl(
      textToDataUrl(payload.content, payload.mimeType),
      payload.filename,
      payload.mode === "auto" ? false : payload.saveAs,
      payload.mode === "auto" ? "overwrite" : payload.conflictAction
    );
  }

  function captureCurrentTabAsMhtml(senderTabId, filename) {
    return new Promise((resolve, reject) => {
      if (!senderTabId) {
        reject(new Error("No tabId received to capture MHTML."));
        return;
      }

      chrome.pageCapture.saveAsMHTML({ tabId: senderTabId }, (blob) => {
        const error = chrome.runtime.lastError;

        if (error) {
          reject(new Error(error.message));
          return;
        }

        if (!blob) {
          reject(new Error("Could not generate the MHTML blob."));
          return;
        }

        blobToDataUrl(blob)
          .then((dataUrl) => downloadByUrl(dataUrl, filename || ("chat-export-capture-" + Date.now() + ".mht")))
          .then(resolve)
          .catch(reject);
      });
    });
  }

  function normalizeActionTheme(theme) {
    if (theme === "dark" || theme === "light") {
      return theme;
    }

    return "default";
  }

  function setActionIconTheme(theme) {
    return new Promise((resolve, reject) => {
      chrome.action.setIcon(
        { path: ACTION_ICON_PATHS[normalizeActionTheme(theme)] },
        () => {
          const error = chrome.runtime.lastError;

          if (error) {
            reject(new Error(error.message));
            return;
          }

          resolve({ ok: true });
        }
      );
    });
  }

  chrome.runtime.onConnect.addListener((port) => {
    if (!port) {
      return;
    }

    if (port.name === PORT_WRITE_DIRECTORY_FILE) {
      setupDirectoryWritePort(port);
      return;
    }

    if (port.name !== PORT_PDF_RENDER_TAB) {
      return;
    }

    const senderTabId = Number(port.sender?.tab?.id);
    if (!Number.isInteger(senderTabId)) {
      port.disconnect();
      return;
    }

    pdfRenderTabId = senderTabId;
    pdfRenderTabPort = port;
    resolvePdfTabPortWaiters(port, senderTabId);

    port.onMessage.addListener((message) => {
      if (!message || message.type !== MSG_PDF_TAB_HTML_READY) {
        return;
      }

      const payload = message.payload || {};
      const requestId = String(payload.requestId || "");
      if (!requestId) {
        return;
      }

      const pending = pendingPdfTabLoads.get(requestId);
      if (!pending) {
        return;
      }

      pendingPdfTabLoads.delete(requestId);
      clearTimeout(pending.timeoutId);

      if (!payload.ok) {
        pending.reject(new Error(payload.error || "Hidden PDF render tab failed to apply HTML."));
        return;
      }

      pending.resolve();
    });

    port.onDisconnect.addListener(() => {
      if (pdfRenderTabPort === port) {
        pdfRenderTabPort = null;
      }

      rejectPendingPdfTabLoads(new Error("Hidden PDF render tab disconnected."));
      rejectPdfTabPortWaiters(new Error("Hidden PDF render tab disconnected."));
    });
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId !== pdfRenderTabId) {
      return;
    }

    pdfRenderTabId = null;
    pdfRenderTabPort = null;
    rejectPendingPdfTabLoads(new Error("Hidden PDF render tab was closed."));
    rejectPdfTabPortWaiters(new Error("Hidden PDF render tab was closed."));
  });

  chrome.runtime.onInstalled.addListener(() => {
    void setActionIconTheme("default").catch(() => {});
  });

  chrome.runtime.onStartup.addListener(() => {
    void setActionIconTheme("default").catch(() => {});
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== "object") {
      return false;
    }

    if (message.type === MSG_DOWNLOAD_FILE) {
      downloadBlobContent(message.payload)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message }));

      return true;
    }

    if (message.type === MSG_CAPTURE_TAB_MHTML) {
      captureCurrentTabAsMhtml(sender?.tab?.id, message.payload?.filename)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message }));

      return true;
    }

    if (message.type === MSG_RENDER_HTML_TO_PDF) {
      renderHtmlToPdf(message.payload)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message }));

      return true;
    }

    if (message.type === MSG_WARMUP_PDF_RENDERER) {
      warmupPdfRenderer(message.payload)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message }));

      return true;
    }

    if (message.type === MSG_AUTO_EXPORT_CHAT) {
      runBackgroundAutoExport(message.payload, sender)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message }));

      return true;
    }

    if (message.type === MSG_SET_ACTION_ICON_THEME) {
      setActionIconTheme(message.payload?.theme)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message }));

      return true;
    }

    if (message.type === MSG_CHECK_MEMBERSHIP) {
      getMembershipStatus(Boolean(message.payload?.forceRefresh))
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((error) => sendResponse({ ok: false, isMember: false, error: error.message }));

      return true;
    }

    if (message.type === MSG_GET_ACCOUNT_SETTINGS) {
      getAccountSettings()
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message }));

      return true;
    }

    if (message.type === MSG_SAVE_ACCOUNT_SETTINGS) {
      saveAccountSettings(message.payload?.settings)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message }));

      return true;
    }

    if (message.type === MSG_WRITE_FILES_TO_DIRECTORY) {
      writeFilesToSavedDirectory(message.payload?.files)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message }));

      return true;
    }

    if (message.type === MSG_WRITE_FILE_TO_DIRECTORY_CHUNK) {
      writeDirectoryChunk(message.payload)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message }));

      return true;
    }

    if (message.type === MSG_NOTION_CONNECT) {
      connectNotion().then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message.type === MSG_NOTION_DISCONNECT) {
      storageRemove([NOTION_STORAGE_KEY]).then(() => sendResponse({ ok: true, connected: false }));
      return true;
    }

    if (message.type === MSG_NOTION_STATUS) {
      storageGet([NOTION_STORAGE_KEY]).then((stored) => {
        const connection = stored[NOTION_STORAGE_KEY];
        sendResponse({ ok: true, connected: Boolean(connection?.accessToken), workspaceName: connection?.workspaceName || "" });
      });
      return true;
    }

    if (message.type === MSG_NOTION_TARGETS) {
      getNotionTargets().then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message.type === MSG_NOTION_CREATE_PAGE) {
      createNotionPage(message.payload).then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    return false;
  });

  chrome.alarms?.create?.("exportai-membership-refresh", { periodInMinutes: 30 });
  chrome.alarms?.onAlarm?.addListener?.((alarm) => {
    if (alarm?.name === "exportai-membership-refresh") {
      void refreshMembershipStatus().catch(() => {});
    }
  });
})();
