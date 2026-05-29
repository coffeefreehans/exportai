const assert = require("assert");
const fs = require("fs");
const path = require("path");

const content = fs.readFileSync(path.join(__dirname, "..", "src", "content", "content.js"), "utf8");
const optionsHtml = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.html"), "utf8");
const optionsJs = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.js"), "utf8");

assert(content.includes("const AUTO_EXPORT_FEATURE_ENABLED = false;"), "content auto export runtime must be disabled.");
assert(/function scheduleAutoExportCheck[\s\S]*AUTO_EXPORT_FEATURE_ENABLED[\s\S]*return;/.test(content), "content must not schedule auto export checks.");
assert(/function runAutoExportCheck[\s\S]*AUTO_EXPORT_FEATURE_ENABLED[\s\S]*feature_hidden/.test(content), "content auto export runner must exit while hidden.");
assert(optionsHtml.includes('id="autoExportSettings" hidden'), "settings page must hide auto export controls.");
assert(optionsJs.includes("const AUTO_EXPORT_FEATURE_ENABLED = false;"), "options must keep auto export disabled.");
assert(/autoExportEnabled:\s*false/.test(optionsJs), "saving options must force autoExportEnabled off.");

console.log("auto export hidden regression passed");
