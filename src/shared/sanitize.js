/*
 * Sanitizador HTML seguro y tolerante.
 * Objetivo: extraer texto y formato útil sin arrastrar "basura" de UI.
 */
(() => {
  const root = globalThis.ChatExportAi;
  const { MEDIA_HANDLING } = root.constants;

  const ALLOWED_TAGS = new Set([
    "p",
    "br",
    "span",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "code",
    "pre",
    "ul",
    "ol",
    "li",
    "blockquote",
    "hr",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td"
  ]);

  const SELF_CLOSING_TAGS = new Set(["br", "hr"]);
  const MEDIA_TAGS = new Set(["img", "video", "audio", "picture", "source", "figure", "figcaption", "iframe", "canvas", "svg"]);

  // Whitelist mínima de tags de bloque para reconstruir saltos coherentes.
  const BLOCK_HINT_TAGS = new Set([
    "p",
    "pre",
    "ul",
    "ol",
    "li",
    "blockquote",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "table",
    "tr",
    "div",
    "section",
    "article"
  ]);

  // Span classes are restricted to extension-owned semantic markers.
  const ALLOWED_SPAN_CLASSES = new Set([
    "ceai-inline-reference-chip"
  ]);

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(text) {
    return escapeHtml(text).replace(/\n/g, " ").trim();
  }

  function isSafeUrl(input) {
    if (!input || typeof input !== "string") {
      return false;
    }

    const trimmed = input.trim();

    // Permitimos URLs relativas del propio sitio para preservar enlaces internos.
    if (trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../") || trimmed.startsWith("#")) {
      return true;
    }

    try {
      const parsed = new URL(trimmed, location.href);
      return ["http:", "https:", "mailto:", "data:", "blob:"].includes(parsed.protocol);
    } catch (_error) {
      return false;
    }
  }

  function firstSrcsetUrl(value) {
    const firstCandidate = String(value || "").split(",")[0] || "";
    return firstCandidate.trim().split(/\s+/)[0] || "";
  }

  function mediaSource(node) {
    return node.currentSrc
      || node.getAttribute("src")
      || node.getAttribute("data-src")
      || node.getAttribute("data-original")
      || node.getAttribute("data-lazy-src")
      || firstSrcsetUrl(node.getAttribute("srcset"))
      || firstSrcsetUrl(node.getAttribute("data-srcset"))
      || "";
  }

  function canvasDataUrlForImage(node) {
    const tag = (node.tagName || "").toLowerCase();
    if (tag !== "img" || !node.complete || !(node.naturalWidth || node.width)) {
      return "";
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = node.naturalWidth || node.width;
      canvas.height = node.naturalHeight || node.height;
      const context = canvas.getContext("2d");
      context.drawImage(node, 0, 0);
      return canvas.toDataURL("image/png");
    } catch (_error) {
      return "";
    }
  }

  function canvasDataUrl(node) {
    const tag = (node.tagName || "").toLowerCase();
    if (tag !== "canvas" || !node.width || !node.height) {
      return "";
    }

    try {
      return node.toDataURL("image/png");
    } catch (_error) {
      return "";
    }
  }

  function svgDataUrl(node) {
    const tag = (node.tagName || "").toLowerCase();
    if (tag !== "svg") {
      return "";
    }

    try {
      const source = new XMLSerializer().serializeToString(node);
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    } catch (_error) {
      return "";
    }
  }

  function cssBackgroundImageUrl(node) {
    if (!node || typeof getComputedStyle !== "function") {
      return "";
    }

    try {
      const backgroundImage = getComputedStyle(node).backgroundImage || "";
      const match = backgroundImage.match(/url\((['"]?)(.*?)\1\)/i);
      return match?.[2] || "";
    } catch (_error) {
      return "";
    }
  }

  function mediaImgMarkup(src, alt = "image") {
    if (!src || !isSafeUrl(src)) {
      return "";
    }

    return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}">`;
  }

  function backgroundImageMarkupForNode(node, state) {
    const backgroundImage = cssBackgroundImageUrl(node);
    const markup = mediaImgMarkup(
      backgroundImage,
      node?.getAttribute?.("aria-label") || node?.getAttribute?.("alt") || "background image"
    );
    if (markup && state) {
      state.hasMedia = true;
    }
    return markup;
  }

  function mediaPlaceholder(node) {
    const tag = (node.tagName || "MEDIA").toUpperCase();
    const alt = node.getAttribute?.("alt") || node.getAttribute?.("aria-label") || "non-textual content";
    return `<p>[${tag}: ${escapeHtml(alt)}]</p>`;
  }

  function sanitizeMediaNode(node, options, state) {
    state.hasMedia = true;

    const mode = options.mediaHandling || MEDIA_HANDLING.PLACEHOLDER;

    if (mode === MEDIA_HANDLING.IGNORE) {
      return "";
    }

    if (mode === MEDIA_HANDLING.PLACEHOLDER) {
      return mediaPlaceholder(node);
    }

    // Modo MHT: conservamos una versión limitada de media cuando sea razonablemente segura.
    const tag = (node.tagName || "").toLowerCase();

    if (tag === "img") {
      const src = canvasDataUrlForImage(node) || mediaSource(node);
      const alt = node.getAttribute("alt") || "image";
      return mediaImgMarkup(src, alt) || mediaPlaceholder(node);
    }

    if (tag === "canvas") {
      return mediaImgMarkup(canvasDataUrl(node), node.getAttribute("aria-label") || "canvas image")
        || mediaPlaceholder(node);
    }

    if (tag === "svg") {
      return mediaImgMarkup(svgDataUrl(node), node.getAttribute("aria-label") || "svg image")
        || mediaPlaceholder(node);
    }

    if (tag === "video" || tag === "audio") {
      const src = mediaSource(node);
      if (!isSafeUrl(src)) {
        return mediaPlaceholder(node);
      }
      return `<${tag} controls src="${escapeAttribute(src)}"></${tag}>`;
    }

    if (tag === "source") {
      const src = mediaSource(node);
      if (!isSafeUrl(src)) {
        return "";
      }
      const type = node.getAttribute("type") || "";
      const typeAttr = type ? ` type="${escapeAttribute(type)}"` : "";
      return `<source src="${escapeAttribute(src)}"${typeAttr}>`;
    }

    if (tag === "figure" || tag === "figcaption" || tag === "picture") {
      // Para contenedores media intentamos preservar hijos sanitizados.
      const children = Array.from(node.childNodes)
        .map((child) => sanitizeNode(child, options, state))
        .join("");
      if (!children.trim()) {
        return mediaPlaceholder(node);
      }
      return `<${tag}>${children}</${tag}>`;
    }

    return mediaPlaceholder(node);
  }

  function sanitizeElement(node, options, state) {
    const tag = node.tagName.toLowerCase();

    const className = String(node.getAttribute("class") || "");
    const ariaHidden = String(node.getAttribute("aria-hidden") || "").toLowerCase();
    const isAssistiveOnly = /\b(?:sr-only|visually-hidden|screen-reader-only)\b/i.test(className)
      || node.hasAttribute("hidden")
      || ariaHidden === "true";
    if (isAssistiveOnly) {
      return "";
    }

    if (MEDIA_TAGS.has(tag)) {
      return sanitizeMediaNode(node, options, state);
    }

    const backgroundImageMarkup = backgroundImageMarkupForNode(node, state);

    // Ignoramos tags claramente de ejecución/UI y seguimos con el resto del árbol.
    if (["script", "style", "noscript", "button", "form", "input", "textarea", "select", "option"].includes(tag)) {
      return "";
    }

    // Tags no permitidos: extraemos hijos para no perder texto útil.
    if (!ALLOWED_TAGS.has(tag)) {
      const extractedChildren = Array.from(node.childNodes)
        .map((child) => sanitizeNode(child, options, state))
        .join("");
      const combinedChildren = `${backgroundImageMarkup}${extractedChildren}`;

      // Si el nodo era de bloque y quedó texto, añadimos separación mínima.
      if (BLOCK_HINT_TAGS.has(tag) && combinedChildren.trim()) {
        return `<p>${combinedChildren}</p>`;
      }

      return combinedChildren;
    }

    // Sanitizado de atributos por tag (whitelist muy corta).
    let attrs = "";

    if (tag === "a") {
      const href = node.getAttribute("href");
      if (isSafeUrl(href)) {
        attrs += ` href="${escapeAttribute(href)}"`;
      }
    }

    let keepSpanTag = true;

    if (tag === "span") {
      const classTokens = String(node.getAttribute("class") || "")
        .split(/\s+/)
        .map((token) => String(token || "").trim())
        .filter((token) => ALLOWED_SPAN_CLASSES.has(token));
      if (classTokens.length) {
        attrs += ` class="${escapeAttribute(Array.from(new Set(classTokens)).join(" "))}"`;
      } else {
        // Flatten regular spans to keep previous sanitize behavior.
        keepSpanTag = false;
      }
    }

    if (SELF_CLOSING_TAGS.has(tag)) {
      return `<${tag}${attrs}>`;
    }

    const children = Array.from(node.childNodes)
      .map((child) => sanitizeNode(child, options, state))
      .join("");

    if (tag === "span" && !keepSpanTag) {
      return children;
    }

    return `<${tag}${attrs}>${backgroundImageMarkup}${children}</${tag}>`;
  }

  function sanitizeNode(node, options, state) {
    if (!node) {
      return "";
    }

    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent || "");
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      return sanitizeElement(node, options, state);
    }

    return "";
  }

  function normalizeEmptyResult(resultHtml, sourceNode) {
    if (resultHtml && resultHtml.replace(/<[^>]+>/g, "").trim()) {
      return resultHtml;
    }

    if (resultHtml && /<(?:img|video|audio|canvas|svg|figure|picture)\b/i.test(resultHtml)) {
      return resultHtml;
    }

    const fallbackText = sourceNode?.innerText || sourceNode?.textContent || "";
    const trimmed = fallbackText.trim();

    if (!trimmed) {
      return "";
    }

    return `<p>${escapeHtml(trimmed)}</p>`;
  }

  function sanitizeMessageNode(sourceNode, options = {}) {
    const state = {
      hasMedia: false
    };

    const safeOptions = {
      mediaHandling: options.mediaHandling || MEDIA_HANDLING.PLACEHOLDER
    };

    const sourceElement = sourceNode?.nodeType === Node.ELEMENT_NODE ? sourceNode : null;
    const sourceTag = sourceElement ? sourceElement.tagName.toLowerCase() : "";
    const rootMediaHtml = sourceElement && MEDIA_TAGS.has(sourceTag)
      ? sanitizeMediaNode(sourceElement, safeOptions, state)
      : backgroundImageMarkupForNode(sourceElement, state);
    const childHtml = Array.from(sourceNode.childNodes)
      .map((child) => sanitizeNode(child, safeOptions, state))
      .join("");
    const html = sourceElement && MEDIA_TAGS.has(sourceTag)
      ? rootMediaHtml
      : `${rootMediaHtml}${childHtml}`;

    const safeHtml = normalizeEmptyResult(html, sourceNode);

    return {
      safeHtml,
      hasMedia: state.hasMedia
    };
  }

  root.sanitize = {
    escapeHtml,
    sanitizeMessageNode
  };
})();
