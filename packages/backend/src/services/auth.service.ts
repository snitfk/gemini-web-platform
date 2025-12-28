import { User } from '@prisma/client';

import {
  userRepository,
  refreshTokenRepository,
} from '../repositories/index.js';
import { UnauthorizedError, ConflictError } from '../types/errors.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { generateTokenPair, verifyToken } from '../utils/jwt.js';

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * 用户注册
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const { email, username, password, displayName } = input;

    // 检查邮箱是否已存在
    if (await userRepository.emailExists(email)) {
      throw new ConflictError('Email already in use');
    }

    // 检查用户名是否已存在
    if (await userRepository.usernameExists(username)) {
      throw new ConflictError('Username already taken');
    }

    // 哈希密码
    const passwordHash = await hashPassword(password);

    // 创建用户
    const user = await userRepository.create({
      email,
      username,
      passwordHash,
      displayName: displayName || username,
      isActive: true,
      isVerified: false,
    });

    // 生成 token
    const tokens = generateTokenPair(user.id, user.email);

    // 保存 refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 天后过期

    await refreshTokenRepository.create({
      user: { connect: { id: user.id } },
      token: tokens.refreshToken,
      expiresAt,
    });

    // 返回结果（排除密码）
    const userWithoutPassword = { ...user };
    delete (userWithoutPassword as any).passwordHash;

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * 用户登录
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password } = input;

    // 查找用户
    const user = await userRepository.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 检查账户状态
    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    // 生成 token
    const tokens = generateTokenPair(user.id, user.email);

    // 保存 refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await refreshTokenRepository.create({
      user: { connect: { id: user.id } },
      token: tokens.refreshToken,
      expiresAt,
    });

    // 更新最后登录时间
    await userRepository.updateLastLogin(user.id);

    // 返回结果
    const userWithoutPassword = { ...user };
    delete (userWithoutPassword as any).passwordHash;

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * 刷新访问令牌
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // 验证 refresh token
    const payload = verifyToken(refreshToken);
    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // 检查 token 是否在数据库中
    const isValid = await refreshTokenRepository.isValid(refreshToken);
    if (!isValid) {
      throw new UnauthorizedError('Refresh token expired or invalid');
    }

    // 生成新的 token 对
    const tokens = generateTokenPair(payload.userId, payload.email);

    // 删除旧的 refresh token
    await refreshTokenRepository.delete({ token: refreshToken });

    // 保存新的 refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await refreshTokenRepository.create({
      user: { connect: { id: payload.userId } },
      token: tokens.refreshToken,
      expiresAt,
    });

    return tokens;
  }

  /**
   * 登出
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await refreshTokenRepository.delete({ token: refreshToken });
    } catch {
      // 即使删除失败也不抛出错误
    }
  }

  /**
   * 登出所有设备
   */
  async logoutAll(userId: string): Promise<void> {
    await refreshTokenRepository.deleteAllByUserId(userId);
  }

  /**
   * 验证访问令牌并获取用户
   */
  async verifyAccessToken(token: string): Promise<User> {
    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid access token');
    }

    const user = await userRepository.findUnique({ id: payload.userId });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    return user;
  }

  /**
   * OAuth 登录（Google）
   */
  async loginWithOAuth(
    provider: string,
    profile: {
      id: string;
      email: string;
      displayName: string;
      avatar?: string;
    }
  ): Promise<AuthResult> {
    // 查找现有用户
    let user = await userRepository.findByOAuth(provider, profile.id);

    // 如果不存在，创建新用户
    if (!user) {
      // 生成唯一用户名
      let username = profile.email.split('@')[0];
      let counter = 1;
      while (await userRepository.usernameExists(username)) {
        username = `${profile.email.split('@')[0]}${counter}`;
        counter++;
      }

      user = await userRepository.create({
        email: profile.email,
        username,
        displayName: profile.displayName,
        avatar: profile.avatar,
        oauthProvider: provider,
        oauthId: profile.id,
        isActive: true,
        isVerified: true, // OAuth 登录自动验证
      });
    }

    // 生成 token
    const tokens = generateTokenPair(user.id, user.email);

    // 保存 refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await refreshTokenRepository.create({
      user: { connect: { id: user.id } },
      token: tokens.refreshToken,
      expiresAt,
    });

    // 更新最后登录时间
    await userRepository.updateLastLogin(user.id);

    const userWithoutPassword = { ...user };
    delete (userWithoutPassword as any).passwordHash;

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}

export const authService = new AuthService();
