const assert = require('assert');
const fs = require('fs');
const path = require('path');

const pricingPath = path.join(__dirname, '..', 'web', 'src', 'components', 'Pricing.tsx');
const source = fs.readFileSync(pricingPath, 'utf8');

assert(
  source.includes("type PlanType = 'FREE' | 'MONTHLY' | 'YEARLY' | 'LIFETIME'"),
  'pricing plan type should include FREE'
);
assert(
  source.includes("['FREE', 'MONTHLY', 'YEARLY', 'LIFETIME']"),
  'pricing plan order should render FREE before paid plans'
);
assert(source.includes("FREE: '$0'"), 'free plan should show $0');
assert(source.includes("FREE: '免费'"), 'Chinese copy should name the free plan');
assert(source.includes("FREE: 'Free'"), 'English copy should name the free plan');
assert(source.includes('弹窗手动导出'), 'free plan should describe popup manual export in Chinese');
assert(source.includes('Popup manual export'), 'free plan should describe popup manual export in English');
assert(source.includes('当前可用'), 'free plan button should be labeled as available in Chinese');
assert(source.includes('Available now'), 'free plan button should be labeled as available in English');
assert(source.includes('xl:grid-cols-4'), 'pricing grid should support four plan cards');
assert(!source.includes('每天 5 次手动导出'), 'web pricing should not reintroduce daily quota text');

console.log('web pricing free plan regression passed');
