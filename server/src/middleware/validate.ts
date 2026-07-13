import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/errors';

/**
 * Request validation middleware factory.
 * Validates request body against a Zod schema.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.errors.map((e) => {
          const field = e.path.join('.');
          return field ? `${field}: ${e.message}` : e.message;
        });
        next(new AppError(400, messages.join('; ')));
        return;
      }
      next(err);
    }
  };
}

/**
 * Zod schemas for auth endpoints.
 */
import { z } from 'zod';

export const schemaRegister = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少需要 8 位'),
});

export const schemaLogin = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

export const schemaGoogleLogin = z.object({
  accessToken: z.string().min(1, 'accessToken 不能为空'),
});

export const schemaLogout = z.object({
  refreshToken: z.string().min(1, 'Refresh token 不能为空'),
});

export const schemaRefresh = z.object({
  refreshToken: z.string().min(1, 'Refresh token 不能为空'),
});

export const schemaForgotPassword = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

export const schemaResetPassword = z.object({
  token: z.string().min(1, '重置令牌不能为空'),
  password: z.string().min(8, '密码至少需要 8 位'),
});

export const schemaCheckout = z.object({
  planType: z.enum(['MONTHLY', 'YEARLY', 'LIFETIME']),
});

export const schemaUserSettings = z.object({
  settings: z.record(z.any()),
});
