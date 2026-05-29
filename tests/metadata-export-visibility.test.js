const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

globalThis.navigator = {
  language: "en-US",
  languages: ["en-US"],
  platform: "Windows",
  userAgent: "Chrome/120"
};
globalThis.location = {
  href: "https://chatgpt.com/c/test"
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
      metadataEnabled: true,
      includeThinkingDuration: false
    }
  },
  sanitize: {
    escapeHtml: (value) => String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
  },
  textConverter: {
    htmlToPlainText: (html) => String(html || "").replace(/<[^>]+>/g, "").trim(),
    htmlToMarkdown: (html) => String(html || "").replace(/<[^>]+>/g, "").trim()
  },
  exporters: {
    resolveFileBaseName: () => "chat"
  }
};

const postProcessPath = path.join(__dirname, "..", "src", "shared", "post-process.js");
vm.runInThisContext(fs.readFileSync(postProcessPath, "utf8"), { filename: postProcessPath });

const settings = {
  ...globalThis.ChatExportAi.defaults.settings,
  metadataExportedAt: false,
  metadataDeviceUser: true,
  metadataFolder: true,
  metadataTitle: true,
  metadataModel: true,
  metadataUrl: true,
  metadataSummaryProvider: true,
  metadataSummaryChatName: true,
  metadataSummaryMessages: true,
  metadataStartTime: true,
  metadataEndTime: true,
  metadataDuration: true
};

const processed = globalThis.ChatExportAi.postProcess.processConversation(
  {
    title: "Strict metadata",
    chatName: "Strict metadata",
    folderName: "Folder",
    modelName: "GPT",
    sourceUrl: "https://chatgpt.com/c/test",
    messages: [
      {
        id: "1",
        role: "human",
        safeHtml: "<p>Hello</p>",
        timeMs: Date.UTC(2026, 4, 25, 1, 2, 3),
        timeLabel: "2026-05-25 01:02"
      },
      {
        id: "2",
        role: "assistant",
        safeHtml: "<p>Hi</p>",
        timeMs: Date.UTC(2026, 4, 25, 1, 3, 3),
        timeLabel: "2026-05-25 01:03"
      }
    ]
  },
  settings,
  { displayName: "ChatGPT" }
);

const labels = processed.metadata.map((item) => item.label);
assert(!labels.includes("Date"));
assert(!labels.includes("PC/User"));
assert(!labels.includes("Chat Folder"));
assert(!labels.includes("Window Title"));
assert(!labels.includes("Provider"));
assert(!labels.includes("Start Time"));
assert(!labels.includes("End Time"));
assert(!labels.includes("Duration"));
assert(labels.includes("Chat Model"));
assert(labels.includes("Chat URL"));
assert(labels.includes("Chat Name"));
assert(labels.includes("Messages"));

console.log("metadata export visibility passed");
