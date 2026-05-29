const assert = require("assert");
const fs = require("fs");
const path = require("path");

const optionsCss = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.css"), "utf8");
const optionsJs = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.js"), "utf8");

assert(
  optionsCss.includes('[data-resolved-theme="dark"]'),
  "options stylesheet must define dark theme variables."
);

assert(
  optionsCss.includes("color-scheme: dark"),
  "dark options theme must set color-scheme for native controls."
);

assert(
  !/background:\s*#fff\b/.test(optionsCss),
  "options stylesheet must not hard-code white backgrounds that ignore theme variables."
);

assert(
  optionsJs.includes("root.appTheme.applyThemeDocument(currentSettings.appTheme)"),
  "options page must apply theme immediately when appTheme changes."
);

console.log("options theme regression passed");
