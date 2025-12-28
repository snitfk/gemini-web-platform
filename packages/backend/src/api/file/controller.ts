import { Request, Response } from 'express';
import { fileService } from '../../services/file.service.js';
import { ResponseHelper } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

/**
 * 读取文件
 * GET /api/workspaces/:workspaceId/files
 */
export const readFile = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { path } = req.query;

  const result = await fileService.readFile(
    workspaceId,
    req.user!.id,
    path as string
  );

  ResponseHelper.success(res, result);
});

/**
 * 写入文件
 * POST /api/workspaces/:workspaceId/files
 */
export const writeFile = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { path, content, mimeType } = req.body;

  const result = await fileService.writeFile(
    workspaceId,
    req.user!.id,
    path,
    content,
    mimeType
  );

  ResponseHelper.created(res, result);
});

/**
 * 编辑文件
 * PATCH /api/workspaces/:workspaceId/files
 */
export const editFile = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { path, edits } = req.body;

  await fileService.editFile(workspaceId, req.user!.id, path, edits);

  ResponseHelper.success(res, { message: 'File edited successfully' });
});

/**
 * 删除文件
 * DELETE /api/workspaces/:workspaceId/files
 */
export const deleteFile = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { path } = req.query;

  await fileService.deleteFile(workspaceId, req.user!.id, path as string);

  ResponseHelper.noContent(res);
});

/**
 * 列出文件
 * GET /api/workspaces/:workspaceId/files/list
 */
export const listFiles = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { pattern } = req.query;

  const files = await fileService.listFiles(
    workspaceId,
    req.user!.id,
    pattern as string | undefined
  );

  ResponseHelper.success(res, { files });
});

/**
 * 检查文件是否存在
 * HEAD /api/workspaces/:workspaceId/files
 */
export const fileExists = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { path } = req.query;

  const exists = await fileService.fileExists(
    workspaceId,
    req.user!.id,
    path as string
  );

  if (exists) {
    res.status(200).end();
  } else {
    res.status(404).end();
  }
});

/**
 * 创建目录
 * POST /api/workspaces/:workspaceId/files/directory
 */
export const createDirectory = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { path } = req.body;

  await fileService.createDirectory(workspaceId, req.user!.id, path);

  ResponseHelper.created(res, { message: 'Directory created successfully' });
});

/**
 * 获取存储统计
 * GET /api/workspaces/:workspaceId/files/stats
 */
export const getStorageStats = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;

  const stats = await fileService.getStorageStats(workspaceId, req.user!.id);

  ResponseHelper.success(res, stats);
});
