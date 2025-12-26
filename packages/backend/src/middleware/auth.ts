import { Request, Response, NextFunction } from 'express';

import { authService } from '../services/auth.service.js';
import { UnauthorizedError } from '../types/errors.js';

/**
 * 认证中间件
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    // 验证 token 并获取用户
    const user = await authService.verifyAccessToken(token);

    // 将用户信息附加到请求对象
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * 可选认证中间件
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await authService.verifyAccessToken(token);
      req.user = user;
    }
  } catch {
    // 忽略错误，继续执行
  }

  next();
}

/**
 * 检查是否已认证
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  next();
}
