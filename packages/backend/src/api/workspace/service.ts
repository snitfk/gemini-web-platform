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
      where: { userId, status: 'active' },
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
        status: 'active',
        storageUsed: 0,
        config: {},
        lastUsedAt: new Date(),
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
        where: { userId, status: 'active' },
        ...params,
        orderBy: params.orderBy || { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          containerId: true,
          storageUsed: true,
          lastUsedAt: true,
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
      prisma.workspace.count({ where: { userId, status: 'active' } }),
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

    if (workspace.status === 'deleted') {
      throw new NotFoundError('Workspace has been deleted');
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
   * 删除工作区（软删除）
   */
  async delete(userId: string, workspaceId: string) {
    // 检查权限
    const workspace = await this.getById(userId, workspaceId);

    // 如果有运行中的容器，先停止
    if (workspace.containerId) {
      logger.info('Workspace has running container, will be stopped', {
        workspaceId,
        containerId: workspace.containerId,
      });
      // TODO: 调用 ContainerService.stopContainer()
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { status: 'deleted' },
    });

    logger.info('Workspace deleted', { workspaceId, userId });
  }

  /**
   * 启动工作区
   */
  async start(userId: string, workspaceId: string) {
    const workspace = await this.getById(userId, workspaceId);

    if (workspace.status !== 'active') {
      throw new BadRequestError('Workspace is not in active status');
    }

    // 更新最后使用时间
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { lastUsedAt: new Date() },
    });

    // TODO: 创建或启动容器
    logger.info('Workspace started', { workspaceId, userId });

    return { message: 'Workspace started' };
  }

  /**
   * 停止工作区
   */
  async stop(userId: string, workspaceId: string) {
    const workspace = await this.getById(userId, workspaceId);

    if (!workspace.containerId) {
      logger.info('Workspace has no container to stop', { workspaceId });
      return { message: 'Workspace has no running container' };
    }

    // TODO: 停止容器
    logger.info('Workspace stopped', { workspaceId, userId });

    return { message: 'Workspace stopped' };
  }

  /**
   * 归档工作区
   */
  async archive(userId: string, workspaceId: string) {
    const workspace = await this.getById(userId, workspaceId);

    if (workspace.status !== 'active') {
      throw new BadRequestError('Only active workspaces can be archived');
    }

    // 如果有运行中的容器，先停止
    if (workspace.containerId) {
      // TODO: 停止容器
    }

    const archivedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { status: 'archived' },
    });

    logger.info('Workspace archived', { workspaceId, userId });

    return archivedWorkspace;
  }

  /**
   * 恢复已归档的工作区
   */
  async restore(userId: string, workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    if (workspace.userId !== userId) {
      throw new ForbiddenError('You do not have access to this workspace');
    }

    if (workspace.status !== 'archived') {
      throw new BadRequestError('Workspace is not archived');
    }

    // 检查活跃工作区数量
    const count = await prisma.workspace.count({
      where: { userId, status: 'active' },
    });

    if (count >= WORKSPACE_LIMITS.maxPerUser) {
      throw new BadRequestError(
        `Cannot restore: maximum number of active workspaces reached (${WORKSPACE_LIMITS.maxPerUser})`
      );
    }

    const restoredWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { status: 'active' },
    });

    logger.info('Workspace restored', { workspaceId, userId });

    return restoredWorkspace;
  }
}

export const workspaceService = new WorkspaceService();
