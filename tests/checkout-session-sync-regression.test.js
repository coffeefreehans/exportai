const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const stripeService = fs.readFileSync(path.join(root, 'server', 'src', 'services', 'stripe.service.ts'), 'utf8');
const membershipService = fs.readFileSync(path.join(root, 'server', 'src', 'services', 'membership.service.ts'), 'utf8');
const membershipRoute = fs.readFileSync(path.join(root, 'server', 'src', 'routes', 'membership.ts'), 'utf8');
const accountPage = fs.readFileSync(path.join(root, 'web', 'src', 'app', 'account', 'page.tsx'), 'utf8');
const api = fs.readFileSync(path.join(root, 'web', 'src', 'lib', 'api.ts'), 'utf8');

assert(
  stripeService.includes('retrieveCheckoutSession') && stripeService.includes('expand'),
  'StripeService should retrieve checkout sessions with expanded subscription/payment intent data'
);
assert(
  membershipService.includes('syncCheckoutSession') && membershipService.includes("session.payment_status !== 'paid'"),
  'MembershipService should verify Checkout Session payment status before activating membership'
);
assert(
  membershipRoute.includes("router.post('/sync-checkout-session'"),
  'membership routes should expose an authenticated sync-checkout-session endpoint'
);
assert(
  api.includes('syncCheckoutSession') && api.includes('/api/membership/sync-checkout-session'),
  'web API client should call sync-checkout-session endpoint'
);
assert(
  accountPage.includes('syncCheckoutSession') && accountPage.includes("searchParams.get('session_id')"),
  'account page should sync the checkout session after payment success return'
);

console.log('checkout session sync regression passed');
