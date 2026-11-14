/*
 * ChatGPT provider.
 * Uses conservative selectors based on the HTML provided by the user.
 */
(() => {
  const root = globalThis.ChatExportAi;
  const { ROLES } = root.constants;

  const MODEL_NAME_REGEX = /\b(?:ChatGPT\s*)?(?:GPT[-\s]?\d(?:\.\d+)?|GPT[-\s]?4o|GPT[-\s]?4\.1|GPT[-\s]?5|o[1345](?:-mini|-pro)?|4o(?:-mini)?|4\.1(?:-mini)?|gpt-[a-z0-9.-]+)\b/i;
  const THINKING_LABEL_REGEX = /\b(?:thinking|reasoning|reasoned|thought for|reasoned for|pensando|pens[oó]|pensamiento|razonando|razonamiento|reflexionando|reflexi[oó]n)\b/i;
  const THINKING_SECONDS_REGEX = /(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s|segundos?|seg)\b/i;
  const THINKING_DURATION_LABEL_REGEX = /(?:thought|thinking|reasoned|reasoning|pensado|pensando|pensamiento|razonando|razonamiento)(?:\s*(?:for|durante))?\s+([0-9hms.: ]+)/i;
  const SHARE_LABEL_REGEX = /\b(?:share|compartir)\b/i;
  const SOURCES_LABEL_REGEX = /^(?:fuentes?|sources?)$/i;
  const IGNORED_ASSISTANT_ACTION_LABEL_REGEX = /^(?:edit(?: image)?|editar(?: imagen)?|share(?: this image)?|compartir(?: esta imagen)?|copy(?: response)?|copiar(?: respuesta)?|like(?: this image)?|me gusta(?: esta imagen)?|dislike(?: this image)?|no me gusta(?: esta imagen)?|regenerate|regenerar|retry|reintentar|thumbs?\s*up|thumbs?\s*down|more actions?|m[aá]s acciones?|more options?|opciones?)$/i;
  const TIME_TEXT_REGEX = /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|A\.M\.|P\.M\.)?\b/i;
  const CONVERSATION_PATH_REGEX = /\/c\/([^/?#]+)/i;
  const PROJECT_PATH_REGEX = /(\/g\/[^/]+)\/c\/[^/?#]+/i;
  // Supports standard turn sections, article turns, or elements containing author roles / markdown
  // Supports conversation turns with testid, standard turn containers, or chat articles
  const TURN_SECTION_SELECTOR = [
    "[data-testid^='conversation-turn-']",
    "[data-message-author-role]",
    "article",
    ".agent-turn",
    "[class*='agent-turn']",
    ".group\\/conversation-turn",
    "[data-markdown-text-style='assistant-message']",
    "[data-testid='user-message']",
    ".user-message-bubble-color",
    ".markdown",
    ".prose"
  ].join(", ");

  function hostnameFromUrl(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch (_error) {
      return "";
    }
  }

  function matchesUrl(url) {
    return hostnameFromUrl(url) === "chatgpt.com";
  }

  function isChatPage() {
    if (document.querySelector('[data-message-author-role="user"], [data-message-author-role="assistant"], [data-testid^="conversation-turn-"], article [data-message-id], article.text-message, .agent-turn, .markdown')) {
      return true;
    }
    // Check if the current URL is explicitly a conversation URL (/c/... or /g/.../c/...)
    if (CONVERSATION_PATH_REGEX.test(location.pathname) || PROJECT_PATH_REGEX.test(location.pathname)) {
      return Boolean(document.querySelector('main, #__next, body'));
    }
    return false;
  }

  function normalizeRole(rawRole) {
    return normalizeText(rawRole).toLowerCase();
  }

  function mapRole(rawRole) {
    const normalizedRole = normalizeRole(rawRole);
    if (normalizedRole === "user") {
      return ROLES.HUMAN;
    }

    if (normalizedRole === "assistant") {
      return ROLES.ASSISTANT;
    }

    return ROLES.UNKNOWN;
  }

  function isVisibleElement(element) {
    return Boolean(element && element.getClientRects && element.getClientRects().length);
  }

  function normalizeText(value) {
    const rawValue = String(value || "").replace(/\s+/g, " ").trim();
    return rawValue.normalize ? rawValue.normalize("NFC") : rawValue;
  }

  function cleanTitleSeparators(value) {
    return normalizeText(value)
      .replace(/^[\s\-|:·•—–]+/g, "")
      .replace(/[\s\-|:·•—–]+$/g, "")
      .trim();
  }

  function formatTimeFromDate(date) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "short"
    }).format(date);
  }

  function extractTimeData(value) {
    const raw = normalizeText(value);

    if (!raw) {
      return { label: "", timestampMs: null };
    }

    if (/^\d{10,13}$/.test(raw)) {
      const numericValue = Number(raw);
      const timestamp = raw.length === 13 ? numericValue : numericValue * 1000;
      const parsed = new Date(timestamp);

      if (!Number.isNaN(parsed.getTime())) {
        return {
          label: formatTimeFromDate(parsed),
          timestampMs: parsed.getTime()
        };
      }
    }

    const parsedTime = Date.parse(raw);
    if (!Number.isNaN(parsedTime)) {
      const parsed = new Date(parsedTime);
      return {
        label: formatTimeFromDate(parsed),
        timestampMs: parsed.getTime()
      };
    }

    const directMatch = raw.match(TIME_TEXT_REGEX);
    if (directMatch) {
      return {
        label: normalizeText(directMatch[0]),
        timestampMs: null
      };
    }

    return { label: "", timestampMs: null };
  }

  function pickMessageContentRoot(messageNode, rawRole) {
    const normalizedRole = normalizeRole(rawRole);

    if (normalizedRole === "assistant") {
      if (typeof messageNode.matches === "function" && messageNode.matches(".markdown, .prose, [data-markdown-text-style='assistant-message']")) {
        return messageNode;
      }

      const markdown = messageNode.querySelector("[data-markdown-text-style='assistant-message'], .markdown, .prose");
      if (markdown) {
        return markdown;
      }

      const textMessage = messageNode.querySelector(".text-message");
      if (textMessage) {
        const innerMarkdown = textMessage.querySelector(".markdown, .prose, [data-markdown-text-style='assistant-message']");
        if (innerMarkdown) {
          return innerMarkdown;
        }
        return textMessage;
      }

      const agentTurn = messageNode.querySelector(".agent-turn");
      if (agentTurn) {
        const innerMarkdown = agentTurn.querySelector(".markdown, .prose, [data-markdown-text-style='assistant-message']");
        if (innerMarkdown) {
          return innerMarkdown;
        }
        return agentTurn;
      }

      const imageContainer = messageNode.querySelector(".group\\/imagegen-image, [id^='image-']");
      if (imageContainer) {
        return imageContainer;
      }

      const whitespaceBubble = messageNode.querySelector(".whitespace-pre-wrap");
      if (whitespaceBubble) {
        return whitespaceBubble;
      }
    }

    if (normalizedRole === "user") {
      if (typeof messageNode.matches === "function" && messageNode.matches(".user-message-bubble-color, [data-testid='user-message'], .whitespace-pre-wrap")) {
        return messageNode;
      }

      const userBubbles = Array.from(messageNode.querySelectorAll(".user-message-bubble-color, [data-testid='user-message'], .whitespace-pre-wrap"));
      if (userBubbles.length > 1) {
        const bubbleGroup = (messageNode.ownerDocument || document).createElement("div");
        userBubbles.forEach((bubble) => {
          bubbleGroup.appendChild(bubble.cloneNode(true));
        });
        return bubbleGroup;
      }

      const userBubble = userBubbles[0];
      if (userBubble) {
        return userBubble;
      }
    }

    return messageNode;
  }

  function hasUserTurnStructure(node) {
    if (!node) {
      return false;
    }

    if (typeof node.matches === "function" && node.matches("[data-message-author-role='user'], .user-message-bubble-color, [data-testid='user-message'], .whitespace-pre-wrap")) {
      return true;
    }

    return Boolean(
      node.querySelector(
        [
          "[data-message-author-role='user']",
          "[data-testid='user-message']",
          ".user-message-bubble-color",
          ".whitespace-pre-wrap",
          "[data-turn='user']"
        ].join(", ")
      )
    );
  }

  function parseTurnOrder(section, fallback) {
    const dataTestId = normalizeText(section?.getAttribute?.("data-testid"));
    const orderMatch = dataTestId.match(/conversation-turn-(\d+)/i);
    if (orderMatch) {
      return Number(orderMatch[1]);
    }

    return Number(fallback || 0);
  }

  function inferRoleFromTurnSection(section, fallbackIndex = null) {
    if (!section) {
      return "";
    }

    // 1. Direct author role on section itself
    const directRole = section.getAttribute?.("data-message-author-role")
      || section.getAttribute?.("data-turn")
      || section.getAttribute?.("data-role");
    if (directRole) {
      return normalizeRole(directRole);
    }

    // 2. Child author role inside section
    const childAuthorRole = section.querySelector?.("[data-message-author-role]")?.getAttribute("data-message-author-role");
    if (childAuthorRole) {
      return normalizeRole(childAuthorRole);
    }

    const hasMatch = (sel) => {
      try {
        if (typeof section.matches === "function" && section.matches(sel)) {
          return true;
        }
      } catch (_e) {}
      try {
        return Boolean(section.querySelector?.(sel));
      } catch (_e) {
        return false;
      }
    };

    // 3. User markers (Highest priority: user bubble, user testid, user edit button)
    if (hasMatch("[data-message-author-role='user'], .user-message-bubble-color, [data-testid='user-message'], [class*='user-message'], button[aria-label*='Edit' i], button[aria-label*='编辑' i]")) {
      return "user";
    }

    // 4. Accessibility screen reader labels inside this section
    const srOnlyNode = section.querySelector?.("h1.sr-only, h2.sr-only, h3.sr-only, h4.sr-only, h5.sr-only, h6.sr-only, [class*='sr-only']");
    const srOnlyHeading = normalizeText(srOnlyNode?.textContent);
    if (srOnlyHeading) {
      if (/(?:you said|你|用户|user|you|vous|sie|あなた|dijiste)/i.test(srOnlyHeading)) {
        return "user";
      }
      if (/(?:chatgpt|assistant|gpt|bot|openai|回答)/i.test(srOnlyHeading)) {
        return "assistant";
      }
    }

    // 5. Assistant markers inside this section (markdown, prose, agent-turn, copy/audio buttons)
    if (
      hasMatch("[data-message-author-role='assistant'], [data-markdown-text-style='assistant-message'], [data-message-model-slug], .agent-turn, [class*='agent-turn'], .markdown, .prose")
      || hasMatch("button[data-testid*='copy' i], button[data-testid*='turn-action' i], button[data-testid*='thumb' i], button[aria-label*='Read aloud' i], button[aria-label*='朗读' i], button[aria-label*='Good response' i], button[aria-label*='Bad response' i], button[aria-label*='Copy' i], button[aria-label*='复制' i], [data-testid*='thumbs' i]")
    ) {
      return "assistant";
    }

    // 6. Aria-labels on section
    const ariaLabel = String(section.getAttribute?.("aria-label") || "");
    if (/you|user|用户/i.test(ariaLabel)) {
      return "user";
    }
    if (/chatgpt|assistant|gpt|bot/i.test(ariaLabel)) {
      return "assistant";
    }

    // 7. If it only has whitespace-pre-wrap and no assistant controls
    if (hasMatch(".whitespace-pre-wrap")) {
      return "user";
    }

    // 8. Fallback to alternating pattern if fallbackIndex is available
    if (fallbackIndex !== null && typeof fallbackIndex === "number") {
      return fallbackIndex % 2 === 0 ? "user" : "assistant";
    }

    return "";
  }

  function hasRenderableTurnContent(section) {
    if (!section) {
      return false;
    }

    if (section.getAttribute("data-message-author-role") || section.getAttribute("data-message-id")) {
      return true;
    }

    const hasText = normalizeText(section.textContent).length > 0;
    const hasQueryMatch = Boolean(
      section.querySelector(
        [
          "[data-message-author-role]",
          ".agent-turn",
          ".markdown",
          ".prose",
          ".text-message",
          ".whitespace-pre-wrap",
          ".user-message-bubble-color",
          "[data-message-id]",
          "[data-message-model-slug]",
          "[data-turn-start-message]",
          "[data-turn-message-id]",
          "[data-testid*='message']",
          "p",
          "pre",
          "code",
          "img",
          "video"
        ].join(", ")
      )
    );

    return hasQueryMatch || hasText;
  }

  function getEntryWeight(entryNode) {
    if (!entryNode) {
      return 0;
    }

    const textWeight = normalizeText(entryNode.textContent).length;
    const mediaWeight = entryNode.querySelectorAll("img, video, audio, canvas").length * 30;
    const richWeight = entryNode.querySelectorAll("p, li, pre, blockquote, table").length * 6;

    return textWeight + mediaWeight + richWeight;
  }

  function isSyntheticEntryId(value) {
    const normalized = normalizeText(value);
    return /^chatgpt-(?:turn|legacy)-\d+$/i.test(normalized);
  }

  function fingerprintEntryNode(entryNode) {
    if (!entryNode) {
      return "";
    }

    const normalizedText = normalizeText(entryNode.textContent).toLowerCase();
    const head = normalizedText.slice(0, 220);
    const tail = normalizedText.length > 220 ? normalizedText.slice(-120) : "";
    const mediaSignature = [
      entryNode.querySelectorAll("img").length,
      entryNode.querySelectorAll("video").length,
      entryNode.querySelectorAll("audio").length,
      entryNode.querySelectorAll("canvas").length,
      entryNode.querySelectorAll("a[href]").length
    ].join(":");
    const raw = `${head}|${tail}|${normalizedText.length}|${mediaSignature}`;

    // Lightweight stable hash for merge-key fallback when real turn/message ids
    // are missing in virtualized DOM variants.
    let hash = 2166136261;
    for (let index = 0; index < raw.length; index += 1) {
      hash ^= raw.charCodeAt(index);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }

    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function entryMergeKey(entry) {
    const roleKey = normalizeRole(entry?.rawRole || "unknown") || "unknown";
    const fingerprint = normalizeText(entry?.contentFingerprint);
    const turnId = normalizeText(entry?.turnId);
    if (turnId) {
      if (fingerprint) {
        return `${turnId}::${roleKey}::${fingerprint}`;
      }
      return `${turnId}::${roleKey}`;
    }

    const messageId = normalizeText(entry?.messageId);
    if (messageId) {
      if (fingerprint) {
        return `${messageId}::${roleKey}::${fingerprint}`;
      }
      return `${messageId}::${roleKey}`;
    }

    const dataTestId = normalizeText(entry?.dataTestId);
    if (dataTestId) {
      return fingerprint
        ? `${dataTestId}::${roleKey}::${fingerprint}`
        : `${dataTestId}::${roleKey}`;
    }

    const order = Number(entry?.order || 0);
    return fingerprint
      ? `chatgpt-order-${order}::${roleKey}::${fingerprint}`
      : `chatgpt-order-${order}::${roleKey}::w${Number(entry?.weight || 0)}`;
  }

  function readEntryFromTurnSection(
    section,
    fallbackIndex,
    messageNodeOverride = null,
    splitIndex = 0,
    splitCount = 1,
    rawRoleOverride = ""
  ) {
    const rawRole = normalizeRole(
      rawRoleOverride
      || section.getAttribute("data-message-author-role")
      || section.getAttribute("data-turn")
      || section.querySelector("[data-message-author-role]")?.getAttribute("data-message-author-role")
      || inferRoleFromTurnSection(section, fallbackIndex)
      || "unknown"
    );

    if (!rawRole) {
      return null;
    }

    const messageNode = messageNodeOverride
      || section.querySelector("[data-message-author-role][data-message-id]")
      || section.querySelector("[data-message-author-role]")
      || section.querySelector("[data-message-id]")
      || section.querySelector("[data-turn-start-message]")
      || section.querySelector(".text-message")
      || section.querySelector(".agent-turn")
      || section;
    const dataTestId = normalizeText(section.getAttribute("data-testid"));
    const explicitTurnId = section.getAttribute("data-turn-id")
      || section.getAttribute("data-turn-start-message")
      || section.querySelector("[data-turn-start-message]")?.getAttribute("data-turn-start-message")
      || "";
    const explicitMessageId = messageNode?.getAttribute("data-message-id")
      || section.getAttribute("data-message-id")
      || section.getAttribute("data-turn-message-id")
      || section.querySelector("[data-turn-message-id]")?.getAttribute("data-turn-message-id")
      || section.getAttribute("data-chatgpt-selection-message-id")
      || section.querySelector("[data-chatgpt-selection-message-id]")?.getAttribute("data-chatgpt-selection-message-id")
      || "";
    const baseFallbackId = (messageNodeOverride && explicitMessageId)
      || explicitMessageId
      || explicitTurnId
      || dataTestId
      || `chatgpt-turn-${fallbackIndex + 1}`;
    const splitSuffix = splitCount > 1 ? `::${rawRole}-${splitIndex + 1}` : "";
    const turnId = normalizeText(
      splitCount > 1
        ? `${baseFallbackId}${splitSuffix}`
        : ((messageNodeOverride && explicitMessageId) || explicitMessageId || explicitTurnId || dataTestId || `chatgpt-turn-${fallbackIndex + 1}`)
    );
    const messageId = normalizeText(
      (splitCount > 1 ? `${explicitMessageId || baseFallbackId}${splitSuffix}` : explicitMessageId)
      || explicitMessageId
      || explicitTurnId
      || dataTestId
      || turnId
    );
    const clonedNode = (messageNodeOverride || section).cloneNode(true);

    return {
      node: clonedNode,
      rawRole,
      turnId,
      messageId,
      dataTestId: splitSuffix ? `${dataTestId}${splitSuffix}` : dataTestId,
      order: parseTurnOrder(section, fallbackIndex + 1) + (splitCount > 1 ? splitIndex / 1000 : 0),
      weight: getEntryWeight(clonedNode),
      contentFingerprint: fingerprintEntryNode(clonedNode),
      _sourceNode: messageNodeOverride || section
    };
  }

  function isSectionOwnedRoleNode(node, section) {
    if (!node) {
      return false;
    }
    // If node itself is the section, it is owned by itself
    if (node === section) {
      return true;
    }
    // Check if section contains node
    if (!section.contains(node)) {
      return false;
    }
    const parentRoleNode = node.parentElement?.closest?.("[data-message-author-role]");
    return !parentRoleNode || !section.contains(parentRoleNode);
  }

  function collectOwnedRoleMessageNodes(section) {
    return Array.from(section.querySelectorAll("[data-message-author-role]"))
      .filter((node) => isSectionOwnedRoleNode(node, section));
  }

  function cloneUserMessageNodeWithSingleBubble(messageNode, bubbleIndex) {
    const clonedMessageNode = messageNode.cloneNode(true);
    const clonedBubbles = Array.from(clonedMessageNode.querySelectorAll(".whitespace-pre-wrap"));

    clonedBubbles.forEach((bubble, index) => {
      if (index === bubbleIndex) {
        return;
      }

      const removableBubble = bubble.closest(".user-message-bubble-color") || bubble;
      removableBubble.remove();
    });

    return clonedMessageNode;
  }

  function splitOwnedRoleNodeForExport(messageNode) {
    const rawRole = normalizeRole(messageNode.getAttribute("data-message-author-role"));
    if (rawRole !== "user") {
      return [{ node: messageNode, rawRole }];
    }

    const bubbles = Array.from(messageNode.querySelectorAll(".whitespace-pre-wrap"));
    if (bubbles.length <= 1) {
      return [{ node: messageNode, rawRole }];
    }

    return bubbles.map((_bubble, bubbleIndex) => ({
      node: cloneUserMessageNodeWithSingleBubble(messageNode, bubbleIndex),
      rawRole
    }));
  }

  function collectSplitRoleEntries(section) {
    const roleNodes = collectOwnedRoleMessageNodes(section);
    const splitNodes = [];

    // ChatGPT can render several user bubbles around empty assistant
    // placeholders, several bubbles inside one user wrapper, or user nodes under
    // a section whose outer data-turn is not "user". Split those concrete role
    // nodes before dedupe so consecutive Human messages cannot collapse.
    for (const roleNode of roleNodes) {
      splitNodes.push(...splitOwnedRoleNodeForExport(roleNode));
    }

    return splitNodes;
  }

  function readEntriesFromTurnSection(section, fallbackIndex) {
    const splitRoleEntries = collectSplitRoleEntries(section);
    if (splitRoleEntries.length > 0) {
      return splitRoleEntries
        .map((entry, splitIndex) => readEntryFromTurnSection(
          section,
          fallbackIndex,
          entry.node,
          splitIndex,
          splitRoleEntries.length,
          entry.rawRole
        ))
        .filter(Boolean);
    }

    const entry = readEntryFromTurnSection(section, fallbackIndex);
    return entry ? [entry] : [];
  }

  function collectExplicitUserEntriesFromTurnSections(turnSections) {
    const entries = [];

    for (let sectionIndex = 0; sectionIndex < turnSections.length; sectionIndex += 1) {
      const section = turnSections[sectionIndex];
      const splitRoleEntries = collectSplitRoleEntries(section);
      if (!splitRoleEntries.some((entry) => entry.rawRole === "user")) {
        continue;
      }

      splitRoleEntries.forEach((entry, splitIndex) => {
        if (entry.rawRole !== "user") {
          return;
        }

        const userEntry = readEntryFromTurnSection(
          section,
          sectionIndex,
          entry.node,
          splitIndex,
          splitRoleEntries.length,
          entry.rawRole
        );

        if (userEntry) {
          entries.push(userEntry);
        }
      });
    }

    return entries;
  }

  function collectExplicitUserEntriesOutsideTurnSections() {
    return Array.from(document.querySelectorAll("[data-message-author-role='user']"))
      .filter((node) => !node.closest(TURN_SECTION_SELECTOR))
      .flatMap((node, index) => {
        return splitOwnedRoleNodeForExport(node)
          .filter((entry) => entry.rawRole === "user")
          .map((entry, splitIndex, splitEntries) => {
            return {
              node: entry.node.cloneNode(true),
              rawRole: entry.rawRole,
              turnId: normalizeText(node.getAttribute("data-message-id") || `chatgpt-legacy-user-${index + 1}${splitEntries.length > 1 ? `-${splitIndex + 1}` : ""}`),
              messageId: normalizeText(node.getAttribute("data-message-id") || `chatgpt-legacy-user-${index + 1}${splitEntries.length > 1 ? `-${splitIndex + 1}` : ""}`),
              dataTestId: normalizeText(node.getAttribute("data-testid")),
              order: Number.MAX_SAFE_INTEGER - 2000 + index + (splitIndex / 1000),
              weight: getEntryWeight(entry.node),
              contentFingerprint: fingerprintEntryNode(entry.node),
              _sourceNode: node
            };
          });
      });
  }

  function collectExplicitAssistantEntriesOutsideTurnSections() {
    return Array.from(document.querySelectorAll("[data-message-author-role='assistant'], [data-markdown-text-style='assistant-message'], .agent-turn, main .markdown, main .prose"))
      .filter((node) => !node.closest(TURN_SECTION_SELECTOR))
      .map((node, index) => {
        const clonedNode = node.cloneNode(true);
        const dataTestId = normalizeText(node.getAttribute("data-testid"));
        const explicitMessageId = normalizeText(node.getAttribute("data-message-id"));
        return {
          node: clonedNode,
          rawRole: "assistant",
          turnId: explicitMessageId || dataTestId || `chatgpt-outside-assistant-${index + 1}`,
          messageId: explicitMessageId || dataTestId || `chatgpt-outside-assistant-${index + 1}`,
          dataTestId,
          order: Number.MAX_SAFE_INTEGER - 1500 + index,
          weight: getEntryWeight(clonedNode),
          contentFingerprint: fingerprintEntryNode(clonedNode),
          _sourceNode: node
        };
      });
  }

  function collectVisibleConversationEntries() {
    const entries = [];
    const allMatchingNodes = Array.from(
      document.querySelectorAll(TURN_SECTION_SELECTOR)
    );
    // Filter to top-level sections so nested selectors don't duplicate or shadow
    const turnSections = allMatchingNodes.filter((node) => {
      let parent = node.parentElement;
      while (parent) {
        if (allMatchingNodes.includes(parent)) {
          return false;
        }
        parent = parent.parentElement;
      }
      return true;
    });

    // Collect concrete user and assistant nodes directly.
    entries.push(...collectExplicitUserEntriesFromTurnSections(turnSections));
    entries.push(...collectExplicitUserEntriesOutsideTurnSections());
    entries.push(...collectExplicitAssistantEntriesOutsideTurnSections());

    for (let index = 0; index < turnSections.length; index += 1) {
      const section = turnSections[index];
      if (!hasRenderableTurnContent(section)) {
        continue;
      }

      entries.push(...readEntriesFromTurnSection(section, index));
    }

    // Safety fallback: if no entries were collected, query any message-bearing elements in main
    if (!entries.length) {
      const fallbackNodes = Array.from(document.querySelectorAll("main [data-message-author-role], main article, [data-message-author-role]"));
      fallbackNodes.forEach((node, idx) => {
        const role = normalizeRole(node.getAttribute("data-message-author-role") || inferRoleFromTurnSection(node) || (idx % 2 === 0 ? "user" : "assistant"));
        const clonedNode = node.cloneNode(true);
        entries.push({
          node: clonedNode,
          rawRole: role,
          turnId: `chatgpt-fallback-${idx + 1}`,
          messageId: `chatgpt-fallback-${idx + 1}`,
          dataTestId: `chatgpt-fallback-${idx + 1}`,
          order: idx + 1,
          weight: getEntryWeight(clonedNode),
          contentFingerprint: fingerprintEntryNode(clonedNode)
        });
      });
    }

    const legacyNodes = Array.from(document.querySelectorAll("[data-message-author-role]"));
    for (let index = 0; index < legacyNodes.length; index += 1) {
      const node = legacyNodes[index];
      if (node.closest(TURN_SECTION_SELECTOR)) {
        continue;
      }

      const rawRole = normalizeRole(node.getAttribute("data-message-author-role") || "unknown");
      if (!rawRole) {
        continue;
      }

      const clonedNode = node.cloneNode(true);
      const dataTestId = normalizeText(node.getAttribute("data-testid"));
      const explicitMessageId = normalizeText(node.getAttribute("data-message-id"));

      entries.push({
        node: clonedNode,
        rawRole,
        turnId: explicitMessageId || dataTestId || `chatgpt-legacy-${index + 1}`,
        messageId: explicitMessageId || dataTestId || `chatgpt-legacy-${index + 1}`,
        dataTestId,
        order: Number.MAX_SAFE_INTEGER - 1000 + index,
        weight: getEntryWeight(clonedNode),
        contentFingerprint: fingerprintEntryNode(clonedNode)
      });
    }

    return entries.sort((left, right) => left.order - right.order);
  }

  function shouldRunTurnHydrationSweep(totalTurns, collectedCount) {
    const total = Number(totalTurns || 0);
    const collected = Number(collectedCount || 0);
    if (!total || total < 12 || collected >= total) {
      return false;
    }

    const missing = total - collected;
    // Run an extra targeted hydration sweep when virtualized turns are much
    // higher than currently rendered entries (common in long ChatGPT threads).
    return missing >= 8 || collected < Math.ceil(total * 0.72);
  }

  function getScrollContainerFromSection(section) {
    let current = section?.parentElement || null;

    while (current) {
      const style = window.getComputedStyle(current);
      const overflowY = String(style.overflowY || "").toLowerCase();
      const canScroll = (overflowY.includes("auto") || overflowY.includes("scroll") || overflowY.includes("overlay"))
        && current.scrollHeight > current.clientHeight + 40;

      if (canScroll) {
        return current;
      }

      current = current.parentElement;
    }

    const fallbackRoot = document.scrollingElement || document.documentElement;
    return fallbackRoot instanceof HTMLElement ? fallbackRoot : null;
  }

  function scrollTopOf(container) {
    return Number(container?.scrollTop || 0);
  }

  function scrollLeftOf(container) {
    return Number(container?.scrollLeft || 0);
  }

  function scrollHeightOf(container) {
    return Number(container?.scrollHeight || 0);
  }

  function clientHeightOf(container) {
    return Number(container?.clientHeight || window.innerHeight || 0);
  }

  function setScrollTop(container, value) {
    if (!container) {
      return;
    }

    container.scrollTop = Number(value || 0);
  }

  function isDocumentScrollContainer(container) {
    const root = document.scrollingElement || document.documentElement;
    return container === root || container === document.documentElement || container === document.body;
  }

  function setScrollPosition(container, top, left) {
    if (!container) {
      return;
    }

    const safeTop = Number(top || 0);
    const safeLeft = Number(left || 0);

    if (isDocumentScrollContainer(container)) {
      // Some hosts bind scrolling to the root and ignore direct `scrollTop`
      // assignments intermittently during reflow, so set both APIs.
      window.scrollTo(safeLeft, safeTop);
      const root = document.scrollingElement || document.documentElement;
      if (root) {
        root.scrollTop = safeTop;
        root.scrollLeft = safeLeft;
      }
      if (document.body) {
        document.body.scrollTop = safeTop;
        document.body.scrollLeft = safeLeft;
      }
      return;
    }

    container.scrollTop = safeTop;
    container.scrollLeft = safeLeft;
  }

  function scrollToTopAnimated(container) {
    if (!container) {
      return;
    }

    const safeLeft = scrollLeftOf(container);

    try {
      if (isDocumentScrollContainer(container)) {
        window.scrollTo({
          top: 0,
          left: safeLeft,
          behavior: "smooth"
        });
        return;
      }

      if (typeof container.scrollTo === "function") {
        container.scrollTo({
          top: 0,
          left: safeLeft,
          behavior: "smooth"
        });
        return;
      }
    } catch (_error) {
      // Fall back to immediate positioning for hosts that reject smooth scroll.
    }

    setScrollPosition(container, 0, safeLeft);
  }

  function scrollToPositionAnimated(container, top, left) {
    if (!container) {
      return;
    }

    const safeTop = Math.max(0, Number(top || 0));
    const safeLeft = Number(left || 0);

    try {
      if (isDocumentScrollContainer(container)) {
        window.scrollTo({
          top: safeTop,
          left: safeLeft,
          behavior: "smooth"
        });
        return;
      }

      if (typeof container.scrollTo === "function") {
        container.scrollTo({
          top: safeTop,
          left: safeLeft,
          behavior: "smooth"
        });
        return;
      }
    } catch (_error) {
      // Fall back to immediate positioning for hosts that reject smooth scroll.
    }

    setScrollPosition(container, safeTop, safeLeft);
  }

  function waitForRender(ms = 72) {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        window.requestAnimationFrame(() => resolve());
      }, ms);
    });
  }

  async function runRequestedHydrationCycle(scrollContainer, hydrationBudgetExceeded, onCollect, topReachThreshold = 2) {
    const sweepStepPx = 1700;
    const stepWaitMs = 250;
    const postSweepWaitMs = 400;
    const postTopWaitMs = 400;
    const retryTopWaitMs = 300;
    const retryBottomWaitMs = 300;
    const bottomReachThreshold = 2;
    const horizontal = scrollLeftOf(scrollContainer);
    const maxSweepIterations = 1600;
    const getBottomTop = () => Math.max(0, scrollHeightOf(scrollContainer) - clientHeightOf(scrollContainer));

    // 1) Move to top:0.
    setScrollPosition(scrollContainer, 0, horizontal);
    onCollect();

    // 2) Sweep down in 1700px immediate steps with 0.5s between steps.
    let iterations = 0;
    while (!hydrationBudgetExceeded() && iterations < maxSweepIterations) {
      const bottomTop = getBottomTop();
      const currentTop = scrollTopOf(scrollContainer);
      if (currentTop >= bottomTop - bottomReachThreshold) {
        break;
      }

      const nextTop = Math.min(bottomTop, currentTop + sweepStepPx);
      if (nextTop <= currentTop) {
        break;
      }
      setScrollPosition(scrollContainer, nextTop, horizontal);
      onCollect();
      await waitForRender(stepWaitMs);
      onCollect();
      iterations += 1;
    }

    // 3) Hold 2 seconds.
    await waitForRender(postSweepWaitMs);
    onCollect();

    // 4) Move to top:0 without animation and hold 2 seconds.
    setScrollPosition(scrollContainer, 0, horizontal);
    onCollect();
    await waitForRender(postTopWaitMs);
    onCollect();

    // 5) If not at top yet, retry top up to 3 times.
    let topRetries = 0;
    while (!hydrationBudgetExceeded() && scrollTopOf(scrollContainer) > topReachThreshold && topRetries < 3) {
      setScrollPosition(scrollContainer, 0, horizontal);
      onCollect();
      await waitForRender(retryTopWaitMs);
      onCollect();
      topRetries += 1;
    }

    // 6) Move to bottom and retry up to 3 times.
    setScrollPosition(scrollContainer, getBottomTop(), horizontal);
    onCollect();
    await waitForRender(retryBottomWaitMs);
    onCollect();

    let bottomRetries = 0;
    while (!hydrationBudgetExceeded() && bottomRetries < 3) {
      const bottomTop = getBottomTop();
      if (scrollTopOf(scrollContainer) >= bottomTop - 20) {
        return true;
      }

      setScrollPosition(scrollContainer, bottomTop, horizontal);
      onCollect();
      await waitForRender(retryBottomWaitMs);
      onCollect();
      bottomRetries += 1;
    }

    return false;
  }

  async function collectConversationEntries(options = {}) {
    const hydrationStartedAt = Date.now();
    const requestedBudgetMs = Number(options.maxHydrationMs);
    const maxHydrationMs = Number.isFinite(requestedBudgetMs)
      ? Math.max(1200, Math.round(requestedBudgetMs))
      : 120000;
    const hydrationBudgetExceeded = () => (Date.now() - hydrationStartedAt) >= maxHydrationMs;

    const initialSections = Array.from(
      document.querySelectorAll(TURN_SECTION_SELECTOR)
    );
    const initialTurnCount = initialSections.length;
    let visibleEntries = collectVisibleConversationEntries();

    if (!visibleEntries.length && options.hydrateVirtualized !== false) {
      // Give ChatGPT one extra paint cycle when sections are still mounting.
      await waitForRender(132);
      visibleEntries = collectVisibleConversationEntries();
    }

    if (
      options.hydrateVirtualized === false
      || !visibleEntries.length
    ) {
      return visibleEntries;
    }

    const scrollContainer = getScrollContainerFromSection(initialSections[0]);
    if (!scrollContainer) {
      return visibleEntries;
    }

    const maxScroll = Math.max(0, scrollHeightOf(scrollContainer) - clientHeightOf(scrollContainer));
    if (maxScroll <= 40) {
      // Chat is short and completely fits in viewport; no virtualization is active.
      return visibleEntries;
    }

    const collectedByTurn = new Map();
    const mergeEntries = (entries) => {
      for (const entry of entries) {
        // Keep role in the merge key to avoid collisions when model variants
        // reuse turn containers with slightly different internal structures.
        const key = entryMergeKey(entry);
        if (!key) {
          continue;
        }

        const existing = collectedByTurn.get(key);
        if (!existing || entry.weight > existing.weight) {
          collectedByTurn.set(key, entry);
        }
      }
    };

    const topReachThreshold = 2;
    mergeEntries(visibleEntries);
    const reachedPositions = await runRequestedHydrationCycle(
      scrollContainer,
      hydrationBudgetExceeded,
      () => {
        mergeEntries(collectVisibleConversationEntries());
      },
      topReachThreshold
    );
    if (!reachedPositions) {
      // Log warning and fallback gracefully to visibleEntries instead of failing export
      console.warn("ChatGPT hydration did not finish top/bottom stabilization within timeout, continuing with visible entries.");
    }

    const mergedEntries = Array.from(collectedByTurn.values()).sort((left, right) => left.order - right.order);
    return mergedEntries.length ? mergedEntries : visibleEntries;
  }

  function buildReferenceKey(item) {
    return `${item.label || ""}::${item.url || ""}`.toLowerCase();
  }

  function dedupeReferences(items) {
    const seen = new Set();
    const unique = [];

    for (const item of items) {
      const key = buildReferenceKey(item);
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      unique.push(item);
    }

    return unique;
  }

  function normalizeReferenceLabel(value) {
    const text = normalizeText(value);
    return text.length > 180 ? text.slice(0, 177).trimEnd() + "..." : text;
  }

  function isLikelyAttachmentHref(href) {
    return /\/files?\//i.test(href) || /download/i.test(href);
  }

  function isLikelyAttachmentLabel(label) {
    return /\.[a-z0-9]{2,8}(?:\b|$)/i.test(label);
  }

  function isLikelyUrlLabel(label) {
    return /^(?:https?:\/\/|www\.)/i.test(label);
  }

  function isLikelyInternalDocumentLabel(label) {
    const normalized = normalizeText(label);
    if (!normalized) {
      return false;
    }

    // Common ChatGPT internal document pills:
    // `39. Define perfecto (GPT)`, `12. Documento ...`, etc.
    if (/^\d{1,4}\.\s+\S+/u.test(normalized)) {
      return true;
    }

    if (/\((?:gpt|chatgpt|claude|gemini|deepseek|grok)\)\s*$/i.test(normalized)) {
      return true;
    }

    return false;
  }

  function isCitationOnlyLabel(label) {
    const normalized = normalizeText(label).replace(/[\[\]().,:;#]/g, "");
    if (!normalized) {
      return false;
    }

    if (/^\d{1,4}$/.test(normalized)) {
      return true;
    }

    // ChatGPT web pills can be exported as labels like "arXiv+1".
    return /^.+\+\d{1,4}$/i.test(normalized);
  }

  function stripAssistantWebLinksFromNode(node, settings = {}) {
    if (!node || settings.showAssistantWebReferences) {
      return;
    }

    const anchors = Array.from(node.querySelectorAll("a[href]"));
    for (const anchor of anchors) {
      const href = normalizeText(anchor.getAttribute("href"));
      const label = normalizeReferenceLabel(
        anchor.getAttribute("aria-label")
        || anchor.getAttribute("title")
        || anchor.textContent
      );

      if (!href) {
        continue;
      }

      // Preserve file-like links and internal document labels.
      if (isLikelyAttachmentHref(href) || isLikelyAttachmentLabel(label) || isLikelyInternalDocumentLabel(label)) {
        continue;
      }

      const isCitationLink = isCitationOnlyLabel(label)
        || Boolean(anchor.querySelector("[data-testid*='citation-pill']"));

      if (isCitationLink || !label || isLikelyUrlLabel(label)) {
        anchor.remove();
        continue;
      }

      // Keep readable wording while removing outbound URL behavior.
      anchor.replaceWith(node.ownerDocument.createTextNode(label));
    }

    // Remove citation chips/pills that are rendered outside direct anchor text.
    const citationNodes = Array.from(
      node.querySelectorAll(
        [
          "[data-testid='webpage-citation-pill']",
          "[data-testid*='citation-pill']"
        ].join(", ")
      )
    );

    for (const citationNode of citationNodes) {
      const linkedWrapper = citationNode.closest("a[href]");
      if (linkedWrapper) {
        linkedWrapper.remove();
        continue;
      }

      citationNode.remove();
    }
  }

  function extractVisibleFileTileLabel(node) {
    const candidates = [
      node.getAttribute("aria-label"),
      node.getAttribute("title"),
      node.querySelector(".font-semibold")?.textContent,
      node.querySelector("[class*='font-semibold']")?.textContent,
      node.querySelector("p.truncate")?.textContent,
      node.querySelector(".truncate")?.textContent,
      node.textContent
    ];

    for (const candidate of candidates) {
      const label = normalizeReferenceLabel(candidate);
      if (label && isLikelyAttachmentLabel(label)) {
        return label;
      }
    }

    return "";
  }

  function isIgnoredReferenceLabel(label) {
    return !label
      || SOURCES_LABEL_REGEX.test(label)
      || /^(\+\d+|pdf|documento|document)$/i.test(label);
  }

  function extractButtonReferenceLabel(node) {
    if (!node) {
      return "";
    }

    const candidates = [
      node.getAttribute("aria-label"),
      node.getAttribute("title"),
      node.querySelector("p.truncate")?.textContent,
      node.querySelector(".truncate")?.textContent,
      node.querySelector(".font-semibold")?.textContent,
      node.querySelector("[class*='font-semibold']")?.textContent,
      node.querySelector(".not-prose")?.textContent,
      node.textContent
    ];

    for (const candidate of candidates) {
      const label = normalizeReferenceLabel(candidate);
      if (!label || isIgnoredReferenceLabel(label) || label.length > 180) {
        continue;
      }

      if (IGNORED_ASSISTANT_ACTION_LABEL_REGEX.test(label)) {
        continue;
      }

      // Keep only content-bearing reference labels (file/url/internal-doc) to avoid UI action text.
      if (isLikelyAttachmentLabel(label) || isLikelyUrlLabel(label) || isLikelyInternalDocumentLabel(label)) {
        return label;
      }
    }

    return "";
  }

  function extractUserAttachmentTiles(messageNode) {
    const tileNodes = Array.from(
      messageNode.querySelectorAll(
        [
          '[role="group"][aria-label]',
          '[class*="file-tile"][aria-label]',
          '[class*="group/file-tile"]',
          '[data-default-action="true"] button[aria-label]',
          '[data-default-action="true"] button',
          'button[aria-haspopup="dialog"]',
          '.font-semibold',
          '[class*="font-semibold"]'
        ].join(", ")
      )
    );

    const items = tileNodes.map((node) => {
      const label = extractVisibleFileTileLabel(node);
      if (!label) {
        return null;
      }

      return {
        kind: "attachment",
        label,
        url: ""
      };
    }).filter(Boolean);

    return dedupeReferences(items);
  }

  function extractUserAttachmentReferences(messageNode) {
    const anchors = Array.from(messageNode.querySelectorAll("a[href], [download]"));
    const linkItems = anchors.map((node) => {
      const href = normalizeText(node.getAttribute("href"));
      const label = normalizeReferenceLabel(
        node.getAttribute("download")
        || node.getAttribute("aria-label")
        || node.getAttribute("title")
        || node.textContent
      );

      if (!label) {
        return null;
      }

      if (!isLikelyAttachmentHref(href) && !isLikelyAttachmentLabel(label)) {
        return null;
      }

      return {
        kind: "attachment",
        label,
        url: href || ""
      };
    }).filter(Boolean);
    const tileItems = extractUserAttachmentTiles(messageNode);

    return dedupeReferences([...linkItems, ...tileItems]);
  }

  function extractAssistantReferences(messageNode, contentRoot) {
    const anchors = Array.from((contentRoot || messageNode).querySelectorAll("a[href]"));
    const items = anchors.map((node) => {
      const href = normalizeText(node.getAttribute("href"));
      const label = normalizeReferenceLabel(
        node.getAttribute("aria-label")
        || node.getAttribute("title")
        || node.textContent
      );

      if (!href && !label) {
        return null;
      }

      return {
        kind: (isLikelyAttachmentHref(href) || isLikelyAttachmentLabel(label) || isLikelyInternalDocumentLabel(label))
          ? "attachment"
          : "url",
        label,
        url: href || ""
      };
    }).filter(Boolean);

    return dedupeReferences(items);
  }

  function extractAssistantButtonReferences(messageNode, contentRoot) {
    const scope = contentRoot || messageNode;
    const buttons = Array.from(
      scope.querySelectorAll(
        [
          'button[aria-haspopup="dialog"]',
          'button .truncate',
          'button .not-prose',
          'button [class*="truncate"]',
          'button [class*="font-semibold"]'
        ].join(", ")
      )
    ).map((node) => node.closest("button")).filter(Boolean);

    const items = buttons.map((button) => {
      const label = extractButtonReferenceLabel(button);
      if (!label) {
        return null;
      }

      return {
        // Button-based chips in ChatGPT are usually internal references; classify
        // non-URL labels as attachments so they are not hidden by the web-link toggle.
        kind: isLikelyUrlLabel(label) ? "url" : "attachment",
        label,
        url: ""
      };
    }).filter(Boolean);

    return dedupeReferences(items);
  }

  function isLikelyThinkingLabelText(value) {
    const text = normalizeText(value);
    if (!text || text.length > 220) {
      return false;
    }

    if (!THINKING_LABEL_REGEX.test(text)) {
      return false;
    }

    if (THINKING_SECONDS_REGEX.test(text) || THINKING_DURATION_LABEL_REGEX.test(text)) {
      return true;
    }

    return /^(?:thought|thinking|reasoning|reasoned|pensado|pensando|pens[oó]|pensamiento|razonando|razonamiento)\b/i.test(text);
  }

  function findThinkingIndicatorInNode(node) {
    if (!node) {
      return null;
    }

    const probes = [
      node,
      ...Array.from(node.querySelectorAll(
        [
          ".text-token-text-tertiary",
          "summary",
          "details",
          '[aria-label*="think" i]',
          '[aria-label*="reason" i]',
          '[aria-label*="pens" i]',
          '[aria-label*="razon" i]',
          '[title*="think" i]',
          '[title*="reason" i]',
          '[title*="pens" i]',
          '[title*="razon" i]'
        ].join(", ")
      ))
    ];

    for (const probe of probes) {
      const candidateTexts = [
        probe.getAttribute?.("aria-label"),
        probe.getAttribute?.("title"),
        probe.textContent
      ]
        .map((value) => normalizeText(value))
        .filter(Boolean);

      const label = candidateTexts.find((text) => isLikelyThinkingLabelText(text));
      if (label) {
        return {
          indicatorNode: probe,
          indicatorText: label
        };
      }
    }

    return null;
  }

  function findStructuredThinkingBlock(turnNode) {
    if (!turnNode) {
      return null;
    }

    const assistantMessageNode = turnNode.querySelector("[data-message-author-role='assistant']");
    if (!assistantMessageNode) {
      return null;
    }

    // ChatGPT currently renders the "Thought for ..." block immediately
    // before the assistant message container inside the assistant turn.
    let sibling = assistantMessageNode.previousElementSibling;
    while (sibling) {
      if (!sibling.querySelector("[data-message-author-role]")) {
        const siblingIndicator = findThinkingIndicatorInNode(sibling);
        if (siblingIndicator) {
          return {
            thinkingRoot: sibling,
            indicatorNode: siblingIndicator.indicatorNode,
            indicatorText: siblingIndicator.indicatorText
          };
        }
      }

      sibling = sibling.previousElementSibling;
    }

    // Fallback for minor DOM variants where the thinking block is rendered
    // as a standalone details/summary node that still precedes assistant text.
    const fallbackCandidates = Array.from(
      turnNode.querySelectorAll("details, summary, [data-testid*='think'], [data-testid*='reason']")
    );

    for (const candidate of fallbackCandidates) {
      if (assistantMessageNode.contains(candidate) || candidate.contains(assistantMessageNode)) {
        continue;
      }

      if (!(candidate.compareDocumentPosition(assistantMessageNode) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        continue;
      }

      const candidateIndicator = findThinkingIndicatorInNode(candidate);
      if (!candidateIndicator) {
        continue;
      }

      return {
        thinkingRoot: candidate.closest("details") || candidate,
        indicatorNode: candidateIndicator.indicatorNode,
        indicatorText: candidateIndicator.indicatorText
      };
    }

    return null;
  }

  function removeStructuredThinkingFromAssistantRoot(contentRoot) {
    const thinkingBlock = findStructuredThinkingBlock(contentRoot);
    if (!thinkingBlock?.thinkingRoot?.parentElement) {
      return;
    }

    thinkingBlock.thinkingRoot.remove();
  }

  function prepareAssistantContentRootForSanitize(contentRoot, settings = {}) {
    const clone = contentRoot?.cloneNode?.(true);
    if (!clone) {
      return contentRoot;
    }

    // Ensure thought labels/blocks do not leak into assistant plain text output.
    removeStructuredThinkingFromAssistantRoot(clone);

    // Remove screen-reader only labels (e.g. "ChatGPT said:", "ChatGPT 说：")
    Array.from(clone.querySelectorAll(".sr-only, [class*='sr-only']")).forEach((node) => node.remove());

    // Remove assistant web links from message body when web references are disabled.
    stripAssistantWebLinksFromNode(clone, settings);

    // Remove UI-only action surfaces that are not part of the assistant content.
    const uiOnlyNodes = Array.from(clone.querySelectorAll(
      [
        "[data-testid='image-gen-overlay-actions']",
        "[data-testid$='turn-action-button']",
        "[aria-label*='copy response' i]",
        "[aria-label*='copiar respuesta' i]",
        "[aria-label*='edit image' i]",
        "[aria-label*='editar imagen' i]",
        "[aria-label*='share this image' i]",
        "[aria-label*='compartir esta imagen' i]",
        "[aria-label*='like this image' i]",
        "[aria-label*='me gusta esta imagen' i]",
        "[aria-label*='dislike this image' i]",
        "[aria-label*='no me gusta esta imagen' i]"
      ].join(", ")
    ));
    uiOnlyNodes.forEach((node) => node.remove());

    // Keep only the primary generated image instance.
    Array.from(clone.querySelectorAll("img[aria-hidden='true']")).forEach((node) => node.remove());

    const buttons = Array.from(clone.querySelectorAll("button"));
    for (const button of buttons) {
      const label = extractButtonReferenceLabel(button);

      if (!label) {
        button.remove();
        continue;
      }

      const replacement = clone.ownerDocument.createElement("span");
      replacement.className = "ceai-inline-reference-chip";
      replacement.textContent = `[${label}]`;
      button.replaceWith(replacement);
    }

    return clone;
  }

  function findFirstVisibleMatch(selectors, regex, maxLength = 80) {
    for (const selector of selectors) {
      const elements = Array.from(document.querySelectorAll(selector));

      for (const element of elements) {
        if (!isVisibleElement(element)) {
          continue;
        }

        const text = normalizeText(element.textContent);
        if (!text || text.length > maxLength) {
          continue;
        }

        if (regex.test(text)) {
          return text;
        }
      }
    }

    return "";
  }

  function isExcludedTitleElement(element) {
    return Boolean(element?.closest("nav, aside, [role='navigation'], dialog"));
  }

  function getCurrentConversationId() {
    const match = location.pathname.match(CONVERSATION_PATH_REGEX);
    return match ? match[1] : "";
  }

  function getCurrentProjectPath() {
    const match = location.pathname.match(PROJECT_PATH_REGEX);
    return match ? `${match[1]}/project` : "";
  }

  function extractSidebarItemText(container) {
    if (!container) {
      return "";
    }

    const textNodes = Array.from(container.querySelectorAll("[dir='auto'], .truncate, span, div"));
    const candidateTexts = [];

    for (const node of textNodes) {
      const nodeText = normalizeText(node.textContent);
      if (!nodeText || nodeText.length > 180) {
        continue;
      }

      candidateTexts.push(nodeText);
    }

    const uniqueCandidates = Array.from(new Set(candidateTexts))
      .sort((left, right) => left.length - right.length);

    for (const candidate of uniqueCandidates) {
      if (candidate) {
        return candidate;
      }
    }

    const titledNodes = Array.from(container.querySelectorAll("[title]"));

    for (const node of titledNodes) {
      const titleText = normalizeText(node.getAttribute?.("title"));
      if (titleText) {
        return titleText;
      }
    }

    return normalizeText(container.textContent);
  }

  function cleanConversationAriaLabel(value) {
    return normalizeText(value)
      .replace(/,\s*chat\s+en\s+el\s+proyecto\s+.+$/i, "")
      .replace(/,\s*chat\s+in\s+the\s+project\s+.+$/i, "")
      .replace(/,\s*chat\s+in\s+project\s+.+$/i, "")
      .trim();
  }

  function extractFolderFromConversationAriaLabel(value) {
    const raw = normalizeText(value);
    const match = raw.match(/,\s*chat\s+en\s+el\s+proyecto\s+(.+)$/i)
      || raw.match(/,\s*chat\s+in\s+the\s+project\s+(.+)$/i)
      || raw.match(/,\s*chat\s+in\s+project\s+(.+)$/i);

    return match ? normalizeText(match[1]) : "";
  }

  function findConversationSidebarLink(conversationId) {
    if (!conversationId) {
      return null;
    }

    const links = Array.from(document.querySelectorAll('a[data-sidebar-item][href], aside a[href], nav a[href]'));
    return links.find((link) => {
      const href = normalizeText(link.getAttribute("href"));
      return href.includes(`/c/${conversationId}`);
    }) || null;
  }

  function extractConversationNameFromSidebar() {
    const link = findConversationSidebarLink(getCurrentConversationId());

    if (!link) {
      return "";
    }

    const text = extractSidebarItemText(link);
    if (text) {
      return text;
    }

    return cleanConversationAriaLabel(link.getAttribute("aria-label"));
  }

  function extractConversationTitle() {
    const folderName = extractConversationFolder();
    const titleSelectors = [
      'main [data-testid*="conversation-title"]',
      'main [data-testid*="conversation"] h1',
      'main header h1',
      'main h1',
      'main h2'
    ];

    for (const selector of titleSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));

      for (const element of elements) {
        if (!isVisibleElement(element) || isExcludedTitleElement(element)) {
          continue;
        }

        const text = normalizeText(element.textContent);

        if (!text || text.length > 180) {
          continue;
        }

        if (folderName && text === folderName) {
          continue;
        }

        if (MODEL_NAME_REGEX.test(text) || SHARE_LABEL_REGEX.test(text)) {
          continue;
        }

        return text;
      }
    }

    const sidebarTitle = extractConversationNameFromSidebar();
    if (sidebarTitle) {
      return sidebarTitle;
    }

    return "ChatGPT Chat";
  }

  function extractWindowTitle() {
    const rawTitle = normalizeText(document.title || document.querySelector("title")?.textContent);

    if (!rawTitle) {
      return "";
    }

    const cleanedTitle = cleanTitleSeparators(rawTitle
      .replace(/\s*[-|·•—–:]\s*chatgpt$/i, "")
      .replace(/^chatgpt\s*[-|·•—–:]\s*/i, ""));

    if (!cleanedTitle || /^chatgpt$/i.test(cleanedTitle)) {
      return "";
    }

    return cleanedTitle;
  }

  function extractConversationName() {
    return extractConversationNameFromSidebar() || extractConversationTitle();
  }

  function extractConversationFolder() {
    const projectPath = getCurrentProjectPath();

    if (!projectPath) {
      return "";
    }

    // The project folder sits on its own /project entry, separate from the chat item.
    const links = Array.from(document.querySelectorAll('a[data-sidebar-item][href], aside a[href], nav a[href]'));

    for (const link of links) {
      const href = normalizeText(link.getAttribute("href"));
      if (href !== projectPath) {
        continue;
      }

      const text = extractSidebarItemText(link);
      if (text) {
        return text;
      }
    }

    // Fallback for localized ChatGPT builds where only the conversation aria-label exposes the project name.
    const conversationLink = findConversationSidebarLink(getCurrentConversationId());
    if (conversationLink) {
      const folderFromAria = extractFolderFromConversationAriaLabel(conversationLink.getAttribute("aria-label"));
      if (folderFromAria) {
        return folderFromAria;
      }
    }

    return "";
  }

  function extractModelName() {
    return findFirstVisibleMatch(
      [
        '[data-testid*="model"]',
        'header button',
        'header [role="button"]',
        'nav button',
        'nav [role="button"]'
      ],
      MODEL_NAME_REGEX
    );
  }

  function isShareButton(element) {
    if (!isVisibleElement(element)) {
      return false;
    }

    const ariaLabel = normalizeText(element.getAttribute("aria-label"));
    const text = normalizeText(element.textContent);
    const combined = `${ariaLabel} ${text}`.trim();

    if (!combined) {
      return false;
    }

    return SHARE_LABEL_REGEX.test(combined);
  }

  function findInlineActionAnchor() {
    const candidates = Array.from(
      document.querySelectorAll('header button, header [role="button"], header a, main button, main [role="button"], main a')
    );

    for (const candidate of candidates) {
      if (!isShareButton(candidate)) {
        continue;
      }

      const rect = candidate.getBoundingClientRect();
      if (rect.top > 320 || rect.width < 20 || rect.height < 20) {
        continue;
      }

      return {
        container: candidate.parentElement,
        referenceNode: candidate
      };
    }

    const fallbackContainers = Array.from(
      document.querySelectorAll("header div, main header div, main h1, header h1")
    );

    for (const container of fallbackContainers) {
      if (!isVisibleElement(container)) {
        continue;
      }

      const rect = container.getBoundingClientRect();
      if (rect.top > 320 || rect.height < 20) {
        continue;
      }

      return {
        container: container.matches("h1") ? container.parentElement : container,
        referenceNode: null
      };
    }

    return null;
  }

  function extractMessageTimeData(messageNode) {
    const candidateNodes = Array.from(
      messageNode.querySelectorAll("time, [datetime], [data-time], [data-timestamp], [title], [aria-label]")
    );

    for (const node of candidateNodes) {
      const attributeCandidates = [
        node.getAttribute("datetime"),
        node.getAttribute("data-time"),
        node.getAttribute("data-timestamp"),
        node.getAttribute("title"),
        node.getAttribute("aria-label")
      ];

      for (const candidate of attributeCandidates) {
        const timeData = extractTimeData(candidate);

        if (timeData.label) {
          return timeData;
        }
      }

      const textData = extractTimeData(node.textContent);
      if (textData.label) {
        return textData;
      }
    }

    return {
      label: "",
      timestampMs: null
    };
  }

  function extractThinkingMessage(messageNode, settings, messageId, timeLabel, timeMs) {
    // Keep extraction available when either reasoning text or thinking time is enabled.
    if (!settings.includeThinking && !settings.includeThinkingDuration) {
      return null;
    }

    const thinkingBlock = findStructuredThinkingBlock(messageNode);
    if (!thinkingBlock) {
      return null;
    }

    const indicatorText = normalizeText(thinkingBlock.indicatorText);
    const thinkingRoot = thinkingBlock.thinkingRoot?.closest?.("details")
      || thinkingBlock.thinkingRoot
      || thinkingBlock.indicatorNode;
    const sanitized = root.sanitize.sanitizeMessageNode(thinkingRoot, {
      mediaHandling: settings.mediaHandling
    });

    const stripped = normalizeText((sanitized.safeHtml || "").replace(/<[^>]*>/g, " "));
    const secondsMatch = (
      indicatorText.match(THINKING_SECONDS_REGEX)
      || normalizeText((sanitized.safeHtml || "").replace(/<[^>]*>/g, " ")).match(THINKING_SECONDS_REGEX)
    );
    const durationMatch = (
      indicatorText.match(THINKING_DURATION_LABEL_REGEX)
      || normalizeText((sanitized.safeHtml || "").replace(/<[^>]*>/g, " ")).match(THINKING_DURATION_LABEL_REGEX)
    );
    const thinkingDurationLabel = durationMatch ? normalizeText(durationMatch[1]) : "";

    if (!stripped && !indicatorText) {
      return null;
    }

    return {
      id: `${messageId}-thinking`,
      role: ROLES.ASSISTANT,
      safeHtml: stripped ? sanitized.safeHtml : `<p>${root.sanitize.escapeHtml(indicatorText)}</p>`,
      hasMedia: Boolean(sanitized.hasMedia),
      timeLabel,
      timeMs,
      isThinking: true,
      thinkingSeconds: secondsMatch ? secondsMatch[1] : null,
      thinkingLabel: normalizeText(indicatorText),
      thinkingDurationLabel
    };
  }

  async function extractConversation(settings, options = {}) {
    const requestedHydrationBudgetMs = Number(options.maxHydrationMs);
    const fallbackHydrationBudgetMs = Math.max(
      120000,
      Math.round(Number(settings?.exportTimeoutSeconds || 20) * 1000 * 0.65)
    );
    const rawEntries = await collectConversationEntries({
      ...options,
      maxHydrationMs: Number.isFinite(requestedHydrationBudgetMs)
        ? requestedHydrationBudgetMs
        : fallbackHydrationBudgetMs
    });
    const seenTurns = new Set();
    const messages = [];

    const shouldExtractAssistantReferences = Boolean(
      settings.showAssistantUserAttachmentReferences
      || settings.showAssistantGeneratedAttachmentReferences
      || settings.showAssistantWebReferences
      || settings.showAssistantReferences
    );

    for (let index = 0; index < rawEntries.length; index += 1) {
      const entry = rawEntries[index];
      const node = entry.node;
      const rawRole = entry.rawRole || "unknown";
      const dedupeKey = entryMergeKey(entry);
      const messageId = entry.messageId || entry.turnId || `chatgpt-${index + 1}`;

      if (seenTurns.has(dedupeKey)) {
        continue;
      }
      seenTurns.add(dedupeKey);

      try {
        const timeData = extractMessageTimeData(node);
        const timeLabel = timeData.label;
        const timeMs = timeData.timestampMs;
        const thinkingMessage = rawRole === "assistant"
          ? extractThinkingMessage(node, settings, messageId, timeLabel, timeMs)
          : null;

        if (thinkingMessage) {
          messages.push(thinkingMessage);
        }

        const contentRoot = pickMessageContentRoot(node, rawRole);
        let sanitizeRoot = contentRoot;
        if (rawRole === "assistant") {
          sanitizeRoot = prepareAssistantContentRootForSanitize(contentRoot, settings);
        } else if (rawRole === "user") {
          const userClone = contentRoot?.cloneNode?.(true) || contentRoot;
          Array.from(userClone.querySelectorAll?.(".sr-only, [class*='sr-only']") || []).forEach((n) => n.remove());
          sanitizeRoot = userClone;
        }
        let sanitized = root.sanitize.sanitizeMessageNode(sanitizeRoot, {
          mediaHandling: settings.mediaHandling
        });
        let stripped = normalizeText((sanitized.safeHtml || "").replace(/<[^>]*>/g, " "));

        // Always fallback to the whole node if contentRoot resulted in empty text
        if (!stripped && !sanitized.hasMedia) {
          const fallbackClone = node.cloneNode(true);
          Array.from(fallbackClone.querySelectorAll(".sr-only, [class*='sr-only']")).forEach((n) => n.remove());
          const fallbackSanitized = root.sanitize.sanitizeMessageNode(fallbackClone, {
            mediaHandling: settings.mediaHandling
          });
          const fallbackStripped = normalizeText((fallbackSanitized.safeHtml || "").replace(/<[^>]*>/g, " "));
          if (fallbackStripped || fallbackSanitized.hasMedia) {
            sanitized = fallbackSanitized;
            stripped = fallbackStripped;
          }
        }

        // If still empty but node has textContent, convert plain text to safe HTML
        if (!stripped && !sanitized.hasMedia) {
          const fallbackClone = node.cloneNode(true);
          Array.from(fallbackClone.querySelectorAll(".sr-only, [class*='sr-only']")).forEach((n) => n.remove());
          const rawNodeText = normalizeText(fallbackClone.textContent);
          if (rawNodeText) {
            sanitized = {
              safeHtml: `<p>${root.sanitize.escapeHtml(rawNodeText)}</p>`,
              hasMedia: false
            };
            stripped = rawNodeText;
          }
        }

        const detectedUserAttachments = rawRole === "user"
          ? extractUserAttachmentReferences(node)
          : [];
        const userAttachments = rawRole === "user" && settings.showUserAttachmentNames
          ? detectedUserAttachments
          : [];
        const assistantReferences = rawRole === "assistant" && shouldExtractAssistantReferences
          ? dedupeReferences([
              ...extractAssistantReferences(node, contentRoot),
              ...extractAssistantButtonReferences(node, contentRoot)
            ])
          : [];

        const preserveEmptyUserTurn = rawRole === "user" && hasUserTurnStructure(node);
        if (!stripped && !sanitized.hasMedia && !detectedUserAttachments.length && !assistantReferences.length && !preserveEmptyUserTurn) {
          continue;
        }

        messages.push({
          id: messageId,
          role: mapRole(rawRole),
          safeHtml: sanitized.safeHtml || (preserveEmptyUserTurn ? "<p></p>" : ""),
          hasMedia: sanitized.hasMedia,
          timeLabel,
          timeMs,
          attachments: userAttachments,
          references: assistantReferences,
          _sourceNode: entry._sourceNode || node
        });
      } catch (turnError) {
        const text = normalizeText(node?.textContent);
        if (text) {
          messages.push({
            id: messageId,
            role: mapRole(rawRole) || ROLES.HUMAN,
            safeHtml: `<p>${root.sanitize.escapeHtml(text)}</p>`,
            hasMedia: false,
            timeLabel: "",
            timeMs: null,
            attachments: [],
            references: [],
            _sourceNode: entry._sourceNode || node
          });
        }
      }
    }

    // Emergency fallback: If messages is still empty, scan document directly for any text blocks
    if (!messages.length) {
      const emergencyNodes = Array.from(document.querySelectorAll("article, [data-message-author-role], main .markdown, main .whitespace-pre-wrap"));
      emergencyNodes.forEach((node, idx) => {
        const text = normalizeText(node.textContent);
        if (text) {
          const role = node.getAttribute("data-message-author-role") === "user" || node.matches(".whitespace-pre-wrap") ? ROLES.HUMAN : (idx % 2 === 0 ? ROLES.HUMAN : ROLES.ASSISTANT);
          messages.push({
            id: `chatgpt-emergency-${idx + 1}`,
            role,
            safeHtml: `<p>${root.sanitize.escapeHtml(text)}</p>`,
            hasMedia: false,
            timeLabel: "",
            timeMs: null,
            attachments: [],
            references: [],
            _sourceNode: node
          });
        }
      });
    }

    // Safety check 1: If we have messages but zero human messages, recover visible user nodes!
    const hasHuman = messages.some((msg) => msg.role === ROLES.HUMAN);
    if (!hasHuman) {
      const candidateUserNodes = Array.from(
        document.querySelectorAll(
          [
            "[data-message-author-role='user']",
            "[data-testid='user-message']",
            ".user-message-bubble-color",
            "[class*='user-message']",
            "main .whitespace-pre-wrap",
            ".whitespace-pre-wrap"
          ].join(", ")
        )
      );

      const userNodes = [];
      for (const cand of candidateUserNodes) {
        if (cand.closest("[data-message-author-role='assistant'], .agent-turn, .markdown, .prose")) {
          continue;
        }
        if (cand.querySelector(".markdown, .prose, .agent-turn, button[aria-label*='Copy' i], button[aria-label*='复制' i]")) {
          continue;
        }
        if (userNodes.some((existing) => existing.contains(cand) || cand.contains(existing))) {
          continue;
        }
        const text = normalizeText(cand.textContent);
        if (text) {
          userNodes.push(cand);
        }
      }

      for (let i = 0; i < userNodes.length; i++) {
        const uNode = userNodes[i];
        const clone = uNode.cloneNode(true);
        Array.from(clone.querySelectorAll(".sr-only, [class*='sr-only']")).forEach((n) => n.remove());
        let sanitized = root.sanitize.sanitizeMessageNode(clone, {
          mediaHandling: settings.mediaHandling
        });
        let stripped = normalizeText((sanitized.safeHtml || "").replace(/<[^>]*>/g, " "));
        if (!stripped) {
          const text = normalizeText(clone.textContent);
          if (text) {
            sanitized = { safeHtml: `<p>${root.sanitize.escapeHtml(text)}</p>`, hasMedia: false };
            stripped = text;
          }
        }
        if (stripped) {
          messages.push({
            id: `chatgpt-recovered-user-${i + 1}`,
            role: ROLES.HUMAN,
            safeHtml: sanitized.safeHtml,
            hasMedia: Boolean(sanitized.hasMedia),
            timeLabel: "",
            timeMs: null,
            attachments: [],
            references: [],
            _sourceNode: uNode
          });
        }
      }
    }

    // Safety check 2: If we have messages but zero assistant messages, check for visible assistant nodes
    const hasAssistant = messages.some((msg) => msg.role === ROLES.ASSISTANT);
    if (!hasAssistant) {
      const candidateNodes = Array.from(
        document.querySelectorAll(
          [
            "[data-message-author-role='assistant']",
            "[data-markdown-text-style='assistant-message']",
            ".agent-turn",
            "[class*='agent-turn']",
            "main .markdown",
            "main .prose",
            ".markdown",
            ".prose"
          ].join(", ")
        )
      );

      const assistantNodes = [];
      for (const cand of candidateNodes) {
        if (cand.closest("[data-message-author-role='user'], .user-message-bubble-color, [data-testid='user-message']")) {
          continue;
        }
        if (assistantNodes.some((existing) => existing.contains(cand) || cand.contains(existing))) {
          continue;
        }
        const text = normalizeText(cand.textContent);
        if (text) {
          assistantNodes.push(cand);
        }
      }

      for (let i = 0; i < assistantNodes.length; i++) {
        const aNode = assistantNodes[i];
        const contentRoot = pickMessageContentRoot(aNode, "assistant");
        let sanitized = root.sanitize.sanitizeMessageNode(contentRoot, {
          mediaHandling: settings.mediaHandling
        });
        let stripped = normalizeText((sanitized.safeHtml || "").replace(/<[^>]*>/g, " "));
        if (!stripped) {
          const text = normalizeText(aNode.textContent);
          if (text) {
            sanitized = { safeHtml: `<p>${root.sanitize.escapeHtml(text)}</p>`, hasMedia: false };
            stripped = text;
          }
        }
        if (stripped) {
          messages.push({
            id: `chatgpt-recovered-assistant-${i + 1}`,
            role: ROLES.ASSISTANT,
            safeHtml: sanitized.safeHtml,
            hasMedia: Boolean(sanitized.hasMedia),
            timeLabel: "",
            timeMs: null,
            attachments: [],
            references: [],
            _sourceNode: aNode
          });
        }
      }
    }

    // Sort all messages into proper document/chronological order
    messages.sort((a, b) => {
      const nodeA = a._sourceNode || rawEntries.find((e) => (e.messageId === a.id || e.turnId === a.id))?._sourceNode;
      const nodeB = b._sourceNode || rawEntries.find((e) => (e.messageId === b.id || e.turnId === b.id))?._sourceNode;
      if (nodeA && nodeB && nodeA !== nodeB && typeof nodeA.compareDocumentPosition === "function") {
        try {
          const isAttachedA = (nodeA.ownerDocument || document).contains(nodeA);
          const isAttachedB = (nodeB.ownerDocument || document).contains(nodeB);
          if (isAttachedA && isAttachedB) {
            const pos = nodeA.compareDocumentPosition(nodeB);
            if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
          }
        } catch (_err) {
          // ignore detached compare
        }
      }
      return 0;
    });

    return {
      providerId: "chatgpt",
      sourceUrl: location.href,
      folderName: extractConversationFolder(),
      chatName: extractConversationName(),
      title: extractWindowTitle() || extractConversationTitle(),
      modelName: extractModelName(),
      messages
    };
  }

  function getLiveStatus() {
    const roleCount = document.querySelectorAll("[data-message-author-role]").length;
    const turnCount = document.querySelectorAll(TURN_SECTION_SELECTOR).length;
    const isChat = isChatPage();
    return {
      isChatPage: isChat,
      messageCount: Math.max(roleCount, turnCount, isChat ? 1 : 0)
    };
  }

  root.providers.registerProvider({
    id: "chatgpt",
    displayName: "ChatGPT",
    matchesUrl,
    isChatPage,
    extractConversation,
    getLiveStatus,
    findInlineActionAnchor
  });
})();
