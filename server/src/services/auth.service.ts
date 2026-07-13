import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AppError } from '../utils/errors';
import prisma from '../utils/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  refreshTokens,
  revokeRefreshToken,
  revokeAllUserTokens,
  AuthResult,
} from './token.service';
import { sendPasswordResetEmail, sendWelcomeEmail } from './email.service';
import { GoogleIdentity, verifyGoogleAccessToken } from './google-auth.service';

const SALT_ROUNDS = 12;

/**
 * Register a new user.
 * @throws AppError(409) if email already exists
 */
export async function register(email: string, password: string): Promise<AuthResult> {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError(409, '该邮箱已注册');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
  });

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);

  // Send welcome email (non-blocking)
  sendWelcomeEmail(email).catch((err) => {
    console.error('[ExportAI] Failed to send welcome email:', err.message);
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * Login with email and password.
 * @throws AppError(401) if credentials are invalid
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  // Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, '邮箱或密码错误');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError(401, '邮箱或密码错误');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError(401, '账号已被禁用');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  };
}

export async function loginWithGoogle(
  accessToken: string,
  googleClientId: string,
  verifier: (accessToken: string, clientId: string) => Promise<GoogleIdentity> = verifyGoogleAccessToken
): Promise<AuthResult> {
  const identity = await verifier(accessToken, googleClientId);
  let user = await prisma.user.findUnique({ where: { email: identity.email } });

  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);
    user = await prisma.user.create({
      data: {
        email: identity.email,
        passwordHash,
      },
    });
  }

  if (!user.isActive) {
    throw new AppError(401, '账号已被禁用');
  }

  const accessTokenResult = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);
  return {
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    },
    accessToken: accessTokenResult,
    refreshToken,
  };
}

/**
 * Logout by revoking the refresh token.
 */
export async function logout(userId: string, refreshToken: string): Promise<void> {
  // Verify the refresh token belongs to this user before revoking
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (tokenRecord && tokenRecord.userId === userId) {
    await revokeRefreshToken(refreshToken);
  }
}

/**
 * Handle forgot password request.
 * Always returns the same message to prevent email enumeration.
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Don't reveal that the email doesn't exist
    return;
  }

  // Generate a random reset token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash the token for storage (we send the plain token in the email)
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Set expiry to 30 minutes from now
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  // Save the hashed token to the database
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token: tokenHash,
      expiresAt,
    },
  });

  // Send the reset email with the plain token
  // Note: the user will use the plain token in the URL,
  // and we'll hash it again when verifying
  await sendPasswordResetEmail(email, resetToken);
}

/**
 * Reset password using a valid reset token.
 * @throws AppError(400) if token is invalid or expired
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  // Hash the provided token to find it in the database
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Find the reset record
  const resetRecord = await prisma.passwordReset.findFirst({
    where: {
      token: tokenHash,
      usedAt: null,
    },
  });

  if (!resetRecord) {
    throw new AppError(400, '重置链接无效或已过期');
  }

  // Check if token is expired
  if (resetRecord.expiresAt < new Date()) {
    throw new AppError(400, '重置链接无效或已过期');
  }

  // Hash the new password
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update user password and mark token as used in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  // Revoke all refresh tokens for this user (force re-login on all devices)
  await revokeAllUserTokens(resetRecord.userId);
}

/**
 * Get current user info.
 */
export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      isActive: true,
      createdAt: true,
      membership: {
        select: {
          id: true,
          planType: true,
          status: true,
          expiresAt: true,
          cancelledAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(401, '未授权，请先登录');
  }

  return user;
}

/**
 * Refresh tokens using a valid refresh token.
 * Delegates to token.service.refreshTokens.
 */
export { refreshTokens };
