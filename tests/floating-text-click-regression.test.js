const assert = require("assert");
const fs = require("fs");
const path = require("path");

const uiSource = fs.readFileSync(path.join(__dirname, "..", "src", "content", "ui-export-button.js"), "utf8");

assert(
  /ceai-floating-format span[\s\S]*pointer-events:\s*none/.test(uiSource),
  "format label text must not intercept clicks; the whole pill should toggle."
);
assert(
  /ceai-floating-fab[\s\S]*display:\s*flex/.test(uiSource),
  "floating button should be a stable flex hit target."
);
assert(
  /ceai-floating-export[\s\S]*display:\s*flex/.test(uiSource),
  "export button should be a stable flex hit target."
);

console.log("floating text click regression passed");
