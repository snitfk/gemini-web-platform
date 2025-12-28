import { config } from '../../config/index.js';
import logger from '../../utils/logger.js';

/**
 * Docker 容器配置
 */
export interface ContainerConfig {
  workspaceId: string;
  userId: string;
  image: string;
  memoryLimit: string;
  cpuLimit: number;
  env?: Record<string, string>;
  volumes?: Array<{ source: string; target: string }>;
}

/**
 * 容器信息
 */
export interface ContainerInfo {
  id: string;
  name: string;
  status: 'created' | 'running' | 'paused' | 'restarting' | 'exited' | 'dead';
  ipAddress: string | null;
  createdAt: Date;
  ports: Array<{ container: number; host: number }>;
}

/**
 * 容器统计信息
 */
export interface ContainerStats {
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRx: number;
  networkTx: number;
}

/**
 * 执行结果
 */
export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Docker 客户端管理器
 * 管理与 Docker 守护进程的交互
 *
 * 注意: 这是一个模拟实现，生产环境需要集成真实的 Docker API (dockerode)
 */
export class DockerClientManager {
  private static containers = new Map<string, ContainerInfo>();

  /**
   * 获取 Docker 客户端
   */
  private static getDockerHost(): string {
    return config.docker.host;
  }

  /**
   * 创建工作区容器
   */
  static async createWorkspaceContainer(
    workspaceId: string,
    userId: string,
    _customConfig?: Partial<ContainerConfig>
  ): Promise<ContainerInfo> {
    const containerName = `workspace-${workspaceId}`;

    logger.info('Creating workspace container', {
      workspaceId,
      userId,
      containerName,
      image: config.docker.sandboxImage,
    });

    // 模拟创建容器
    const containerId = `container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const containerInfo: ContainerInfo = {
      id: containerId,
      name: containerName,
      status: 'running',
      ipAddress: `172.17.0.${Math.floor(Math.random() * 254) + 1}`,
      createdAt: new Date(),
      ports: [
        { container: 22, host: 20000 + Math.floor(Math.random() * 10000) },
      ],
    };

    this.containers.set(containerId, containerInfo);

    logger.info('Container created successfully', {
      containerId,
      workspaceId,
      status: containerInfo.status,
    });

    return containerInfo;
  }

  /**
   * 获取工作区容器
   */
  static async getWorkspaceContainer(containerId: string): Promise<ContainerInfo | null> {
    return this.containers.get(containerId) || null;
  }

  /**
   * 启动容器
   */
  static async startContainer(containerId: string): Promise<void> {
    const container = this.containers.get(containerId);

    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }

    if (container.status === 'running') {
      logger.info('Container already running', { containerId });
      return;
    }

    container.status = 'running';
    this.containers.set(containerId, container);

    logger.info('Container started', { containerId });
  }

  /**
   * 停止容器
   */
  static async stopContainer(containerId: string, timeout: number = 10): Promise<void> {
    const container = this.containers.get(containerId);

    if (!container) {
      logger.warn('Container not found, skipping stop', { containerId });
      return;
    }

    if (container.status !== 'running') {
      logger.info('Container not running, skipping stop', { containerId, status: container.status });
      return;
    }

    // 模拟停止延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    container.status = 'exited';
    this.containers.set(containerId, container);

    logger.info('Container stopped', { containerId, timeout });
  }

  /**
   * 重启容器
   */
  static async restartContainer(containerId: string, timeout: number = 10): Promise<void> {
    await this.stopContainer(containerId, timeout);
    await this.startContainer(containerId);

    logger.info('Container restarted', { containerId });
  }

  /**
   * 删除容器
   */
  static async removeWorkspaceContainer(containerId: string, force: boolean = false): Promise<void> {
    const container = this.containers.get(containerId);

    if (!container) {
      logger.warn('Container not found, skipping removal', { containerId });
      return;
    }

    if (container.status === 'running' && !force) {
      throw new Error(`Container ${containerId} is running. Stop it first or use force=true`);
    }

    this.containers.delete(containerId);

    logger.info('Container removed', { containerId, force });
  }

  /**
   * 获取容器统计信息
   */
  static async getContainerStats(containerId: string): Promise<ContainerStats> {
    const container = this.containers.get(containerId);

    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }

    // 模拟统计信息
    return {
      cpuPercent: Math.random() * 50,
      memoryUsage: Math.floor(Math.random() * 256 * 1024 * 1024),
      memoryLimit: 512 * 1024 * 1024,
      memoryPercent: Math.random() * 50,
      networkRx: Math.floor(Math.random() * 1024 * 1024),
      networkTx: Math.floor(Math.random() * 1024 * 1024),
    };
  }

  /**
   * 获取容器日志
   */
  static async getContainerLogs(
    containerId: string,
    options: { tail?: number; since?: number; follow?: boolean } = {}
  ): Promise<string> {
    const container = this.containers.get(containerId);

    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }

    // 模拟日志输出
    const logs: string[] = [];
    const lineCount = options.tail || 10;

    for (let i = 0; i < lineCount; i++) {
      const timestamp = new Date(Date.now() - (lineCount - i) * 1000).toISOString();
      logs.push(`${timestamp} [INFO] Container log line ${i + 1}`);
    }

    return logs.join('\n');
  }

  /**
   * 在容器中执行命令
   */
  static async execInContainer(
    containerId: string,
    command: string[],
    options: { workDir?: string; env?: Record<string, string>; timeout?: number } = {}
  ): Promise<ExecResult> {
    const container = this.containers.get(containerId);

    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }

    if (container.status !== 'running') {
      throw new Error(`Container ${containerId} is not running`);
    }

    logger.debug('Executing command in container', {
      containerId,
      command: command.join(' '),
      workDir: options.workDir,
    });

    // 模拟命令执行
    const cmd = command.join(' ');
    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    if (cmd.startsWith('echo ')) {
      stdout = cmd.substring(5);
    } else if (cmd === 'pwd') {
      stdout = options.workDir || '/workspace';
    } else if (cmd === 'ls' || cmd.startsWith('ls ')) {
      stdout = 'file1.txt\nfile2.js\nnode_modules\npackage.json';
    } else if (cmd === 'whoami') {
      stdout = 'sandbox';
    } else if (cmd.includes('error') || cmd.includes('fail')) {
      stderr = 'Command failed';
      exitCode = 1;
    } else {
      stdout = `Executed: ${cmd}`;
    }

    return { exitCode, stdout, stderr };
  }

  /**
   * 复制文件到容器
   */
  static async copyToContainer(
    containerId: string,
    sourcePath: string,
    containerPath: string
  ): Promise<void> {
    const container = this.containers.get(containerId);

    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }

    logger.debug('Copying file to container', {
      containerId,
      sourcePath,
      containerPath,
    });

    // 模拟复制操作
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * 从容器复制文件
   */
  static async copyFromContainer(
    containerId: string,
    containerPath: string,
    destPath: string
  ): Promise<void> {
    const container = this.containers.get(containerId);

    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }

    logger.debug('Copying file from container', {
      containerId,
      containerPath,
      destPath,
    });

    // 模拟复制操作
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * 列出所有容器
   */
  static async listContainers(all: boolean = false): Promise<ContainerInfo[]> {
    const containers = Array.from(this.containers.values());

    if (all) {
      return containers;
    }

    return containers.filter(c => c.status === 'running');
  }

  /**
   * 清理所有容器（测试用）
   */
  static clearAll(): void {
    this.containers.clear();
    logger.info('All containers cleared');
  }

  /**
   * 健康检查
   */
  static async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      // 在生产环境中，这里会真正连接 Docker 守护进程
      const dockerHost = this.getDockerHost();

      logger.debug('Docker health check', { dockerHost });

      return {
        healthy: true,
        message: `Docker daemon at ${dockerHost} is healthy`,
      };
    } catch (error) {
      logger.error('Docker health check failed', { error });

      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
