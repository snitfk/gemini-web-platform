import { workspaceRepository } from '../repositories/workspace.repository.js';
import { ForbiddenError, NotFoundError } from '../types/errors.js';
import logger from '../utils/logger.js';

/**
 * 资源类型
 */
export enum ResourceType {
  WORKSPACE = 'workspace',
  CONTAINER = 'container',
  FILE = 'file',
  CHAT_SESSION = 'chat_session',
}

/**
 * 操作类型
 */
export enum ActionType {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  EXECUTE = 'execute',
  ADMIN = 'admin',
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * 资源上下文
 */
export interface ResourceContext {
  resourceType: ResourceType;
  resourceId: string;
  action: ActionType;
  userId: string;
  metadata?: Record<string, unknown>;
}

/**
 * PermissionService
 * 权限管理服务，处理资源级别的访问控制
 */
export class PermissionService {
  /**
   * 检查用户是否有权限访问资源
   */
  async checkPermission(context: ResourceContext): Promise<PermissionCheckResult> {
    const { resourceType, resourceId, action, userId } = context;

    logger.debug('Checking permission', { resourceType, resourceId, action, userId });

    switch (resourceType) {
      case ResourceType.WORKSPACE:
        return this.checkWorkspacePermission(resourceId, userId, action);
      case ResourceType.CONTAINER:
        return this.checkContainerPermission(resourceId, userId, action);
      case ResourceType.FILE:
        return this.checkFilePermission(resourceId, userId, action);
      case ResourceType.CHAT_SESSION:
        return this.checkChatSessionPermission(resourceId, userId, action);
      default:
        return { allowed: false, reason: 'Unknown resource type' };
    }
  }

  /**
   * 检查并确保权限，如果无权限则抛出异常
   */
  async enforcePermission(context: ResourceContext): Promise<void> {
    const result = await this.checkPermission(context);

    if (!result.allowed) {
      logger.warn('Permission denied', { ...context, reason: result.reason });
      throw new ForbiddenError(result.reason || 'Permission denied');
    }
  }

  /**
   * 检查工作区权限
   */
  private async checkWorkspacePermission(
    workspaceId: string,
    userId: string,
    action: ActionType
  ): Promise<PermissionCheckResult> {
    const workspace = await workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    // 检查是否是工作区所有者
    if (workspace.userId !== userId) {
      return { allowed: false, reason: 'You do not own this workspace' };
    }

    // 检查工作区状态
    if (workspace.status === 'deleted') {
      return { allowed: false, reason: 'Workspace has been deleted' };
    }

    // 对于已归档的工作区，只允许读取和恢复操作
    if (workspace.status === 'archived') {
      if (action !== ActionType.READ && action !== ActionType.ADMIN) {
        return { allowed: false, reason: 'Workspace is archived. Restore it first.' };
      }
    }

    return { allowed: true };
  }

  /**
   * 检查容器权限（通过工作区）
   */
  private async checkContainerPermission(
    workspaceId: string,
    userId: string,
    action: ActionType
  ): Promise<PermissionCheckResult> {
    // 容器权限依赖于工作区权限
    const workspaceResult = await this.checkWorkspacePermission(workspaceId, userId, action);

    if (!workspaceResult.allowed) {
      return workspaceResult;
    }

    // 对于执行操作，需要额外检查工作区是否处于活跃状态
    if (action === ActionType.EXECUTE) {
      const workspace = await workspaceRepository.findById(workspaceId);
      if (workspace?.status !== 'active') {
        return { allowed: false, reason: 'Workspace must be active to execute commands' };
      }
    }

    return { allowed: true };
  }

  /**
   * 检查文件权限（通过工作区）
   */
  private async checkFilePermission(
    workspaceId: string,
    userId: string,
    action: ActionType
  ): Promise<PermissionCheckResult> {
    // 文件权限依赖于工作区权限
    return this.checkWorkspacePermission(workspaceId, userId, action);
  }

  /**
   * 检查聊天会话权限
   */
  private async checkChatSessionPermission(
    workspaceId: string,
    userId: string,
    action: ActionType
  ): Promise<PermissionCheckResult> {
    // 聊天会话权限依赖于工作区权限
    return this.checkWorkspacePermission(workspaceId, userId, action);
  }

  /**
   * 获取用户的所有工作区 ID
   */
  async getUserWorkspaceIds(userId: string): Promise<string[]> {
    const workspaces = await workspaceRepository.findByUserId(userId);

    return workspaces.map(w => w.id);
  }

  /**
   * 检查用户是否可以创建更多工作区
   */
  async canCreateWorkspace(userId: string): Promise<PermissionCheckResult> {
    const count = await workspaceRepository.count({
      userId,
      status: { not: 'deleted' },
    } as never);

    const maxWorkspaces = 10; // 最大工作区数量限制

    if (count >= maxWorkspaces) {
      return {
        allowed: false,
        reason: `Maximum number of workspaces (${maxWorkspaces}) reached`,
      };
    }

    return { allowed: true };
  }

  /**
   * 检查存储配额
   */
  async checkStorageQuota(
    workspaceId: string,
    additionalBytes: number
  ): Promise<PermissionCheckResult> {
    const workspace = await workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const quotaBytes = 1024 * 1024 * 1024; // 1GB 配额
    const projectedUsage = workspace.storageUsed + additionalBytes;

    if (projectedUsage > quotaBytes) {
      return {
        allowed: false,
        reason: `Storage quota exceeded. Used: ${workspace.storageUsed}, Quota: ${quotaBytes}`,
      };
    }

    return { allowed: true };
  }
}

// 导出单例
export const permissionService = new PermissionService();
