const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const constants = fs.readFileSync(path.join(root, "src", "shared", "constants.js"), "utf8");
const popup = fs.readFileSync(path.join(root, "src", "popup", "popup.js"), "utf8");
const options = fs.readFileSync(path.join(root, "src", "options", "options.js"), "utf8");
const content = fs.readFileSync(path.join(root, "src", "content", "content.js"), "utf8");

assert(
  /PAID_FEATURES_TEMPORARILY_UNLOCKED:\s*true/.test(constants),
  "The temporary paid-feature unlock must be explicitly enabled in one shared switch."
);
assert(
  popup.includes("PAID_FEATURES_TEMPORARILY_UNLOCKED || currentMembership?.isMember"),
  "Popup formats and Notion access must honor the temporary unlock."
);
assert(
  options.includes("!PAID_FEATURES_TEMPORARILY_UNLOCKED && !membership.isMember")
    && options.includes("PAID_FEATURES_TEMPORARILY_UNLOCKED || membership.isMember"),
  "Settings paid controls must stay editable during the temporary unlock."
);
assert(
  content.includes("function hasPaidFeatureAccess(membership)")
    && content.includes("PAID_FEATURES_TEMPORARILY_UNLOCKED || membership?.isMember")
    && content.includes("if (paidFeatureAccess)"),
  "Content exports and integrated controls must honor the temporary unlock."
);
assert(
  popup.includes('popupAccountPlan.textContent = currentMembership?.isMember'),
  "Temporary access must not falsify the membership shown in the account panel."
);

console.log("temporary paid unlock regression passed");
