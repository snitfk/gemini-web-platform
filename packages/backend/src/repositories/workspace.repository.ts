import { prisma } from '../utils/prisma.js';
import { IBaseRepository, PaginatedResult, createPaginatedResult } from './base.repository.js';
import logger from '../utils/logger.js';

/**
 * 工作区状态
 */
export type WorkspaceStatus = 'active' | 'archived' | 'deleted';

/**
 * 工作区数据类型
 */
export interface Workspace {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: WorkspaceStatus;
  containerId: string | null;
  storageUsed: number;
  config: Record<string, unknown>;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 工作区创建输入
 */
export interface WorkspaceCreateInput {
  userId: string;
  name: string;
  description?: string;
  config?: Record<string, unknown>;
}

/**
 * 工作区更新输入
 */
export interface WorkspaceUpdateInput {
  name?: string;
  description?: string;
  status?: WorkspaceStatus;
  containerId?: string | null;
  storageUsed?: number;
  config?: Record<string, unknown>;
  lastUsedAt?: Date;
}

/**
 * 工作区查询条件
 */
export interface WorkspaceWhereInput {
  id?: string;
  userId?: string;
  status?: WorkspaceStatus;
  name?: { contains: string };
}

/**
 * 工作区唯一查询条件
 */
export interface WorkspaceWhereUniqueInput {
  id?: string;
  containerId?: string;
}

/**
 * Workspace Repository
 * 工作区数据访问层
 */
export class WorkspaceRepository implements IBaseRepository<
  Workspace,
  WorkspaceCreateInput,
  WorkspaceUpdateInput,
  WorkspaceWhereInput,
  WorkspaceWhereUniqueInput
> {
  /**
   * 创建工作区
   */
  async create(data: WorkspaceCreateInput): Promise<Workspace> {
    const workspace = await prisma.workspace.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description || null,
        status: 'active',
        config: data.config || {},
        storageUsed: 0,
        lastUsedAt: new Date(),
      },
    });

    logger.debug('Workspace created in repository', { workspaceId: workspace.id });

    return workspace as Workspace;
  }

  /**
   * 通过唯一条件查找工作区
   */
  async findUnique(where: WorkspaceWhereUniqueInput): Promise<Workspace | null> {
    const workspace = await prisma.workspace.findUnique({
      where: where as { id: string },
    });

    return workspace as Workspace | null;
  }

  /**
   * 通过ID查找工作区
   */
  async findById(id: string): Promise<Workspace | null> {
    return this.findUnique({ id });
  }

  /**
   * 查找多个工作区
   */
  async findMany(params: {
    where?: WorkspaceWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<Workspace[]> {
    const workspaces = await prisma.workspace.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
    });

    return workspaces as Workspace[];
  }

  /**
   * 更新工作区
   */
  async update(
    where: WorkspaceWhereUniqueInput,
    data: WorkspaceUpdateInput
  ): Promise<Workspace> {
    const workspace = await prisma.workspace.update({
      where: where as { id: string },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    logger.debug('Workspace updated in repository', { workspaceId: workspace.id });

    return workspace as Workspace;
  }

  /**
   * 删除工作区
   */
  async delete(where: WorkspaceWhereUniqueInput): Promise<Workspace> {
    const workspace = await prisma.workspace.delete({
      where: where as { id: string },
    });

    logger.debug('Workspace deleted from repository', { workspaceId: workspace.id });

    return workspace as Workspace;
  }

  /**
   * 统计工作区数量
   */
  async count(where?: WorkspaceWhereInput): Promise<number> {
    return prisma.workspace.count({ where });
  }

  /**
   * 查找用户的工作区
   */
  async findByUserId(
    userId: string,
    status?: WorkspaceStatus
  ): Promise<Workspace[]> {
    return this.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  /**
   * 通过容器 ID 查找工作区
   */
  async findByContainerId(containerId: string): Promise<Workspace | null> {
    const workspace = await prisma.workspace.findFirst({
      where: { containerId },
    });

    return workspace as Workspace | null;
  }

  /**
   * 更新最后使用时间
   */
  async updateLastUsedAt(workspaceId: string): Promise<Workspace> {
    return this.update(
      { id: workspaceId },
      { lastUsedAt: new Date() }
    );
  }

  /**
   * 软删除工作区
   */
  async softDelete(workspaceId: string): Promise<Workspace> {
    return this.update(
      { id: workspaceId },
      { status: 'deleted' }
    );
  }

  /**
   * 归档工作区
   */
  async archive(workspaceId: string): Promise<Workspace> {
    return this.update(
      { id: workspaceId },
      { status: 'archived' }
    );
  }

  /**
   * 恢复已归档的工作区
   */
  async restore(workspaceId: string): Promise<Workspace> {
    return this.update(
      { id: workspaceId },
      { status: 'active' }
    );
  }

  /**
   * 更新存储使用量
   */
  async updateStorageUsed(workspaceId: string, storageUsed: number): Promise<Workspace> {
    return this.update(
      { id: workspaceId },
      { storageUsed }
    );
  }

  /**
   * 设置容器 ID
   */
  async setContainerId(workspaceId: string, containerId: string | null): Promise<Workspace> {
    return this.update(
      { id: workspaceId },
      { containerId }
    );
  }

  /**
   * 分页查询用户的工作区
   */
  async findByUserIdPaginated(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: WorkspaceStatus
  ): Promise<PaginatedResult<Workspace>> {
    const where: WorkspaceWhereInput = {
      userId,
      ...(status && { status }),
    };

    const [workspaces, total] = await Promise.all([
      this.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastUsedAt: 'desc' },
      }),
      this.count(where),
    ]);

    return createPaginatedResult(workspaces, total, page, limit);
  }

  /**
   * 查找空闲工作区（长时间未使用）
   */
  async findIdleWorkspaces(idleThresholdMs: number): Promise<Workspace[]> {
    const thresholdDate = new Date(Date.now() - idleThresholdMs);

    return this.findMany({
      where: {
        status: 'active',
      },
    }).then(workspaces =>
      workspaces.filter(w => w.lastUsedAt < thresholdDate && w.containerId !== null)
    );
  }
}

// 导出单例
export const workspaceRepository = new WorkspaceRepository();
