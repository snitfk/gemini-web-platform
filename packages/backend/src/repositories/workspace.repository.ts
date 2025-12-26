import { Workspace, Prisma } from '@prisma/client';

import { prisma } from '../utils/prisma.js';

import { BaseRepository } from './base.repository.js';

export class WorkspaceRepository extends BaseRepository<
  Workspace,
  Prisma.WorkspaceCreateInput,
  Prisma.WorkspaceUpdateInput,
  Prisma.WorkspaceWhereInput,
  Prisma.WorkspaceWhereUniqueInput
> {
  constructor() {
    super(prisma, 'Workspace');
  }

  async create(data: Prisma.WorkspaceCreateInput): Promise<Workspace> {
    return prisma.workspace.create({ data });
  }

  async findUnique(
    where: Prisma.WorkspaceWhereUniqueInput
  ): Promise<Workspace | null> {
    return prisma.workspace.findUnique({ where });
  }

  async findMany(params: {
    where?: Prisma.WorkspaceWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.WorkspaceOrderByWithRelationInput;
  }): Promise<Workspace[]> {
    return prisma.workspace.findMany(params);
  }

  async update(
    where: Prisma.WorkspaceWhereUniqueInput,
    data: Prisma.WorkspaceUpdateInput
  ): Promise<Workspace> {
    return prisma.workspace.update({ where, data });
  }

  async delete(where: Prisma.WorkspaceWhereUniqueInput): Promise<Workspace> {
    return prisma.workspace.delete({ where });
  }

  async count(where?: Prisma.WorkspaceWhereInput): Promise<number> {
    return prisma.workspace.count({ where });
  }

  /**
   * 获取用户的所有工作区
   */
  async findByUserId(userId: string): Promise<Workspace[]> {
    return this.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  /**
   * 更新最后使用时间
   */
  async updateLastUsed(workspaceId: string): Promise<Workspace> {
    return this.update({ id: workspaceId }, { lastUsedAt: new Date() });
  }

  /**
   * 获取活跃工作区数量
   */
  async countActiveByUser(userId: string): Promise<number> {
    return this.count({
      userId,
      status: 'ACTIVE',
    });
  }
}

export const workspaceRepository = new WorkspaceRepository();
