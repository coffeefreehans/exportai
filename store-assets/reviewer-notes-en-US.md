# Chrome Web Store reviewer notes — ExportAI 2.0.12

## Reviewer account

- Email: `test@exportai.com`
- Password: `Test1234!`
- Plan: Annual membership (ACTIVE)

## Sign-in steps

1. Open the ExportAI popup.
2. Click the account icon in the upper-right corner.
3. Enter the reviewer email and password above, then click **Sign in**.
4. The account panel should show **Annual member**.

## Export test

1. Open a supported AI conversation page, such as ChatGPT.
2. Open ExportAI.
3. Select one or more of the 8 formats: TXT, PDF, MHT, HTML, MD, DOCX, XLSX, or PNG.
4. Click **Export** to download the selected files.

## Notion test

1. Click **Send to Notion** in the main popup.
2. Click **Continue with Google** or use the reviewer account above.
3. Complete the official Notion OAuth flow using the reviewer's own Notion workspace.
4. Select any page/database made available during Notion authorization.
5. Return to a supported AI conversation and click **Send to Notion** again.

The reviewer account is an active member and therefore has unlimited Notion sends. Free accounts are limited to 3 successful Notion sends per calendar day (Asia/Shanghai reset). ExportAI does not store the conversation body; content is sent directly from the browser to the user's authorized Notion workspace.

## Main permissions

- `activeTab` / `tabs`: detect supported AI chat pages and read the active conversation for export.
- `downloads`: save generated export files.
- `storage`: store settings, login state, membership status, and Notion connection data.
- `identity`: Google sign-in and OAuth callbacks.
- `pageCapture` / `debugger`: generate export formats that require rendered-page capture.
- `alarms`: extension-internal scheduled work.
- Host permissions: supported AI sites, `exportai.nexscp.com`, and `api.notion.com` only.
