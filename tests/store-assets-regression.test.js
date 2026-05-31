const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function pngSize(file) {
  const buffer = fs.readFileSync(file);
  assert.strictEqual(buffer.toString('ascii', 1, 4), 'PNG', `${file} must be a PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function assertPng(file, width, height) {
  assert(fs.existsSync(file), `${file} must exist`);
  const size = pngSize(file);
  assert.deepStrictEqual(size, { width, height }, `${file} must be ${width}x${height}`);
  assert(fs.statSync(file).size > 500, `${file} must not be empty`);
}

assertPng(path.join(root, 'icons', 'icon16.png'), 16, 16);
assertPng(path.join(root, 'icons', 'icon48.png'), 48, 48);
assertPng(path.join(root, 'icons', 'icon128.png'), 128, 128);
assertPng(path.join(root, 'store-assets', 'icons', 'chrome-icon-128.png'), 128, 128);
assertPng(path.join(root, 'store-assets', 'icons', 'edge-logo-300.png'), 300, 300);
assertPng(path.join(root, 'store-assets', 'icons', 'exportai-icon-512.png'), 512, 512);
assertPng(path.join(root, 'store-assets', 'promo', 'chrome-small-promo-440x280.png'), 440, 280);
assertPng(path.join(root, 'store-assets', 'promo', 'edge-small-promo-440x280.png'), 440, 280);
assertPng(path.join(root, 'store-assets', 'promo', 'chrome-marquee-1400x560.png'), 1400, 560);
assertPng(path.join(root, 'store-assets', 'promo', 'edge-large-promo-1400x560.png'), 1400, 560);

for (const locale of ['en-US', 'zh-CN']) {
  for (const name of [
    '01-popup-export-1280x800.png',
    '02-formats-1280x800.png',
    '03-floating-panel-1280x800.png',
  ]) {
    assertPng(path.join(root, 'store-assets', 'screenshots', locale, name), 1280, 800);
  }
}

const zh = fs.readFileSync(path.join(root, 'store-assets', 'listing', 'zh-CN.md'), 'utf8');
const en = fs.readFileSync(path.join(root, 'store-assets', 'listing', 'en-US.md'), 'utf8');
assert(zh.includes('ExportAI - AI 对话导出助手'), 'Chinese listing copy must include localized extension name');
assert(en.includes('ExportAI - AI Conversation Exporter'), 'English listing copy must include localized extension name');
assert(zh.includes('权限说明') && en.includes('Permission notes'), 'listing copy must include permission notes in both languages');

console.log('store assets regression passed');
