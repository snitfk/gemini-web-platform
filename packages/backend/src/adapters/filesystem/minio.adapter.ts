import { Client } from 'minio';
import { Readable } from 'stream';
import { FileSystemAdapter, FileEdit, FileInfo } from '../types.js';
import logger from '../../utils/logger.js';

export interface MinIOConfig {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  bucket: string;
  useSSL: boolean;
}

/**
 * MinIO 文件系统适配器
 * 将文件操作桥接到 MinIO 对象存储
 */
export class MinIOFileSystemAdapter implements FileSystemAdapter {
  private client: Client;
  private bucket: string;
  private initialized = false;

  constructor(config: MinIOConfig) {
    this.client = new Client({
      endPoint: config.endpoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    this.bucket = config.bucket;
  }

  /**
   * 确保 bucket 存在
   */
  private async ensureBucket(): Promise<void> {
    if (this.initialized) return;

    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        logger.info('Created MinIO bucket', { bucket: this.bucket });
      }
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to ensure bucket', { error, bucket: this.bucket });
      throw error;
    }
  }

  /**
   * 构建对象键
   */
  private buildObjectKey(workspaceId: string, path: string): string {
    // 规范化路径
    const normalizedPath = path.replace(/^\/+/, '');
    return `workspaces/${workspaceId}/${normalizedPath}`;
  }

  /**
   * 读取文件
   */
  async readFile(workspaceId: string, path: string): Promise<string> {
    await this.ensureBucket();

    const objectKey = this.buildObjectKey(workspaceId, path);

    try {
      const stream = await this.client.getObject(this.bucket, objectKey);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        stream.on('error', reject);
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'NoSuchKey') {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  /**
   * 写入文件
   */
  async writeFile(workspaceId: string, path: string, content: string): Promise<void> {
    await this.ensureBucket();

    const objectKey = this.buildObjectKey(workspaceId, path);
    const buffer = Buffer.from(content, 'utf-8');
    const stream = Readable.from(buffer);

    await this.client.putObject(
      this.bucket,
      objectKey,
      stream,
      buffer.length,
      { 'Content-Type': this.getMimeType(path) }
    );

    logger.debug('File written', { workspaceId, path, size: buffer.length });
  }

  /**
   * 编辑文件
   */
  async editFile(workspaceId: string, path: string, edits: FileEdit[]): Promise<void> {
    // 读取现有内容
    let content: string;
    try {
      content = await this.readFile(workspaceId, path);
    } catch {
      // 如果文件不存在，从空内容开始
      content = '';
    }

    // 应用编辑
    for (const edit of edits) {
      if (content.includes(edit.oldText)) {
        content = content.replace(edit.oldText, edit.newText);
      } else {
        throw new Error(`Edit failed: could not find text to replace in ${path}`);
      }
    }

    // 写回文件
    await this.writeFile(workspaceId, path, content);
  }

  /**
   * 列出文件
   */
  async listFiles(workspaceId: string, pattern?: string): Promise<FileInfo[]> {
    await this.ensureBucket();

    const prefix = `workspaces/${workspaceId}/`;
    const files: FileInfo[] = [];

    return new Promise((resolve, reject) => {
      const stream = this.client.listObjectsV2(this.bucket, prefix, true);

      stream.on('data', (obj) => {
        if (!obj.name) return;

        const relativePath = obj.name.replace(prefix, '');

        // 如果有 pattern，进行简单匹配
        if (pattern && !this.matchPattern(relativePath, pattern)) {
          return;
        }

        files.push({
          path: relativePath,
          name: relativePath.split('/').pop() || relativePath,
          size: obj.size || 0,
          mimeType: this.getMimeType(relativePath),
          lastModified: obj.lastModified || new Date(),
        });
      });

      stream.on('end', () => resolve(files));
      stream.on('error', reject);
    });
  }

  /**
   * 删除文件
   */
  async deleteFile(workspaceId: string, path: string): Promise<void> {
    await this.ensureBucket();

    const objectKey = this.buildObjectKey(workspaceId, path);
    await this.client.removeObject(this.bucket, objectKey);

    logger.debug('File deleted', { workspaceId, path });
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(workspaceId: string, path: string): Promise<boolean> {
    await this.ensureBucket();

    const objectKey = this.buildObjectKey(workspaceId, path);

    try {
      await this.client.statObject(this.bucket, objectKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 创建目录（在对象存储中，目录是通过前缀模拟的）
   */
  async createDirectory(workspaceId: string, path: string): Promise<void> {
    await this.ensureBucket();

    // 在对象存储中，通过创建一个空的 .keep 文件来模拟目录
    const objectKey = this.buildObjectKey(workspaceId, `${path}/.keep`);
    const buffer = Buffer.from('');
    const stream = Readable.from(buffer);

    await this.client.putObject(this.bucket, objectKey, stream, 0);

    logger.debug('Directory created', { workspaceId, path });
  }

  /**
   * 简单的模式匹配
   */
  private matchPattern(path: string, pattern: string): boolean {
    // 将 glob 模式转换为正则表达式
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regexPattern}$`).test(path);
  }

  /**
   * 获取 MIME 类型
   */
  private getMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      txt: 'text/plain',
      md: 'text/markdown',
      json: 'application/json',
      js: 'application/javascript',
      ts: 'application/typescript',
      html: 'text/html',
      css: 'text/css',
      py: 'text/x-python',
      java: 'text/x-java-source',
      go: 'text/x-go',
      rs: 'text/x-rust',
      sh: 'text/x-shellscript',
      yml: 'text/yaml',
      yaml: 'text/yaml',
      xml: 'application/xml',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
