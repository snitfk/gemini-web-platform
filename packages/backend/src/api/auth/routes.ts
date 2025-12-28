import { Router, type IRouter } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from './schema.js';
import * as controller from './controller.js';

const router: IRouter = Router();

// 公开路由
router.post('/register', validate({ body: registerSchema }), controller.register);
router.post('/login', validate({ body: loginSchema }), controller.login);
router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  controller.refreshToken
);
router.post('/logout', controller.logout);

// 需要认证的路由
router.get('/me', authenticate, controller.me);
router.post('/logout-all', authenticate, controller.logoutAll);
router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  controller.changePassword
);

export default router;
