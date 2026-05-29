import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Custom application error with HTTP status code and error code.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = statusCode;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Error code enum for consistent error responses.
 */
export enum ErrorCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  RATE_LIMITED = 429,
  INTERNAL_ERROR = 500,
}

/**
 * API response format matching the project's ApiResponse interface.
 */
interface ApiResponse<T> {
  code: number;
  data: T | null;
  message: string;
}

/**
 * Global error handler middleware.
 * Catches AppError instances and formats responses consistently.
 */
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[ExportAI] Error:', err.message);
  console.error('[ExportAI] Stack:', err.stack);

  if (err instanceof AppError) {
    const response: ApiResponse<null> = {
      code: err.code,
      data: null,
      message: err.message,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Prisma unique constraint errors
  if (err && typeof err === 'object' && 'code' in err) {
    const prismaErr = err as { code: string; meta?: { target?: string[] } };
    if (prismaErr.code === 'P2002') {
      const response: ApiResponse<null> = {
        code: 409,
        data: null,
        message: '该邮箱已注册',
      };
      res.status(409).json(response);
      return;
    }
  }

  // Handle Zod validation errors
  if (err && err.name === 'ZodError') {
    const zodErr = err as unknown as { errors: { message: string }[] };
    const response: ApiResponse<null> = {
      code: 400,
      data: null,
      message: zodErr.errors.map((e) => e.message).join('; '),
    };
    res.status(400).json(response);
    return;
  }

  // Default: 500 internal server error
  const response: ApiResponse<null> = {
    code: 500,
    data: null,
    message: env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
  };
  res.status(500).json(response);
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(_req: Request, res: Response): void {
  const response: ApiResponse<null> = {
    code: 404,
    data: null,
    message: '接口不存在',
  };
  res.status(404).json(response);
}
