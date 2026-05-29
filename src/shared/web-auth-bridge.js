(() => {
  "use strict";

  const AUTH_LOGOUT_KEY = "exportai_auth_logout_at";
  const KEYS = [
    "exportai_access_token",
    "exportai_refresh_token",
    "exportai_user_info",
    "exportai_membership"
  ];

  let lastLocalSnapshot = "";
  let applyingRemote = false;

  function chromeLocal() {
    return globalThis.chrome?.storage?.local || null;
  }

  function parseStoredValue(key, value) {
    if (!value) return null;
    if (key !== "exportai_membership" && key !== "exportai_user_info") return value;
    try {
      return JSON.parse(value);
    } catch (_error) {
      return value;
    }
  }

  function serializeRemoteValue(value) {
    if (value === undefined || value === null || value === "") return "";
    return typeof value === "string" ? value : JSON.stringify(value);
  }

  function localSnapshot() {
    return KEYS.map((key) => localStorage.getItem(key) || "").join("|");
  }

  function hasLocalAuth() {
    return Boolean(localStorage.getItem("exportai_access_token"));
  }

  function dispatchAuthSync() {
    try {
      window.dispatchEvent(new CustomEvent("exportai-auth-sync"));
    } catch (_error) {}
  }

  function navigateTo(path) {
    if (location.pathname !== path) {
      location.assign(path);
    }
  }

  function setLocalFromRemote(values) {
    applyingRemote = true;
    try {
      KEYS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
          const nextValue = serializeRemoteValue(values[key]);
          if (nextValue) {
            localStorage.setItem(key, nextValue);
          } else {
            localStorage.removeItem(key);
          }
        }
      });
      lastLocalSnapshot = localSnapshot();
    } finally {
      applyingRemote = false;
    }
    dispatchAuthSync();
  }

  function clearLocalAuth() {
    applyingRemote = true;
    try {
      KEYS.forEach((key) => localStorage.removeItem(key));
      lastLocalSnapshot = localSnapshot();
    } finally {
      applyingRemote = false;
    }
    dispatchAuthSync();
  }

  function syncLocalToChrome(reason = "change") {
    const storage = chromeLocal();
    if (!storage || applyingRemote) return;

    const currentValues = {};
    const removedKeys = [];
    KEYS.forEach((key) => {
      const rawValue = localStorage.getItem(key);
      if (rawValue) {
        const parsed = parseStoredValue(key, rawValue);
        if (parsed !== null) currentValues[key] = parsed;
      } else if (reason !== "initial" && lastLocalSnapshot) {
        removedKeys.push(key);
      }
    });

    if (Object.keys(currentValues).length) {
      storage.set(currentValues);
      storage.remove([AUTH_LOGOUT_KEY]);
    }

    if (removedKeys.length) {
      storage.set({ [AUTH_LOGOUT_KEY]: new Date().toISOString() });
      storage.remove(removedKeys);
    }

    lastLocalSnapshot = localSnapshot();
  }

  function syncChromeToLocalInitial() {
    const storage = chromeLocal();
    if (!storage) return;
    storage.get([...KEYS, AUTH_LOGOUT_KEY], (stored) => {
      const remoteValues = {};
      KEYS.forEach((key) => {
        if (stored[key] !== undefined && stored[key] !== null && stored[key] !== "") {
          remoteValues[key] = stored[key];
        }
      });

      if (Object.keys(remoteValues).length) {
        setLocalFromRemote(remoteValues);
        return;
      }

      if (stored[AUTH_LOGOUT_KEY]) {
        if (hasLocalAuth()) {
          syncLocalToChrome("login-present");
          return;
        }
        clearLocalAuth();
        if (!location.pathname.includes("/login")) {
          navigateTo("/login");
        }
      }
    });
  }

  function handleRemoteChange(changes, areaName) {
    if (areaName !== "local") return;

    if (changes[AUTH_LOGOUT_KEY]?.newValue) {
      if (hasLocalAuth()) {
        syncLocalToChrome("login-present");
        return;
      }
      clearLocalAuth();
      if (!location.pathname.includes("/login")) {
        navigateTo("/login");
      }
      return;
    }

    const changedValues = {};
    let hasAuthChange = false;
    KEYS.forEach((key) => {
      if (changes[key]) {
        hasAuthChange = true;
        changedValues[key] = changes[key].newValue;
      }
    });

    if (hasAuthChange) {
      setLocalFromRemote(changedValues);
      if (changedValues.exportai_access_token && location.pathname.includes("/login")) {
        navigateTo("/account");
      }
    }
  }

  syncLocalToChrome("initial");
  syncChromeToLocalInitial();

  chromeLocal()?.onChanged?.addListener?.(handleRemoteChange);
  globalThis.chrome?.storage?.onChanged?.addListener?.(handleRemoteChange);

  window.addEventListener("storage", (event) => {
    if (KEYS.includes(event.key)) {
      syncLocalToChrome("change");
    }
  });

  lastLocalSnapshot = localSnapshot();
  setInterval(() => {
    const currentSnapshot = localSnapshot();
    if (currentSnapshot !== lastLocalSnapshot) {
      syncLocalToChrome("change");
    }
  }, 1000);
})();
