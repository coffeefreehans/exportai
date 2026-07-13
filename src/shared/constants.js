/*
 * Constantes compartidas para mantener contratos estables entre módulos.
 */
(() => {
  const root = globalThis.ChatExportAi;

  root.constants = {
    // Clave única para guardar configuración persistente.
    SETTINGS_STORAGE_KEY: "chatExportAi.settings.v1",
    // Tracks which settings were manually changed by the user.
    SETTINGS_MANUAL_KEYS_STORAGE_KEY: "chatExportAi.settings.manualKeys.v1",
    // Dedicated storage bucket for filename/export counters.
    COUNTERS_STORAGE_KEY: "chatExportAi.counters.v1",

    // Hard cap for export timeout while the PDF pipeline is still conservative.
    MAX_EXPORT_TIMEOUT_SECONDS: 20,

    // Contrato de mensajes entre content/popup/background.
    MSG_DOWNLOAD_FILE: "CHAT_EXPORT_AI_DOWNLOAD_FILE",
    MSG_RENDER_HTML_TO_PDF: "CHAT_EXPORT_AI_RENDER_HTML_TO_PDF",
    MSG_WARMUP_PDF_RENDERER: "CHAT_EXPORT_AI_WARMUP_PDF_RENDERER",
    MSG_CAPTURE_TAB_MHTML: "CHAT_EXPORT_AI_CAPTURE_TAB_MHTML",
    MSG_GET_CHAT_STATUS: "CHAT_EXPORT_AI_GET_CHAT_STATUS",
    MSG_EXPORT_CHAT: "CHAT_EXPORT_AI_EXPORT_CHAT",
    MSG_EXPORT_NOTION: "CHAT_EXPORT_AI_EXPORT_NOTION",
    MSG_NOTION_CONNECT: "EXPORTAI_NOTION_CONNECT",
    MSG_NOTION_DISCONNECT: "EXPORTAI_NOTION_DISCONNECT",
    MSG_NOTION_STATUS: "EXPORTAI_NOTION_STATUS",
    MSG_NOTION_TARGETS: "EXPORTAI_NOTION_TARGETS",
    MSG_NOTION_CREATE_PAGE: "EXPORTAI_NOTION_CREATE_PAGE",
    MSG_ACCOUNT_LOGIN: "EXPORTAI_ACCOUNT_LOGIN",
    MSG_AUTO_EXPORT_CHAT: "CHAT_EXPORT_AI_AUTO_EXPORT_CHAT",
    MSG_GET_INTEGRATION_STATUS: "EXPORTAI_GET_INTEGRATION_STATUS",
    MSG_SET_ACTION_ICON_THEME: "CHAT_EXPORT_AI_SET_ACTION_ICON_THEME",
    MSG_CHECK_MEMBERSHIP: "CHECK_MEMBERSHIP",
    MSG_GET_ACCOUNT_SETTINGS: "EXPORTAI_GET_ACCOUNT_SETTINGS",
    MSG_SAVE_ACCOUNT_SETTINGS: "EXPORTAI_SAVE_ACCOUNT_SETTINGS",
    MSG_DEBUG_MEDIA_EXTRACTION: "EXPORTAI_DEBUG_MEDIA_EXTRACTION",
    MSG_WRITE_FILES_TO_DIRECTORY: "EXPORTAI_WRITE_FILES_TO_DIRECTORY",
    MSG_WRITE_FILE_TO_DIRECTORY_CHUNK: "EXPORTAI_WRITE_FILE_TO_DIRECTORY_CHUNK",
    PORT_WRITE_DIRECTORY_FILE: "EXPORTAI_WRITE_DIRECTORY_FILE_PORT",

    // Export format contracts shared across content and popup.
    EXPORT_FORMATS: {
      MULTI: "multi",
      PDF: "pdf",
      TXT: "txt",
      HTML: "html",
      MHT: "mht",
      MD: "md",
      DOCX: "docx",
      XLSX: "xlsx",
      PNG: "png"
    },

    // Roles normalizados internos para desacoplar cada proveedor.
    ROLES: {
      HUMAN: "human",
      ASSISTANT: "assistant",
      SYSTEM: "system",
      UNKNOWN: "unknown"
    },

    // Estrategias de formato de texto.
    TEXT_FORMATTING: {
      CLEAN: "clean",
      MARKDOWN: "markdown"
    },

    // How TXT/PDF exports should format continuation lines in multiline messages.
    MULTILINE_FORMAT: {
      TAB: "tab",
      NAME: "name",
      NONE: "none"
    },

    // Shared metadata labels used in all export formats.
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
    },

    // Estilo global para quotes y divisores en el postprocesado común.
    QUOTE_DIVIDER_STYLE: {
      MARKDOWN: "markdown",
      TABULAR: "tabular"
    },

    // Política global para media/elementos no textuales.
    MEDIA_HANDLING: {
      IGNORE: "ignore",
      PLACEHOLDER: "placeholder",
      MHT: "mht"
    },

    // Resolución del nombre mostrado para la IA.
    AI_NAME_MODE: {
      PROVIDER: "provider",
      CUSTOM: "custom"
    },

    // Theme mode for popup/options and extension-owned controls.
    APP_THEME: {
      AUTO: "auto",
      LIGHT: "light",
      DARK: "dark"
    }
  };
})();
