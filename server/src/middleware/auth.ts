import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import prisma from '../utils/prisma';
import { TokenPayload } from '../services/token.service';

/**
 * JWT authentication middleware.
 * Verifies the access token from the Authorization header.
 * Attaches req.user = { id: userId } on success.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError(401, '未授权，请先登录'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    if (decoded.type !== 'access') {
      next(new AppError(401, '未授权，请先登录'));
      return;
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) {
      next(new AppError(401, '未授权，请先登录'));
      return;
    }

    (req as any).user = { id: decoded.userId };
    next();
  } catch (err) {
    next(new AppError(401, '未授权，请先登录'));
  }
}
