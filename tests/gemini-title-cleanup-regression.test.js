const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "providers", "gemini-provider.js"), "utf8");

assert(
  source.includes("isGenericGeminiChatTitle"),
  "Gemini provider must identify generic Gemini default chat titles."
);
assert(
  /Gemini\s*\u5bf9\u8bdd|\u4e0e\s*Gemini\s*\u5bf9\u8bdd|Gemini\s*Chat|Chat\s*with\s*Gemini/.test(source),
  "Gemini provider must treat localized generic titles like '与 Gemini 对话' as non-chat names."
);
assert(
  /titleFromHeader[\s\S]*!isGenericGeminiChatTitle\(titleFromHeader\)/.test(source),
  "Gemini header title should only win when it is not a generic default title."
);

console.log("gemini title cleanup regression passed");
