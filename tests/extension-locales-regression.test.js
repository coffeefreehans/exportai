const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

assert.strictEqual(manifest.default_locale, 'en', 'manifest must declare default locale');
assert.strictEqual(manifest.name, '__MSG_extensionName__', 'manifest name must use localized message');
assert.strictEqual(
  manifest.description,
  '__MSG_extensionDescription__',
  'manifest description must use localized message',
);

for (const locale of ['en', 'zh_CN']) {
  const messagesPath = path.join(root, '_locales', locale, 'messages.json');
  assert(fs.existsSync(messagesPath), `${locale} messages.json must exist`);
  const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
  assert(messages.extensionName?.message, `${locale} extensionName must be present`);
  assert(messages.extensionDescription?.message, `${locale} extensionDescription must be present`);
}

console.log('extension locales regression passed');
