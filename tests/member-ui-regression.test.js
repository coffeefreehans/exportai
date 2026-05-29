const assert = require("assert");
const fs = require("fs");
const path = require("path");

const popupHtml = fs.readFileSync(path.join(__dirname, "..", "src", "popup", "popup.html"), "utf8");
const popupJs = fs.readFileSync(path.join(__dirname, "..", "src", "popup", "popup.js"), "utf8");
const optionsHtml = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.html"), "utf8");
const optionsJs = fs.readFileSync(path.join(__dirname, "..", "src", "options", "options.js"), "utf8");
const webAuthBridge = fs.readFileSync(path.join(__dirname, "..", "src", "shared", "web-auth-bridge.js"), "utf8");
const authForm = fs.readFileSync(path.join(__dirname, "..", "web", "src", "components", "AuthForm.tsx"), "utf8");
const pricingTsx = fs.readFileSync(path.join(__dirname, "..", "web", "src", "components", "Pricing.tsx"), "utf8");
const apiTs = fs.readFileSync(path.join(__dirname, "..", "web", "src", "lib", "api.ts"), "utf8");

assert(!popupHtml.includes("membershipText"), "popup must not show membership status in chat summary.");
assert(!popupJs.includes("membershipText"), "popup script must not update removed membership status.");

assert(optionsHtml.includes("accountEmail"), "settings header must have a visible account email target.");
assert(optionsHtml.includes("accountPlan"), "settings header must have a visible membership status target.");
assert(optionsHtml.includes("logoutButton"), "settings header must expose a logout button.");
assert(!optionsHtml.includes("integrationAccountEmail"), "Integration card must not repeat account status.");
assert(optionsJs.includes("membership.isFresh === true && !membership.isMember"), "paid controls must not be locked by stale free cached membership.");
assert(optionsJs.includes("is-active-member"), "settings must mark Integration as active for paid users.");
assert(optionsJs.includes("exportai_auth_logout_at"), "settings logout must write a logout marker for web sync.");
assert(optionsJs.includes("showHeaderExportButtonClaude"), "settings save must heal hidden legacy provider floating-button switches.");

assert(pricingTsx.includes("getMembership"), "web pricing must read membership state.");
assert(pricingTsx.includes("membership?.isMember"), "web pricing must disable subscription actions for active members.");
assert(apiTs.includes("exportai_membership"), "web membership fetch must sync membership state for the extension.");
assert(webAuthBridge.includes("exportai_membership"), "web auth bridge must sync web membership state into extension storage.");
assert(webAuthBridge.includes("storage?.onChanged"), "web auth bridge must listen for extension-side auth changes.");
assert(webAuthBridge.includes("exportai-auth-sync"), "web auth bridge must notify the web app when extension auth changes.");
assert(webAuthBridge.includes("location.assign"), "web auth bridge must navigate when extension auth changes while web is open.");
assert(authForm.includes("resolveReturnPath"), "web login/register must return to the requested page.");
assert(authForm.includes("api.getMembership().catch"), "web login/register must refresh membership before returning.");
assert(popupJs.includes("/login?return=/account"), "extension login entry must return the web user to the account page.");

console.log("member ui regression passed");
