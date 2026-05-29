const assert = require("assert");
const fs = require("fs");
const path = require("path");

const contentSource = fs.readFileSync(path.join(__dirname, "..", "src", "content", "content.js"), "utf8");
const providerSource = fs.readFileSync(path.join(__dirname, "..", "src", "providers", "chatgpt-provider.js"), "utf8");

assert(
  contentSource.includes("cleanTitleSeparators"),
  "Popup title preview must clean leftover leading/trailing title separators."
);
assert(
  /cleanDocumentTitleForPopup[\s\S]*cleanTitleSeparators\(title\)/.test(contentSource),
  "Popup document title cleanup must remove separators after provider names are stripped."
);
assert(
  providerSource.includes("cleanTitleSeparators"),
  "ChatGPT provider must clean leftover leading/trailing title separators."
);
assert(
  /extractWindowTitle[\s\S]*cleanTitleSeparators\([\s\S]*replace/.test(providerSource),
  "ChatGPT window title cleanup must apply separator cleanup after removing ChatGPT."
);

console.log("chatgpt title cleanup regression passed");
