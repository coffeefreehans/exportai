const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const popupHtml = fs.readFileSync(path.join(root, 'src/popup/popup.html'), 'utf8');
const popupJs = fs.readFileSync(path.join(root, 'src/popup/popup.js'), 'utf8');
const optionsHtml = fs.readFileSync(path.join(root, 'src/options/options.html'), 'utf8');

const requiredPopupIds = [
  'accountText', 'loginButton', 'openOptions', 'loginPanel', 'popupLoginForm',
  'popupLoginEmail', 'popupLoginPassword', 'popupLoginSubmit', 'popupGoogleLogin',
  'popupForgotPassword', 'popupRegisterLink',
  'status', 'statusText', 'statusAction', 'summary', 'summaryProvider',
  'summaryChatName', 'exportPanel', 'formatOptions', 'exportButton', 'notionButton'
];

const requiredOptionsIds = [
  'status', 'accountEmail', 'accountPlan', 'loginButton', 'logoutButton',
  'settingsForm', 'tab-general', 'tab-export', 'tab-files', 'tab-integration',
  'panel-general', 'appTheme', 'appLanguage', 'includeThinking',
  'includeThinkingDuration', 'includeMessageTime', 'showUserAttachmentNames',
  'showAssistantUserAttachmentReferences', 'showAssistantGeneratedAttachmentReferences',
  'showAssistantWebReferences', 'panel-export', 'humanName', 'aiCustomName',
  'textFormatting', 'multilineFormat', 'metadataEnabled', 'includeExportTitle',
  'metadataExportedAt', 'metadataModel', 'metadataUrl', 'metadataSummaryChatName',
  'metadataSummaryMessages', 'panel-files', 'customDownloadFolder',
  'autosaveConflictAction', 'panel-integration', 'notionStatus',
  'notionStatusText', 'notionConnect', 'notionDisconnect', 'notionTarget',
  'showHeaderExportButton', 'integrationFormats', 'autoExportSettings',
  'autoExportEnabled', 'autoExportMode', 'autoExportIntervalSeconds', 'autoExportFormats'
];

requiredPopupIds.forEach((id) => assert(popupHtml.includes(`id="${id}"`), `Popup control missing: ${id}`));
requiredOptionsIds.forEach((id) => assert(optionsHtml.includes(`id="${id}"`), `Settings control missing: ${id}`));

['TXT', 'PDF', 'MHT', 'HTML', 'MD', 'DOCX', 'XLSX', 'PNG'].forEach((format) => {
  assert(popupJs.includes(`"${format}"`), `Popup format missing: ${format}`);
});

assert(popupJs.includes('MSG_EXPORT_CHAT'), 'Local export action must remain connected.');
assert(popupJs.includes('MSG_EXPORT_NOTION'), 'Notion export action must remain connected.');
assert(popupJs.includes('openOptionsPage'), 'Settings entry and Notion setup entry must remain connected.');

console.log('ui control preservation regression passed');
