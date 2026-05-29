const assert = require("assert");
const fs = require("fs");
const path = require("path");

const optionsPath = path.join(__dirname, "..", "src", "options", "options.js");
const source = fs.readFileSync(optionsPath, "utf8");

const initStart = source.indexOf("async function init()");
const refreshStart = source.indexOf("async function refreshAccountStateInBackground");
assert(initStart >= 0, "options init function must exist.");
assert(refreshStart >= 0, "background account refresh function must exist.");

const initBody = source.slice(initStart);
assert(
  initBody.includes("root.storage.getCachedSettings()"),
  "settings page must render cached settings first."
);
assert(
  initBody.includes("getCachedMembership()"),
  "settings page must render cached membership first."
);
assert(
  initBody.indexOf("applySettings(settings)") < initBody.indexOf("refreshAccountStateInBackground(auth)"),
  "settings page must apply local settings before starting account sync."
);

console.log("options local-first regression passed");
