const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const api = fs.readFileSync(path.join(root, 'web', 'src', 'lib', 'api.ts'), 'utf8');
const bridge = fs.readFileSync(path.join(root, 'src', 'shared', 'web-auth-bridge.js'), 'utf8');

assert(
  api.includes("exportai_auth_logout_at") && api.includes("c.storage.local.remove(['exportai_auth_logout_at'])"),
  'web login/register sync must clear stale chrome logout marker'
);
assert(
  bridge.includes('hasLocalAuth()') && bridge.includes('syncLocalToChrome("login-present")'),
  'web auth bridge initial logout handling must not clear fresh local auth'
);
assert(
  bridge.includes('changes[AUTH_LOGOUT_KEY]?.newValue') && bridge.includes('if (hasLocalAuth())'),
  'web auth bridge remote logout handling must ignore stale logout marker when local auth exists'
);

console.log('auth logout marker regression passed');
