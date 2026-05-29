import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validate, schemaCheckout } from '../middleware/validate';
import { MembershipService } from '../services/membership.service';

const router = Router();

/**
 * GET /api/membership — Get current user's membership status
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const membership = await MembershipService.getMembership(userId);
  res.status(200).json({
    code: 200,
    data: membership,
    message: 'ok',
  });
});

/**
 * POST /api/membership/checkout — Create a Stripe Checkout session
 */
router.post(
  '/checkout',
  authenticate,
  validate(schemaCheckout),
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { planType } = req.body;

    // Get user email for Stripe customer creation
    const prisma = (await import('../utils/prisma')).default;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(401).json({ code: 401, data: null, message: '未授权，请先登录' });
      return;
    }

    const session = await MembershipService.createCheckoutSession(
      userId,
      planType,
      user.email
    );
    res.status(200).json({
      code: 200,
      data: session,
      message: 'ok',
    });
  }
);

/**
 * GET /api/membership/portal — Create a Stripe billing portal session
 */
router.get('/portal', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result = await MembershipService.createPortalSession(userId);
  res.status(200).json({
    code: 200,
    data: result,
    message: 'ok',
  });
});

export default router;
