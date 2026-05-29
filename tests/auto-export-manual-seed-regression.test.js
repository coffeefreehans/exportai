const assert = require("assert");
const fs = require("fs");
const path = require("path");

const content = fs.readFileSync(path.join(__dirname, "..", "src", "content", "content.js"), "utf8");
const optionsHtml = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.html"), "utf8");
const optionsJs = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.js"), "utf8");

assert(content.includes("hasManualExportSeed"), "content must check that the conversation has a manual export seed.");
assert(
  /if\s*\(!hasManualExportSeed\(settings,\s*provider\)\)\s*{[\s\S]*manual_export_required[\s\S]*return;\s*}/.test(content),
  "auto export must not run until this conversation has been manually exported once."
);
assert(
  /if\s*\(!isSilentAutoExport\)\s*{[\s\S]*rememberExportFilename/.test(content),
  "only manual exports should seed lastDownloadFilenameByConversation."
);
assert(
  /rememberExportFilename[\s\S]*getCachedSettings[\s\S]*currentMap/.test(content),
  "manual multi-format exports must merge filename records from the latest local settings."
);
assert(optionsHtml.includes("autoExportManualSeedHint"), "settings must show the manual-export prerequisite.");
assert(optionsJs.includes("autoExportManualSeedHint"), "language dictionaries must include the auto-export prerequisite hint.");

console.log("auto export manual seed regression passed");
