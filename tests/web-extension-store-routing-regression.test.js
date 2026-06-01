const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const routerPath = path.join(root, 'web', 'src', 'lib', 'extension-store.ts');

assert(fs.existsSync(routerPath), 'web app must define a shared extension store router');

const router = fs.readFileSync(routerPath, 'utf8');
const hero = fs.readFileSync(path.join(root, 'web', 'src', 'components', 'Hero.tsx'), 'utf8');
const page = fs.readFileSync(path.join(root, 'web', 'src', 'app', 'page.tsx'), 'utf8');
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');

assert(router.includes('Edg/'), 'router must detect Microsoft Edge user agents');
assert(router.includes('microsoftedge.microsoft.com'), 'router must include an Edge Add-ons URL');
assert(router.includes('chromewebstore.google.com'), 'router must include a Chrome Web Store URL');
assert(router.includes('NEXT_PUBLIC_EDGE_EXTENSION_URL'), 'Edge store URL must be configurable per environment');
assert(router.includes('NEXT_PUBLIC_CHROME_EXTENSION_URL'), 'Chrome store URL must be configurable per environment');
assert(
  router.includes('getBrowserExtensionInstallUrl') && router.includes('getBrowserExtensionInstallTarget'),
  'router must expose browser-aware install URL and target helpers'
);
assert(
  hero.includes('useBrowserExtensionInstallTarget') &&
    hero.includes('installEdge') &&
    hero.includes('installChrome') &&
    !hero.includes('href="https://chromewebstore.google.com"'),
  'Hero install button must use browser-aware store routing and browser-specific text'
);
assert(
  page.includes('useBrowserExtensionInstallTarget') &&
    page.includes('installEdge') &&
    page.includes('installChrome') &&
    !page.includes('href="https://chromewebstore.google.com"'),
  'Homepage CTA install button must use browser-aware store routing and browser-specific text'
);
assert(
  compose.includes('NEXT_PUBLIC_CHROME_EXTENSION_URL') && compose.includes('NEXT_PUBLIC_EDGE_EXTENSION_URL'),
  'Docker web build must pass browser store URLs into Next.js'
);
assert(
  envExample.includes('NEXT_PUBLIC_CHROME_EXTENSION_URL') && envExample.includes('NEXT_PUBLIC_EDGE_EXTENSION_URL'),
  '.env.example must document browser store URL variables'
);

console.log('web extension store routing regression passed');
