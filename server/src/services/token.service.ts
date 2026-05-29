import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import prisma from '../utils/prisma';

export interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate an access token (short-lived, 15min).
 */
export function generateAccessToken(userId: string): string {
  const payload: TokenPayload = { userId, type: 'access' };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
}

/**
 * Generate a refresh token (long-lived, 7d) and persist it in the database.
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex');

  // Calculate expiry from the env string (e.g., "7d")
  const expiresAt = new Date();
  const refreshExpiryStr = env.JWT_REFRESH_EXPIRES_IN;
  const match = refreshExpiryStr.match(/^(\d+)([dhms])$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 'd': expiresAt.setDate(expiresAt.getDate() + value); break;
      case 'h': expiresAt.setHours(expiresAt.getHours() + value); break;
      case 'm': expiresAt.setMinutes(expiresAt.getMinutes() + value); break;
      case 's': expiresAt.setSeconds(expiresAt.getSeconds() + value); break;
    }
  } else {
    // Default to 7 days
    expiresAt.setDate(expiresAt.getDate() + 7);
  }

  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify an access token and return its payload.
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch (err) {
    throw new AppError(401, '未授权，请先登录');
  }
}

/**
 * Verify a refresh token from the database.
 * Returns the token record if valid.
 */
export async function verifyRefreshToken(token: string) {
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!tokenRecord) {
    throw new AppError(401, 'Refresh token 无效或已过期');
  }

  if (tokenRecord.revokedAt) {
    throw new AppError(401, 'Refresh token 无效或已过期');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token 无效或已过期');
  }

  return tokenRecord;
}

/**
 * Refresh tokens: revoke the old refresh token and issue a new pair.
 */
export async function refreshTokens(oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenRecord = await verifyRefreshToken(oldRefreshToken);

  // Revoke the old refresh token
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revokedAt: new Date() },
  });

  // Generate new tokens
  const accessToken = generateAccessToken(tokenRecord.userId);
  const refreshToken = await generateRefreshToken(tokenRecord.userId);

  return { accessToken, refreshToken };
}

/**
 * Revoke a specific refresh token.
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke all refresh tokens for a user.
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
