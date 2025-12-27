import { Request, Response } from 'express';
import { workspaceService } from './service.js';
import { ResponseHelper } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { paginationSchema } from '../../utils/pagination.js';

/**
 * 创建工作区
 * POST /api/workspaces
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await workspaceService.create(req.user!.id, req.body);
  ResponseHelper.created(res, workspace);
});

/**
 * 获取工作区列表
 * GET /api/workspaces
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = paginationSchema.parse(req.query);
  const result = await workspaceService.list(req.user!.id, query);
  res.json({
    success: true,
    ...result,
  });
});

/**
 * 获取工作区详情
 * GET /api/workspaces/:id
 */
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await workspaceService.getById(req.user!.id, req.params.id);
  ResponseHelper.success(res, workspace);
});

/**
 * 更新工作区
 * PATCH /api/workspaces/:id
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await workspaceService.update(
    req.user!.id,
    req.params.id,
    req.body
  );
  ResponseHelper.success(res, workspace);
});

/**
 * 删除工作区
 * DELETE /api/workspaces/:id
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await workspaceService.delete(req.user!.id, req.params.id);
  ResponseHelper.noContent(res);
});
