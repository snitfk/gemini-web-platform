import {
  sign,
  verify,
  TokenExpiredError,
  JsonWebTokenError,
} from 'jsonwebtoken';

import { config } from '../config/index.js';
import { UnauthorizedError } from '../types/errors.js';

export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

/**
 * 生成访问令牌
 */
export function generateAccessToken(userId: string, email: string): string {
  const payload: JwtPayload = {
    userId,
    email,
    type: 'access',
  };

  return sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
}

/**
 * 生成刷新令牌
 */
export function generateRefreshToken(userId: string, email: string): string {
  const payload: JwtPayload = {
    userId,
    email,
    type: 'refresh',
  };

  return sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn as any,
  });
}

/**
 * 验证令牌
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const payload = verify(token, config.jwt.secret) as JwtPayload;
    return payload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (error instanceof JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
}

/**
 * 生成令牌对
 */
export function generateTokenPair(userId: string, email: string) {
  return {
    accessToken: generateAccessToken(userId, email),
    refreshToken: generateRefreshToken(userId, email),
  };
}
