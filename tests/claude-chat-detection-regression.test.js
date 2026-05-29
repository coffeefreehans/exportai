const assert = require("assert");
const fs = require("fs");
const path = require("path");

const claudeProvider = fs.readFileSync(
  path.join(__dirname, "..", "src", "providers", "claude-provider.js"),
  "utf8"
);

assert(
  /location\.pathname/.test(claudeProvider) && claudeProvider.includes("isClaudeChatUrl"),
  "Claude chat detection must recognize /chat/... URLs even when message DOM selectors change."
);

assert(
  /chat-title-button/.test(claudeProvider),
  "Claude chat detection should use the chat title button as a secondary signal."
);

console.log("claude chat detection regression passed");
