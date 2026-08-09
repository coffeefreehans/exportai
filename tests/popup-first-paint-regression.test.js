const assert = require("assert");
const fs = require("fs");
const path = require("path");

const popupSource = fs.readFileSync(path.join(__dirname, "..", "src", "popup", "popup.js"), "utf8");
const loadStart = popupSource.indexOf("  async function loadPopup() {");
const loadEnd = popupSource.indexOf("  async function runExport()", loadStart);
assert(loadStart >= 0 && loadEnd > loadStart, "loadPopup function must exist.");

const loadBody = popupSource.slice(loadStart, loadEnd);
const showMainIndex = loadBody.indexOf("summaryNode.hidden = false;");
const backgroundRefreshIndex = loadBody.indexOf("refreshAccountStateInBackground(loadVersion)");

assert(showMainIndex >= 0, "Popup must reveal its main panel during initial load.");
assert(backgroundRefreshIndex >= 0, "Popup must refresh account state in the background.");
assert(
  !loadBody.includes("await getMembership(true)"),
  "Initial popup rendering must not await a forced membership refresh."
);
assert(
  showMainIndex < backgroundRefreshIndex,
  "Popup main content must be revealed before account refresh starts."
);

console.log("popup first paint regression passed");
