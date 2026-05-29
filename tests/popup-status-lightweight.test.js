const assert = require("assert");
const fs = require("fs");
const path = require("path");

const contentPath = path.join(__dirname, "..", "src", "content", "content.js");
const source = fs.readFileSync(contentPath, "utf8");

const startMarker = "async function getChatStatus() {";
const endMarker = "  function setupRuntimeListener()";
const startIndex = source.indexOf(startMarker);
const endIndex = source.indexOf(endMarker, startIndex);
assert(startIndex >= 0 && endIndex > startIndex, "getChatStatus function must exist.");

const getChatStatusBody = source.slice(startIndex, endIndex);

assert(
  !getChatStatusBody.includes("buildProcessedConversation("),
  "Popup chat status must not pre-run full conversation extraction."
);

assert(
  !getChatStatusBody.includes("root.storage.getSettings("),
  "Popup chat status must not wait on account settings sync."
);

assert(
  getChatStatusBody.includes("getCachedSettingsForPopupStatus(")
    && source.includes("root.storage.getCachedSettings("),
  "Popup chat status should use cached settings for filename preview."
);

console.log("popup status lightweight regression passed");
