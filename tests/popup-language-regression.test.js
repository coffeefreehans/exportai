const assert = require("assert");
const fs = require("fs");
const path = require("path");

const popupHtml = fs.readFileSync(path.join(__dirname, "..", "src", "popup", "popup.html"), "utf8");
const popupJs = fs.readFileSync(path.join(__dirname, "..", "src", "popup", "popup.js"), "utf8");

assert(popupHtml.includes('id="accountText"'), "popup must keep the account status target.");
assert(popupHtml.includes("data-i18n"), "popup static labels must be translatable.");
assert(popupJs.includes("POPUP_LANGUAGE_TEXT"), "popup script must define popup language dictionaries.");
assert(popupJs.includes("applyLanguage"), "popup must apply the selected appLanguage.");
assert(popupJs.includes("currentSettings.appLanguage"), "popup language must come from shared settings.");
assert(popupJs.includes('t("export")'), "popup export button text must use translations.");
assert(!popupJs.includes('textContent = "导出"'), "popup must not hardcode Chinese export button labels.");

console.log("popup language regression passed");
