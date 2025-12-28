import { AdapterFactory } from '../adapters/factory.js';
import { FileSystemAdapter, FileInfo, FileEdit } from '../adapters/types.js';
import { workspaceRepository } from '../repositories/workspace.repository.js';
import { prisma } from '../utils/prisma.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../types/errors.js';
import logger from '../utils/logger.js';
import * as path from 'path';
import { getWebSocketService } from './websocket.service.js';

/**
 * 文件上传输入
 */
export interface FileUploadInput {
  workspaceId: string;
  path: string;
  content: string;
  mimeType?: string;
}

/**
 * 文件元数据
 */
export interface FileMetadata {
  id: string;
  workspaceId: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 文件存储配置
 */
const FILE_LIMITS = {
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  maxPathLength: 500,
  forbiddenExtensions: ['.exe', '.bat', '.sh', '.ps1', '.cmd'],
  forbiddenPaths: ['..', '~', '$'],
};

/**
 * FileService
 * 文件存储服务，提供文件的增删改查功能
 */
export class FileService {
  private fsAdapter: FileSystemAdapter;

  constructor() {
    this.fsAdapter = AdapterFactory.getFileSystemAdapter();
  }

  /**
   * 验证工作区访问权限
   */
  private async validateWorkspaceAccess(workspaceId: string, userId: string): Promise<void> {
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
  }

  /**
   * 验证文件路径
   */
  private validatePath(filePath: string): void {
    if (filePath.length > FILE_LIMITS.maxPathLength) {
      throw new BadRequestError(`Path too long (max ${FILE_LIMITS.maxPathLength} characters)`);
    }

    // 检查禁止的路径模式
    for (const pattern of FILE_LIMITS.forbiddenPaths) {
      if (filePath.includes(pattern)) {
        throw new BadRequestError(`Path contains forbidden pattern: ${pattern}`);
      }
    }

    // 检查禁止的文件扩展名
    const ext = path.extname(filePath).toLowerCase();
    if (FILE_LIMITS.forbiddenExtensions.includes(ext)) {
      throw new BadRequestError(`File extension not allowed: ${ext}`);
    }
  }

  /**
   * 读取文件
   */
  async readFile(
    workspaceId: string,
    userId: string,
    filePath: string
  ): Promise<{ content: string; metadata: FileInfo }> {
    await this.validateWorkspaceAccess(workspaceId, userId);
    this.validatePath(filePath);

    logger.debug('Reading file', { workspaceId, filePath });

    try {
      const content = await this.fsAdapter.readFile(workspaceId, filePath);

      // 获取文件信息
      const files = await this.fsAdapter.listFiles(workspaceId, filePath);
      const metadata = files.find(f => f.path === filePath) || {
        name: path.basename(filePath),
        path: filePath,
        size: Buffer.byteLength(content, 'utf8'),
        mimeType: 'text/plain',
        lastModified: new Date(),
      };

      return { content, metadata };
    } catch (error) {
      logger.error('Failed to read file', { workspaceId, filePath, error });
      throw new NotFoundError(`File not found: ${filePath}`);
    }
  }

  /**
   * 写入文件
   */
  async writeFile(
    workspaceId: string,
    userId: string,
    filePath: string,
    content: string,
    mimeType?: string
  ): Promise<FileInfo> {
    await this.validateWorkspaceAccess(workspaceId, userId);
    this.validatePath(filePath);

    // 验证文件大小
    const size = Buffer.byteLength(content, 'utf8');
    if (size > FILE_LIMITS.maxFileSizeBytes) {
      throw new BadRequestError(
        `File too large (max ${FILE_LIMITS.maxFileSizeBytes / 1024 / 1024}MB)`
      );
    }

    // 检查存储配额
    const workspace = await workspaceRepository.findById(workspaceId);
    if (workspace) {
      const projectedUsage = workspace.storageUsed + size;
      // 假设 1GB 配额
      if (projectedUsage > 1024 * 1024 * 1024) {
        throw new BadRequestError('Storage quota exceeded');
      }
    }

    logger.info('Writing file', { workspaceId, filePath, size });

    try {
      await this.fsAdapter.writeFile(workspaceId, filePath, content);

      // 更新数据库记录
      const file = await prisma.file.create({
        data: {
          workspaceId,
          name: path.basename(filePath),
          path: filePath,
          mimeType: mimeType || this.getMimeType(filePath),
          size,
          storageKey: `${workspaceId}/${filePath}`,
        },
      });

      // 更新工作区存储使用量
      if (workspace) {
        await workspaceRepository.updateStorageUsed(workspaceId, workspace.storageUsed + size);
      }

      logger.info('File written successfully', { workspaceId, filePath, fileId: file.id });

      // Broadcast file change via WebSocket
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.sendFileChange(workspaceId, {
          workspaceId,
          action: 'created',
          path: filePath,
          metadata: {
            size: file.size,
            mimeType: file.mimeType,
            lastModified: file.updatedAt.toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        name: file.name,
        path: file.path,
        size: file.size,
        mimeType: file.mimeType,
        lastModified: file.updatedAt,
      };
    } catch (error) {
      logger.error('Failed to write file', { workspaceId, filePath, error });
      throw error;
    }
  }

  /**
   * 编辑文件
   */
  async editFile(
    workspaceId: string,
    userId: string,
    filePath: string,
    edits: FileEdit[]
  ): Promise<void> {
    await this.validateWorkspaceAccess(workspaceId, userId);
    this.validatePath(filePath);

    logger.info('Editing file', { workspaceId, filePath, editsCount: edits.length });

    try {
      await this.fsAdapter.editFile(workspaceId, filePath, edits);
      logger.info('File edited successfully', { workspaceId, filePath });

      // Broadcast file change via WebSocket
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.sendFileChange(workspaceId, {
          workspaceId,
          action: 'updated',
          path: filePath,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Failed to edit file', { workspaceId, filePath, error });
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(
    workspaceId: string,
    userId: string,
    filePath: string
  ): Promise<void> {
    await this.validateWorkspaceAccess(workspaceId, userId);
    this.validatePath(filePath);

    logger.info('Deleting file', { workspaceId, filePath });

    try {
      // 获取文件大小以更新存储使用量
      const files = await this.fsAdapter.listFiles(workspaceId, filePath);
      const file = files.find(f => f.path === filePath);
      const fileSize = file?.size || 0;

      await this.fsAdapter.deleteFile(workspaceId, filePath);

      // 删除数据库记录
      await prisma.file.deleteMany({
        where: {
          workspaceId,
          path: filePath,
        },
      });

      // 更新工作区存储使用量
      const workspace = await workspaceRepository.findById(workspaceId);
      if (workspace && fileSize > 0) {
        const newUsage = Math.max(0, workspace.storageUsed - fileSize);
        await workspaceRepository.updateStorageUsed(workspaceId, newUsage);
      }

      logger.info('File deleted successfully', { workspaceId, filePath });

      // Broadcast file change via WebSocket
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.sendFileChange(workspaceId, {
          workspaceId,
          action: 'deleted',
          path: filePath,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Failed to delete file', { workspaceId, filePath, error });
      throw error;
    }
  }

  /**
   * 列出文件
   */
  async listFiles(
    workspaceId: string,
    userId: string,
    pattern?: string
  ): Promise<FileInfo[]> {
    await this.validateWorkspaceAccess(workspaceId, userId);

    logger.debug('Listing files', { workspaceId, pattern });

    try {
      const files = await this.fsAdapter.listFiles(workspaceId, pattern);
      return files;
    } catch (error) {
      logger.error('Failed to list files', { workspaceId, pattern, error });
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(
    workspaceId: string,
    userId: string,
    filePath: string
  ): Promise<boolean> {
    await this.validateWorkspaceAccess(workspaceId, userId);
    this.validatePath(filePath);

    try {
      return await this.fsAdapter.fileExists(workspaceId, filePath);
    } catch {
      return false;
    }
  }

  /**
   * 创建目录
   */
  async createDirectory(
    workspaceId: string,
    userId: string,
    dirPath: string
  ): Promise<void> {
    await this.validateWorkspaceAccess(workspaceId, userId);
    this.validatePath(dirPath);

    logger.info('Creating directory', { workspaceId, dirPath });

    try {
      await this.fsAdapter.createDirectory(workspaceId, dirPath);
      logger.info('Directory created successfully', { workspaceId, dirPath });
    } catch (error) {
      logger.error('Failed to create directory', { workspaceId, dirPath, error });
      throw error;
    }
  }

  /**
   * 获取工作区存储统计
   */
  async getStorageStats(
    workspaceId: string,
    userId: string
  ): Promise<{ used: number; quota: number; files: number }> {
    await this.validateWorkspaceAccess(workspaceId, userId);

    const workspace = await workspaceRepository.findById(workspaceId);
    const fileCount = await prisma.file.count({ where: { workspaceId } });

    return {
      used: workspace?.storageUsed || 0,
      quota: 1024 * 1024 * 1024, // 1GB
      files: fileCount,
    };
  }

  /**
   * 根据文件扩展名获取 MIME 类型
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.md': 'text/markdown',
      '.py': 'text/x-python',
      '.rb': 'text/x-ruby',
      '.java': 'text/x-java',
      '.go': 'text/x-go',
      '.rs': 'text/x-rust',
      '.c': 'text/x-c',
      '.cpp': 'text/x-c++',
      '.h': 'text/x-c',
      '.hpp': 'text/x-c++',
      '.yaml': 'text/yaml',
      '.yml': 'text/yaml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}

// 导出单例
export const fileService = new FileService();
