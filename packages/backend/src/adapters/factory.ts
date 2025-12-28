import { FileSystemAdapter, ShellAdapter, WebToolsAdapter } from './types.js';
import { MinIOFileSystemAdapter } from './filesystem/minio.adapter.js';
import { DockerShellAdapter } from './shell/docker.adapter.js';
import { WebToolsAdapterImpl } from './web/web.adapter.js';
import { config } from '../config/index.js';

/**
 * 适配器工厂
 * 管理和提供各种适配器的单例实例
 */
export class AdapterFactory {
  private static fileSystemAdapter: FileSystemAdapter | null = null;
  private static shellAdapter: ShellAdapter | null = null;
  private static webToolsAdapter: WebToolsAdapter | null = null;

  /**
   * 获取文件系统适配器
   */
  static getFileSystemAdapter(): FileSystemAdapter {
    if (!this.fileSystemAdapter) {
      this.fileSystemAdapter = new MinIOFileSystemAdapter({
        endpoint: config.minio.endpoint,
        port: config.minio.port,
        accessKey: config.minio.accessKey,
        secretKey: config.minio.secretKey,
        bucket: config.minio.bucket,
        useSSL: config.minio.useSSL,
      });
    }
    return this.fileSystemAdapter;
  }

  /**
   * 获取 Shell 适配器
   */
  static getShellAdapter(): ShellAdapter {
    if (!this.shellAdapter) {
      this.shellAdapter = new DockerShellAdapter({
        host: config.docker.host,
        sandboxImage: config.docker.sandboxImage,
        memoryLimit: config.docker.sandboxMemoryLimit,
        cpuLimit: config.docker.sandboxCpuLimit,
      });
    }
    return this.shellAdapter;
  }

  /**
   * 获取 Web 工具适配器
   */
  static getWebToolsAdapter(): WebToolsAdapter {
    if (!this.webToolsAdapter) {
      this.webToolsAdapter = new WebToolsAdapterImpl();
    }
    return this.webToolsAdapter;
  }

  /**
   * 重置所有适配器（用于测试）
   */
  static reset(): void {
    this.fileSystemAdapter = null;
    this.shellAdapter = null;
    this.webToolsAdapter = null;
  }
}
