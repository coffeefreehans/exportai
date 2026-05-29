const assert = require("assert");
const fs = require("fs");
const path = require("path");

const content = fs.readFileSync(path.join(__dirname, "..", "src", "content", "content.js"), "utf8");

assert(
  !content.includes('isAutoExport && settings.saveMode === "ask"'),
  "auto export must not use the ask-location directory handle branch."
);
assert(
  /saveAs:\s*\(isAutoExport\s*\|\|\s*isBackgroundAutoExport\)\s*\?\s*false/.test(content),
  "auto export must force saveAs:false."
);
assert(
  /conflictAction:\s*\(isAutoExport\s*\|\|\s*isBackgroundAutoExport\)\s*\?\s*"overwrite"/.test(content),
  "auto export must force overwrite conflict handling."
);
assert(
  /if\s*\(!isAutoExport\)\s*{\s*scheduleInlineUiRefresh\(\);\s*}/.test(content),
  "auto export must not refresh/disable the floating UI while running."
);
assert(
  /if\s*\(!isSilentAutoExport\s*&&\s*String\(error\?\.\message/.test(content),
  "auto export must not show user-facing hydration alerts."
);

console.log("auto export silent regression passed");
