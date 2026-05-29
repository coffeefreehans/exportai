const assert = require("assert");
const fs = require("fs");
const path = require("path");

const manifest = fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8");
const provider = fs.readFileSync(path.join(__dirname, "..", "src", "providers", "chinese-ai-provider.js"), "utf8");

[
  "doubao",
  "kimi",
  "minimax",
  "glm"
].forEach((id) => {
  assert(provider.includes(`id: "${id}"`), `provider must register ${id}.`);
});

[
  "www.doubao.com",
  "doubao.com",
  "www.dola.com",
  "kimi.moonshot.cn",
  "www.kimi.com",
  "chat.minimax.io",
  "agent.minimaxi.com",
  "hailuo.ai",
  "hailuoai.com",
  "chatglm.cn",
  "www.chatglm.cn",
  "chat.z.ai"
].forEach((host) => {
  assert(provider.includes(host), `provider must match ${host}.`);
  assert(manifest.includes(`https://${host}/*`), `manifest must allow ${host}.`);
});

[
  "https://www.doubao.com/chat/38426937490246658",
  "https://www.kimi.com/chat/cvtljpmg0jbd9g5qsn60?chat_enter_method=history",
  "https://agent.minimaxi.com/chat?id=402435688997373",
  "https://chat.z.ai/c/45759e64-20b5-4959-875b-dd99fb6c3526"
].forEach((url) => {
  const { hostname } = new URL(url);
  assert(manifest.includes(`https://${hostname}/*`), `manifest must inject content scripts into ${url}.`);
});

assert(
  manifest.includes("src/providers/chinese-ai-provider.js"),
  "manifest must load the Chinese AI provider before content.js."
);
assert(provider.includes("extractGenericConversation"), "provider must use shared generic extraction.");
assert(provider.includes("classifyRole"), "provider must classify user and assistant messages.");
assert(provider.includes("CHAT_PATH_REGEX"), "provider must recognize /chat and /c chat URL patterns.");
assert(provider.includes("collectFallbackMessageNodes"), "provider must fall back for Chinese AI DOMs without message-like class names.");
assert(provider.includes("hasChatInput"), "provider must allow chat-page detection from chat URL plus input.");
assert(provider.includes("findInlineActionAnchor"), "provider must expose floating export anchor discovery.");

console.log("chinese platform providers regression passed");
