const assert = require("assert");
const fs = require("fs");
const path = require("path");

const defaults = fs.readFileSync(path.join(__dirname, "..", "src", "shared", "default-settings.js"), "utf8");
const optionsHtml = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.html"), "utf8");
const optionsJs = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.js"), "utf8");

assert(defaults.includes("appLanguage"), "default settings must include appLanguage.");
assert(optionsHtml.includes('id="appLanguage"'), "settings page must show a language selector under App theme.");
assert(optionsHtml.includes('value="en"') && optionsHtml.includes('value="zh-CN"'), "language selector must support English and Chinese.");
assert(optionsHtml.includes("data-i18n"), "settings page labels must be translatable.");
assert(optionsJs.includes("LANGUAGE_TEXT"), "options script must define language dictionaries.");
assert(optionsJs.includes("applyLanguage"), "options script must apply the selected language.");
assert(optionsJs.includes("appLanguage: document.getElementById(\"appLanguage\").value"), "language setting must be saved with the other settings.");

console.log("options language regression passed");
