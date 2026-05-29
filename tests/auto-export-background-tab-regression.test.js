const assert = require("assert");
const fs = require("fs");
const path = require("path");

const constants = fs.readFileSync(path.join(__dirname, "..", "src", "shared", "constants.js"), "utf8");
const background = fs.readFileSync(path.join(__dirname, "..", "src", "background", "background.js"), "utf8");
const content = fs.readFileSync(path.join(__dirname, "..", "src", "content", "content.js"), "utf8");

assert(constants.includes("MSG_AUTO_EXPORT_CHAT"), "shared constants must define a background auto-export message.");
assert(background.includes("MSG_AUTO_EXPORT_CHAT"), "background must handle background auto-export messages.");
assert(background.includes("AUTO_EXPORT_TAB_TIMEOUT_MS"), "background auto export must use its own longer tab-load timeout.");
assert(/const timeoutMs = AUTO_EXPORT_TAB_TIMEOUT_MS;/.test(background), "background auto export must not reuse the short normal export timeout.");
assert(/createTab\(\{\s*url,\s*active:\s*false/.test(background), "background auto export must open a non-active tab without rewriting the chat URL.");
assert(background.includes("MSG_EXPORT_CHAT"), "background auto export must ask the temporary tab content script to export.");
assert(background.includes('mode: "auto-background"'), "temporary tab export must use full silent auto-background mode.");
assert(/finally\s*{[\s\S]*removeTab\(tabId\)/.test(background), "background auto export must close the temporary tab in finally.");
assert(content.includes("MSG_AUTO_EXPORT_CHAT"), "content script must request background auto export.");
assert(content.includes('document.visibilityState === "hidden"'), "content script must not auto-trigger from inactive tabs.");
assert(/runAutoExportCheck[\s\S]*MSG_AUTO_EXPORT_CHAT[\s\S]*formats/.test(content), "auto export checks must send selected formats to background.");
assert(content.includes('const shouldHydrateVirtualized = !isAutoExport || isBackgroundAutoExport;'), "background auto export must keep full hydration while current-page auto export stays no-scroll.");

console.log("auto export background tab regression passed");
