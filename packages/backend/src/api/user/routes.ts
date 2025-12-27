import { Router, type IRouter } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { updateProfileSchema, updateApiKeySchema } from './schema.js';
import * as controller from './controller.js';

const router: IRouter = Router();

// 所有用户路由都需要认证
router.use(authenticate);

// 用户资料
router.get('/me', controller.getProfile);
router.patch('/me', validate({ body: updateProfileSchema }), controller.updateProfile);
router.delete('/me', controller.deleteAccount);

// API Key 管理
router.put(
  '/me/api-key',
  validate({ body: updateApiKeySchema }),
  controller.updateApiKey
);
router.get('/me/api-key/status', controller.hasApiKey);

export default router;
