const assert = require("assert");
const fs = require("fs");
const path = require("path");

const backgroundPath = path.join(__dirname, "..", "src", "background", "background.js");
const optionsPath = path.join(__dirname, "..", "src", "options", "options.js");
const popupPath = path.join(__dirname, "..", "src", "popup", "popup.js");

const background = fs.readFileSync(backgroundPath, "utf8");
const options = fs.readFileSync(optionsPath, "utf8");
const popup = fs.readFileSync(popupPath, "utf8");

assert(
  /function getMembershipStatus\([^)]*forceRefresh/.test(background),
  "background membership lookup must accept a forceRefresh flag."
);

assert(
  /message\.payload\?\.forceRefresh/.test(background),
  "CHECK_MEMBERSHIP must read payload.forceRefresh."
);

assert(
  /if\s*\(\s*forceRefresh\s*\)\s*\{\s*return refreshMembershipStatus\(\);/s.test(background),
  "forceRefresh must bypass cached membership."
);

assert(
  /catch\s*\([^)]*\)\s*\{[\s\S]*storageGet\(\[MEMBERSHIP_STORAGE_KEY\]\)[\s\S]*const\s+preserved\s*=\s*\{[\s\S]*stale:\s*true[\s\S]*return\s+preserved/s.test(background),
  "membership refresh failures must preserve cached paid status instead of overwriting it as free."
);

assert(
  !Array.from(background.matchAll(/chrome\.storage\.local\.remove\(\[([\s\S]*?)\]/g))
    .some((match) => match[1].includes("MEMBERSHIP_STORAGE_KEY")),
  "token refresh failures must not delete cached membership state used by paid extension features."
);

assert(
  /if\s*\(\s*!token\s*\)\s*\{[\s\S]*storageGet\(\[MEMBERSHIP_STORAGE_KEY\]\)[\s\S]*cached\.isMember[\s\S]*return\s+preserved/s.test(background),
  "missing access tokens must still preserve cached paid membership for extension-side paid gates."
);

assert(
  /getMembership\(true\)/.test(options),
  "options page must force-refresh membership after rendering cached settings."
);

assert(
  /getMembership\(true\)/.test(popup),
  "popup must force-refresh membership in the background instead of trusting stale cache."
);

console.log("membership force refresh regression passed");
