const assert = require("assert");
const fs = require("fs");
const path = require("path");

const content = fs.readFileSync(path.join(__dirname, "..", "src", "content", "content.js"), "utf8");

assert(
  content.includes("const shouldHydrateVirtualized = !isAutoExport || isBackgroundAutoExport;"),
  "current-page auto export must not hydrate, while background auto export may fully hydrate in a temporary tab."
);
assert(
  /buildRawConversation\(provider,\s*sharedExtractionSettings,\s*{\s*hydrateVirtualized:\s*shouldHydrateVirtualized/.test(content),
  "multi-format export must use the auto-export hydration flag."
);
assert(
  /buildProcessedConversation\(provider,\s*extractionSettings,\s*{\s*hydrateVirtualized:\s*shouldHydrateVirtualized/.test(content),
  "single processed export must use the auto-export hydration flag."
);
assert(
  !/mode:\s*"auto"[\s\S]{0,500}hydrateVirtualized:\s*true/.test(content),
  "auto export must not force hydrateVirtualized:true."
);

console.log("auto export no-scroll regression passed");
