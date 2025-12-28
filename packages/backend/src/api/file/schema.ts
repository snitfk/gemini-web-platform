import { z } from 'zod';

/**
 * 工作区 ID 参数 Schema
 */
export const workspaceIdParamSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

/**
 * 文件路径查询参数 Schema
 */
export const filePathQuerySchema = z.object({
  path: z.string().min(1, 'File path is required'),
});

/**
 * 文件列表查询参数 Schema
 */
export const listFilesQuerySchema = z.object({
  pattern: z.string().optional(),
});

/**
 * 写入文件 Schema
 */
export const writeFileSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  content: z.string(),
  mimeType: z.string().optional(),
});

/**
 * 编辑文件 Schema
 */
export const editFileSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  edits: z.array(
    z.object({
      oldText: z.string(),
      newText: z.string(),
    })
  ).min(1, 'At least one edit is required'),
});

/**
 * 创建目录 Schema
 */
export const createDirectorySchema = z.object({
  path: z.string().min(1, 'Directory path is required'),
});

// 类型导出
export type WorkspaceIdParam = z.infer<typeof workspaceIdParamSchema>;
export type FilePathQuery = z.infer<typeof filePathQuerySchema>;
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;
export type WriteFileInput = z.infer<typeof writeFileSchema>;
export type EditFileInput = z.infer<typeof editFileSchema>;
export type CreateDirectoryInput = z.infer<typeof createDirectorySchema>;
