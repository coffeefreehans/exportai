const assert = require("assert");
const fs = require("fs");
const path = require("path");

const defaults = fs.readFileSync(path.join(__dirname, "..", "src", "shared", "default-settings.js"), "utf8");
const optionsHtml = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.html"), "utf8");
const optionsJs = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.js"), "utf8");
const content = fs.readFileSync(path.join(__dirname, "..", "src", "content", "content.js"), "utf8");

assert(defaults.includes("autoExportIntervalSeconds: 60"), "default auto export interval must be at least one minute.");
assert(/Math\.max\(60,\s*Math\.min\(86400/.test(defaults), "stored auto export interval must be clamped to >=60 seconds.");
assert(optionsHtml.includes('min="1"') && optionsHtml.includes('max="1440"'), "auto export interval input must use minute bounds.");
assert(optionsJs.includes("autoExportIntervalMinutesFromSeconds"), "options page must convert stored seconds to display minutes.");
assert(optionsJs.includes("autoExportIntervalSecondsFromMinutes"), "options page must save selected minutes as seconds.");
assert(optionsJs.includes("intervalMinutes"), "options page label must say minutes.");
assert(/Math\.max\(60,\s*Math\.min\(86400/.test(content), "content runtime must clamp interval to >=60 seconds.");

console.log("auto export interval minutes regression passed");
