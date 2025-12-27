import { ShellAdapter, ShellExecuteOptions, ShellOutput } from '../types.js';
import logger from '../../utils/logger.js';

export interface DockerConfig {
  host: string;
  sandboxImage: string;
  memoryLimit: string;
  cpuLimit: number;
}

/**
 * Docker Shell 适配器
 * 在隔离的 Docker 容器中执行 shell 命令
 *
 * 注意: 这是一个简化的实现，生产环境需要更完善的容器管理
 */
export class DockerShellAdapter implements ShellAdapter {
  private runningProcesses = new Map<string, { workspaceId: string; containerId?: string }>();

  // Config stored for future production Docker integration
  constructor(_config: DockerConfig) {
    // In production, config would be used for container settings
    void _config;
  }

  /**
   * 执行命令
   */
  async *execute(
    workspaceId: string,
    command: string,
    _options?: ShellExecuteOptions
  ): AsyncIterable<ShellOutput> {
    const processId = `${workspaceId}-${Date.now()}`;

    logger.info('Executing shell command', { workspaceId, command, processId });

    try {
      // 在生产环境中，这里应该创建 Docker 容器并执行命令
      // 目前使用模拟实现用于开发和测试

      this.runningProcesses.set(processId, { workspaceId });

      // 模拟命令执行
      yield { type: 'stdout', data: `Executing: ${command}\n` };

      // 模拟一些输出
      if (command.startsWith('echo ')) {
        const output = command.substring(5).replace(/['"]/g, '');
        yield { type: 'stdout', data: `${output}\n` };
      } else if (command === 'ls' || command.startsWith('ls ')) {
        yield { type: 'stdout', data: 'file1.txt\nfile2.txt\nfolder/\n' };
      } else if (command === 'pwd') {
        yield { type: 'stdout', data: `/workspaces/${workspaceId}\n` };
      } else {
        yield { type: 'stdout', data: `[Mock] Command executed: ${command}\n` };
      }

      yield { type: 'exit', data: 0 };
    } catch (error) {
      logger.error('Shell execution error', { error, workspaceId, command });
      yield { type: 'stderr', data: `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n` };
      yield { type: 'exit', data: 1 };
    } finally {
      this.runningProcesses.delete(processId);
    }
  }

  /**
   * 终止进程
   */
  async kill(workspaceId: string, processId: string): Promise<void> {
    const process = this.runningProcesses.get(processId);

    if (!process) {
      logger.warn('Process not found for kill', { workspaceId, processId });
      return;
    }

    if (process.workspaceId !== workspaceId) {
      throw new Error('Process does not belong to this workspace');
    }

    // 在生产环境中，这里应该终止 Docker 容器
    this.runningProcesses.delete(processId);

    logger.info('Process killed', { workspaceId, processId });
  }

  /**
   * 获取正在运行的进程列表
   */
  getRunningProcesses(workspaceId: string): string[] {
    const processes: string[] = [];

    for (const [processId, info] of this.runningProcesses) {
      if (info.workspaceId === workspaceId) {
        processes.push(processId);
      }
    }

    return processes;
  }
}
