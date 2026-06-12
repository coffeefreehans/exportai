const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const popup = fs.readFileSync(path.join(root, 'src', 'popup', 'popup.js'), 'utf8');
const options = fs.readFileSync(path.join(root, 'src', 'options', 'options.js'), 'utf8');
const background = fs.readFileSync(path.join(root, 'src', 'background', 'background.js'), 'utf8');
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

assert(popup.includes('const WEB_URL = "https://exportai.followaigc.com";'), 'popup should open the production web account/pricing URL');
assert(options.includes('const WEB_URL = "https://exportai.followaigc.com";'), 'options should open the production web account URL');
assert(background.includes('const API_BASE = "https://exportai.followaigc.com";'), 'background API calls should use the production API origin');
assert(compose.includes('WEB_URL=${WEB_URL:-https://exportai.followaigc.com}'), 'release compose should default to the production web URL');

assert(manifest.host_permissions.includes('https://exportai.followaigc.com/*'), 'manifest should allow production API host permissions');
assert(
  manifest.content_scripts.some((script) =>
    script.js.includes('src/shared/web-auth-bridge.js') &&
    script.matches.includes('https://exportai.followaigc.com/*')
  ),
  'web auth bridge should run on the production web app'
);

console.log('production extension endpoints regression passed');
