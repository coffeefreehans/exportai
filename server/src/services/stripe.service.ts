import Stripe from 'stripe';
import { env } from '../config/env';

/**
 * Stripe SDK client instance.
 */
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

function isPlaceholder(value: string): boolean {
  return value.toLowerCase().includes('placeholder');
}

function hasExpectedPrefix(value: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => value.startsWith(prefix));
}

function collectStripeConfigErrors(): string[] {
  const checks = [
    {
      name: 'STRIPE_SECRET_KEY',
      value: env.STRIPE_SECRET_KEY,
      prefixes: ['sk_test_', 'sk_live_'],
    },
    {
      name: 'STRIPE_WEBHOOK_SECRET',
      value: env.STRIPE_WEBHOOK_SECRET,
      prefixes: ['whsec_'],
    },
    {
      name: 'STRIPE_PRICE_MONTHLY',
      value: env.STRIPE_PRICE_MONTHLY,
      prefixes: ['price_'],
    },
    {
      name: 'STRIPE_PRICE_YEARLY',
      value: env.STRIPE_PRICE_YEARLY,
      prefixes: ['price_'],
    },
    {
      name: 'STRIPE_PRICE_LIFETIME',
      value: env.STRIPE_PRICE_LIFETIME,
      prefixes: ['price_'],
    },
  ];

  return checks
    .filter((check) => isPlaceholder(check.value) || !hasExpectedPrefix(check.value, check.prefixes))
    .map((check) => check.name);
}

/**
 * StripeService — encapsulates all Stripe API interactions.
 */
export const StripeService = {
  /**
   * Check whether Stripe environment variables look usable.
   */
  isStripeConfigured(): { ok: boolean; missing: string[] } {
    const missing = collectStripeConfigErrors();
    return { ok: missing.length === 0, missing };
  },

  /**
   * Create a subscription checkout session (recurring).
   */
  createSubscriptionCheckout(
    priceId: string,
    customerId: string,
    successUrl: string,
    cancelUrl: string,
    planType: string
  ): Promise<Stripe.Checkout.Session> {
    return stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { planType },
    });
  },

  /**
   * Create a one-time payment checkout session.
   */
  createPaymentCheckout(
    priceId: string,
    customerId: string,
    successUrl: string,
    cancelUrl: string,
    planType: string
  ): Promise<Stripe.Checkout.Session> {
    return stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { planType },
    });
  },

  /**
   * Retrieve a Checkout Session from Stripe after success redirect.
   */
  retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'payment_intent'],
    });
  },

  /**
   * Create a Stripe customer.
   */
  createCustomer(email: string): Promise<Stripe.Customer> {
    return stripe.customers.create({ email });
  },

  /**
   * Create a billing portal session for the customer.
   */
  createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  },

  /**
   * Verify a Stripe webhook signature.
   * Returns the parsed event or throws on failure.
   */
  verifyWebhookSignature(payload: string | Buffer, sig: string): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  },
};
