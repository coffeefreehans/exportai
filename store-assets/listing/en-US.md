# ExportAI Store Listing Copy (English)

## Extension name
ExportAI - AI Conversation Exporter

## Short description
Save complete AI conversations as files or send them to your Notion workspace.

## Full description
ExportAI helps you save and organize complete conversations from supported AI chat websites. Open a conversation, choose the type of copy you need, and create one or several files from the extension popup.

The extension can produce readable documents, web archives, spreadsheets, and image-based copies. It aims to preserve the conversation structure, including code blocks, lists, tables, formulas, images, and attachment-related content when the source page makes that content available.

You can also connect your own Notion workspace from the main popup. After authorization, browse the available page hierarchy and choose a page or database as the destination. Free accounts may send up to three conversations to Notion each day; active members do not have a daily Notion sending limit.

Exports are started by the user and processed primarily in the browser. The ExportAI account service is used for sign-in, membership status, the free Notion allowance, and settings synchronization. It does not store the body of exported conversations. Content sent to Notion goes directly from the browser to the user's authorized workspace.

Only save conversations that you have permission to retain.

## Search terms
conversation export, Notion archive

## Permission notes
- activeTab/tabs: detect the current supported AI chat page and read exportable conversation content.
- storage: save login state, membership status, settings, Notion connection data, and export preferences.
- downloads: save generated files through the browser download flow.
- pageCapture/debugger: generate exports that require page rendering or capture.
- identity: complete Google sign-in and authorization callbacks.
- alarms: run extension-internal scheduled tasks.
- host permissions: limited to supported AI platforms, the ExportAI website, the Notion API, and login synchronization.
