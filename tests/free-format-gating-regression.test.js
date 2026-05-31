const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const popup = fs.readFileSync(path.join(root, 'src', 'popup', 'popup.js'), 'utf8');
const popupCss = fs.readFileSync(path.join(root, 'src', 'popup', 'popup.css'), 'utf8');
const content = fs.readFileSync(path.join(root, 'src', 'content', 'content.js'), 'utf8');
const floating = fs.readFileSync(path.join(root, 'src', 'content', 'ui-export-button.js'), 'utf8');
const pricing = fs.readFileSync(path.join(root, 'web', 'src', 'components', 'Pricing.tsx'), 'utf8');
const faq = fs.readFileSync(path.join(root, 'web', 'src', 'components', 'FAQ.tsx'), 'utf8');
const hero = fs.readFileSync(path.join(root, 'web', 'src', 'components', 'Hero.tsx'), 'utf8');

assert(
  popup.indexOf('[EXPORT_FORMATS.TXT, "TXT"]') < popup.indexOf('[EXPORT_FORMATS.PDF, "PDF"]'),
  'popup format order should place TXT before PDF'
);
assert(
  popup.includes('FREE_EXPORT_FORMATS') && popup.includes('isFormatAllowedForMembership'),
  'popup should define free format gating helpers'
);
assert(
  popup.includes('data-paid-only="true"') && popup.includes('openUrl(`${WEB_URL}/#pricing`)'),
  'popup should make paid-only formats clickable and route free users to pricing'
);
assert(
  popup.includes('is-locked') && popupCss.includes('format-option.is-locked'),
  'popup should visibly lock paid-only formats for free users'
);
assert(
  popup.includes('lock-mark') && popupCss.includes('.lock-mark'),
  'locked popup formats should show a lock marker'
);
assert(
  !popup.includes(' disabled"'),
  'paid-only popup format inputs should not be disabled because clicks must open pricing'
);
assert(
  content.includes('FREE_EXPORT_FORMATS') && content.includes('assertAllowedFormatsForMembership'),
  'content export entry should enforce free format gating'
);
assert(
  floating.includes('const ALL_FORMATS = ["txt", "pdf"'),
  'floating export format order should place TXT first'
);
assert(
  pricing.includes('TXT/PDF') && pricing.includes('TXT and PDF'),
  'pricing copy should describe free TXT/PDF limitation in both languages'
);
assert(
  faq.includes('TXT 和 PDF') && faq.includes('TXT and PDF'),
  'FAQ copy should describe free TXT/PDF limitation in both languages'
);
assert(
  hero.includes("const formats = ['TXT', 'PDF'"),
  'homepage hero format preview should place TXT first'
);

console.log('free format gating regression passed');
