const assert = require("assert");
const fs = require("fs");
const path = require("path");

const content = fs.readFileSync(path.join(__dirname, "..", "src", "content", "content.js"), "utf8");

assert(content.includes("lastAutoExportStatus"), "content must keep last auto export diagnostics.");
assert(content.includes("autoExportLastStatus"), "integration diagnostics must expose last auto export status.");
assert(content.includes("manual_export_required"), "diagnostics must report when manual export seed is missing.");
assert(content.includes("disabled_or_not_member"), "diagnostics must report disabled/member gating.");
assert(content.includes("inactive_tab") || content.includes("background_skipped"), "diagnostics must report background skips.");
assert(/resolveAutoFilename[\s\S]*sameFormatEntry[\s\S]*anyEntry/.test(content), "auto export filename lookup must fall back to path-level manual export records.");

console.log("auto export diagnostics regression passed");
