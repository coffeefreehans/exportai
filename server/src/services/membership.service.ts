import { env } from '../config/env';
import { AppError } from '../utils/errors';
import prisma from '../utils/prisma';
import { StripeService } from './stripe.service';
import { PlanType, MembershipStatus } from '@prisma/client';

/** Price-id → plan-type mapping for subscription look-ups */
const PRICE_PLAN_MAP: Record<string, PlanType> = {
  [env.STRIPE_PRICE_MONTHLY]: 'MONTHLY',
  [env.STRIPE_PRICE_YEARLY]: 'YEARLY',
  [env.STRIPE_PRICE_LIFETIME]: 'LIFETIME',
};

/** Idempotency guard — keeps processed event IDs for 72 h */
const processedEventIds = new Set<string>();
const eventTimestamps = new Map<string, number>(); // eventId → timestamp
const IDEMPOTENCY_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

/** Clean up old event IDs periodically */
function cleanupProcessedEvents(): void {
  const now = Date.now();
  for (const [id, ts] of eventTimestamps) {
    if (now - ts > IDEMPOTENCY_TTL_MS) {
      processedEventIds.delete(id);
      eventTimestamps.delete(id);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupProcessedEvents, 60 * 60 * 1000);

/**
 * Compute expiration date based on plan type.
 */
function computeExpiresAt(planType: PlanType): Date {
  const now = new Date();
  switch (planType) {
    case 'MONTHLY':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'YEARLY':
      now.setFullYear(now.getFullYear() + 1);
      break;
    case 'LIFETIME':
      now.setFullYear(now.getFullYear() + 100);
      break;
  }
  return now;
}

/**
 * Determine if a membership is considered "active" (member).
 * CANCELLED memberships are still active until they expire (current period valid).
 */
function isMemberActive(membership: {
  status: string;
  expiresAt: Date | null;
}): boolean {
  if (membership.status === 'CANCELLED') {
    // Cancelled but still within current billing period — still active
    if (!membership.expiresAt) return true;
    return membership.expiresAt > new Date();
  }
  if (membership.status !== 'ACTIVE') return false;
  if (!membership.expiresAt) return true; // LIFETIME has no real expiry
  return membership.expiresAt > new Date();
}

function ensureStripeConfigured(): void {
  const config = StripeService.isStripeConfigured();
  if (!config.ok) {
    throw new AppError(
      503,
      `Stripe payment is not configured: ${config.missing.join(', ')}`
    );
  }
}

export const MembershipService = {
  /**
   * Get the membership status for a user.
   */
  async getMembership(userId: string) {
    const membership = await prisma.membership.findUnique({
      where: { userId },
    });

    if (!membership) {
      return {
        id: null,
        planType: null,
        status: null,
        expiresAt: null,
        cancelledAt: null,
        isMember: false,
      };
    }

    return {
      id: membership.id,
      planType: membership.planType,
      status: membership.status,
      expiresAt: membership.expiresAt,
      cancelledAt: membership.cancelledAt,
      isMember: isMemberActive(membership),
    };
  },

  /**
   * Create a Stripe Checkout session for the given plan.
   */
  async createCheckoutSession(
    userId: string,
    planType: PlanType,
    userEmail: string
  ) {
    ensureStripeConfigured();

    // 1. Find or create Membership row
    let membership = await prisma.membership.findUnique({ where: { userId } });

    // 2. Check if user already has an active membership
    if (membership && isMemberActive(membership)) {
      throw new AppError(409, '您已有有效会员，无需重复购买');
    }

    // 3. Ensure Stripe customer exists
    let stripeCustomerId = membership?.stripeCustomerId || null;

    if (!stripeCustomerId) {
      const customer = await StripeService.createCustomer(userEmail);
      stripeCustomerId = customer.id;

      // Upsert membership with the new customer ID
      membership = await prisma.membership.upsert({
        where: { userId },
        update: { stripeCustomerId },
        create: {
          userId,
          planType,
          stripeCustomerId,
          status: 'EXPIRED',
        },
      });
    }

    // 4. Determine price ID and checkout mode
    let priceId: string;
    let isSubscription: boolean;

    switch (planType) {
      case 'MONTHLY':
        priceId = env.STRIPE_PRICE_MONTHLY;
        isSubscription = true;
        break;
      case 'YEARLY':
        priceId = env.STRIPE_PRICE_YEARLY;
        isSubscription = true;
        break;
      case 'LIFETIME':
        priceId = env.STRIPE_PRICE_LIFETIME;
        isSubscription = false;
        break;
      default:
        throw new AppError(400, '无效的方案类型');
    }

    // 5. Build URLs
    const successUrl = `${env.WEB_URL}/account?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${env.WEB_URL}/#pricing`;

    // 6. Create the checkout session
    const session = isSubscription
      ? await StripeService.createSubscriptionCheckout(
          priceId,
          stripeCustomerId,
          successUrl,
          cancelUrl,
          planType
        )
      : await StripeService.createPaymentCheckout(
          priceId,
          stripeCustomerId,
          successUrl,
          cancelUrl,
          planType
        );

    return { sessionId: session.id, url: session.url };
  },

  /**
   * Handle checkout.session.completed webhook event.
   */
  async handleCheckoutComplete(
    session: {
      id: string;
      mode: string;
      customer: string;
      subscription?: string;
      payment_intent?: string;
      metadata?: { planType?: string };
    },
    eventId: string
  ) {
    // Idempotency check
    if (processedEventIds.has(eventId)) return;
    processedEventIds.add(eventId);
    eventTimestamps.set(eventId, Date.now());

    const stripeCustomerId = session.customer as string;

    // Find membership by Stripe customer ID
    const membership = await prisma.membership.findFirst({
      where: { stripeCustomerId },
    });

    if (!membership) {
      console.error(`[ExportAI] No membership found for Stripe customer: ${stripeCustomerId}`);
      return;
    }

    let planType: PlanType;
    let stripeSubscriptionId: string | null = null;
    let stripePaymentIntentId: string | null = null;

    // Prefer planType from session metadata (set during checkout creation)
    const metadataPlanType = session.metadata?.planType as PlanType | undefined;

    if (session.mode === 'subscription') {
      stripeSubscriptionId = session.subscription || null;
      // Use metadata planType if available, otherwise fall back to price map or existing
      if (metadataPlanType && ['MONTHLY', 'YEARLY', 'LIFETIME'].includes(metadataPlanType)) {
        planType = metadataPlanType;
      } else {
        planType = membership.planType || 'MONTHLY';
      }
    } else {
      // One-time payment = LIFETIME
      planType = 'LIFETIME';
      stripePaymentIntentId = session.payment_intent || null;
    }

    const expiresAt = computeExpiresAt(planType);

    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        planType,
        status: 'ACTIVE',
        stripeSubscriptionId,
        stripePaymentIntentId,
        expiresAt,
        cancelledAt: null,
      },
    });
  },

  /**
   * Handle customer.subscription.updated webhook event.
   */
  async handleSubscriptionUpdated(
    subscription: {
      id: string;
      customer: string;
      current_period_end?: number;
      items: { data: { price: { id: string } }[] };
    },
    eventId: string
  ) {
    // Idempotency check
    if (processedEventIds.has(eventId)) return;
    processedEventIds.add(eventId);
    eventTimestamps.set(eventId, Date.now());

    const stripeCustomerId = subscription.customer as string;
    const priceId = subscription.items?.data?.[0]?.price?.id;

    const membership = await prisma.membership.findFirst({
      where: { stripeCustomerId },
    });

    if (!membership) return;

    const planType: PlanType = PRICE_PLAN_MAP[priceId] || membership.planType;
    const expiresAt = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : computeExpiresAt(planType);

    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        planType,
        status: 'ACTIVE',
        expiresAt,
        cancelledAt: null,
      },
    });
  },

  /**
   * Handle customer.subscription.deleted webhook event.
   */
  async handleSubscriptionDeleted(
    subscription: { customer: string },
    eventId: string
  ) {
    // Idempotency check
    if (processedEventIds.has(eventId)) return;
    processedEventIds.add(eventId);
    eventTimestamps.set(eventId, Date.now());

    const stripeCustomerId = subscription.customer as string;

    const membership = await prisma.membership.findFirst({
      where: { stripeCustomerId },
    });

    if (!membership) return;

    // User actively cancelled subscription — mark as CANCELLED.
    // isMemberActive() still returns true if within current period.
    // EXPIRED is reserved for natural expiry / payment failure.
    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });
  },

  /**
   * Handle invoice.payment_failed webhook event.
   */
  async handleInvoicePaymentFailed(
    invoice: { customer: string },
    eventId: string
  ) {
    // Idempotency check
    if (processedEventIds.has(eventId)) return;
    processedEventIds.add(eventId);
    eventTimestamps.set(eventId, Date.now());

    const stripeCustomerId = invoice.customer as string;

    const membership = await prisma.membership.findFirst({
      where: { stripeCustomerId },
    });

    if (!membership) return;

    // Mark as expired after grace period
    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        status: 'EXPIRED',
      },
    });
  },

  /**
   * Create a Stripe billing portal session for the user.
   */
  async createPortalSession(userId: string) {
    const membership = await prisma.membership.findUnique({
      where: { userId },
    });

    if (!membership?.stripeCustomerId) {
      throw new AppError(400, '未找到 Stripe 客户信息');
    }

    const returnUrl = `${env.WEB_URL}/account`;
    const session = await StripeService.createPortalSession(
      membership.stripeCustomerId,
      returnUrl
    );

    return { url: session.url };
  },
};
