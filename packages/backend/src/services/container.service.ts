import {
  DockerClientManager,
  ContainerStats,
} from '../adapters/docker/docker-client.js';
import { workspaceRepository } from '../repositories/workspace.repository.js';
import { NotFoundError, InternalServerError } from '../types/errors.js';
import logger from '../utils/logger.js';

/**
 * 容器状态
 */
export enum ContainerStatus {
  CREATING = 'creating',
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error',
}

/**
 * 容器详情
 */
export interface ContainerDetails {
  id: string;
  workspaceId: string;
  status: ContainerStatus;
  ipAddress: string | null;
  createdAt: Date;
  stats?: ContainerStats;
}

/**
 * ContainerService
 * 容器生命周期管理服务
 */
export class ContainerService {
  /**
   * 为工作区创建并启动容器
   */
  async createContainer(workspaceId: string, userId: string): Promise<ContainerDetails> {
    logger.info('Creating container for workspace', { workspaceId, userId });

    // 获取工作区
    const workspace = await workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    if (workspace.userId !== userId) {
      throw new NotFoundError('Workspace not found');
    }

    // 检查是否已有容器
    if (workspace.containerId) {
      const existingContainer = await DockerClientManager.getWorkspaceContainer(
        workspace.containerId
      );

      if (existingContainer) {
        logger.info('Container already exists for workspace', {
          workspaceId,
          containerId: workspace.containerId,
        });

        return this.getContainerDetails(workspace.containerId, workspaceId);
      }
    }

    try {
      // 创建新容器
      const container = await DockerClientManager.createWorkspaceContainer(
        workspaceId,
        userId
      );

      // 更新工作区记录
      await workspaceRepository.setContainerId(workspaceId, container.id);
      await workspaceRepository.updateLastUsedAt(workspaceId);

      logger.info('Container created successfully', {
        workspaceId,
        containerId: container.id,
      });

      return {
        id: container.id,
        workspaceId,
        status: this.mapContainerStatus(container.status),
        ipAddress: container.ipAddress,
        createdAt: container.createdAt,
      };
    } catch (error) {
      logger.error('Failed to create container', { workspaceId, error });
      throw new InternalServerError('Failed to create container');
    }
  }

  /**
   * 获取容器详情
   */
  async getContainerDetails(containerId: string, workspaceId: string): Promise<ContainerDetails> {
    try {
      const container = await DockerClientManager.getWorkspaceContainer(containerId);

      if (!container) {
        throw new NotFoundError('Container not found');
      }

      // 获取统计信息
      let stats: ContainerStats | undefined;
      if (container.status === 'running') {
        try {
          stats = await DockerClientManager.getContainerStats(containerId);
        } catch {
          // 忽略统计信息获取失败
        }
      }

      return {
        id: containerId,
        workspaceId,
        status: this.mapContainerStatus(container.status),
        ipAddress: container.ipAddress,
        createdAt: container.createdAt,
        stats,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to get container details', { containerId, error });
      throw new InternalServerError('Failed to get container details');
    }
  }

  /**
   * 启动容器
   */
  async startContainer(containerId: string, workspaceId: string): Promise<void> {
    logger.info('Starting container', { containerId, workspaceId });

    try {
      await DockerClientManager.startContainer(containerId);

      // 更新工作区最后使用时间
      await workspaceRepository.updateLastUsedAt(workspaceId);

      logger.info('Container started', { containerId });
    } catch (error) {
      logger.error('Failed to start container', { containerId, error });
      throw new InternalServerError('Failed to start container');
    }
  }

  /**
   * 停止容器
   */
  async stopContainer(containerId: string, workspaceId: string): Promise<void> {
    logger.info('Stopping container', { containerId, workspaceId });

    try {
      await DockerClientManager.stopContainer(containerId);
      logger.info('Container stopped', { containerId });
    } catch (error) {
      logger.error('Failed to stop container', { containerId, error });
      throw new InternalServerError('Failed to stop container');
    }
  }

  /**
   * 重启容器
   */
  async restartContainer(containerId: string, workspaceId: string): Promise<void> {
    logger.info('Restarting container', { containerId, workspaceId });

    try {
      await DockerClientManager.restartContainer(containerId);

      // 更新工作区最后使用时间
      await workspaceRepository.updateLastUsedAt(workspaceId);

      logger.info('Container restarted', { containerId });
    } catch (error) {
      logger.error('Failed to restart container', { containerId, error });
      throw new InternalServerError('Failed to restart container');
    }
  }

  /**
   * 删除容器
   */
  async removeContainer(containerId: string, workspaceId: string): Promise<void> {
    logger.info('Removing container', { containerId, workspaceId });

    try {
      // 先停止容器（如果正在运行）
      const container = await DockerClientManager.getWorkspaceContainer(containerId);
      if (container && container.status === 'running') {
        await DockerClientManager.stopContainer(containerId);
      }

      // 删除容器
      await DockerClientManager.removeWorkspaceContainer(containerId, true);

      // 更新工作区记录
      await workspaceRepository.setContainerId(workspaceId, null);

      logger.info('Container removed', { containerId });
    } catch (error) {
      logger.error('Failed to remove container', { containerId, error });
      throw new InternalServerError('Failed to remove container');
    }
  }

  /**
   * 获取容器日志
   */
  async getContainerLogs(
    containerId: string,
    options: { tail?: number; since?: number } = {}
  ): Promise<string> {
    try {
      return await DockerClientManager.getContainerLogs(containerId, options);
    } catch (error) {
      logger.error('Failed to get container logs', { containerId, error });
      throw new InternalServerError('Failed to get container logs');
    }
  }

  /**
   * 在容器中执行命令
   */
  async execCommand(
    containerId: string,
    command: string[],
    workDir?: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    try {
      const result = await DockerClientManager.execInContainer(containerId, command, {
        workDir,
      });

      return result;
    } catch (error) {
      logger.error('Failed to execute command in container', {
        containerId,
        command,
        error,
      });
      throw new InternalServerError('Failed to execute command');
    }
  }

  /**
   * 获取容器统计信息
   */
  async getContainerStats(containerId: string): Promise<ContainerStats> {
    try {
      return await DockerClientManager.getContainerStats(containerId);
    } catch (error) {
      logger.error('Failed to get container stats', { containerId, error });
      throw new InternalServerError('Failed to get container stats');
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    return DockerClientManager.healthCheck();
  }

  /**
   * 映射容器状态
   */
  private mapContainerStatus(status: string): ContainerStatus {
    switch (status) {
      case 'running':
        return ContainerStatus.RUNNING;
      case 'created':
      case 'restarting':
        return ContainerStatus.CREATING;
      case 'paused':
      case 'exited':
      case 'dead':
        return ContainerStatus.STOPPED;
      default:
        return ContainerStatus.ERROR;
    }
  }
}

// 导出单例
export const containerService = new ContainerService();
