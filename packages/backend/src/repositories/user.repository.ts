import { User, Prisma } from '@prisma/client';

import { prisma } from '../utils/prisma.js';

import { BaseRepository } from './base.repository.js';

export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserWhereInput,
  Prisma.UserWhereUniqueInput
> {
  constructor() {
    super(prisma, 'User');
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async findUnique(where: Prisma.UserWhereUniqueInput): Promise<User | null> {
    return prisma.user.findUnique({ where });
  }

  async findMany(params: {
    where?: Prisma.UserWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    return prisma.user.findMany(params);
  }

  async update(
    where: Prisma.UserWhereUniqueInput,
    data: Prisma.UserUpdateInput
  ): Promise<User> {
    return prisma.user.update({ where, data });
  }

  async delete(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return prisma.user.delete({ where });
  }

  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({ where });
  }

  /**
   * 通过邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findUnique({ email });
  }

  /**
   * 通过用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.findUnique({ username });
  }

  /**
   * 通过 OAuth 查找用户
   */
  async findByOAuth(provider: string, oauthId: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        oauthProvider: provider,
        oauthId,
      },
    });
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(userId: string): Promise<User> {
    return this.update({ id: userId }, {
      lastLoginAt: new Date(),
    } as unknown as Prisma.UserUpdateInput);
  }

  /**
   * 检查邮箱是否已存在
   */
  async emailExists(email: string): Promise<boolean> {
    return this.exists({ email });
  }

  /**
   * 检查用户名是否已存在
   */
  async usernameExists(username: string): Promise<boolean> {
    return this.exists({ username });
  }
}

// 导出单例
export const userRepository = new UserRepository();
