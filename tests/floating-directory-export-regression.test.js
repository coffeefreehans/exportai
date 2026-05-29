const assert = require("assert");
const fs = require("fs");
const path = require("path");

const content = fs.readFileSync(path.join(__dirname, "..", "src", "content", "content.js"), "utf8");

assert(
  content.includes("chooseDirectoryForFloatingExport"),
  "floating export must have its own one-time directory picker for Ask for location mode."
);

assert(
  /settings\.saveMode\s*===\s*"ask"[\s\S]*output:\s*"files"/.test(content),
  "floating export must request all selected files at once instead of triggering per-format save prompts."
);

assert(
  content.includes("writeFilesToChosenDirectory"),
  "floating export must write all returned files into the one chosen directory."
);

assert(
  content.includes("showDirectoryPicker") && content.includes("exportai-download-directory"),
  "floating export must use the same directory picker id as popup exports."
);

console.log("floating directory export regression passed");
