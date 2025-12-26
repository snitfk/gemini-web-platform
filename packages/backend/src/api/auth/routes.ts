import { Router } from 'express';

import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { authService } from '../../services/auth.service.js';
import { ResponseHelper } from '../../utils/response.js';

import { registerSchema, loginSchema, refreshTokenSchema } from './schemas.js';

const router = Router();

/**
 * 注册
 */
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);

    ResponseHelper.created(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  })
);

/**
 * 登录
 */
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);

    ResponseHelper.success(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  })
);

/**
 * 刷新访问令牌
 */
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshAccessToken(refreshToken);

    ResponseHelper.success(res, tokens);
  })
);

/**
 * 登出
 */
router.post(
  '/logout',
  validate(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);

    ResponseHelper.success(res, { message: 'Logged out successfully' });
  })
);

/**
 * 登出所有设备
 */
router.post(
  '/logout-all',
  authenticate,
  asyncHandler(async (req, res) => {
    await authService.logoutAll(req.user!.id);

    ResponseHelper.success(res, { message: 'Logged out from all devices' });
  })
);

/**
 * 获取当前用户信息
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const { passwordHash, ...user } = req.user!;

    ResponseHelper.success(res, { user });
  })
);

export default router;
