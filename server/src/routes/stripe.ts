import { Router, Request, Response } from 'express';
import { StripeService } from '../services/stripe.service';
import { MembershipService } from '../services/membership.service';

const router = Router();

/**
 * POST /api/stripe/webhook — Stripe webhook endpoint
 *
 * Uses raw body (set in index.ts before express.json()).
 * No authentication — Stripe verifies via signature.
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    console.warn('[ExportAI] Webhook rejected: missing stripe-signature header');
    res.status(400).json({ code: 400, data: null, message: 'Missing stripe-signature header' });
    return;
  }

  let event: any;
  try {
    // req.body is a Buffer because of express.raw() middleware
    const payload = Buffer.isBuffer(req.body) ? req.body.toString() : req.body;
    event = StripeService.verifyWebhookSignature(payload, sig);
    console.log(`[ExportAI] Webhook received: ${event.type} (${event.id})`);
  } catch (err: any) {
    console.error('[ExportAI] Webhook signature verification failed:', err.message);
    res.status(400).json({ code: 400, data: null, message: 'Webhook signature verification failed' });
    return;
  }

  const eventId = event.id as string;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`[ExportAI] Processing checkout.session.completed for customer: ${session.customer}`);
        await MembershipService.handleCheckoutComplete(session, eventId);
        console.log(`[ExportAI] checkout.session.completed processed successfully (${eventId})`);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log(`[ExportAI] Processing customer.subscription.updated for customer: ${subscription.customer}`);
        await MembershipService.handleSubscriptionUpdated(subscription, eventId);
        console.log(`[ExportAI] customer.subscription.updated processed successfully (${eventId})`);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log(`[ExportAI] Processing customer.subscription.deleted for customer: ${subscription.customer}`);
        await MembershipService.handleSubscriptionDeleted(subscription, eventId);
        console.log(`[ExportAI] customer.subscription.deleted processed successfully (${eventId})`);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`[ExportAI] Processing invoice.payment_failed for customer: ${invoice.customer}`);
        await MembershipService.handleInvoicePaymentFailed(invoice, eventId);
        console.log(`[ExportAI] invoice.payment_failed processed successfully (${eventId})`);
        break;
      }
      default:
        console.log(`[ExportAI] Unhandled Stripe event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`[ExportAI] Error handling Stripe event ${event.type} (${eventId}):`, err.message);
    if (err.stack) {
      console.error(`[ExportAI] Stack trace:`, err.stack);
    }
    // Still return 200 so Stripe doesn't retry on our internal errors
  }

  res.status(200).json({ code: 200, data: null, message: 'ok' });
});

export default router;
