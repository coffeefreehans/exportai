import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validate, schemaUserSettings } from '../middleware/validate';
import prisma from '../utils/prisma';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const row = await prisma.userSettings.findUnique({ where: { userId } });

  res.status(200).json({
    code: 200,
    data: {
      settings: row?.settings || {},
      updatedAt: row?.updatedAt || null,
    },
    message: 'ok',
  });
});

router.put('/', authenticate, validate(schemaUserSettings), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { settings } = req.body;
  const row = await prisma.userSettings.upsert({
    where: { userId },
    update: { settings },
    create: { userId, settings },
  });

  res.status(200).json({
    code: 200,
    data: {
      settings: row.settings,
      updatedAt: row.updatedAt,
    },
    message: 'ok',
  });
});

export default router;
