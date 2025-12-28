import { Router, type IRouter } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdParamSchema,
} from './schema.js';
import * as controller from './controller.js';

const router: IRouter = Router();

// 所有工作区路由都需要认证
router.use(authenticate);

// 工作区 CRUD
router.post('/', validate({ body: createWorkspaceSchema }), controller.create);
router.get('/', controller.list);
router.get(
  '/:id',
  validate({ params: workspaceIdParamSchema }),
  controller.getById
);
router.patch(
  '/:id',
  validate({ params: workspaceIdParamSchema, body: updateWorkspaceSchema }),
  controller.update
);
router.delete(
  '/:id',
  validate({ params: workspaceIdParamSchema }),
  controller.remove
);

// 工作区生命周期管理
router.post(
  '/:id/start',
  validate({ params: workspaceIdParamSchema }),
  controller.start
);
router.post(
  '/:id/stop',
  validate({ params: workspaceIdParamSchema }),
  controller.stop
);
router.post(
  '/:id/archive',
  validate({ params: workspaceIdParamSchema }),
  controller.archive
);
router.post(
  '/:id/restore',
  validate({ params: workspaceIdParamSchema }),
  controller.restore
);

export default router;
