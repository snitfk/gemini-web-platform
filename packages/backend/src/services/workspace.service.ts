import {
  workspaceRepository,
  Workspace,
} from '../repositories/workspace.repository.js';
import { PaginatedResult } from '../repositories/base.repository.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../types/errors.js';
import logger from '../utils/logger.js';

/**
 * 工作区创建 DTO
 */
export interface CreateWorkspaceDto {
  name: string;
  description?: string;
  config?: Record<string, unknown>;
}

/**
 * 工作区更新 DTO
 */
export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
}

/**
 * 工作区配置限制
 */
const WORKSPACE_LIMITS = {
  maxPerUser: 10,
  maxNameLength: 100,
  maxDescriptionLength: 500,
  maxStorageBytes: 1024 * 1024 * 1024, // 1GB
};

/**
 * WorkspaceService
 * 工作区生命周期管理服务
 */
export class WorkspaceService {
  /**
   * 创建工作区
   */
  async createWorkspace(
    userId: string,
    dto: CreateWorkspaceDto
  ): Promise<Workspace> {
    // 检查用户的工作区数量限制
    const existingCount = await workspaceRepository.count({
      userId,
      status: 'active',
    });

    if (existingCount >= WORKSPACE_LIMITS.maxPerUser) {
      throw new BadRequestError(
        `Maximum number of workspaces reached (${WORKSPACE_LIMITS.maxPerUser})`
      );
    }

    // 验证名称长度
    if (dto.name.length > WORKSPACE_LIMITS.maxNameLength) {
      throw new BadRequestError(
        `Workspace name must be less than ${WORKSPACE_LIMITS.maxNameLength} characters`
      );
    }

    // 验证描述长度
    if (dto.description && dto.description.length > WORKSPACE_LIMITS.maxDescriptionLength) {
      throw new BadRequestError(
        `Workspace description must be less than ${WORKSPACE_LIMITS.maxDescriptionLength} characters`
      );
    }

    // 创建工作区
    const workspace = await workspaceRepository.create({
      userId,
      name: dto.name,
      description: dto.description,
      config: dto.config || {},
    });

    logger.info('Workspace created', {
      workspaceId: workspace.id,
      userId,
      name: workspace.name,
    });

    return workspace;
  }

  /**
   * 获取工作区（验证所有权）
   */
  async getWorkspace(workspaceId: string, userId: string): Promise<Workspace> {
    const workspace = await workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    if (workspace.userId !== userId) {
      throw new ForbiddenError('Access denied to this workspace');
    }

    if (workspace.status === 'deleted') {
      throw new NotFoundError('Workspace has been deleted');
    }

    return workspace;
  }

  /**
   * 获取工作区详情（包含统计信息）
   */
  async getWorkspaceDetails(workspaceId: string, userId: string): Promise<Workspace & {
    isRunning: boolean;
    storageUsedMB: number;
    storageQuotaMB: number;
  }> {
    const workspace = await this.getWorkspace(workspaceId, userId);

    return {
      ...workspace,
      isRunning: workspace.containerId !== null,
      storageUsedMB: Math.round(workspace.storageUsed / (1024 * 1024) * 100) / 100,
      storageQuotaMB: Math.round(WORKSPACE_LIMITS.maxStorageBytes / (1024 * 1024)),
    };
  }

  /**
   * 列出用户的工作区
   */
  async listUserWorkspaces(userId: string): Promise<Workspace[]> {
    return workspaceRepository.findByUserId(userId, 'active');
  }

  /**
   * 分页列出用户的工作区
   */
  async listUserWorkspacesPaginated(
    userId: string,
    page: number = 1,
    limit: number = 20,
    includeArchived: boolean = false
  ): Promise<PaginatedResult<Workspace>> {
    if (includeArchived) {
      // 获取 active 和 archived 的工作区
      const [activeResult, archivedResult] = await Promise.all([
        workspaceRepository.findByUserIdPaginated(userId, page, limit, 'active'),
        workspaceRepository.findByUserIdPaginated(userId, page, limit, 'archived'),
      ]);

      // 合并结果
      const allWorkspaces = [...activeResult.data, ...archivedResult.data]
        .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime())
        .slice(0, limit);

      return {
        data: allWorkspaces,
        total: activeResult.total + archivedResult.total,
        page,
        limit,
        totalPages: Math.ceil((activeResult.total + archivedResult.total) / limit),
      };
    }

    return workspaceRepository.findByUserIdPaginated(userId, page, limit, 'active');
  }

  /**
   * 更新工作区
   */
  async updateWorkspace(
    workspaceId: string,
    userId: string,
    dto: UpdateWorkspaceDto
  ): Promise<Workspace> {
    // 验证所有权
    await this.getWorkspace(workspaceId, userId);

    // 验证名称长度
    if (dto.name && dto.name.length > WORKSPACE_LIMITS.maxNameLength) {
      throw new BadRequestError(
        `Workspace name must be less than ${WORKSPACE_LIMITS.maxNameLength} characters`
      );
    }

    // 验证描述长度
    if (dto.description && dto.description.length > WORKSPACE_LIMITS.maxDescriptionLength) {
      throw new BadRequestError(
        `Workspace description must be less than ${WORKSPACE_LIMITS.maxDescriptionLength} characters`
      );
    }

    const workspace = await workspaceRepository.update(
      { id: workspaceId },
      dto
    );

    logger.info('Workspace updated', { workspaceId, userId });

    return workspace;
  }

  /**
   * 删除工作区（软删除）
   */
  async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    // 验证所有权
    const workspace = await this.getWorkspace(workspaceId, userId);

    // 如果有运行中的容器，先停止
    if (workspace.containerId) {
      logger.info('Stopping container before workspace deletion', {
        workspaceId,
        containerId: workspace.containerId,
      });
      // TODO: 调用 ContainerService.stopContainer()
    }

    // 软删除
    await workspaceRepository.softDelete(workspaceId);

    logger.info('Workspace deleted', { workspaceId, userId });
  }

  /**
   * 归档工作区
   */
  async archiveWorkspace(workspaceId: string, userId: string): Promise<Workspace> {
    // 验证所有权
    const workspace = await this.getWorkspace(workspaceId, userId);

    // 如果有运行中的容器，先停止
    if (workspace.containerId) {
      logger.info('Stopping container before workspace archival', {
        workspaceId,
        containerId: workspace.containerId,
      });
      // TODO: 调用 ContainerService.stopContainer()
    }

    const archivedWorkspace = await workspaceRepository.archive(workspaceId);

    logger.info('Workspace archived', { workspaceId, userId });

    return archivedWorkspace;
  }

  /**
   * 恢复已归档的工作区
   */
  async restoreWorkspace(workspaceId: string, userId: string): Promise<Workspace> {
    const workspace = await workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    if (workspace.userId !== userId) {
      throw new ForbiddenError('Access denied to this workspace');
    }

    if (workspace.status !== 'archived') {
      throw new BadRequestError('Workspace is not archived');
    }

    // 检查用户的活跃工作区数量
    const existingCount = await workspaceRepository.count({
      userId,
      status: 'active',
    });

    if (existingCount >= WORKSPACE_LIMITS.maxPerUser) {
      throw new BadRequestError(
        `Cannot restore: maximum number of active workspaces reached (${WORKSPACE_LIMITS.maxPerUser})`
      );
    }

    const restoredWorkspace = await workspaceRepository.restore(workspaceId);

    logger.info('Workspace restored', { workspaceId, userId });

    return restoredWorkspace;
  }

  /**
   * 启动工作区（创建/启动容器）
   */
  async startWorkspace(workspaceId: string, userId: string): Promise<void> {
    const workspace = await this.getWorkspace(workspaceId, userId);

    if (workspace.status !== 'active') {
      throw new BadRequestError('Workspace is not in active status');
    }

    if (workspace.containerId) {
      logger.info('Workspace container already exists', {
        workspaceId,
        containerId: workspace.containerId,
      });
      // TODO: 检查容器状态，如果已停止则启动
      // await containerService.startContainer(workspace.containerId);
    } else {
      logger.info('Creating container for workspace', { workspaceId });
      // TODO: 创建新容器
      // const container = await containerService.createContainer(workspaceId, userId);
      // await workspaceRepository.setContainerId(workspaceId, container.id);
    }

    // 更新最后使用时间
    await workspaceRepository.updateLastUsedAt(workspaceId);

    logger.info('Workspace started', { workspaceId, userId });
  }

  /**
   * 停止工作区（停止容器）
   */
  async stopWorkspace(workspaceId: string, userId: string): Promise<void> {
    const workspace = await this.getWorkspace(workspaceId, userId);

    if (!workspace.containerId) {
      logger.info('Workspace has no container to stop', { workspaceId });
      return;
    }

    logger.info('Stopping workspace container', {
      workspaceId,
      containerId: workspace.containerId,
    });

    // TODO: 停止容器
    // await containerService.stopContainer(workspace.containerId);

    logger.info('Workspace stopped', { workspaceId, userId });
  }

  /**
   * 更新工作区存储使用量
   */
  async updateStorageUsed(workspaceId: string, storageUsed: number): Promise<void> {
    await workspaceRepository.updateStorageUsed(workspaceId, storageUsed);
  }

  /**
   * 检查存储配额
   */
  async checkStorageQuota(workspaceId: string, additionalBytes: number): Promise<boolean> {
    const workspace = await workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    return (workspace.storageUsed + additionalBytes) <= WORKSPACE_LIMITS.maxStorageBytes;
  }

  /**
   * 清理空闲工作区的容器
   */
  async cleanupIdleWorkspaces(idleThresholdMs: number = 30 * 60 * 1000): Promise<number> {
    const idleWorkspaces = await workspaceRepository.findIdleWorkspaces(idleThresholdMs);

    let cleanedCount = 0;

    for (const workspace of idleWorkspaces) {
      try {
        if (workspace.containerId) {
          logger.info('Cleaning up idle workspace container', {
            workspaceId: workspace.id,
            containerId: workspace.containerId,
            lastUsedAt: workspace.lastUsedAt,
          });

          // TODO: 停止并移除容器
          // await containerService.stopContainer(workspace.containerId);
          // await workspaceRepository.setContainerId(workspace.id, null);

          cleanedCount++;
        }
      } catch (error) {
        logger.error('Failed to cleanup idle workspace', {
          workspaceId: workspace.id,
          error,
        });
      }
    }

    logger.info('Idle workspace cleanup completed', { cleanedCount });

    return cleanedCount;
  }
}

// 导出单例
export const workspaceService = new WorkspaceService();
