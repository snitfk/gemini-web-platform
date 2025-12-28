import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../types/errors.js';
import logger from '../utils/logger.js';
import { config } from '../config/index.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// Prisma error type guard
function isPrismaError(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Error && 'code' in err && typeof (err as Prisma.PrismaClientKnownRequestError).code === 'string';
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  // 记录错误
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // 处理不同类型的错误
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        ...(err instanceof ValidationError && { errors: err.errors }),
      },
    });
  }

  // Zod 验证错误
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation Error',
        errors: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Prisma 错误
  if (isPrismaError(err)) {
    // 唯一约束冲突
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Resource already exists',
          field: (err.meta?.target as string[])?.join(', '),
        },
      });
    }

    // 记录未找到
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Resource not found',
        },
      });
    }
  }

  // 默认错误处理
  const statusCode = 500;
  const message = config.server.isDevelopment
    ? err.message
    : 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(config.server.isDevelopment && { stack: err.stack }),
    },
  });
}

// 404 处理
export function notFoundHandler(req: Request, res: Response): Response {
  return res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.path}`,
    },
  });
}

// 异步错误包装器
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
