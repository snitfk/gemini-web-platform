import { prisma } from '../../utils/prisma.js';
import { NotFoundError } from '../../types/errors.js';
import { UpdateProfileInput } from './schema.js';

export class UserService {
  /**
   * 获取用户详情
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * 更新用户资料
   */
  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * 更新 Gemini API Key
   */
  async updateApiKey(userId: string, geminiApiKey: string) {
    // TODO: 加密存储 API Key
    await prisma.user.update({
      where: { id: userId },
      data: { geminiApiKey },
    });

    return { message: 'API key updated successfully' };
  }

  /**
   * 检查是否有 API Key
   */
  async hasApiKey(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { geminiApiKey: true },
    });

    return { hasApiKey: !!user?.geminiApiKey };
  }

  /**
   * 删除用户账户
   */
  async deleteAccount(userId: string) {
    await prisma.user.delete({
      where: { id: userId },
    });
  }
}

export const userService = new UserService();
