const assert = require("assert");
const fs = require("fs");
const path = require("path");

const optionsHtml = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.html"), "utf8");
const optionsCss = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.css"), "utf8");
const optionsJs = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.js"), "utf8");

["general", "export", "files", "integration"].forEach((tab) => {
  assert(
    optionsHtml.includes(`data-tab="${tab}"`),
    `settings page must include a ${tab} tab button.`
  );
  assert(
    optionsHtml.includes(`data-panel="${tab}"`),
    `settings page must include a standalone ${tab} settings panel.`
  );
});

assert(optionsHtml.includes('role="tablist"'), "settings page must expose tabs as a tablist.");
assert(optionsHtml.includes('role="tabpanel"'), "settings panels must use tabpanel semantics.");
assert(optionsCss.includes(".settings-tabs"), "settings page must style the tab bar.");
assert(optionsCss.includes(".settings-layout"), "settings page must use a two-column tab/content layout.");
assert(optionsCss.includes("position: sticky"), "settings tabs should stay visible beside the active page.");
assert(optionsCss.includes(".settings-panel[hidden]"), "inactive settings pages must be hidden.");
assert(optionsJs.includes("activateTab"), "settings page must switch pages when tabs are clicked.");
assert(optionsJs.includes("aria-selected"), "settings tabs must update selected state.");

console.log("options tabs regression passed");
