const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

globalThis.ChatExportAi = {
  constants: {
    ROLES: {
      HUMAN: "human",
      ASSISTANT: "assistant",
      SYSTEM: "system"
    },
    TEXT_FORMATTING: {
      CLEAN: "clean",
      MARKDOWN: "markdown"
    },
    MULTILINE_FORMAT: {
      TAB: "tab",
      NAME: "name",
      NONE: "none"
    }
  },
  defaults: {
    settings: {
      includeExportTitle: true,
      txtTrimStartFirstHumanHeader: true,
      txtHumanMessageHeaderTemplate: "",
      txtAiMessageHeaderTemplate: "",
      multilineFormat: "tab",
      txtApplyMultilineOnFirstLine: true,
      messageSeparator: "\n\n",
      invalidFileNameReplacement: ".",
      autoFileName: true,
      fileNameTemplate: "<ChatName>"
    }
  }
};

const exportEnginePath = path.join(__dirname, "..", "src", "shared", "export-engine.js");
vm.runInThisContext(fs.readFileSync(exportEnginePath, "utf8"), { filename: exportEnginePath });

const conversation = {
  chatName: "MD regression",
  title: "MD regression",
  providerName: "Claude",
  settings: globalThis.ChatExportAi.defaults.settings,
  metadata: [
    { label: "Chat Name", value: "MD regression" }
  ],
  messages: [
    {
      role: "human",
      speakerLabel: "Human",
      text: "请看图片\n\n[Image: screenshot]",
      safeHtml: '<p>请看图片</p><img alt="screenshot" src="data:image/png;base64,AAAABBBBCCCC">'
    },
    {
      role: "assistant",
      speakerLabel: "Claude",
      text: "正文内容",
      safeHtml: "<p>正文内容</p>"
    }
  ]
};

assert.strictEqual(typeof globalThis.ChatExportAi.exporters.toMarkdownDocument, "function");
const markdown = globalThis.ChatExportAi.exporters.toMarkdownDocument(conversation, conversation.settings);

assert(markdown.includes("# MD regression"));
assert(markdown.includes("## Human"));
assert(markdown.includes("请看图片"));
assert(markdown.includes("[Image: screenshot]"));
assert(!markdown.includes("data:image"), "Markdown export must not include base64 image data.");
assert(!markdown.includes("body {"), "Markdown export must not include HTML/CSS document styles.");
assert(!markdown.includes("<style"), "Markdown export must not include HTML head/style markup.");

const cleanedHumanText = globalThis.ChatExportAi.exporters.cleanPlatformAssistiveText(
  "You said:\n国内笔记应用市场份额",
  { role: "human" }
);
assert.strictEqual(cleanedHumanText, "国内笔记应用市场份额");

const cleanedSameLineHumanText = globalThis.ChatExportAi.exporters.cleanPlatformAssistiveText(
  "You said: 国内笔记应用市场份额",
  { role: "human" }
);
assert.strictEqual(cleanedSameLineHumanText, "国内笔记应用市场份额");

console.log("markdown export regression passed");
