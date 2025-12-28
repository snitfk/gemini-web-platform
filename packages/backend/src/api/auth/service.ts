import { prisma } from '../../utils/prisma.js';
import { hashPassword, verifyPassword } from '../../utils/crypto.js';
import { generateTokenPair, verifyToken } from '../../utils/jwt.js';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from '../../types/errors.js';
import { RegisterInput, LoginInput } from './schema.js';
import { config } from '../../config/index.js';

export class AuthService {
  /**
   * 用户注册
   */
  async register(input: RegisterInput) {
    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existingEmail) {
      throw new ConflictError('Email already registered');
    }

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username: input.username },
    });
    if (existingUsername) {
      throw new ConflictError('Username already taken');
    }

    // 哈希密码
    const passwordHash = await hashPassword(input.password);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        passwordHash,
        displayName: input.displayName || input.username,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        createdAt: true,
      },
    });

    // 生成令牌
    const tokens = generateTokenPair(user.id, user.email);

    // 保存刷新令牌
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user,
      ...tokens,
    };
  }

  /**
   * 用户登录
   */
  async login(input: LoginInput) {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // 验证密码
    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 生成令牌
    const tokens = generateTokenPair(user.id, user.email);

    // 保存刷新令牌
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      },
      ...tokens,
    };
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string) {
    // 验证令牌
    const payload = verifyToken(refreshToken);

    if (payload.type !== 'refresh') {
      throw new BadRequestError('Invalid token type');
    }

    // 检查令牌是否存在于数据库
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || !storedToken.user) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = storedToken.user;

    if (storedToken.expiresAt < new Date()) {
      // 删除过期令牌
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedError('Refresh token expired');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // 删除旧的刷新令牌
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // 生成新令牌
    const tokens = generateTokenPair(user.id, user.email);

    // 保存新的刷新令牌
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  /**
   * 登出
   */
  async logout(refreshToken: string) {
    // 删除刷新令牌
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  /**
   * 登出所有设备
   */
  async logoutAll(userId: string) {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * 修改密码
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new BadRequestError('Cannot change password for OAuth users');
    }

    // 验证当前密码
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // 哈希新密码
    const passwordHash = await hashPassword(newPassword);

    // 更新密码
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // 撤销所有刷新令牌
    await this.logoutAll(userId);
  }

  /**
   * 保存刷新令牌
   */
  private async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    // 解析过期时间
    const match = config.jwt.refreshExpiresIn.match(/^(\d+)([dhms])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
        case 'd':
          expiresAt.setDate(expiresAt.getDate() + value);
          break;
        case 'h':
          expiresAt.setHours(expiresAt.getHours() + value);
          break;
        case 'm':
          expiresAt.setMinutes(expiresAt.getMinutes() + value);
          break;
        case 's':
          expiresAt.setSeconds(expiresAt.getSeconds() + value);
          break;
      }
    } else {
      // 默认 30 天
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    await prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }
}

export const authService = new AuthService();
