const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
const membership = fs.readFileSync(path.join(root, 'server', 'src', 'services', 'membership.service.ts'), 'utf8');
const stripeService = fs.readFileSync(path.join(root, 'server', 'src', 'services', 'stripe.service.ts'), 'utf8');
const envConfig = fs.readFileSync(path.join(root, 'server', 'src', 'config', 'env.ts'), 'utf8');

assert(!compose.includes('sk_test_placeholder'), 'docker compose must not override STRIPE_SECRET_KEY with placeholder');
assert(!compose.includes('whsec_placeholder'), 'docker compose must not override STRIPE_WEBHOOK_SECRET with placeholder');
assert(!compose.includes('price_monthly_placeholder'), 'docker compose must not override monthly price with placeholder');
assert(!compose.includes('price_yearly_placeholder'), 'docker compose must not override yearly price with placeholder');
assert(!compose.includes('price_lifetime_placeholder'), 'docker compose must not override lifetime price with placeholder');

assert(
  membership.includes("status: 'EXPIRED'"),
  'checkout pre-created membership rows must stay non-member until Stripe webhook confirms payment'
);
assert(
  membership.includes('ensureStripeConfigured') && membership.includes('Stripe payment is not configured'),
  'checkout should fail clearly when Stripe keys/prices are placeholders'
);
assert(
  membership.includes("const cancelUrl = `${env.WEB_URL}/#pricing`;"),
  'cancelled Stripe checkout should return to homepage pricing anchor instead of a missing /pricing route'
);
assert(
  membership.includes('current_period_end') && membership.includes('new Date(subscription.current_period_end * 1000)'),
  'subscription webhooks should use Stripe current_period_end when available'
);
assert(
  stripeService.includes('isStripeConfigured') && stripeService.includes('placeholder'),
  'StripeService should expose placeholder-aware configuration checks'
);
assert(
  envConfig.includes('STRIPE_PRICE_MONTHLY') && envConfig.includes('STRIPE_PRICE_LIFETIME'),
  'env validation should keep all Stripe price variables defined'
);

console.log('stripe integration regression passed');
