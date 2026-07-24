/*
 * Main content-script controller.
 * It extracts chat data, responds to popup requests and can optionally mount
 * a draggable floating export control on supported chat pages.
 */
(() => {
  const root = globalThis.ChatExportAi;
  const {
    MSG_DOWNLOAD_FILE,
    MSG_RENDER_HTML_TO_PDF,
    MSG_WARMUP_PDF_RENDERER,
    MSG_GET_CHAT_STATUS,
    MSG_EXPORT_CHAT,
    MSG_EXPORT_NOTION,
    MSG_NOTION_CREATE_PAGE,
    MSG_AUTO_EXPORT_CHAT,
    MSG_GET_INTEGRATION_STATUS,
    EXPORT_FORMATS,
    MEDIA_HANDLING,
    TEXT_FORMATTING,
    QUOTE_DIVIDER_STYLE,
    MSG_CHECK_MEMBERSHIP,
    PAID_FEATURES_TEMPORARILY_UNLOCKED,
    MSG_DEBUG_MEDIA_EXTRACTION,
    MSG_WRITE_FILES_TO_DIRECTORY,
    MSG_WRITE_FILE_TO_DIRECTORY_CHUNK,
    PORT_WRITE_DIRECTORY_FILE
  } = root.constants;

  let activeProvider = null;
  let exportInProgress = false;
  let inlineUi = null;
  let inlineUiRefreshTimer = null;
  let inlineUiRefreshInFlight = false;
  let inlineUiRefreshQueued = false;
  let domObserver = null;
  let cachedInlineUiSettings = null;
  let inlineUiInteractionUntil = 0;
  let inlineUiInteractionReleaseTimer = null;
  let autoExportDebounceTimer = null;
  let autoExportIntervalTimer = null;
  let autoExportRuntimeKey = "";
  let autoExportInFlight = false;
  let lastAutoExportSignature = "";
  let lastAutoExportStatus = {
    ok: true,
    state: "idle",
    reason: "not_run",
    at: null
  };
  let lastIntegrationStatus = {
    ok: true,
    visible: false,
    reason: "not_checked",
    providerId: null,
    isChatPage: false,
    isMember: false,
    enabledBySettings: false,
    autoExportEnabled: false,
    autoExportMode: "change",
    autoExportFormats: [],
    autoExportRuntime: "off",
    autoExportLastStatus: lastAutoExportStatus,
    floatingUiCreated: false
  };
  const exportSnapshotsByConversation = new Map();
  const INLINE_UI_INTERACTION_LOCK_MS = 1500;
  const HYDRATION_TOP_ERROR_TOKEN = "HYDRATION_TOP_REACH_FAILED";
  const DEFAULT_EXPORT_BUTTON_ORDER = [
    EXPORT_FORMATS.MULTI,
    EXPORT_FORMATS.TXT,
    EXPORT_FORMATS.PDF,
    EXPORT_FORMATS.MHT,
    EXPORT_FORMATS.HTML,
    EXPORT_FORMATS.MD,
    EXPORT_FORMATS.DOCX,
    EXPORT_FORMATS.XLSX,
    EXPORT_FORMATS.PNG
  ];
  const EXPORTABLE_FORMATS = [
    EXPORT_FORMATS.TXT,
    EXPORT_FORMATS.PDF,
    EXPORT_FORMATS.MHT,
    EXPORT_FORMATS.HTML,
    EXPORT_FORMATS.MD,
    EXPORT_FORMATS.DOCX,
    EXPORT_FORMATS.XLSX,
    EXPORT_FORMATS.PNG
  ];
  const FREE_EXPORT_FORMATS = new Set([EXPORT_FORMATS.TXT, EXPORT_FORMATS.PDF]);
  const AUTO_EXPORT_FEATURE_ENABLED = false;
  function getProviderButtonSetting(settings, _providerId) {
    return Boolean(settings.showHeaderExportButton);
  }

  function withTimeout(promise, timeoutMs, timeoutMessage) {
    return new Promise((resolve, reject) => {
      const timerId = window.setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);

      Promise.resolve(promise)
        .then((value) => {
          window.clearTimeout(timerId);
          resolve(value);
        })
        .catch((error) => {
          window.clearTimeout(timerId);
          reject(error);
        });
    });
  }

  function resolveHydrationTimeoutMs(settings) {
    const exportTimeoutMs = Math.max(
      0,
      Math.round(Number(settings?.exportTimeoutSeconds || 20) * 1000)
    );
    return Math.max(120000, exportTimeoutMs);
  }

  function normalizeExportErrorMessage(error) {
    const rawMessage = String(error?.message || "Export error.");
    if (rawMessage.includes(HYDRATION_TOP_ERROR_TOKEN)) {
      return "Could not scroll this chat to the beginning before timeout. Export was canceled.";
    }

    return rawMessage;
  }

  function xmlEscape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stripHtmlToText(html) {
    const container = document.createElement("div");
    container.innerHTML = String(html || "");
    return (container.innerText || container.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  }

  function crc32(bytes) {
    let crc = -1;
    for (let i = 0; i < bytes.length; i += 1) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j += 1) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return (crc ^ -1) >>> 0;
  }

  function uint16(value) {
    return [value & 255, (value >>> 8) & 255];
  }

  function uint32(value) {
    return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
  }

  function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { dosTime, dosDate };
  }

  function zipStore(files, mimeType = "application/zip") {
    const encoder = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    const { dosTime, dosDate } = dosDateTime();

    files.forEach((file) => {
      const nameBytes = encoder.encode(file.name);
      const dataBytes = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
      const checksum = crc32(dataBytes);
      const local = new Uint8Array([
        ...uint32(0x04034b50), ...uint16(20), ...uint16(0), ...uint16(0),
        ...uint16(dosTime), ...uint16(dosDate), ...uint32(checksum),
        ...uint32(dataBytes.length), ...uint32(dataBytes.length),
        ...uint16(nameBytes.length), ...uint16(0)
      ]);
      chunks.push(local, nameBytes, dataBytes);
      central.push({ nameBytes, dataBytes, checksum, offset });
      offset += local.length + nameBytes.length + dataBytes.length;
    });

    const centralStart = offset;
    central.forEach((file) => {
      const header = new Uint8Array([
        ...uint32(0x02014b50), ...uint16(20), ...uint16(20), ...uint16(0), ...uint16(0),
        ...uint16(dosTime), ...uint16(dosDate), ...uint32(file.checksum),
        ...uint32(file.dataBytes.length), ...uint32(file.dataBytes.length),
        ...uint16(file.nameBytes.length), ...uint16(0), ...uint16(0), ...uint16(0),
        ...uint16(0), ...uint32(0), ...uint32(file.offset)
      ]);
      chunks.push(header, file.nameBytes);
      offset += header.length + file.nameBytes.length;
    });

    const centralSize = offset - centralStart;
    chunks.push(new Uint8Array([
      ...uint32(0x06054b50), ...uint16(0), ...uint16(0),
      ...uint16(central.length), ...uint16(central.length),
      ...uint32(centralSize), ...uint32(centralStart), ...uint16(0)
    ]));

    return new Blob(chunks, { type: mimeType });
  }

  function base64DataUrlToBytes(dataUrl) {
    const match = String(dataUrl || "").match(/^data:[^,]*;base64,(.*)$/i);
    if (!match) {
      return new TextEncoder().encode(String(dataUrl || ""));
    }

    const binary = atob(match[1]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function filenameBasename(filename) {
    return String(filename || "chat-export").replace(/\\/g, "/").split("/").filter(Boolean).pop() || "chat-export";
  }

  function blobToDataUrlLocal(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not encode blob."));
      reader.readAsDataURL(blob);
    });
  }

  async function blobToBase64Content(blob) {
    const dataUrl = await blobToDataUrlLocal(blob);
    return String(dataUrl).split(",")[1] || "";
  }

  function conversationPlainLines(conversation) {
    const lines = [];
    const cleanText = (value, message) => {
      const cleaner = root.exporters?.cleanPlatformAssistiveText;
      const text = String(value || "");
      return typeof cleaner === "function" ? cleaner(text, message) : text.trim();
    };
    const settings = conversation.settings || root.defaults?.settings || {};
    if (settings.includeExportTitle !== false) {
      lines.push(conversation.chatName || conversation.title || "Chat Export");
      lines.push("");
    }
    const metadata = Array.isArray(conversation.metadata) ? conversation.metadata : [];
    if (metadata.length) {
      lines.push("Metadata");
      metadata.forEach((item) => {
        if (item?.label && item?.value) {
          lines.push(`${item.label}: ${item.value}`);
        }
      });
      lines.push("");
    }
    (conversation.messages || []).forEach((message, index) => {
      const role = message.role === "human" ? "Human" : (conversation.providerName || "AI");
      const bodyText = cleanText(message.text || stripHtmlToText(message.safeHtml), message);
      lines.push(`${index + 1}. ${role}`);
      lines.push(bodyText);
      if (message.attachments?.length) {
        lines.push(`Attached: ${message.attachments.map((item) => item.label || item.name || item).join(", ")}`);
      }
      lines.push("");
    });
    return lines;
  }

  function base64ToBytes(base64) {
    const binary = atob(String(base64 || ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function dataUrlToImage(dataUrl) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = dataUrl;
    });
  }

  async function dataImageToPngBytes(dataUrl) {
    const directMatch = String(dataUrl || "").match(/^data:image\/png;base64,(.+)$/i);
    if (directMatch) {
      return base64ToBytes(directMatch[1]);
    }

    const image = await dataUrlToImage(dataUrl);
    if (!image) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width || 1;
    canvas.height = image.naturalHeight || image.height || 1;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const pngDataUrl = canvas.toDataURL("image/png");
    const pngMatch = pngDataUrl.match(/^data:image\/png;base64,(.+)$/i);
    return pngMatch ? base64ToBytes(pngMatch[1]) : null;
  }

  async function extractDocxImagesFromHtml(htmlDocument) {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(String(htmlDocument || ""), "text/html");
    const images = [];

    for (const imageNode of Array.from(parsed.querySelectorAll(".ceai-rich img[src]"))) {
      const src = imageNode.getAttribute("src") || "";
      const match = src.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i);
      if (!match) {
        continue;
      }

      const normalizedType = match[1].toLowerCase() === "jpg" ? "jpeg" : match[1].toLowerCase();
      const bytes = normalizedType === "jpeg"
        ? base64ToBytes(match[2])
        : await dataImageToPngBytes(src);
      if (!bytes) {
        continue;
      }

      images.push({
        contentType: normalizedType === "jpeg" ? "image/jpeg" : "image/png",
        extension: normalizedType === "jpeg" ? "jpg" : "png",
        alt: imageNode.getAttribute("alt") || "image",
        bytes
      });
    }

    return images;
  }

  function docxImageParagraph(image, index) {
    const relationshipId = `rId${index + 1}`;
    const docPrId = index + 1;
    const cx = 5486400;
    const cy = 3657600;
    return `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${docPrId}" name="Picture ${docPrId}" descr="${xmlEscape(image.alt)}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="image${docPrId}.${image.extension}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  }

  async function createDocxBlob(conversation, htmlDocument = "") {
    const images = await extractDocxImagesFromHtml(htmlDocument);
    const paragraphs = conversationPlainLines(conversation)
      .map((line) => `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r></w:p>`)
      .join("") + images.map((image, index) => docxImageParagraph(image, index)).join("");
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
    const imageRelationships = images.map((image, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${index + 1}.${image.extension}"/>`).join("");
    const contentTypeDefaults = [
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
      '<Default Extension="xml" ContentType="application/xml"/>',
      images.some((image) => image.extension === "png") ? '<Default Extension="png" ContentType="image/png"/>' : "",
      images.some((image) => image.extension === "jpg") ? '<Default Extension="jpg" ContentType="image/jpeg"/>' : ""
    ].filter(Boolean).join("");
    return zipStore([
      { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${contentTypeDefaults}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
      { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
      { name: "word/_rels/document.xml.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${imageRelationships}</Relationships>` },
      { name: "word/document.xml", content: documentXml },
      ...images.map((image, index) => ({
        name: `word/media/image${index + 1}.${image.extension}`,
        content: image.bytes
      }))
    ], "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  }

  async function createXlsxBlob(conversation) {
    const cleanText = (value, message) => {
      const cleaner = root.exporters?.cleanPlatformAssistiveText;
      const text = String(value || "");
      return typeof cleaner === "function" ? cleaner(text, message) : text.trim();
    };
    const rows = [["Index", "Role", "Content", "Time", "References"]]
      .concat((conversation.messages || []).map((message, index) => [
        String(index + 1),
        message.role === "human" ? "Human" : (conversation.providerName || "AI"),
        cleanText(message.text || stripHtmlToText(message.safeHtml), message),
        message.timeLabel || "",
        (message.references || []).map((ref) => ref.label || ref.url || "").join("; ")
      ]));
    const sheetData = rows.map((row, rIndex) => `<row r="${rIndex + 1}">${row.map((cell, cIndex) => {
      const col = String.fromCharCode(65 + cIndex);
      return `<c r="${col}${rIndex + 1}" t="inlineStr"><is><t>${xmlEscape(cell)}</t></is></c>`;
    }).join("")}</row>`).join("");
    const sheetXml = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetData}</sheetData></worksheet>`;
    return zipStore([
      { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
      { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Messages" sheetId="1" r:id="rId1"/></sheets></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` },
      { name: "xl/worksheets/sheet1.xml", content: sheetXml }
    ], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }

  function measureCanvasLines(context, text, maxWidth) {
    const rawText = String(text || "");
    const words = /\s/.test(rawText) ? rawText.split(/\s+/) : Array.from(rawText);
    const lines = [];
    let line = "";

    words.forEach((word) => {
      const separator = /\s/.test(rawText) ? " " : "";
      const testLine = line ? `${line}${separator}${word}` : word;
      if (context.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    });

    if (line) {
      lines.push(line);
    }

    return lines.length ? lines : [""];
  }

  async function createPngDataUrl(conversation) {
    const width = 1200;
    const padding = 48;
    const lineHeight = 26;
    const lines = conversationPlainLines(conversation);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = 1;
    const measureContext = canvas.getContext("2d");
    measureContext.font = "18px Segoe UI, Arial, sans-serif";
    const wrappedLines = lines.flatMap((line) => measureCanvasLines(measureContext, line, width - padding * 2).concat([""]));
    const height = Math.max(600, padding * 2 + wrappedLines.length * lineHeight);
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#0f172a";
    context.font = "18px Segoe UI, Arial, sans-serif";
    let y = padding;
    wrappedLines.forEach((line) => {
      if (line) {
        context.fillText(line, padding, y);
      }
      y += lineHeight;
    });
    return canvas.toDataURL("image/png");
  }

  function htmlToCanvasTextBlocks(htmlDocument) {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(String(htmlDocument || ""), "text/html");
    const blocks = [];

    Array.from(parsed.querySelectorAll(".ceai-message")).forEach((messageNode) => {
      const speaker = messageNode.querySelector("h2")?.textContent?.trim() || "Message";
      blocks.push({ type: "heading", text: speaker });

      Array.from(messageNode.querySelectorAll(".ceai-rich img")).forEach((imageNode) => {
        const src = imageNode.getAttribute("src") || "";
        const alt = imageNode.getAttribute("alt") || "image";
        if (src) {
          blocks.push({ type: "image", src, alt });
        }
      });

      const text = Array.from(messageNode.querySelectorAll(".ceai-rich p, .ceai-rich li, .ceai-rich pre, .ceai-rich blockquote"))
        .map((node) => node.textContent || "")
        .join("\n")
        .trim();
      if (text) {
        blocks.push({ type: "text", text });
      }
      blocks.push({ type: "gap", text: "" });
    });

    return blocks;
  }

  function loadCanvasImage(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  async function createPngDataUrlFromHtml(htmlDocument, conversation) {
    const width = 1200;
    const padding = 48;
    const lineHeight = 26;
    const maxContentWidth = width - padding * 2;
    const measureCanvas = document.createElement("canvas");
    measureCanvas.width = width;
    measureCanvas.height = 1;
    const measureContext = measureCanvas.getContext("2d");
    measureContext.font = "18px Segoe UI, Arial, sans-serif";
    const sourceBlocks = htmlToCanvasTextBlocks(htmlDocument);
    const fallbackBlocks = conversationPlainLines(conversation).map((text) => ({ type: "text", text }));
    const renderedBlocks = [];
    let height = padding;

    for (const block of sourceBlocks.length ? sourceBlocks : fallbackBlocks) {
      if (block.type === "image") {
        const image = await loadCanvasImage(block.src);
        if (image) {
          const naturalWidth = image.naturalWidth || image.width || 1;
          const naturalHeight = image.naturalHeight || image.height || 1;
          const ratio = Math.min(1, maxContentWidth / naturalWidth);
          const drawWidth = Math.max(1, Math.round(naturalWidth * ratio));
          const drawHeight = Math.max(1, Math.round(naturalHeight * ratio));
          renderedBlocks.push({ ...block, image, drawWidth, drawHeight });
          height += drawHeight + 18;
        } else {
          const lines = measureCanvasLines(measureContext, `[Image: ${block.alt}]`, maxContentWidth);
          renderedBlocks.push({ type: "text", lines });
          height += lines.length * lineHeight + 10;
        }
        continue;
      }

      if (block.type === "gap") {
        renderedBlocks.push(block);
        height += 18;
        continue;
      }

      const lines = measureCanvasLines(measureContext, block.text, maxContentWidth);
      renderedBlocks.push({ ...block, lines });
      height += lines.length * lineHeight + (block.type === "heading" ? 12 : 10);
    }

    height = Math.max(600, height + padding);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, width, height);
    let y = padding;

    renderedBlocks.forEach((block) => {
      if (block.type === "image" && block.image) {
        context.drawImage(block.image, padding, y, block.drawWidth, block.drawHeight);
        y += block.drawHeight + 18;
        return;
      }

      if (block.type === "gap") {
        y += 18;
        return;
      }

      context.fillStyle = block.type === "heading" ? "#1d4ed8" : "#0f172a";
      context.font = block.type === "heading"
        ? "700 20px Segoe UI, Arial, sans-serif"
        : "18px Segoe UI, Arial, sans-serif";
      (block.lines || []).forEach((line) => {
        context.fillText(line, padding, y);
        y += lineHeight;
      });
      y += block.type === "heading" ? 12 : 10;
    });

    return canvas.toDataURL("image/png");
  }

  function resolveProvider() {
    activeProvider = root.providers.findProviderForUrl(location.href);
    return activeProvider;
  }

  function getActiveProvider() {
    return activeProvider || resolveProvider();
  }

  function isProviderReadyForExport() {
    const provider = getActiveProvider();
    return Boolean(provider && provider.isChatPage());
  }

  function cloneRawConversationSnapshot(rawConversation) {
    if (typeof globalThis.structuredClone === "function") {
      try {
        return globalThis.structuredClone(rawConversation);
      } catch (_error) {
        // Fall through to JSON clone for plain-data provider payloads.
      }
    }

    return JSON.parse(JSON.stringify(rawConversation || {}));
  }

  async function buildRawConversation(provider, settings, options = {}) {
    return Promise.resolve(provider.extractConversation(settings, options));
  }

  function processRawConversation(rawConversation, settings, provider) {
    // Post-processing mutates some fields (for example `settings`), so each
    // format gets an isolated raw snapshot.
    const rawSnapshot = cloneRawConversationSnapshot(rawConversation);
    return root.postProcess.processConversation(rawSnapshot, settings, provider);
  }

  async function buildProcessedConversation(provider, settings, options = {}) {
    const rawConversation = await buildRawConversation(provider, settings, options);
    return processRawConversation(rawConversation, settings, provider);
  }

  function settingsForRichMediaExport(settings) {
    return {
      ...settings,
      mediaHandling: MEDIA_HANDLING.MHT
    };
  }

  function settingsForVisualExport(settings) {
    return {
      ...settings,
      // Text conversion options are TXT-only. Keep rich formatting in HTML/PDF/MHT.
      textFormatting: TEXT_FORMATTING.MARKDOWN,
      quoteDividerStyle: QUOTE_DIVIDER_STYLE.MARKDOWN
    };
  }

  function applyCounterSnapshotToConversation(conversation, counterSnapshot) {
    if (!conversation || !counterSnapshot || typeof counterSnapshot !== "object") {
      return conversation;
    }

    conversation.exportCounters = {
      totalCount: Number(counterSnapshot.totalCount || 0),
      dayCount: Number(counterSnapshot.dayCount || 0),
      chatNameCount: Number(counterSnapshot.chatNameCount || 1),
      dayKey: String(counterSnapshot.dayKey || "")
    };

    // Keep popup summary/file-name preview aligned with the same counter snapshot.
    if (conversation.summary && typeof root.exporters?.resolveFileBaseName === "function") {
      const fileNameBase = root.exporters.resolveFileBaseName(conversation);
      conversation.summary.fileNameBase = fileNameBase;
      conversation.summary.fileName = fileNameBase;
    }

    return conversation;
  }

  async function requestFileDownload(payload) {
    const response = await root.chromeHelpers.runtimeSendMessage({
      type: MSG_DOWNLOAD_FILE,
      payload
    });

    if (!response || !response.ok) {
      throw new Error(response?.error || "Unknown download error.");
    }

    return response;
  }

  async function sendDirectoryFileInChunks(file) {
    const dataUrl = file.dataUrl || textToDataUrlForDirectory(file.content, file.mimeType);
    const match = String(dataUrl || "").match(/^data:([^,]*;base64),(.*)$/i);
    if (!match) {
      throw new Error("目录写入只支持 base64 data URL。");
    }
    const base64Body = match[2] || "";
    const chunkSize = 128 * 1024;
    const decodedLength = (base64) => {
      const padding = base64.endsWith("==") ? 2 : (base64.endsWith("=") ? 1 : 0);
      return Math.max(0, Math.floor(base64.length * 3 / 4) - padding);
    };

    const connect = globalThis.chrome?.runtime?.connect;
    if (typeof connect !== "function" || !PORT_WRITE_DIRECTORY_FILE) {
      return sendDirectoryFileByMessages(file, base64Body, chunkSize, decodedLength);
    }

    const port = connect.call(globalThis.chrome.runtime, { name: PORT_WRITE_DIRECTORY_FILE });
    let seq = 0;
    let disconnected = false;
    const pending = new Map();

    const cleanupPending = (error) => {
      for (const entry of pending.values()) {
        clearTimeout(entry.timeoutId);
        entry.reject(error);
      }
      pending.clear();
    };

    const onMessage = (response) => {
      const entry = pending.get(response?.seq);
      if (!entry) {
        return;
      }

      pending.delete(response.seq);
      clearTimeout(entry.timeoutId);
      if (!response?.ok) {
        entry.reject(new Error(response?.error || "写入保存目录失败。"));
        return;
      }
      entry.resolve(response);
    };

    port.onMessage.addListener(onMessage);
    port.onDisconnect.addListener(() => {
      disconnected = true;
      cleanupPending(new Error("保存目录写入连接已断开。"));
    });

    const send = (payload) => {
      if (disconnected) {
        return Promise.reject(new Error("保存目录写入连接已断开。"));
      }

      const currentSeq = ++seq;
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          pending.delete(currentSeq);
          reject(new Error("保存目录写入超时。"));
        }, 30000);

        pending.set(currentSeq, { resolve, reject, timeoutId });
        try {
          port.postMessage({
            seq: currentSeq,
            filename: file.filename,
            mimeType: file.mimeType,
            ...payload
          });
        } catch (error) {
          pending.delete(currentSeq);
          clearTimeout(timeoutId);
          reject(error);
        }
      });
    };

    try {
      await send({
        action: "start"
      });
      for (let index = 0; index < base64Body.length; index += chunkSize) {
        const chunk = base64Body.slice(index, index + chunkSize);
        const bytes = decodedLength(chunk);
        await send({
          action: "chunk",
          bytes,
          chunk
        });
      }
      return await send({ action: "end" });
    } catch (error) {
      await send({ action: "abort" }).catch(() => null);
      throw error;
    } finally {
      cleanupPending(new Error("保存目录写入已结束。"));
      try {
        port.disconnect();
      } catch (_error) {
        // Ignore disconnect races after a finished write.
      }
    }
  }

  async function sendDirectoryFileByMessages(file, base64Body, chunkSize, decodedLength) {
    const transferId = `exportai-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const send = async (payload) => {
      const response = await root.chromeHelpers.runtimeSendMessage({
        type: MSG_WRITE_FILE_TO_DIRECTORY_CHUNK,
        payload: {
          transferId,
          filename: file.filename,
          mimeType: file.mimeType,
          ...payload
        }
      });
      if (!response?.ok) {
        throw new Error(response?.error || "写入保存目录失败。");
      }
      return response;
    };

    try {
      await send({ action: "start" });
      let byteOffset = 0;
      for (let index = 0; index < base64Body.length; index += chunkSize) {
        const chunk = base64Body.slice(index, index + chunkSize);
        const bytes = decodedLength(chunk);
        await send({
          action: "chunk",
          offset: byteOffset,
          bytes,
          chunk
        });
        byteOffset += bytes;
      }
      return await send({ action: "end" });
    } catch (error) {
      await root.chromeHelpers.runtimeSendMessage({
        type: MSG_WRITE_FILE_TO_DIRECTORY_CHUNK,
        payload: { transferId, filename: file.filename, action: "abort" }
      }).catch(() => null);
      throw error;
    }
  }

  async function chooseDirectoryForFloatingExport() {
    if (typeof globalThis.showDirectoryPicker !== "function") {
      throw new Error("Current browser does not support choosing one folder for floating multi-export.");
    }

    const directoryHandle = await globalThis.showDirectoryPicker({
      mode: "readwrite",
      id: "exportai-download-directory"
    });

    if (typeof directoryHandle.requestPermission === "function") {
      const permission = await directoryHandle.requestPermission({ mode: "readwrite" });
      if (permission !== "granted") {
        throw new Error("Folder write permission was not granted.");
      }
    }

    return directoryHandle;
  }

  function directoryExportFileBlob(file) {
    if (file?.dataUrl) {
      return new Blob([base64DataUrlToBytes(file.dataUrl)], {
        type: file.mimeType || "application/octet-stream"
      });
    }

    return new Blob([String(file?.content || "")], {
      type: file?.mimeType || "text/plain;charset=utf-8"
    });
  }

  async function writeFilesToChosenDirectory(directoryHandle, files) {
    const written = [];
    for (const file of Array.isArray(files) ? files : []) {
      if (!file?.filename) {
        continue;
      }

      const fileHandle = await directoryHandle.getFileHandle(filenameBasename(file.filename), { create: true });
      const writable = await fileHandle.createWritable();
      try {
        await writable.write(directoryExportFileBlob(file));
      } finally {
        await writable.close();
      }
      written.push(file.filename);
    }

    return written;
  }

  function textToDataUrlForDirectory(content, mimeType) {
    const bytes = new TextEncoder().encode(String(content || ""));
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return `data:${mimeType || "text/plain;charset=utf-8"};base64,${btoa(binary)}`;
  }

  function normalizeCustomDownloadFolder(value) {
    const rawValue = String(value || "").trim();
    if (!rawValue) {
      return "";
    }

    const normalizedValue = rawValue.normalize ? rawValue.normalize("NFC") : rawValue;
    const pathSegments = normalizedValue
      .replace(/\\/g, "/")
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .filter((segment) => segment !== "." && segment !== "..")
      .map((segment) => segment
        .replace(/[<>:"|?*\u0000-\u001F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      )
      .filter(Boolean);

    return pathSegments.join("/");
  }

  function resolveDownloadFilename(baseFilename, settings) {
    const safeBaseFileName = String(baseFilename || "chat-export");
    if (settings?.saveMode !== "custom") {
      return safeBaseFileName;
    }

    const safeFolder = normalizeCustomDownloadFolder(settings.customDownloadFolder);
    if (!safeFolder) {
      return safeBaseFileName;
    }

    return `${safeFolder}/${safeBaseFileName}`;
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalizePopupTitle(value) {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    return normalized.normalize ? normalized.normalize("NFC") : normalized;
  }

  function cleanTitleSeparators(value) {
    return normalizePopupTitle(value)
      .replace(/^[\s\-|:·•—–]+/g, "")
      .replace(/[\s\-|:·•—–]+$/g, "")
      .trim();
  }

  function cleanDocumentTitleForPopup(provider) {
    let title = normalizePopupTitle(document.title || document.querySelector("title")?.textContent);
    const providerNames = [provider?.displayName, provider?.id]
      .map((name) => normalizePopupTitle(name))
      .filter(Boolean);

    providerNames.forEach((name) => {
      const escapedName = escapeRegExp(name);
      title = title
        .replace(new RegExp(`^${escapedName}\\s*[-|:]*\\s*`, "i"), "")
        .replace(new RegExp(`\\s*[-|:]*\\s*${escapedName}$`, "i"), "")
        .trim();
    });

    return cleanTitleSeparators(title);
  }

  function getPopupTitleCandidate(provider) {
    const selectors = [
      '[data-testid="chat-title-button"] .truncate',
      '[data-testid="chat-title-button"]',
      'main [data-testid*="conversation-title"]',
      "main header h1",
      "main h1"
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element || (element.getClientRects && !element.getClientRects().length)) {
        continue;
      }

      const text = normalizePopupTitle(element.textContent);
      if (text && text.length <= 180) {
        return text;
      }
    }

    return cleanDocumentTitleForPopup(provider) || `${provider?.displayName || "AI"} Chat`;
  }

  async function getCachedSettingsForPopupStatus() {
    if (typeof root.storage?.getCachedSettings === "function") {
      try {
        return await root.storage.getCachedSettings();
      } catch (_error) {
        // Keep popup status fast even if local storage is temporarily unavailable.
      }
    }

    return root.defaults?.settings || {};
  }

  async function buildPopupStatusSummary(provider, settings, messageCount) {
    const title = getPopupTitleCandidate(provider);
    const conversationPreview = {
      providerId: provider?.id || "",
      providerName: provider?.displayName || "AI",
      sourceUrl: location.href,
      folderName: "",
      chatName: title,
      title,
      modelName: provider?.displayName || "AI",
      extractedAtIso: new Date().toISOString(),
      settings,
      summary: {
        providerName: provider?.displayName || "AI",
        chatName: title,
        totalMessages: Number(messageCount || 0)
      }
    };

    if (typeof root.storage?.previewExportCounters === "function") {
      try {
        const previewSnapshot = await root.storage.previewExportCounters(conversationPreview);
        applyCounterSnapshotToConversation(conversationPreview, previewSnapshot);
      } catch (_error) {
        // Counter preview is cosmetic in popup status.
      }
    }

    if (!conversationPreview.summary.fileNameBase && typeof root.exporters?.resolveFileBaseName === "function") {
      const fileNameBase = root.exporters.resolveFileBaseName(conversationPreview);
      conversationPreview.summary.fileNameBase = fileNameBase;
      conversationPreview.summary.fileName = fileNameBase;
    }

    if (conversationPreview.summary.fileName) {
      conversationPreview.summary.fileName = resolveDownloadFilename(conversationPreview.summary.fileName, settings);
    }

    return conversationPreview.summary;
  }

  function shouldAskForDownloadLocation(settings) {
    return settings?.saveMode === "ask";
  }

  function shouldInlineMediaSource(rawSource) {
    const source = String(rawSource || "").trim();
    if (!source) {
      return false;
    }

    if (/^data:/i.test(source)) {
      return false;
    }

    if (/^(?:javascript|about|chrome-extension):/i.test(source)) {
      return false;
    }

    return true;
  }

  function withSignalTimeout(timeoutMs) {
    const controller = new AbortController();
    const timerId = window.setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    return {
      signal: controller.signal,
      clear: () => window.clearTimeout(timerId)
    };
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not convert image blob to data URL."));
      reader.readAsDataURL(blob);
    });
  }

  async function fetchImageAsDataUrl(url) {
    const timeoutHandle = withSignalTimeout(6000);

    try {
      const response = await fetch(url, {
        credentials: "include",
        cache: "force-cache",
        signal: timeoutHandle.signal
      });

      if (!response.ok) {
        throw new Error(`Image request failed (${response.status})`);
      }

      const imageBlob = await response.blob();
      if (!imageBlob || !imageBlob.size) {
        throw new Error("Image payload is empty.");
      }

      return await blobToDataUrl(imageBlob);
    } finally {
      timeoutHandle.clear();
    }
  }

  async function inlineImagesInHtmlDocument(htmlDocument) {
    const htmlSource = String(htmlDocument || "");
    if (!htmlSource || !/<img\b/i.test(htmlSource)) {
      return htmlSource;
    }

    const parser = new DOMParser();
    const parsed = parser.parseFromString(htmlSource, "text/html");
    const images = Array.from(parsed.querySelectorAll("img[src]"));

    if (!images.length) {
      return htmlSource;
    }

    const dataUrlCache = new Map();

    await Promise.all(images.map(async (image) => {
      const source = image.getAttribute("src") || "";
      if (!shouldInlineMediaSource(source)) {
        return;
      }

      let absoluteUrl = "";
      try {
        absoluteUrl = new URL(source, location.href).href;
      } catch (_error) {
        return;
      }

      if (!shouldInlineMediaSource(absoluteUrl)) {
        return;
      }

      if (!dataUrlCache.has(absoluteUrl)) {
        dataUrlCache.set(absoluteUrl, fetchImageAsDataUrl(absoluteUrl).catch(() => ""));
      }

      const resolvedDataUrl = await dataUrlCache.get(absoluteUrl);
      if (!resolvedDataUrl) {
        return;
      }

      image.setAttribute("src", resolvedDataUrl);
      image.removeAttribute("srcset");
    }));

    return "<!doctype html>\n" + parsed.documentElement.outerHTML;
  }

  function allFormats() {
    return Object.values(EXPORT_FORMATS);
  }

  function normalizeExportButtonOrder(value) {
    const seen = new Set();
    const normalized = [];

    if (Array.isArray(value)) {
      value.forEach((item) => {
        const format = String(item || "").trim().toLowerCase();
        if (!DEFAULT_EXPORT_BUTTON_ORDER.includes(format) || seen.has(format)) {
          return;
        }

        seen.add(format);
        normalized.push(format);
      });
    }

    DEFAULT_EXPORT_BUTTON_ORDER.forEach((format) => {
      if (!seen.has(format)) {
        seen.add(format);
        normalized.push(format);
      }
    });

    return normalized.length ? normalized : [...DEFAULT_EXPORT_BUTTON_ORDER];
  }

  function resolveMultiTargetFormats(settings) {
    const targets = [];
    if (settings?.multiExportPdf) {
      targets.push(EXPORT_FORMATS.PDF);
    }
    if (settings?.multiExportMht) {
      targets.push(EXPORT_FORMATS.MHT);
    }
    if (settings?.multiExportHtml) {
      targets.push(EXPORT_FORMATS.HTML);
    }
    if (settings?.multiExportTxt) {
      targets.push(EXPORT_FORMATS.TXT);
    }
    if (settings?.multiExportMd) {
      targets.push(EXPORT_FORMATS.MD);
    }
    if (settings?.multiExportDocx) {
      targets.push(EXPORT_FORMATS.DOCX);
    }
    if (settings?.multiExportXlsx) {
      targets.push(EXPORT_FORMATS.XLSX);
    }
    if (settings?.multiExportPng) {
      targets.push(EXPORT_FORMATS.PNG);
    }

    return targets;
  }

  function shouldForceRichMediaForFormat(format) {
    return [
      EXPORT_FORMATS.MHT,
      EXPORT_FORMATS.PDF,
      EXPORT_FORMATS.HTML,
      EXPORT_FORMATS.MD,
      EXPORT_FORMATS.DOCX,
      EXPORT_FORMATS.PNG
    ].includes(format);
  }

  function getConversationKey(provider) {
    return `${provider?.id || "unknown"}:${location.pathname}`;
  }

  function getLastFilenameKey(provider, conversation, format) {
    const title = conversation?.chatName || conversation?.title || location.pathname;
    return `${provider?.id || "unknown"}:${location.pathname}:${title}:${format}`;
  }

  function hasManualExportSeed(settings, provider) {
    const map = settings?.lastDownloadFilenameByConversation || {};
    const prefix = `${provider?.id || "unknown"}:${location.pathname}:`;
    return Object.keys(map).some((key) => key.startsWith(prefix) && Boolean(map[key]));
  }

  function resolveAutoFilename(settings, provider, conversation, format, fallbackFilename) {
    const map = settings.lastDownloadFilenameByConversation || {};
    const exact = map[getLastFilenameKey(provider, conversation, format)];
    if (exact) {
      return exact;
    }

    const prefix = `${provider?.id || "unknown"}:${location.pathname}:`;
    const suffix = `:${format}`;
    const sameFormatEntry = Object.entries(map).find(([key, value]) => (
      key.startsWith(prefix) && key.endsWith(suffix) && Boolean(value)
    ));
    if (sameFormatEntry) {
      return sameFormatEntry[1];
    }

    const anyEntry = Object.entries(map).find(([key, value]) => key.startsWith(prefix) && Boolean(value));
    if (!anyEntry) {
      return fallbackFilename;
    }

    const previousFilename = String(anyEntry[1] || "");
    return previousFilename.replace(/\.[^/.]+$/, `.${format}`) || fallbackFilename;
  }

  async function rememberExportFilename(settings, provider, conversation, format, filename) {
    if (!filename || !root.storage?.saveSettings) {
      return;
    }

    let latestSettings = settings;
    if (typeof root.storage.getCachedSettings === "function") {
      latestSettings = await root.storage.getCachedSettings().catch(() => settings);
    }

    const currentMap = latestSettings.lastDownloadFilenameByConversation || settings.lastDownloadFilenameByConversation || {};
    const key = getLastFilenameKey(provider, conversation, format);
    if (currentMap[key] === filename) {
      return;
    }

    await root.storage.saveSettings({
      lastDownloadFilenameByConversation: {
        ...currentMap,
        [key]: filename
      }
    }).catch(() => null);
  }

  function getLiveMessageCount(provider) {
    if (!provider) {
      return 0;
    }

    const liveStatus = provider.getLiveStatus ? provider.getLiveStatus() : null;
    return Number(liveStatus?.messageCount || 0);
  }

  function getExportStates(provider, liveMessageCount) {
    const key = getConversationKey(provider);
    const snapshot = exportSnapshotsByConversation.get(key) || {};
    const currentCount = Number(liveMessageCount || 0);
    const next = {};

    allFormats().forEach((format) => {
      const savedCount = Number(snapshot[format]);
      next[format] = Number.isFinite(savedCount) && currentCount > 0 && currentCount <= savedCount;
    });

    return next;
  }

  function markExportSuccess(provider, format, liveMessageCount) {
    const key = getConversationKey(provider);
    const current = exportSnapshotsByConversation.get(key) || {};
    const safeCount = Math.max(0, Number(liveMessageCount || 0));
    current[format] = safeCount;
    exportSnapshotsByConversation.set(key, current);
  }

  function ensureInlineUi() {
    if (!root.contentUi || typeof root.contentUi.createFloatingExportUi !== "function") {
      return null;
    }

    if (!inlineUi) {
      inlineUi = root.contentUi.createFloatingExportUi({
        onExport: handleInlineExport,
        onInteraction: () => {
          const lockMs = INLINE_UI_INTERACTION_LOCK_MS;
          inlineUiInteractionUntil = Math.max(inlineUiInteractionUntil, Date.now() + lockMs);

          if (inlineUiInteractionReleaseTimer !== null) {
            window.clearTimeout(inlineUiInteractionReleaseTimer);
          }

          inlineUiInteractionReleaseTimer = window.setTimeout(() => {
            inlineUiInteractionReleaseTimer = null;
            scheduleInlineUiRefresh();
          }, lockMs + 40);
        }
      });
    }

    return inlineUi;
  }

  function requestInlineUiRefresh() {
    if (inlineUiRefreshInFlight) {
      inlineUiRefreshQueued = true;
      return;
    }

    inlineUiRefreshInFlight = true;
    refreshInlineUi()
      .catch(() => {})
      .finally(() => {
        inlineUiRefreshInFlight = false;

        if (inlineUiRefreshQueued) {
          inlineUiRefreshQueued = false;
          scheduleInlineUiRefresh();
        }
      });
  }

  function scheduleInlineUiRefresh() {
    if (inlineUiRefreshTimer !== null) {
      return;
    }

    inlineUiRefreshTimer = window.setTimeout(() => {
      inlineUiRefreshTimer = null;
      requestInlineUiRefresh();
    }, 140);
  }

  async function isMember() {
    const response = await root.chromeHelpers.runtimeSendMessage({ type: MSG_CHECK_MEMBERSHIP });
    return Boolean(PAID_FEATURES_TEMPORARILY_UNLOCKED || (response?.ok && response.isMember));
  }

  async function getIntegrationMembership() {
    const response = await root.chromeHelpers.runtimeSendMessage({ type: MSG_CHECK_MEMBERSHIP });
    return response?.ok
      ? response
      : { ok: false, isMember: false, error: response?.error || "membership_unavailable" };
  }

  function hasPaidFeatureAccess(membership) {
    return Boolean(PAID_FEATURES_TEMPORARILY_UNLOCKED || membership?.isMember);
  }

  async function assertAllowedFormatsForMembership(formats) {
    const membership = await getIntegrationMembership();
    const paidFeatureAccess = hasPaidFeatureAccess(membership);
    if (paidFeatureAccess) {
      return;
    }

    const blocked = formats.filter((format) => !FREE_EXPORT_FORMATS.has(format));
    if (blocked.length) {
      throw new Error("Free accounts can export TXT and PDF only. Upgrade to export other formats.");
    }
  }

  function setIntegrationStatus(overrides) {
    lastIntegrationStatus = {
      ok: true,
      visible: false,
      reason: "not_checked",
      providerId: null,
      isChatPage: false,
      isMember: false,
      paidFeatureAccess: Boolean(PAID_FEATURES_TEMPORARILY_UNLOCKED),
      enabledBySettings: false,
      autoExportEnabled: false,
      autoExportMode: "change",
      autoExportFormats: [],
      autoExportRuntime: autoExportRuntimeKey || "off",
      autoExportLastStatus: lastAutoExportStatus,
      floatingUiCreated: Boolean(inlineUi),
      ...overrides
    };
    return lastIntegrationStatus;
  }

  async function getIntegrationStatus() {
    const provider = getActiveProvider();
    const settings = cachedInlineUiSettings || await root.storage.getSettings();
    const membership = await getIntegrationMembership();
    const paidFeatureAccess = hasPaidFeatureAccess(membership);
    const isChatPage = Boolean(provider?.isChatPage?.());
    const enabledBySettings = Boolean(provider && getProviderButtonSetting(settings, provider.id));
    let reason = "visible";
    let visible = true;

    if (!provider) {
      reason = "no_provider";
      visible = false;
    } else if (!isChatPage) {
      reason = "not_chat_page";
      visible = false;
    } else if (!enabledBySettings) {
      reason = "disabled_by_settings";
      visible = false;
    } else if (!paidFeatureAccess) {
      reason = "not_member";
      visible = false;
    }

    return setIntegrationStatus({
      visible,
      reason,
      providerId: provider?.id || null,
      providerName: provider?.displayName || null,
      isChatPage,
      isMember: Boolean(membership.isMember),
      paidFeatureAccess,
      enabledBySettings,
      autoExportEnabled: Boolean(settings.autoExportEnabled && paidFeatureAccess),
      autoExportMode: String(settings.autoExportMode || "change").toLowerCase(),
      autoExportFormats: normalizeSelectedExportFormats(settings.autoExportSelectedFormats, [EXPORT_FORMATS.HTML]),
      autoExportRuntime: autoExportRuntimeKey || "off",
      autoExportLastStatus: lastAutoExportStatus,
      floatingUiCreated: Boolean(inlineUi),
      selectedFormats: normalizeSelectedExportFormats(settings.integrationSelectedFormats, [EXPORT_FORMATS.HTML])
    });
  }

  function normalizeSelectedExportFormats(value, fallback = [EXPORT_FORMATS.HTML]) {
    const seen = new Set();
    const source = Array.isArray(value) && value.length ? value : fallback;
    return source
      .map((item) => String(item || "").trim().toLowerCase())
      .filter((item) => EXPORTABLE_FORMATS.includes(item))
      .filter((item) => {
        if (seen.has(item)) {
          return false;
        }
        seen.add(item);
        return true;
      });
  }

  function setAutoExportStatus(status) {
    lastAutoExportStatus = {
      ok: Boolean(status?.ok),
      state: status?.state || "unknown",
      reason: status?.reason || "",
      error: status?.error || "",
      at: new Date().toISOString()
    };
    return lastAutoExportStatus;
  }

  function getAutoExportSignature(provider) {
    const liveStatus = provider?.getLiveStatus ? provider.getLiveStatus() : null;
    const bodyText = String(document.body?.innerText || "");
    const tail = bodyText.slice(-6000);
    let hash = 0;

    for (let index = 0; index < tail.length; index += 1) {
      hash = ((hash << 5) - hash + tail.charCodeAt(index)) | 0;
    }

    return [
      provider?.id || "unknown",
      location.href,
      Number(liveStatus?.messageCount || 0),
      bodyText.length,
      hash
    ].join(":");
  }

  function syncAutoExportRuntime(settings) {
    if (!AUTO_EXPORT_FEATURE_ENABLED) {
      autoExportRuntimeKey = "off";
      if (autoExportIntervalTimer !== null) {
        window.clearInterval(autoExportIntervalTimer);
        autoExportIntervalTimer = null;
      }
      setAutoExportStatus({ ok: true, state: "disabled", reason: "feature_hidden" });
      return;
    }

    const enabled = Boolean(settings?.autoExportEnabled);
    const mode = String(settings?.autoExportMode || "change").toLowerCase();
    const intervalSeconds = Math.max(60, Math.min(86400, Number(settings?.autoExportIntervalSeconds || 60)));
    const nextKey = enabled && mode === "interval" ? `interval:${intervalSeconds}` : "off";

    if (autoExportRuntimeKey === nextKey) {
      return;
    }

    autoExportRuntimeKey = nextKey;
    if (autoExportIntervalTimer !== null) {
      window.clearInterval(autoExportIntervalTimer);
      autoExportIntervalTimer = null;
    }

    if (enabled && mode === "interval") {
      autoExportIntervalTimer = window.setInterval(() => {
        runAutoExportCheck("interval").catch(() => null);
      }, intervalSeconds * 1000);
    }
  }

  function scheduleAutoExportCheck(delayMs = 1600) {
    if (!AUTO_EXPORT_FEATURE_ENABLED) {
      return;
    }

    if (autoExportDebounceTimer !== null) {
      window.clearTimeout(autoExportDebounceTimer);
    }

    autoExportDebounceTimer = window.setTimeout(() => {
      autoExportDebounceTimer = null;
      runAutoExportCheck("change").catch(() => null);
    }, delayMs);
  }

  async function runAutoExportCheck(trigger = "change") {
    if (!AUTO_EXPORT_FEATURE_ENABLED) {
      setAutoExportStatus({ ok: true, state: "disabled", reason: "feature_hidden" });
      return;
    }

    if (document.visibilityState === "hidden") {
      setAutoExportStatus({ ok: true, state: "skipped", reason: "hidden_tab" });
      return;
    }

    if (autoExportInFlight || exportInProgress) {
      setAutoExportStatus({ ok: true, state: "skipped", reason: "busy" });
      return;
    }

    const provider = getActiveProvider();
    if (!provider || !provider.isChatPage()) {
      setAutoExportStatus({ ok: true, state: "skipped", reason: "not_chat_page" });
      return;
    }

    const settings = await root.storage.getSettings();
    syncAutoExportRuntime(settings);
    const mode = String(settings.autoExportMode || "change").toLowerCase();
    if (trigger === "change" && mode === "interval") {
      setAutoExportStatus({ ok: true, state: "skipped", reason: "interval_mode" });
      return;
    }
    if (!settings.autoExportEnabled || !(await isMember())) {
      setAutoExportStatus({ ok: true, state: "skipped", reason: "disabled_or_not_member" });
      return;
    }

    const formats = normalizeSelectedExportFormats(settings.autoExportSelectedFormats, [EXPORT_FORMATS.HTML]);
    if (!formats.length) {
      setAutoExportStatus({ ok: true, state: "skipped", reason: "no_formats" });
      return;
    }
    if (!hasManualExportSeed(settings, provider)) {
      setAutoExportStatus({ ok: true, state: "skipped", reason: "manual_export_required" });
      return;
    }

    const signature = getAutoExportSignature(provider);
    if (signature === lastAutoExportSignature) {
      setAutoExportStatus({ ok: true, state: "skipped", reason: "unchanged" });
      return;
    }

    autoExportInFlight = true;
    try {
      setAutoExportStatus({ ok: true, state: "running", reason: trigger });
      const response = await root.chromeHelpers.runtimeSendMessage({
        type: MSG_AUTO_EXPORT_CHAT,
        payload: {
          url: location.href,
          formats,
          trigger,
          signature
        }
      });
      if (!response?.ok) {
        throw new Error(response?.error || "Background auto export failed.");
      }
      if (response.skipped) {
        setAutoExportStatus({ ok: true, state: "skipped", reason: response.reason || "background_skipped" });
        return;
      }
      lastAutoExportSignature = signature;
      setAutoExportStatus({ ok: true, state: "exported", reason: trigger });
    } catch (error) {
      setAutoExportStatus({ ok: false, state: "error", reason: trigger, error: error.message });
    } finally {
      autoExportInFlight = false;
    }
  }

  async function refreshInlineUi() {
    const provider = getActiveProvider();
    const settings = cachedInlineUiSettings || await root.storage.getSettings();
    const interactionLocked = inlineUiInteractionUntil > Date.now();
    cachedInlineUiSettings = settings;
    syncAutoExportRuntime(settings);

    if (root.appTheme?.syncActionIconTheme) {
      root.appTheme.syncActionIconTheme(settings.appTheme);
    }

    const membership = await getIntegrationMembership();
    const paidFeatureAccess = hasPaidFeatureAccess(membership);
    const isChatPage = Boolean(provider?.isChatPage?.());
    const enabledBySettings = Boolean(provider && getProviderButtonSetting(settings, provider.id));

    if (!provider || !isChatPage || !enabledBySettings || !paidFeatureAccess) {
      let reason = "visible";
      if (!provider) {
        reason = "no_provider";
      } else if (!isChatPage) {
        reason = "not_chat_page";
      } else if (!enabledBySettings) {
        reason = "disabled_by_settings";
      } else if (!paidFeatureAccess) {
        reason = "not_member";
      }
      setIntegrationStatus({
        visible: false,
        reason,
        providerId: provider?.id || null,
        providerName: provider?.displayName || null,
        isChatPage,
        isMember: Boolean(membership.isMember),
        paidFeatureAccess,
        enabledBySettings,
        autoExportEnabled: Boolean(settings.autoExportEnabled && paidFeatureAccess),
        autoExportMode: String(settings.autoExportMode || "change").toLowerCase(),
        autoExportFormats: normalizeSelectedExportFormats(settings.autoExportSelectedFormats, [EXPORT_FORMATS.HTML]),
        autoExportRuntime: autoExportRuntimeKey || "off",
        floatingUiCreated: Boolean(inlineUi)
      });
      if (inlineUi) {
        // Avoid transient hide/remount while user is clicking.
        if (!exportInProgress && interactionLocked) {
          inlineUi.setVisible(true);
          inlineUi.setEnabled(true);
          return;
        }
        inlineUi.setVisible(false);
      }
      return;
    }

    const ui = ensureInlineUi();

    if (!ui) {
      setIntegrationStatus({
        visible: false,
        reason: "ui_unavailable",
        providerId: provider.id,
        providerName: provider.displayName,
        isChatPage,
        isMember: Boolean(membership.isMember),
        paidFeatureAccess,
        enabledBySettings,
        autoExportEnabled: Boolean(settings.autoExportEnabled && paidFeatureAccess),
        autoExportMode: String(settings.autoExportMode || "change").toLowerCase(),
        autoExportFormats: normalizeSelectedExportFormats(settings.autoExportSelectedFormats, [EXPORT_FORMATS.HTML]),
        autoExportRuntime: autoExportRuntimeKey || "off",
        floatingUiCreated: false
      });
      return;
    }

    if (root.appTheme && typeof ui.setTheme === "function") {
      ui.setTheme(root.appTheme.resolveThemeMode(settings.appTheme));
    }
    if (typeof ui.setProvider === "function") {
      ui.setProvider(provider.id || "");
    }
    if (typeof ui.setSelectedFormats === "function") {
      ui.setSelectedFormats(normalizeSelectedExportFormats(settings.integrationSelectedFormats, [EXPORT_FORMATS.HTML]));
    }
    if (typeof ui.setPosition === "function") {
      ui.setPosition(settings.integrationPosition);
    }

    const menuOpen = Boolean(!exportInProgress && typeof ui.isMenuOpen === "function" && ui.isMenuOpen());

    if (!exportInProgress && interactionLocked) {
      ui.setVisible(true);
      ui.setEnabled(true);
      return;
    }

    // Keep the menu stable while the user is interacting with it.
    // Without this guard, rapid host DOM mutations can race with mount/update
    // and make first clicks feel ignored.
    if (menuOpen) {
      ui.setVisible(true);
      ui.setEnabled(true);
      return;
    }

    // Reorder only when interaction is idle; moving menu buttons during
    // pointer/click sequences can make the integrated action miss clicks.
    if (typeof ui.setFormatOrder === "function") {
      ui.setFormatOrder(normalizeExportButtonOrder(settings.exportButtonOrder));
    }

    ui.setVisibleFormats({
      showExportMulti: Boolean(settings.showExportMulti),
      showExportPdf: Boolean(settings.showExportPdf),
      showExportMht: Boolean(settings.showExportMht),
      showExportHtml: Boolean(settings.showExportHtml),
      showExportTxt: Boolean(settings.showExportTxt),
      showExportMd: Boolean(settings.showExportMd),
      showExportDocx: Boolean(settings.showExportDocx),
      showExportXlsx: Boolean(settings.showExportXlsx),
      showExportPng: Boolean(settings.showExportPng)
    });

    if (!ui.hasVisibleFormats()) {
      ui.setVisible(false);
      return;
    }

    const mounted = ui.mount();

    if (!mounted) {
      ui.setVisible(false);
      setIntegrationStatus({
        visible: false,
        reason: "mount_failed",
        providerId: provider.id,
        providerName: provider.displayName,
        isChatPage,
        isMember: Boolean(membership.isMember),
        paidFeatureAccess,
        enabledBySettings,
        autoExportEnabled: Boolean(settings.autoExportEnabled && paidFeatureAccess),
        autoExportMode: String(settings.autoExportMode || "change").toLowerCase(),
        autoExportFormats: normalizeSelectedExportFormats(settings.autoExportSelectedFormats, [EXPORT_FORMATS.HTML]),
        autoExportRuntime: autoExportRuntimeKey || "off",
        floatingUiCreated: Boolean(inlineUi)
      });
      return;
    }

    ui.setVisible(true);
    // Keep the inline entry point immediately actionable once mounted.
    // Message counters can transiently flap during host DOM hydration and
    // should not block user clicks when no export is in progress.
    ui.setEnabled(!exportInProgress);
    setIntegrationStatus({
      visible: true,
      reason: "visible",
      providerId: provider.id,
      providerName: provider.displayName,
      isChatPage,
      isMember: Boolean(membership.isMember),
      paidFeatureAccess,
      enabledBySettings,
      autoExportEnabled: Boolean(settings.autoExportEnabled && paidFeatureAccess),
      autoExportMode: String(settings.autoExportMode || "change").toLowerCase(),
      autoExportFormats: normalizeSelectedExportFormats(settings.autoExportSelectedFormats, [EXPORT_FORMATS.HTML]),
      autoExportRuntime: autoExportRuntimeKey || "off",
      floatingUiCreated: Boolean(inlineUi),
      selectedFormats: normalizeSelectedExportFormats(settings.integrationSelectedFormats, [EXPORT_FORMATS.HTML])
    });
  }

  async function handleInlineExport(format, formats = null) {
    const ui = ensureInlineUi();

    if (ui) {
      ui.setLoading(true);
    }

    try {
      const settings = await root.storage.getSettings();
      if (settings.saveMode === "ask") {
        const directoryHandle = await chooseDirectoryForFloatingExport();
        const result = await exportCurrentChat(format, {
          formats,
          mode: "manual",
          output: "files"
        });
        await writeFilesToChosenDirectory(directoryHandle, result?.files || []);
        return;
      }

      await exportCurrentChat(format, { formats, mode: "manual" });
    } finally {
      if (ui) {
        ui.setLoading(false);
      }
      scheduleInlineUiRefresh();
    }
  }

  function normalizeRequestedFormats(format, options = {}) {
    const explicitFormats = Array.isArray(options.formats)
      ? options.formats
      : (Array.isArray(format) ? format : null);
    if (explicitFormats) {
      const seen = new Set();
      return explicitFormats
        .map((item) => String(item || "").trim().toLowerCase())
        .filter((item) => EXPORTABLE_FORMATS.includes(item))
        .filter((item) => {
          if (seen.has(item)) return false;
          seen.add(item);
          return true;
        });
    }
    return [];
  }

  async function exportCurrentChat(format, options = {}) {
    const provider = getActiveProvider();
    const isAutoExport = String(options.mode || "").toLowerCase() === "auto";
    const isBackgroundAutoExport = String(options.mode || "").toLowerCase() === "auto-background";
    const isSilentAutoExport = isAutoExport || isBackgroundAutoExport;

    if (!provider) {
      throw new Error("No active provider for this page.");
    }

    if (!isProviderReadyForExport()) {
      throw new Error("No active chat detected on this page.");
    }

    if (exportInProgress) {
      throw new Error("An export is already in progress.");
    }

    const requestedFormats = normalizeRequestedFormats(format, options);
    const requestedFormat = requestedFormats.length
      ? EXPORT_FORMATS.MULTI
      : String(format || "").trim().toLowerCase();
    const allowedFormats = new Set(allFormats());
    if (!allowedFormats.has(requestedFormat)) {
      throw new Error("Unsupported format: " + format);
    }

    exportInProgress = true;

    try {
      if (!isAutoExport) {
        scheduleInlineUiRefresh();
      }
      const settings = await root.storage.getSettings();
      const outputMode = String(options.output || "").toLowerCase();
      const shouldReturnFiles = outputMode === "files";
      const shouldWriteFilesImmediately = !isSilentAutoExport && outputMode === "directory";
      const shouldWriteDirectory = shouldReturnFiles || shouldWriteFilesImmediately;
      const timeoutMs = settings.exportTimeoutSeconds * 1000;
      const hydrationTimeoutMs = resolveHydrationTimeoutMs(settings);
      const liveMessageCountBeforeExport = getLiveMessageCount(provider);
      const exporter = root.exporters;
      const isMultiExport = requestedFormat === EXPORT_FORMATS.MULTI;
      const targetFormats = requestedFormats.length
        ? requestedFormats
        : requestedFormat === EXPORT_FORMATS.MULTI
          ? resolveMultiTargetFormats(settings)
        : [requestedFormat];
      await assertAllowedFormatsForMembership(targetFormats);
      const needsRichMediaHydration = targetFormats.some((targetFormat) => shouldForceRichMediaForFormat(targetFormat))
        || (
          !isMultiExport
          && settings.mediaHandling === MEDIA_HANDLING.MHT
          && settings.companionMhtOnMedia
          && !targetFormats.includes(EXPORT_FORMATS.MHT)
        );
      const shouldHydrateVirtualized = !isAutoExport || isBackgroundAutoExport;

      if (!exporter) {
        throw new Error("Export engine is not initialized.");
      }

      if (!targetFormats.length) {
        throw new Error("Multi export requires at least one target format selected in Settings.");
      }

      // Pre-warm the hidden background PDF print renderer as soon as PDF is needed.
      // This overlaps renderer initialization with extraction/hydration work.
      const pdfWarmupPromise = targetFormats.includes(EXPORT_FORMATS.PDF)
        ? root.chromeHelpers.runtimeSendMessage({
            type: MSG_WARMUP_PDF_RENDERER,
            payload: { timeoutMs }
          }).catch(() => null)
        : null;

      const processedConversationByMode = new Map();
      let counterSnapshot = null;
      let maxMessageCount = 0;
      let lastFilename = "";
      let sharedHydratedRawConversation = null;
      const generatedFiles = [];
      const writeGeneratedFile = async (file) => {
        if (shouldReturnFiles) {
          generatedFiles.push(file);
          return;
        }

        await sendDirectoryFileInChunks(file);
      };

      if (isMultiExport) {
        const sharedExtractionSettings = needsRichMediaHydration
          ? settingsForRichMediaExport(settings)
          : settings;

        // Multi export hydrates once per click and reuses the same hydrated
        // conversation snapshot for all selected formats.
        sharedHydratedRawConversation = await buildRawConversation(provider, sharedExtractionSettings, {
          hydrateVirtualized: shouldHydrateVirtualized,
          maxHydrationMs: hydrationTimeoutMs
        });
      }

      const getProcessedConversation = async (forceRichMedia, targetFormat) => {
        const isTxtExport = targetFormat === EXPORT_FORMATS.TXT;
        const cacheKey = `${forceRichMedia ? "rich" : "normal"}:${isTxtExport ? "txt" : "visual"}`;
        if (processedConversationByMode.has(cacheKey)) {
          return processedConversationByMode.get(cacheKey);
        }

        const baseExtractionSettings = isTxtExport
          ? settings
          : settingsForVisualExport(settings);
        const extractionSettings = forceRichMedia
          ? settingsForRichMediaExport(baseExtractionSettings)
          : baseExtractionSettings;
        const processedConversation = isMultiExport && sharedHydratedRawConversation
          ? processRawConversation(sharedHydratedRawConversation, extractionSettings, provider)
          : await buildProcessedConversation(provider, extractionSettings, {
            hydrateVirtualized: shouldHydrateVirtualized,
            maxHydrationMs: hydrationTimeoutMs
          });

        if (!processedConversation.messages.length) {
          throw new Error("No exportable messages found in current chat.");
        }

        if (typeof root.storage.reserveExportCounters === "function") {
          try {
            if (!counterSnapshot) {
              counterSnapshot = await root.storage.reserveExportCounters(processedConversation);
            }
            if (counterSnapshot) {
              applyCounterSnapshotToConversation(processedConversation, counterSnapshot);
            }
          } catch (_error) {
            // Keep exporting even if counter persistence fails unexpectedly.
          }
        }

        maxMessageCount = Math.max(maxMessageCount, processedConversation.messages.length);
        processedConversationByMode.set(cacheKey, processedConversation);
        return processedConversation;
      };

      const exportSingleFormat = async (targetFormat) => {
        const shouldForceRichMedia = shouldForceRichMediaForFormat(targetFormat);
        const processedConversation = await getProcessedConversation(shouldForceRichMedia, targetFormat);
        const exportSettings = processedConversation.settings || settings;
        let filename = "";
        let mimeType = "text/plain;charset=utf-8";
        let content = "";
        let htmlDocument = "";

        if (targetFormat === EXPORT_FORMATS.TXT) {
          filename = resolveDownloadFilename(exporter.buildFileName(processedConversation, "txt"), settings);
          root.postProcess.setResolvedFileNameMetadata(processedConversation, filename);
          const formatter = exporter.toIrcText || exporter.toChatText;

          if (typeof formatter !== "function") {
            throw new Error("TXT formatter is not available.");
          }

          content = formatter(processedConversation);
        } else if (targetFormat === EXPORT_FORMATS.HTML) {
          filename = resolveDownloadFilename(exporter.buildFileName(processedConversation, "html"), settings);
          root.postProcess.setResolvedFileNameMetadata(processedConversation, filename);
          htmlDocument = exporter.toHtmlDocument(processedConversation, exportSettings);
          htmlDocument = await inlineImagesInHtmlDocument(htmlDocument);
          content = htmlDocument;
          mimeType = "text/html;charset=utf-8";
        } else if (targetFormat === EXPORT_FORMATS.MHT) {
          filename = resolveDownloadFilename(exporter.buildFileName(processedConversation, "mht"), settings);
          root.postProcess.setResolvedFileNameMetadata(processedConversation, filename);
          htmlDocument = exporter.toHtmlDocument(processedConversation, exportSettings);
          htmlDocument = await inlineImagesInHtmlDocument(htmlDocument);
          content = exporter.toMhtDocument(htmlDocument, processedConversation);
          mimeType = "application/octet-stream";
        } else if (targetFormat === EXPORT_FORMATS.PDF) {
          filename = resolveDownloadFilename(exporter.buildFileName(processedConversation, "pdf"), settings);
          root.postProcess.setResolvedFileNameMetadata(processedConversation, filename);
          htmlDocument = typeof exporter.toPdfDocument === "function"
            ? exporter.toPdfDocument(processedConversation, exportSettings)
            : exporter.toHtmlDocument(processedConversation, exportSettings);
          htmlDocument = await inlineImagesInHtmlDocument(htmlDocument);
        } else if (targetFormat === EXPORT_FORMATS.MD) {
          filename = resolveDownloadFilename(exporter.buildFileName(processedConversation, "md"), settings);
          root.postProcess.setResolvedFileNameMetadata(processedConversation, filename);
          content = typeof exporter.toMarkdownDocument === "function"
            ? exporter.toMarkdownDocument(processedConversation, exportSettings)
            : stripHtmlToText(exporter.toHtmlDocument(processedConversation, exportSettings));
          mimeType = "text/markdown;charset=utf-8";
        } else if (targetFormat === EXPORT_FORMATS.DOCX) {
          filename = resolveDownloadFilename(exporter.buildFileName(processedConversation, "docx"), settings);
          root.postProcess.setResolvedFileNameMetadata(processedConversation, filename);
          htmlDocument = exporter.toHtmlDocument(processedConversation, exportSettings);
          htmlDocument = await inlineImagesInHtmlDocument(htmlDocument);
          const blob = await createDocxBlob(processedConversation, htmlDocument);
          content = await blobToDataUrlLocal(blob);
          mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } else if (targetFormat === EXPORT_FORMATS.XLSX) {
          filename = resolveDownloadFilename(exporter.buildFileName(processedConversation, "xlsx"), settings);
          root.postProcess.setResolvedFileNameMetadata(processedConversation, filename);
          const blob = await createXlsxBlob(processedConversation);
          content = await blobToDataUrlLocal(blob);
          mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        } else if (targetFormat === EXPORT_FORMATS.PNG) {
          filename = resolveDownloadFilename(exporter.buildFileName(processedConversation, "png"), settings);
          root.postProcess.setResolvedFileNameMetadata(processedConversation, filename);
          htmlDocument = exporter.toHtmlDocument(processedConversation, exportSettings);
          htmlDocument = await inlineImagesInHtmlDocument(htmlDocument);
          content = await createPngDataUrlFromHtml(htmlDocument, processedConversation);
          mimeType = "image/png";
        } else {
          throw new Error("Unsupported format: " + targetFormat);
        }

        if (isSilentAutoExport) {
          filename = resolveAutoFilename(settings, provider, processedConversation, targetFormat, filename);
        }

        if (shouldWriteDirectory) {
          if (targetFormat === EXPORT_FORMATS.PDF) {
            if (pdfWarmupPromise) {
              await Promise.resolve(pdfWarmupPromise).catch(() => null);
            }

            const response = await withTimeout(
              root.chromeHelpers.runtimeSendMessage({
                type: MSG_RENDER_HTML_TO_PDF,
                payload: {
                  filename,
                  html: htmlDocument,
                  writeToDirectory: !shouldReturnFiles,
                  returnDataUrl: shouldReturnFiles,
                  timeoutMs
                }
              }),
              timeoutMs + 1000,
              `The PDF export exceeded the ${settings.exportTimeoutSeconds}s timeout.`
            );

            if (!response || !response.ok || (shouldReturnFiles && !response.dataUrl)) {
              throw new Error(response?.error || "Unknown PDF render error.");
            }

            if (shouldReturnFiles) {
              await writeGeneratedFile({
                filename: filenameBasename(filename),
                mimeType: "application/pdf",
                dataUrl: response.dataUrl
              });
            }
          } else {
            await writeGeneratedFile({
              filename: filenameBasename(filename),
              mimeType,
              content: targetFormat === EXPORT_FORMATS.DOCX || targetFormat === EXPORT_FORMATS.XLSX || targetFormat === EXPORT_FORMATS.PNG ? "" : content,
              dataUrl: targetFormat === EXPORT_FORMATS.DOCX || targetFormat === EXPORT_FORMATS.XLSX || targetFormat === EXPORT_FORMATS.PNG ? content : ""
            });
          }
        } else if (targetFormat === EXPORT_FORMATS.PDF) {
          if (pdfWarmupPromise) {
            await Promise.resolve(pdfWarmupPromise).catch(() => null);
          }

          const response = await withTimeout(
            root.chromeHelpers.runtimeSendMessage({
              type: MSG_RENDER_HTML_TO_PDF,
              payload: {
                filename,
                html: htmlDocument,
                saveAs: (isAutoExport || isBackgroundAutoExport) ? false : shouldAskForDownloadLocation(settings),
                conflictAction: (isAutoExport || isBackgroundAutoExport) ? "overwrite" : settings.autosaveConflictAction,
                mode: (isAutoExport || isBackgroundAutoExport) ? "auto" : "manual",
                timeoutMs
              }
            }),
            timeoutMs + 1000,
            `The PDF export exceeded the ${settings.exportTimeoutSeconds}s timeout.`
          );

          if (!response || !response.ok) {
            throw new Error(response?.error || "Unknown PDF render error.");
          }
        } else {
          await withTimeout(
            requestFileDownload({
              filename,
              mimeType,
              content: targetFormat === EXPORT_FORMATS.DOCX || targetFormat === EXPORT_FORMATS.XLSX || targetFormat === EXPORT_FORMATS.PNG ? "" : content,
              dataUrl: targetFormat === EXPORT_FORMATS.DOCX || targetFormat === EXPORT_FORMATS.XLSX || targetFormat === EXPORT_FORMATS.PNG ? content : "",
              saveAs: (isAutoExport || isBackgroundAutoExport) ? false : shouldAskForDownloadLocation(settings),
              conflictAction: (isAutoExport || isBackgroundAutoExport) ? "overwrite" : settings.autosaveConflictAction,
              mode: (isAutoExport || isBackgroundAutoExport) ? "auto" : "manual"
            }),
            timeoutMs,
            `The ${targetFormat.toUpperCase()} export exceeded the ${settings.exportTimeoutSeconds}s timeout.`
          );
        }

        markExportSuccess(
          provider,
          targetFormat,
          liveMessageCountBeforeExport > 0 ? liveMessageCountBeforeExport : processedConversation.messages.length
        );
        if (!isSilentAutoExport) {
          await rememberExportFilename(settings, provider, processedConversation, targetFormat, filename);
        }
        lastFilename = filename || lastFilename;
      };

      for (const targetFormat of targetFormats) {
        await exportSingleFormat(targetFormat);
      }

      if (
        requestedFormat !== EXPORT_FORMATS.MULTI &&
        !shouldWriteDirectory &&
        settings.mediaHandling === MEDIA_HANDLING.MHT &&
        settings.companionMhtOnMedia &&
        !targetFormats.includes(EXPORT_FORMATS.MHT)
      ) {
        const conversationForCompanion = await getProcessedConversation(true, EXPORT_FORMATS.MHT);
        const companionSettings = conversationForCompanion.settings || settings;
        if (conversationForCompanion.hasMedia) {
          const htmlDoc = await inlineImagesInHtmlDocument(
            exporter.toHtmlDocument(conversationForCompanion, companionSettings)
          );
          const companionFilename = resolveDownloadFilename(
            exporter.buildFileName(conversationForCompanion, "mht"),
            settings
          );
          root.postProcess.setResolvedFileNameMetadata(conversationForCompanion, companionFilename);
          const mhtContent = exporter.toMhtDocument(htmlDoc, conversationForCompanion);

          await withTimeout(
            requestFileDownload({
              filename: companionFilename,
              mimeType: "application/octet-stream",
              content: mhtContent,
              saveAs: shouldAskForDownloadLocation(settings),
              conflictAction: settings.autosaveConflictAction
            }),
            timeoutMs,
            `The companion MHT export exceeded the ${settings.exportTimeoutSeconds}s timeout.`
          );
        }
      }

      if (requestedFormat === EXPORT_FORMATS.MULTI) {
        markExportSuccess(
          provider,
          EXPORT_FORMATS.MULTI,
          liveMessageCountBeforeExport > 0 ? liveMessageCountBeforeExport : maxMessageCount
        );
      }

      const liveMessageCountAfterExport = getLiveMessageCount(provider);
      const exportStates = getExportStates(
        provider,
        liveMessageCountAfterExport > 0 ? liveMessageCountAfterExport : liveMessageCountBeforeExport
      );

      return {
        ok: true,
        format: requestedFormat,
        messageCount: maxMessageCount,
        filename: lastFilename,
        formats: targetFormats,
        files: shouldReturnFiles ? generatedFiles : undefined,
        exportStates
      };
    } catch (error) {
      if (!isSilentAutoExport && String(error?.message || "").includes(HYDRATION_TOP_ERROR_TOKEN)) {
        try {
          window.alert("Export failed: could not load the full chat history. Scroll to the beginning and try again.");
        } catch (_alertError) {
          // Ignore alert failures in restricted contexts.
        }
      }

      throw new Error(normalizeExportErrorMessage(error));
    } finally {
      exportInProgress = false;
      if (!isAutoExport) {
        scheduleInlineUiRefresh();
      }
    }
  }

  function notionTextChunks(value) {
    const text = stripHtmlToText(String(value || "")).trim();
    if (!text) return [""];
    const chunks = [];
    for (let index = 0; index < text.length; index += 1900) chunks.push(text.slice(index, index + 1900));
    return chunks;
  }

  function notionRichText(content, link) {
    const text = { content: String(content || "").slice(0, 2000) };
    if (link) text.link = { url: String(link).slice(0, 2000) };
    return [{ type: "text", text }];
  }

  function conversationToNotionBlocks(conversation) {
    const blocks = [];
    const sourceUrl = String(conversation?.url || conversation?.sourceUrl || location.href || "");
    if (sourceUrl) blocks.push({ object: "block", type: "bookmark", bookmark: { url: sourceUrl.slice(0, 2000) } });
    blocks.push({ object: "block", type: "callout", callout: { icon: { type: "emoji", emoji: "🤖" }, rich_text: notionRichText(`Source: ${conversation?.providerName || conversation?.provider || "AI chat"}\nExported: ${new Date().toLocaleString()}`) } });
    (conversation?.messages || []).forEach((message) => {
      const role = String(message?.role || "assistant").toLowerCase();
      const label = role === "human" || role === "user" ? "You" : "AI";
      blocks.push({ object: "block", type: "heading_2", heading_2: { rich_text: notionRichText(label) } });
      const raw = message?.markdown || message?.text || message?.content || message?.html || "";
      notionTextChunks(raw).forEach((chunk) => blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: notionRichText(chunk) } }));
      const code = message?.code || message?.codeText;
      if (code) notionTextChunks(code).forEach((chunk) => blocks.push({ object: "block", type: "code", code: { language: "plain text", rich_text: notionRichText(chunk) } }));
    });
    return blocks;
  }

  async function exportCurrentChatToNotion() {
    const provider = getActiveProvider();
    if (!provider || !isProviderReadyForExport()) throw new Error("No active chat detected on this page.");
    if (exportInProgress) throw new Error("An export is already in progress.");
    exportInProgress = true;
    try {
      const settings = await root.storage.getSettings();
      if (!settings.notionTarget?.id) throw new Error("Choose a Notion destination in ExportAI Settings first.");
      await assertAllowedFormatsForMembership([EXPORT_FORMATS.MD]);
      const conversation = await buildProcessedConversation(provider, settingsForVisualExport(settings), { hydrateVirtualized: true, maxHydrationMs: resolveHydrationTimeoutMs(settings) });
      if (!conversation.messages.length) throw new Error("No exportable messages found in current chat.");
      const title = conversation.chatName || conversation.title || conversation.summary?.chatName || document.title || "AI conversation";
      const signature = `${location.href}|${conversation.messages.length}|${String(conversation.messages.at(-1)?.text || conversation.messages.at(-1)?.content || "").slice(-80)}`;
      const requestId = Array.from(new TextEncoder().encode(signature)).reduce((hash, value) => ((hash * 31) + value) >>> 0, 0).toString(16);
      const response = await root.chromeHelpers.runtimeSendMessage({ type: MSG_NOTION_CREATE_PAGE, payload: { target: settings.notionTarget, title, requestId, blocks: conversationToNotionBlocks(conversation) } });
      if (!response?.ok) throw new Error(response?.error || "Notion export failed.");
      return response;
    } finally {
      exportInProgress = false;
      scheduleInlineUiRefresh();
    }
  }

  async function getChatStatus() {
    const provider = getActiveProvider();

    if (!provider) {
      return {
        supported: false,
        providerId: null,
        providerName: null,
        isChatPage: false,
        messageCount: 0,
        exportStates: {}
      };
    }

    const isChatPage = Boolean(provider.isChatPage());
    const messageCount = isChatPage ? 1 : 0;
    const settings = await getCachedSettingsForPopupStatus();
    const summary = isChatPage
      ? await buildPopupStatusSummary(provider, settings, messageCount)
      : null;

    return {
      supported: true,
      providerId: provider.id,
      providerName: provider.displayName,
      isChatPage,
      messageCount,
      summary,
      exportStates: getExportStates(provider, messageCount)
    };
  }

  function setupRuntimeListener() {
    if (!globalThis.chrome?.runtime?.onMessage?.addListener) {
      return;
    }

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!message || typeof message !== "object") {
        return false;
      }

      if (message.type === MSG_GET_CHAT_STATUS) {
        getChatStatus()
          .then((status) => sendResponse(status))
          .catch((error) => sendResponse({
            supported: false,
            error: error.message
          }));
        return true;
      }

      if (message.type === MSG_EXPORT_CHAT) {
        exportCurrentChat(message.payload?.format, {
          formats: message.payload?.formats,
          mode: message.payload?.mode,
          output: message.payload?.output
        })
          .then((result) => sendResponse({ ok: true, result }))
          .catch((error) => sendResponse({ ok: false, error: error.message }));

        return true;
      }

      if (message.type === MSG_EXPORT_NOTION) {
        exportCurrentChatToNotion().then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
        return true;
      }

      if (message.type === MSG_GET_INTEGRATION_STATUS) {
        getIntegrationStatus()
          .then((status) => sendResponse(status))
          .catch((error) => sendResponse({
            ok: false,
            visible: false,
            reason: "diagnostics_error",
            error: error.message,
            lastStatus: lastIntegrationStatus
          }));
        return true;
      }

      if (message.type === MSG_DEBUG_MEDIA_EXTRACTION) {
        const provider = getActiveProvider();
        const debug = provider && typeof provider.debugMediaExtraction === "function"
          ? provider.debugMediaExtraction()
          : { error: "No provider debugMediaExtraction available." };
        sendResponse({ ok: true, providerId: provider?.id || null, debug });
        return true;
      }

      return false;
    });
  }

  function setupStorageListener() {
    if (!globalThis.chrome?.storage?.onChanged?.addListener) {
      return;
    }

    chrome.storage.onChanged.addListener((_changes, areaName) => {
      if (areaName === "local") {
        cachedInlineUiSettings = null;
        scheduleInlineUiRefresh();
        scheduleAutoExportCheck();
      }
    });
  }

  function setupDomObserver() {
    if (domObserver || !document.documentElement) {
      return;
    }

    domObserver = new MutationObserver(() => {
      scheduleInlineUiRefresh();
      scheduleAutoExportCheck();
    });

    domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    window.addEventListener("popstate", () => {
      scheduleInlineUiRefresh();
      scheduleAutoExportCheck();
    });
    window.addEventListener("focus", () => {
      scheduleInlineUiRefresh();
      scheduleAutoExportCheck();
    });
  }

  function bootstrap() {
    resolveProvider();
    setupRuntimeListener();
    setupStorageListener();
    setupDomObserver();
    scheduleInlineUiRefresh();
    scheduleAutoExportCheck(2500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
