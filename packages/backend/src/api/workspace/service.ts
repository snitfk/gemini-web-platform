import { prisma } from '../../utils/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../types/errors.js';
import { CreateWorkspaceInput, UpdateWorkspaceInput } from './schema.js';
import { PaginationQuery, getPaginationParams, createPaginationMeta } from '../../utils/pagination.js';
import logger from '../../utils/logger.js';

/**
 * 工作区配置限制
 */
const WORKSPACE_LIMITS = {
  maxPerUser: 10,
};

export class WorkspaceService {
  /**
   * 创建工作区
   */
  async create(userId: string, input: CreateWorkspaceInput) {
    // 检查工作区数量限制
    const count = await prisma.workspace.count({
      where: { userId },
    });

    if (count >= WORKSPACE_LIMITS.maxPerUser) {
      throw new BadRequestError(
        `Maximum number of workspaces reached (${WORKSPACE_LIMITS.maxPerUser})`
      );
    }

    const workspace = await prisma.workspace.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        settings: input.settings || {},
      },
    });

    logger.info('Workspace created', { workspaceId: workspace.id, userId });

    return workspace;
  }

  /**
   * 获取用户的工作区列表
   */
  async list(userId: string, query: PaginationQuery) {
    const params = getPaginationParams(query, ['name', 'createdAt', 'updatedAt']);

    const [workspaces, total] = await Promise.all([
      prisma.workspace.findMany({
        where: { userId },
        ...params,
        orderBy: params.orderBy || { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          settings: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              chatSessions: true,
              files: true,
            },
          },
        },
      }),
      prisma.workspace.count({ where: { userId } }),
    ]);

    return {
      data: workspaces,
      meta: createPaginationMeta(query.page, query.limit, total),
    };
  }

  /**
   * 获取工作区详情
   */
  async getById(userId: string, workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: {
          select: {
            chatSessions: true,
            files: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    // 检查权限
    if (workspace.userId !== userId) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    return workspace;
  }

  /**
   * 更新工作区
   */
  async update(userId: string, workspaceId: string, input: UpdateWorkspaceInput) {
    // 检查权限
    await this.getById(userId, workspaceId);

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: input,
    });

    logger.info('Workspace updated', { workspaceId, userId });

    return workspace;
  }

  /**
   * 删除工作区
   */
  async delete(userId: string, workspaceId: string) {
    // 检查权限
    await this.getById(userId, workspaceId);

    // 删除工作区（硬删除，Prisma 会级联删除相关数据）
    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    logger.info('Workspace deleted', { workspaceId, userId });
  }
}

export const workspaceService = new WorkspaceService();
