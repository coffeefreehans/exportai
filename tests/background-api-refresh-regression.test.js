const assert = require("assert");
const fs = require("fs");
const path = require("path");

const backgroundPath = path.join(__dirname, "..", "src", "background", "background.js");
const source = fs.readFileSync(backgroundPath, "utf8");

assert(
  source.includes("exportai_refresh_token"),
  "background API must read the refresh token, not only the access token."
);

assert(
  source.includes("/api/auth/refresh"),
  "background API must call the auth refresh endpoint when account API returns 401."
);

assert(
  /response\.status\s*===\s*401/.test(source),
  "background API must detect 401 responses before treating account sync as failed."
);

assert(
  /fetch\(`\$\{API_BASE\}\$\{path\}`/.test(source) && source.indexOf("/api/auth/refresh") < source.lastIndexOf("fetch(`${API_BASE}${path}`"),
  "background API must retry the original request after refreshing the token."
);

console.log("background api refresh regression passed");
