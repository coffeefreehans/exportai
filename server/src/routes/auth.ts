import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validate, schemaRegister, schemaLogin, schemaGoogleLogin, schemaLogout, schemaRefresh, schemaForgotPassword, schemaResetPassword } from '../middleware/validate';
import * as authService from '../services/auth.service';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

const router = Router();

/**
 * POST /api/auth/register — User registration
 */
router.post('/register', validate(schemaRegister), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.register(email, password);
  res.status(201).json({
    code: 201,
    data: result,
    message: '注册成功',
  });
});

/**
 * POST /api/auth/login — User login
 */
router.post('/login', validate(schemaLogin), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json({
    code: 200,
    data: result,
    message: '登录成功',
  });
});

router.post('/google', validate(schemaGoogleLogin), async (req: Request, res: Response) => {
  if (!env.GOOGLE_CLIENT_ID) throw new AppError(503, 'Google 登录尚未配置');
  const result = await authService.loginWithGoogle(req.body.accessToken, env.GOOGLE_CLIENT_ID);
  res.status(200).json({
    code: 200,
    data: result,
    message: '登录成功',
  });
});

/**
 * POST /api/auth/logout — User logout
 */
router.post('/logout', authenticate, validate(schemaLogout), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { refreshToken } = req.body;
  await authService.logout(userId, refreshToken);
  res.status(200).json({
    code: 200,
    data: null,
    message: '登出成功',
  });
});

/**
 * POST /api/auth/refresh — Refresh tokens
 */
router.post('/refresh', validate(schemaRefresh), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshTokens(refreshToken);
  res.status(200).json({
    code: 200,
    data: result,
    message: 'Token 刷新成功',
  });
});

/**
 * POST /api/auth/forgot-password — Request password reset email
 */
router.post('/forgot-password', validate(schemaForgotPassword), async (req: Request, res: Response) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  res.status(200).json({
    code: 200,
    data: null,
    message: '如果该邮箱已注册，重置链接已发送',
  });
});

/**
 * POST /api/auth/reset-password — Reset password with token
 */
router.post('/reset-password', validate(schemaResetPassword), async (req: Request, res: Response) => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  res.status(200).json({
    code: 200,
    data: null,
    message: '密码重置成功',
  });
});

/**
 * GET /api/auth/me — Get current user info
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const user = await authService.getMe(userId);
  res.status(200).json({
    code: 200,
    data: user,
    message: 'ok',
  });
});

export default router;
