const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'web', 'src');
const files = [
  'components/Hero.tsx',
  'components/Features.tsx',
  'components/FAQ.tsx',
  'components/Testimonials.tsx',
  'components/Footer.tsx',
  'app/page.tsx',
];

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert(source.includes('useLanguage'), `${file} should read the shared language state`);
}

const checks = {
  'components/Hero.tsx': ['Export AI conversations in one click', 'Install Chrome extension', 'Install Edge Add-on', 'Export formats'],
  'components/Features.tsx': ['Product focus', 'Built for real export workflows', 'Preserve images and rich text'],
  'components/FAQ.tsx': ['Frequently asked questions', 'Which AI platforms does ExportAI support?'],
  'components/Testimonials.tsx': ['Use cases', 'Product manager', 'Save AI output for the long term'],
  'components/Footer.tsx': ['Product', 'Account', 'Privacy policy'],
  'app/page.tsx': ['Start exporting your AI conversations', 'View pricing'],
};

for (const [file, expectedTexts] of Object.entries(checks)) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const text of expectedTexts) {
    assert(source.includes(text), `${file} should include English text: ${text}`);
  }
}

console.log('web homepage i18n regression passed');
