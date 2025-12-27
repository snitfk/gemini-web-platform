import { Request, Response } from 'express';
import { userService } from './service.js';
import { ResponseHelper } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

/**
 * 获取当前用户详情
 * GET /api/users/me
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.user!.id);
  ResponseHelper.success(res, user);
});

/**
 * 更新用户资料
 * PATCH /api/users/me
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await userService.updateProfile(req.user!.id, req.body);
    ResponseHelper.success(res, user);
  }
);

/**
 * 更新 Gemini API Key
 * PUT /api/users/me/api-key
 */
export const updateApiKey = asyncHandler(
  async (req: Request, res: Response) => {
    const { geminiApiKey } = req.body;
    const result = await userService.updateApiKey(req.user!.id, geminiApiKey);
    ResponseHelper.success(res, result);
  }
);

/**
 * 检查是否有 API Key
 * GET /api/users/me/api-key/status
 */
export const hasApiKey = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.hasApiKey(req.user!.id);
  ResponseHelper.success(res, result);
});

/**
 * 删除用户账户
 * DELETE /api/users/me
 */
export const deleteAccount = asyncHandler(
  async (req: Request, res: Response) => {
    await userService.deleteAccount(req.user!.id);
    ResponseHelper.noContent(res);
  }
);
