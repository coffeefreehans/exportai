/*
 * Generic provider adapters for Chinese AI chat products with similar web UIs.
 * The extractor is intentionally conservative and works from visible message-like
 * DOM blocks, then each product supplies host/title metadata.
 */
(() => {
  const root = globalThis.ChatExportAi;
  const { ROLES } = root.constants;

  const PLATFORM_CONFIGS = [
    {
      id: "doubao",
      displayName: "Doubao",
      hosts: ["www.doubao.com", "doubao.com", "www.dola.com", "dola.com"],
      fallbackTitle: "Doubao Chat",
      titleWords: ["doubao", "豆包"]
    },
    {
      id: "kimi",
      displayName: "Kimi",
      hosts: ["kimi.moonshot.cn", "www.kimi.com", "kimi.com"],
      fallbackTitle: "Kimi Chat",
      titleWords: ["kimi", "moonshot", "月之暗面"]
    },
    {
      id: "minimax",
      displayName: "MiniMax",
      hosts: ["chat.minimax.io", "agent.minimaxi.com", "www.minimax.io", "minimax.io", "hailuo.ai", "www.hailuo.ai", "hailuoai.com", "www.hailuoai.com"],
      fallbackTitle: "MiniMax Chat",
      titleWords: ["minimax", "mini max", "hailuo", "海螺"]
    },
    {
      id: "glm",
      displayName: "GLM",
      hosts: ["chatglm.cn", "www.chatglm.cn", "z.ai", "chat.z.ai"],
      fallbackTitle: "GLM Chat",
      titleWords: ["glm", "chatglm", "智谱", "清言"]
    }
  ];

  const MESSAGE_SELECTOR = [
    "article",
    "[data-testid*='message' i]",
    "[data-testid*='chat' i]",
    "[data-role]",
    "[data-author]",
    "[data-message-author-role]",
    "[class*='message' i]",
    "[class*='bubble' i]",
    "[class*='chat-item' i]",
    "[class*='conversation-item' i]",
    "[class*='dialogue' i]",
    "[class*='answer' i]",
    "[class*='question' i]"
  ].join(",");
  const CHAT_PATH_REGEX = /\/(?:chat|c|conversation|agent|bot|app)(?:\/|$)/i;
  const EXCLUDED_SELECTOR = "nav, aside, header, footer, form, textarea, input, [contenteditable='true'], [role='textbox']";
  const HUMAN_HINT = /\b(user|human|mine|me|question|query|ask|sender|right)\b|用户|我|提问|问题|输入|右侧/i;
  const ASSISTANT_HINT = /\b(assistant|ai|bot|answer|response|reply|model|left)\b|助手|回答|回复|豆包|kimi|minimax|glm|清言|左侧/i;
  const SHARE_LABEL_REGEX = /\b(?:share|export|更多|分享|导出|复制)\b/i;

  function normalizeText(value) {
    const rawValue = String(value || "").replace(/\s+/g, " ").trim();
    return rawValue.normalize ? rawValue.normalize("NFC") : rawValue;
  }

  function hostnameFromUrl(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch (_error) {
      return "";
    }
  }

  function isVisibleElement(element) {
    return Boolean(element && element.getClientRects && element.getClientRects().length);
  }

  function cleanTitleSeparators(value) {
    return normalizeText(value)
      .replace(/^[\s\-|:·•—–]+/g, "")
      .replace(/[\s\-|:·•—–]+$/g, "")
      .trim();
  }

  function stripPlatformWords(value, config) {
    let title = normalizeText(value);
    (config.titleWords || []).forEach((word) => {
      const escaped = String(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      title = title
        .replace(new RegExp(`^${escaped}\\s*[-|:·•—–]*\\s*`, "i"), "")
        .replace(new RegExp(`\\s*[-|:·•—–]*\\s*${escaped}$`, "i"), "");
    });
    return cleanTitleSeparators(title);
  }

  function isGenericTitle(value, config) {
    const normalized = normalizeText(value).toLowerCase();
    if (!normalized) {
      return true;
    }
    const compact = normalized.replace(/\s+/g, "");
    return (config.titleWords || []).some((word) => compact === String(word).toLowerCase().replace(/\s+/g, ""))
      || /^(new chat|untitled|chat|对话|新对话|新的聊天|未命名)$/.test(normalized);
  }

  function extractWindowTitle(config) {
    const rawTitle = normalizeText(document.title || document.querySelector("title")?.textContent);
    const cleanedTitle = stripPlatformWords(rawTitle, config);
    return isGenericTitle(cleanedTitle, config) ? "" : cleanedTitle;
  }

  function extractChatName(config) {
    const selectors = [
      "[data-testid*='conversation-title' i]",
      "[data-testid*='chat-title' i]",
      "[class*='conversation-title' i]",
      "[class*='chat-title' i]",
      "main header h1",
      "main h1",
      "main h2"
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (!node || !isVisibleElement(node)) {
        continue;
      }

      const title = stripPlatformWords(node.textContent, config);
      if (title && title.length <= 180 && !isGenericTitle(title, config)) {
        return title;
      }
    }

    return extractWindowTitle(config) || config.fallbackTitle;
  }

  function isLikelyMessageNode(node) {
    if (!node || node.closest(EXCLUDED_SELECTOR)) {
      return false;
    }
    if (!isVisibleElement(node)) {
      return false;
    }

    const text = normalizeText(node.textContent);
    if (text.length < 1 && !node.querySelector("img, video, canvas, svg")) {
      return false;
    }
    if (text.length > 20000) {
      return false;
    }

    const rect = node.getBoundingClientRect();
    if (rect.width < 80 || rect.height < 12) {
      return false;
    }

    return true;
  }

  function hasChatInput() {
    return Boolean(document.querySelector("textarea, [contenteditable='true'], [role='textbox']"));
  }

  function isLikelyChatUrl() {
    return CHAT_PATH_REGEX.test(location.pathname || "") || /(?:chat|conversation)/i.test(location.search || "");
  }

  function isLikelyContentLeaf(node) {
    if (!isLikelyMessageNode(node)) {
      return false;
    }

    const text = normalizeText(node.textContent);
    if (text.length < 2 || text.length > 8000) {
      return false;
    }

    const interactiveText = normalizeText(Array.from(node.querySelectorAll("button, a, input, textarea")).map((item) => item.textContent || item.value || "").join(" "));
    if (interactiveText && interactiveText.length >= Math.max(12, text.length * 0.8)) {
      return false;
    }

    const childContent = Array.from(node.children).filter((child) => {
      if (child.matches?.("button, a, svg, img, video, canvas, input, textarea")) {
        return false;
      }
      return normalizeText(child.textContent).length > 24;
    });
    return childContent.length <= 2;
  }

  function nodeSignature(node) {
    return normalizeText(node.textContent).slice(0, 300);
  }

  function isAncestorOfExisting(node, existingNodes) {
    return existingNodes.some((item) => item !== node && node.contains(item));
  }

  function collectMessageNodes() {
    const rawNodes = Array.from(document.querySelectorAll(MESSAGE_SELECTOR))
      .filter(isLikelyMessageNode);
    const sourceNodes = rawNodes.length ? rawNodes : collectFallbackMessageNodes();
    const unique = [];
    const seen = new Set();

    sourceNodes
      .sort((left, right) => {
        const leftRect = left.getBoundingClientRect();
        const rightRect = right.getBoundingClientRect();
        return leftRect.top - rightRect.top || leftRect.left - rightRect.left;
      })
      .forEach((node) => {
        if (isAncestorOfExisting(node, sourceNodes)) {
          return;
        }

        const signature = nodeSignature(node);
        if (!signature || seen.has(signature)) {
          return;
        }

        seen.add(signature);
        unique.push(node);
      });

    return unique;
  }

  function collectFallbackMessageNodes() {
    const roots = Array.from(document.querySelectorAll("main, [role='main'], [class*='chat' i], [class*='conversation' i]"))
      .filter(isVisibleElement);
    const searchRoots = roots.length ? roots : [document.body].filter(Boolean);
    const candidates = [];
    const selector = [
      "p",
      "li",
      "pre",
      "blockquote",
      "[class*='markdown' i]",
      "[class*='content' i]",
      "[class*='text' i]",
      "[class*='message' i]",
      "[class*='bubble' i]",
      "[data-testid]",
      "[data-index]"
    ].join(",");

    searchRoots.forEach((rootNode) => {
      candidates.push(...Array.from(rootNode.querySelectorAll(selector)));
    });

    return candidates.filter(isLikelyContentLeaf);
  }

  function classifyRole(node, previousRole) {
    const attrs = normalizeText([
      node.getAttribute("data-role"),
      node.getAttribute("data-author"),
      node.getAttribute("data-message-author-role"),
      node.getAttribute("aria-label"),
      node.className
    ].join(" "));

    if (HUMAN_HINT.test(attrs)) {
      return ROLES.HUMAN;
    }
    if (ASSISTANT_HINT.test(attrs)) {
      return ROLES.ASSISTANT;
    }

    const rect = node.getBoundingClientRect();
    if (Number.isFinite(rect.left) && Number.isFinite(rect.width) && window.innerWidth) {
      const center = rect.left + rect.width / 2;
      if (center > window.innerWidth * 0.57) {
        return ROLES.HUMAN;
      }
      if (center < window.innerWidth * 0.48) {
        return ROLES.ASSISTANT;
      }
    }

    return previousRole === ROLES.HUMAN ? ROLES.ASSISTANT : ROLES.HUMAN;
  }

  function dedupeByLabelAndUrl(items) {
    const seen = new Set();
    const unique = [];

    for (const item of items) {
      const key = `${normalizeText(item?.label)}::${normalizeText(item?.url)}`.toLowerCase();
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      unique.push(item);
    }

    return unique;
  }

  function extractReferences(node) {
    return dedupeByLabelAndUrl(Array.from(node.querySelectorAll("a[href]")).map((anchor) => {
      const href = normalizeText(anchor.getAttribute("href"));
      const label = normalizeText(anchor.getAttribute("aria-label") || anchor.getAttribute("title") || anchor.textContent || href);
      if (!href && !label) {
        return null;
      }
      return {
        kind: /\.[a-z0-9]{2,8}(?:\b|$)|download|file/i.test(`${href} ${label}`) ? "attachment" : "url",
        label,
        url: href
      };
    }).filter(Boolean));
  }

  function extractGenericConversation(config, settings) {
    const messageNodes = collectMessageNodes();
    const messages = [];
    let previousRole = ROLES.ASSISTANT;

    messageNodes.forEach((node, index) => {
      const role = classifyRole(node, previousRole);
      previousRole = role;
      const sanitized = root.sanitize.sanitizeMessageNode(node, {
        mediaHandling: settings.mediaHandling
      });
      const references = role === ROLES.ASSISTANT ? extractReferences(node) : [];
      const attachments = role === ROLES.HUMAN && settings.showUserAttachmentNames ? extractReferences(node) : [];
      const textContent = normalizeText((sanitized.safeHtml || "").replace(/<[^>]*>/g, " "));

      if (!textContent && !sanitized.hasMedia && !references.length && !attachments.length) {
        return;
      }

      messages.push({
        id: `${config.id}-${index + 1}`,
        role,
        safeHtml: sanitized.safeHtml,
        hasMedia: sanitized.hasMedia,
        attachments,
        references
      });
    });

    const chatName = extractChatName(config);
    return {
      providerId: config.id,
      sourceUrl: location.href,
      folderName: "",
      chatName,
      title: extractWindowTitle(config) || chatName,
      modelName: config.displayName,
      messages
    };
  }

  function getLiveStatus(config) {
    return {
      isChatPage: isChatPage(config),
      messageCount: collectMessageNodes().length
    };
  }

  function isChatPage(_config) {
    return collectMessageNodes().length > 0 || (isLikelyChatUrl() && hasChatInput());
  }

  function findInlineActionAnchor() {
    const candidates = Array.from(document.querySelectorAll("header button, header [role='button'], main button, button[aria-label]"));
    for (const candidate of candidates) {
      if (!isVisibleElement(candidate)) {
        continue;
      }

      const label = normalizeText(candidate.getAttribute("aria-label") || candidate.getAttribute("title") || candidate.textContent);
      if (!label || !SHARE_LABEL_REGEX.test(label)) {
        continue;
      }

      return {
        container: candidate.parentElement,
        referenceNode: candidate
      };
    }

    return null;
  }

  function registerConfig(config) {
    root.providers.registerProvider({
      id: config.id,
      displayName: config.displayName,
      matchesUrl(url) {
        const host = hostnameFromUrl(url);
        return config.hosts.includes(host);
      },
      isChatPage() {
        return isChatPage(config);
      },
      extractConversation(settings) {
        return extractGenericConversation(config, settings);
      },
      getLiveStatus() {
        return getLiveStatus(config);
      },
      findInlineActionAnchor
    });
  }

  PLATFORM_CONFIGS.forEach(registerConfig);
})();
