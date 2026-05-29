/*
 * Claude provider adapter.
 * It extracts user/assistant turns and normalizes them into the shared pipeline.
 */
(() => {
  const root = globalThis.ChatExportAi;
  const { ROLES } = root.constants;

  const HOSTNAME = "claude.ai";
  const SHARE_LABEL_REGEX = /\b(?:share|compartir)\b/i;

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

  function matchesUrl(url) {
    return hostnameFromUrl(url) === HOSTNAME;
  }

  function isVisibleElement(element) {
    return Boolean(element && element.getClientRects && element.getClientRects().length);
  }

  function extractWindowTitle() {
    const rawTitle = normalizeText(document.title || document.querySelector("title")?.textContent);

    if (!rawTitle) {
      return "";
    }

    const cleanedTitle = rawTitle
      .replace(/\s*[-|·•]\s*claude$/i, "")
      .replace(/^claude\s*[-|·•]\s*/i, "")
      .trim();

    if (!cleanedTitle || /^claude$/i.test(cleanedTitle)) {
      return "";
    }

    return cleanedTitle;
  }

  function extractChatName() {
    const titleFromHeader = normalizeText(
      document.querySelector('[data-testid="chat-title-button"] .truncate')?.textContent
      || document.querySelector('[data-testid="chat-title-button"]')?.textContent
    );

    if (titleFromHeader) {
      return titleFromHeader;
    }

    return extractWindowTitle() || "Claude Chat";
  }

  function extractModelName() {
    return normalizeText(document.querySelector('[data-testid="model-selector-dropdown"]')?.textContent);
  }

  function isClaudeChatUrl() {
    const pathname = String(location.pathname || "");
    return /^\/chat\/[^/?#]+/i.test(pathname)
      || /^\/project\/[^/?#]+\/chat\/[^/?#]+/i.test(pathname);
  }

  function isChatPage() {
    return Boolean(
      document.querySelector('[data-testid="user-message"], div[data-is-streaming]')
      || (isClaudeChatUrl() && document.querySelector('[data-testid="chat-title-button"]'))
      || isClaudeChatUrl()
    );
  }

  function getConversationScrollContainer(probeNode) {
    let current = probeNode?.parentElement || null;

    while (current) {
      const style = window.getComputedStyle(current);
      const overflowY = String(style.overflowY || "").toLowerCase();
      const canScroll = (overflowY.includes("auto") || overflowY.includes("scroll") || overflowY.includes("overlay"))
        && current.scrollHeight > current.clientHeight + 60;

      if (canScroll) {
        return current;
      }

      current = current.parentElement;
    }

    const scrollingRoot = document.scrollingElement || document.documentElement;
    return scrollingRoot instanceof HTMLElement ? scrollingRoot : null;
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

  function waitForRender(ms = 84) {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        window.requestAnimationFrame(() => resolve());
      }, ms);
    });
  }

  async function runRequestedHydrationCycle(scrollContainer, hydrationBudgetExceeded, onCollect, topReachThreshold = 2) {
    const sweepStepPx = 1700;
    const stepWaitMs = 500;
    const postSweepWaitMs = 2000;
    const postTopWaitMs = 2000;
    const retryTopWaitMs = 1000;
    const retryBottomWaitMs = 1000;
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

    // 5) If not at top yet, keep forcing top every 1 second.
    while (!hydrationBudgetExceeded() && scrollTopOf(scrollContainer) > topReachThreshold) {
      setScrollPosition(scrollContainer, 0, horizontal);
      onCollect();
      await waitForRender(retryTopWaitMs);
      onCollect();
    }

    if (scrollTopOf(scrollContainer) > topReachThreshold) {
      return false;
    }

    // 6) Move to bottom and keep forcing it every 1 second until it sticks.
    setScrollPosition(scrollContainer, getBottomTop(), horizontal);
    onCollect();
    await waitForRender(retryBottomWaitMs);
    onCollect();

    while (!hydrationBudgetExceeded()) {
      const bottomTop = getBottomTop();
      if (scrollTopOf(scrollContainer) >= bottomTop - bottomReachThreshold) {
        return true;
      }

      setScrollPosition(scrollContainer, bottomTop, horizontal);
      onCollect();
      await waitForRender(retryBottomWaitMs);
      onCollect();
    }

    return false;
  }

  async function runWithHydratedMessageNodes(selector, options, worker) {
    const readNodes = () => Array.from(document.querySelectorAll(selector));
    let messageNodes = readNodes();

    if (!messageNodes.length && options?.hydrateVirtualized !== false) {
      await waitForRender(140);
      messageNodes = readNodes();
    }

    if (options?.hydrateVirtualized === false || !messageNodes.length) {
      return worker(messageNodes);
    }

    const scrollContainer = getConversationScrollContainer(messageNodes[0]);
    if (!scrollContainer) {
      return worker(messageNodes);
    }

    const requestedBudgetMs = Number(options?.maxHydrationMs);
    const maxHydrationMs = Number.isFinite(requestedBudgetMs)
      ? Math.max(1200, Math.round(requestedBudgetMs))
      : 120000;
    const hydrationStartedAt = Date.now();
    const hydrationBudgetExceeded = () => (Date.now() - hydrationStartedAt) >= maxHydrationMs;
    const topReachThreshold = 2;
    const reachedPositions = await runRequestedHydrationCycle(
      scrollContainer,
      hydrationBudgetExceeded,
      () => {
        messageNodes = readNodes();
      },
      topReachThreshold
    );
    if (!reachedPositions) {
      throw new Error("HYDRATION_TOP_REACH_FAILED: Claude hydration did not finish top/bottom stabilization within timeout.");
    }

    messageNodes = readNodes();
    return worker(messageNodes);
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

  function isLikelyAttachmentLabel(label) {
    return /\.[a-z0-9]{2,8}(?:\b|$)/i.test(String(label || ""));
  }

  function isLikelyAttachmentHref(href) {
    return /\/files?\//i.test(String(href || "")) || /download/i.test(String(href || ""));
  }

  function extractUserAttachments(userNode) {
    // Claude renders upload tiles in the same turn container as the user bubble.
    const turnRoot = findUserTurnRoot(userNode);
    const tileNodes = Array.from(turnRoot.querySelectorAll('[data-testid="file-thumbnail"]'));

    const items = tileNodes.map((tileNode) => {
      const label = normalizeText(
        tileNode.querySelector("h3")?.textContent
        || tileNode.querySelector('[aria-label]')?.getAttribute("aria-label")
        || tileNode.textContent
      );

      if (!label) {
        return null;
      }

      return {
        kind: "attachment",
        label,
        url: ""
      };
    }).filter(Boolean);

    return dedupeByLabelAndUrl(items);
  }

  function findUserTurnRoot(userNode) {
    const candidates = [
      userNode.closest('[data-test-render-count]'),
      userNode.closest("[data-testid='conversation-turn']"),
      userNode.closest(".group"),
      userNode.parentElement,
      userNode
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (!candidate.contains(userNode)) {
        continue;
      }

      const hasNearbyMedia = candidate.querySelector("img, picture, figure, canvas, svg, [style*='background-image']");
      const hasUserText = candidate.querySelector('[data-testid="user-message"]') || candidate === userNode;
      const hasAssistant = candidate.querySelector("div[data-is-streaming], .response-content-markdown, .standard-markdown, .progressive-markdown");

      if (hasUserText && hasNearbyMedia && !hasAssistant) {
        return candidate;
      }
    }

    return userNode;
  }

  function rectsOverlapHorizontally(left, right) {
    return left.left < right.right && right.left < left.right;
  }

  function isLikelyContentMediaNode(node, userRect) {
    const rect = node.getBoundingClientRect?.();
    if (!rect || rect.width < 24 || rect.height < 24) {
      return false;
    }

    const area = rect.width * rect.height;
    if (area < 1200) {
      return false;
    }

    const verticalGap = userRect.top - rect.bottom;
    if (verticalGap < -20 || verticalGap > 520) {
      return false;
    }

    return rectsOverlapHorizontally(rect, userRect);
  }

  function hasBackgroundImage(node) {
    try {
      return /url\(/i.test(getComputedStyle(node).backgroundImage || "");
    } catch (_error) {
      return false;
    }
  }

  function collectNearbyUserMediaHtml(userNode, settings) {
    const userRect = userNode.getBoundingClientRect?.();
    if (!userRect) {
      return { html: "", hasMedia: false };
    }

    const candidates = [
      ...Array.from(document.querySelectorAll("img, picture, figure, canvas, svg")),
      ...Array.from(document.querySelectorAll("*")).filter(hasBackgroundImage)
    ];
    const seen = new Set();
    const parts = [];
    let hasMedia = false;

    for (const candidate of candidates) {
      if (!candidate || seen.has(candidate) || candidate.contains(userNode) || userNode.contains(candidate)) {
        continue;
      }
      seen.add(candidate);

      if (!isLikelyContentMediaNode(candidate, userRect)) {
        continue;
      }

      const sanitized = root.sanitize.sanitizeMessageNode(candidate, {
        mediaHandling: settings.mediaHandling
      });
      if (!sanitized.hasMedia || !/<img\b/i.test(sanitized.safeHtml || "")) {
        continue;
      }

      parts.push(sanitized.safeHtml);
      hasMedia = true;
    }

    return {
      html: parts.join(""),
      hasMedia
    };
  }

  function mediaDebugForUserNode(userNode) {
    const rows = [];
    let current = userNode;
    let depth = 0;

    while (current && depth < 8) {
      const rect = current.getBoundingClientRect?.();
      rows.push({
        depth,
        tag: current.tagName?.toLowerCase() || "",
        id: current.id || "",
        testId: current.getAttribute?.("data-testid") || "",
        className: String(current.getAttribute?.("class") || "").slice(0, 220),
        text: normalizeText(current.textContent).slice(0, 120),
        rect: rect ? {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        } : null,
        mediaCount: current.querySelectorAll?.("img, picture, figure, canvas, svg, [style*='background-image']").length || 0,
        imageCount: current.querySelectorAll?.("img").length || 0,
        backgroundCount: Array.from(current.querySelectorAll?.("*") || [])
          .filter((node) => {
            try {
              return /url\(/i.test(getComputedStyle(node).backgroundImage || "");
            } catch (_error) {
              return false;
            }
          }).length
      });
      current = current.parentElement;
      depth += 1;
    }

    return rows;
  }

  function debugMediaExtraction() {
    const userNodes = Array.from(document.querySelectorAll('[data-testid="user-message"]'));
    return userNodes.map((node, index) => {
      const rootNode = findUserTurnRoot(node);
      const sanitized = root.sanitize.sanitizeMessageNode(rootNode, {
        mediaHandling: root.constants.MEDIA_HANDLING.MHT
      });
      return {
        index,
        text: normalizeText(node.textContent).slice(0, 160),
        nearbyMedia: collectNearbyUserMediaHtml(node, {
          mediaHandling: root.constants.MEDIA_HANDLING.MHT
        }),
        chosenRoot: {
          tag: rootNode.tagName?.toLowerCase() || "",
          testId: rootNode.getAttribute?.("data-testid") || "",
          className: String(rootNode.getAttribute?.("class") || "").slice(0, 220),
          mediaCount: rootNode.querySelectorAll?.("img, picture, figure, canvas, svg, [style*='background-image']").length || 0,
          imageCount: rootNode.querySelectorAll?.("img").length || 0
        },
        sanitized: {
          hasMedia: sanitized.hasMedia,
          imgCount: (sanitized.safeHtml.match(/<img\b/gi) || []).length,
          preview: sanitized.safeHtml.slice(0, 400)
        },
        ancestors: mediaDebugForUserNode(node)
      };
    });
  }

  function extractAssistantReferences(containerNode, contentRoot) {
    const anchorNodes = Array.from((contentRoot || containerNode).querySelectorAll("a[href]"));

    const items = anchorNodes.map((anchor) => {
      const href = normalizeText(anchor.getAttribute("href"));
      const label = normalizeText(anchor.getAttribute("aria-label") || anchor.getAttribute("title") || anchor.textContent);

      if (!href && !label) {
        return null;
      }

      return {
        kind: isLikelyAttachmentHref(href) || isLikelyAttachmentLabel(label) ? "attachment" : "url",
        label,
        url: href || ""
      };
    }).filter(Boolean);

    return dedupeByLabelAndUrl(items);
  }

  function pickAssistantContentRoot(containerNode) {
    return containerNode.querySelector(".response-content-markdown, .standard-markdown, .progressive-markdown, .markdown") || containerNode;
  }

  async function extractConversation(settings, options = {}) {
    const shouldExtractAssistantReferences = Boolean(
      settings.showAssistantUserAttachmentReferences
      || settings.showAssistantGeneratedAttachmentReferences
      || settings.showAssistantWebReferences
      || settings.showAssistantReferences
    );

    return runWithHydratedMessageNodes(
      '[data-testid="user-message"], div[data-is-streaming]',
      options,
      (messageNodes) => {
        const messages = [];

        for (let index = 0; index < messageNodes.length; index += 1) {
          const node = messageNodes[index];
          const isUserNode = node.matches('[data-testid="user-message"]');
          const messageId = `${isUserNode ? "claude-user" : "claude-assistant"}-${index + 1}`;

          if (isUserNode) {
            const userContentRoot = findUserTurnRoot(node);
            const sanitized = root.sanitize.sanitizeMessageNode(userContentRoot, {
              mediaHandling: settings.mediaHandling
            });
            const nearbyMedia = collectNearbyUserMediaHtml(node, settings);
            const safeHtml = `${nearbyMedia.html}${sanitized.safeHtml || ""}`;
            const attachments = settings.showUserAttachmentNames ? extractUserAttachments(node) : [];
            const textContent = normalizeText((safeHtml || "").replace(/<[^>]*>/g, " "));
            const hasMedia = Boolean(sanitized.hasMedia || nearbyMedia.hasMedia);

            if (!textContent && !hasMedia && !attachments.length) {
              continue;
            }

            messages.push({
              id: messageId,
              role: ROLES.HUMAN,
              safeHtml,
              hasMedia,
              attachments,
              references: []
            });

            continue;
          }

          const contentRoot = pickAssistantContentRoot(node);
          const sanitized = root.sanitize.sanitizeMessageNode(contentRoot, {
            mediaHandling: settings.mediaHandling
          });
          const references = shouldExtractAssistantReferences
            ? extractAssistantReferences(node, contentRoot)
            : [];
          const textContent = normalizeText((sanitized.safeHtml || "").replace(/<[^>]*>/g, " "));

          if (!textContent && !sanitized.hasMedia && !references.length) {
            continue;
          }

          messages.push({
            id: messageId,
            role: ROLES.ASSISTANT,
            safeHtml: sanitized.safeHtml,
            hasMedia: sanitized.hasMedia,
            attachments: [],
            references
          });
        }

        const chatName = extractChatName();

        return {
          providerId: "claude",
          sourceUrl: location.href,
          folderName: "",
          chatName,
          title: extractWindowTitle() || chatName,
          modelName: extractModelName(),
          messages
        };
      }
    );
  }

  function getLiveStatus() {
    const messageCount = document.querySelectorAll('[data-testid="user-message"], div[data-is-streaming]').length;
    return {
      isChatPage: isChatPage(),
      messageCount: messageCount || (isChatPage() ? 1 : 0)
    };
  }

  function findInlineActionAnchor() {
    const directShareButton = document.querySelector('[data-testid="wiggle-controls-actions-share"]');

    if (directShareButton && isVisibleElement(directShareButton)) {
      return {
        container: directShareButton.parentElement,
        referenceNode: directShareButton
      };
    }

    const candidates = Array.from(document.querySelectorAll("header button, header [role='button'], main header button"));

    for (const candidate of candidates) {
      if (!isVisibleElement(candidate)) {
        continue;
      }

      const label = normalizeText(candidate.getAttribute("aria-label") || candidate.textContent);
      if (!label || !SHARE_LABEL_REGEX.test(label)) {
        continue;
      }

      const rect = candidate.getBoundingClientRect();
      if (rect.top > 320) {
        continue;
      }

      return {
        container: candidate.parentElement,
        referenceNode: candidate
      };
    }

    return null;
  }

  root.providers.registerProvider({
    id: "claude",
    displayName: "Claude",
    matchesUrl,
    isChatPage,
    extractConversation,
    getLiveStatus,
    debugMediaExtraction,
    findInlineActionAnchor
  });
})();
