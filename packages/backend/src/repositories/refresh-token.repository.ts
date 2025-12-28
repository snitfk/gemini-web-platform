import { RefreshToken, Prisma } from '@prisma/client';

import { prisma } from '../utils/prisma.js';

import { BaseRepository } from './base.repository.js';

export class RefreshTokenRepository extends BaseRepository<
  RefreshToken,
  Prisma.RefreshTokenCreateInput,
  Prisma.RefreshTokenUpdateInput,
  Prisma.RefreshTokenWhereInput,
  Prisma.RefreshTokenWhereUniqueInput
> {
  constructor() {
    super(prisma, 'RefreshToken');
  }

  async create(data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  }

  async findUnique(
    where: Prisma.RefreshTokenWhereUniqueInput
  ): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where });
  }

  async findMany(params: {
    where?: Prisma.RefreshTokenWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.RefreshTokenOrderByWithRelationInput;
  }): Promise<RefreshToken[]> {
    return prisma.refreshToken.findMany(params);
  }

  async update(
    where: Prisma.RefreshTokenWhereUniqueInput,
    data: Prisma.RefreshTokenUpdateInput
  ): Promise<RefreshToken> {
    return prisma.refreshToken.update({ where, data });
  }

  async delete(
    where: Prisma.RefreshTokenWhereUniqueInput
  ): Promise<RefreshToken> {
    return prisma.refreshToken.delete({ where });
  }

  async count(where?: Prisma.RefreshTokenWhereInput): Promise<number> {
    return prisma.refreshToken.count({ where });
  }

  /**
   * 通过 token 查找
   */
  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.findUnique({ token });
  }

  /**
   * 删除用户的所有 token
   */
  async deleteAllByUserId(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * 删除过期的 token
   */
  async deleteExpired(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * 验证 token 是否有效
   */
  async isValid(token: string): Promise<boolean> {
    const refreshToken = await this.findByToken(token);
    if (!refreshToken) return false;
    return refreshToken.expiresAt > new Date();
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
