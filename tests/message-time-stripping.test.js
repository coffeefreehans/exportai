const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

globalThis.navigator = {
  language: "zh-CN",
  languages: ["zh-CN"]
};
globalThis.location = {
  href: "https://claude.ai/chat/test"
};

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
    AI_NAME_MODE: {
      PROVIDER: "provider",
      CUSTOM: "custom"
    },
    METADATA_LABELS: {
      EXPORTED_AT: "Date",
      DEVICE_USER: "PC/User",
      FOLDER: "Chat Folder",
      TITLE: "Window Title",
      MODEL: "Chat Model",
      URL: "Chat URL",
      PROVIDER: "Provider",
      CHAT_NAME: "Chat Name",
      MESSAGE_TOTAL: "Messages",
      START_TIME: "Start Time",
      END_TIME: "End Time",
      DURATION: "Duration"
    }
  },
  defaults: {
    settings: {
      aiNameMode: "provider",
      humanName: "Human",
      aiCustomName: "AI",
      textFormatting: "clean",
      metadataEnabled: false,
      includeThinkingDuration: false,
      includeMessageTime: false
    }
  },
  sanitize: {
    escapeHtml: (value) => String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
  },
  textConverter: {
    htmlToPlainText: (html) => String(html || "").replace(/<[^>]+>/g, "\n").replace(/\n+/g, "\n").trim(),
    htmlToMarkdown: (html) => String(html || "").replace(/<[^>]+>/g, "\n").replace(/\n+/g, "\n").trim()
  },
  exporters: {
    resolveFileBaseName: () => "chat"
  }
};

const postProcessPath = path.join(__dirname, "..", "src", "shared", "post-process.js");
vm.runInThisContext(fs.readFileSync(postProcessPath, "utf8"), { filename: postProcessPath });

const processed = globalThis.ChatExportAi.postProcess.processConversation(
  {
    title: "Time stripping",
    chatName: "Time stripping",
    sourceUrl: "https://claude.ai/chat/test",
    messages: [
      {
        id: "1",
        role: "human",
        safeHtml: "<p>Hello</p><p>4\u670819\u65e5</p>",
        timeLabel: "4\u670819\u65e5"
      }
    ]
  },
  {
    ...globalThis.ChatExportAi.defaults.settings,
    includeMessageTime: false
  },
  { displayName: "Claude" }
);

assert.strictEqual(processed.messages[0].timeLabel, "");
assert(!processed.messages[0].text.includes("4\u670819\u65e5"));
assert(!processed.messages[0].safeHtml.includes("4\u670819\u65e5"));

const nested = globalThis.ChatExportAi.postProcess.processConversation(
  {
    title: "Nested time stripping",
    chatName: "Nested time stripping",
    sourceUrl: "https://claude.ai/chat/test",
    messages: [
      {
        id: "1",
        role: "human",
        safeHtml: "<div><p>怎么实现，能不能帮我规划</p><p><span>4</span><span>月19日</span></p></div>"
      },
      {
        id: "2",
        role: "assistant",
        safeHtml: "<p>先了解一下你的情况</p><p><span>4\u670819\u65e5</span></p>"
      }
    ]
  },
  {
    ...globalThis.ChatExportAi.defaults.settings,
    includeMessageTime: false
  },
  { displayName: "Claude" }
);

assert(nested.messages[0].text.includes("怎么实现"));
assert(!nested.messages[0].text.includes("4\u670819\u65e5"));
assert(!nested.messages[0].safeHtml.includes("4\u670819\u65e5"));
assert(!nested.messages[1].text.includes("4\u670819\u65e5"));
assert(!nested.messages[1].safeHtml.includes("4\u670819\u65e5"));

const brSeparated = globalThis.ChatExportAi.postProcess.processConversation(
  {
    title: "BR time stripping",
    chatName: "BR time stripping",
    sourceUrl: "https://claude.ai/chat/test",
    messages: [
      {
        id: "1",
        role: "human",
        safeHtml: "<p>怎么实现，能不能帮我规划<br>4\u670819\u65e5</p>"
      }
    ]
  },
  {
    ...globalThis.ChatExportAi.defaults.settings,
    includeMessageTime: false
  },
  { displayName: "Claude" }
);

assert(brSeparated.messages[0].text.includes("怎么实现"));
assert(!brSeparated.messages[0].text.includes("4\u670819\u65e5"));
assert(!brSeparated.messages[0].safeHtml.includes("4\u670819\u65e5"));

const preserved = globalThis.ChatExportAi.postProcess.processConversation(
  {
    title: "Time stripping",
    chatName: "Time stripping",
    sourceUrl: "https://claude.ai/chat/test",
    messages: [
      {
        id: "1",
        role: "human",
        safeHtml: "<p>Hello</p><p>4\u670819\u65e5</p>",
        timeLabel: "4\u670819\u65e5"
      }
    ]
  },
  {
    ...globalThis.ChatExportAi.defaults.settings,
    includeMessageTime: true
  },
  { displayName: "Claude" }
);

assert.strictEqual(preserved.messages[0].timeLabel, "4\u670819\u65e5");
assert(preserved.messages[0].text.includes("4\u670819\u65e5"));
assert(preserved.messages[0].safeHtml.includes("4\u670819\u65e5"));

console.log("message time stripping passed");
