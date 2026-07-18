# ExportAI Store Listing Copy (English)

## Extension name
ExportAI - AI Conversation Exporter

## Short description
Export complete AI conversations in 8 formats or send them directly to Notion.

## Full description
ExportAI is a browser extension for saving and organizing complete AI chat records. Export conversations as common file types or send them directly to an authorized Notion page for knowledge archives, project records, research, and team handoff.

Key features:
- Export as TXT, PDF, MHT, HTML, MD, DOCX, XLSX, or PNG.
- Select multiple formats in the popup and generate them in one action.
- Preserve code blocks, lists, tables, math, images, and attachment-related content where supported.
- Works with ChatGPT, Claude, Gemini, Grok, DeepSeek, Doubao, Qwen, Zhipu, Kimi, MiniMax, and other listed AI chat pages.
- Sign in, view account status, and connect Notion inside the main extension popup.
- Browse authorized Notion pages by hierarchy and select any available page or database as the destination.
- Free accounts can send to Notion 3 times per day; active members have unlimited Notion sends.
- Export processing happens primarily in the browser. ExportAI does not store the body of your conversations.

Privacy note:
The account server is used for login, membership status, the free Notion quota, and settings sync. It does not store exported chat content. Notion content is sent directly from the browser to the user's authorized Notion workspace. Make sure you have permission to save the conversations you export.

## Search terms
AI conversation export, chat archive, conversation backup, Notion

## Permission notes
- activeTab/tabs: detect the current supported AI chat page and read exportable conversation content.
- storage: save login state, membership status, settings, Notion connection data, and export preferences.
- downloads: save generated files through the browser download flow.
- pageCapture/debugger: generate exports that require page rendering or capture.
- identity: complete Google sign-in and authorization callbacks.
- alarms: run extension-internal scheduled tasks.
- host permissions: limited to supported AI platforms, the ExportAI website, the Notion API, and login synchronization.
