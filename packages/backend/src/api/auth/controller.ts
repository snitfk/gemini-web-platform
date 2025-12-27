import { Request, Response } from 'express';
import { authService } from './service.js';
import { ResponseHelper } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

/**
 * 用户注册
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  ResponseHelper.created(res, result);
});

/**
 * 用户登录
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  ResponseHelper.success(res, result);
});

/**
 * 刷新令牌
 * POST /api/auth/refresh
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshToken(refreshToken);
    ResponseHelper.success(res, tokens);
  }
);

/**
 * 登出
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await authService.logout(refreshToken);
  }
  ResponseHelper.noContent(res);
});

/**
 * 登出所有设备
 * POST /api/auth/logout-all
 */
export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAll(req.user!.id);
  ResponseHelper.noContent(res);
});

/**
 * 修改密码
 * POST /api/auth/change-password
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    ResponseHelper.success(res, { message: 'Password changed successfully' });
  }
);

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req: Request, res: Response) => {
  ResponseHelper.success(res, { user: req.user });
});
