const assert = require("assert");
const fs = require("fs");
const path = require("path");

const background = fs.readFileSync(path.join(__dirname, "..", "src", "background", "background.js"), "utf8");
const content = fs.readFileSync(path.join(__dirname, "..", "src", "content", "content.js"), "utf8");

assert(content.includes('document.visibilityState === "hidden"'), "inactive content tabs must not trigger auto export.");
assert(background.includes("isSenderActiveFocusedTab"), "background must verify the sender tab is active and focused.");
assert(/const tab = await getTab\(senderTabId\)/.test(background), "background must query the sender tab instead of trusting sender.tab.active.");
assert(background.includes("inactive_tab"), "background must skip auto export from non-current tabs.");
assert(/runBackgroundAutoExport\(message\.payload,\s*sender\)/.test(background), "background must validate the sender for auto export.");
assert(content.includes("response.skipped"), "content must not mark skipped inactive-tab exports as completed.");

console.log("auto export active tab regression passed");
