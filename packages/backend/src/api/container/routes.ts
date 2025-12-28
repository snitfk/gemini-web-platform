import { Router, type IRouter } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { workspaceIdParamSchema, execCommandSchema } from './schema.js';
import * as controller from './controller.js';

const router: IRouter = Router();

// 所有容器路由需要认证
router.use(authenticate);

// 健康检查
router.get('/health', controller.healthCheck);

// 工作区容器管理 (嵌套在 /api/workspaces 下)
// POST /api/workspaces/:workspaceId/container - 创建容器
router.post(
  '/:workspaceId/container',
  validate({ params: workspaceIdParamSchema }),
  controller.create
);

// GET /api/workspaces/:workspaceId/container - 获取容器信息
router.get(
  '/:workspaceId/container',
  validate({ params: workspaceIdParamSchema }),
  controller.get
);

// POST /api/workspaces/:workspaceId/container/start - 启动容器
router.post(
  '/:workspaceId/container/start',
  validate({ params: workspaceIdParamSchema }),
  controller.start
);

// POST /api/workspaces/:workspaceId/container/stop - 停止容器
router.post(
  '/:workspaceId/container/stop',
  validate({ params: workspaceIdParamSchema }),
  controller.stop
);

// POST /api/workspaces/:workspaceId/container/restart - 重启容器
router.post(
  '/:workspaceId/container/restart',
  validate({ params: workspaceIdParamSchema }),
  controller.restart
);

// DELETE /api/workspaces/:workspaceId/container - 删除容器
router.delete(
  '/:workspaceId/container',
  validate({ params: workspaceIdParamSchema }),
  controller.remove
);

// GET /api/workspaces/:workspaceId/container/logs - 获取日志
router.get(
  '/:workspaceId/container/logs',
  validate({ params: workspaceIdParamSchema }),
  controller.getLogs
);

// GET /api/workspaces/:workspaceId/container/stats - 获取统计信息
router.get(
  '/:workspaceId/container/stats',
  validate({ params: workspaceIdParamSchema }),
  controller.getStats
);

// POST /api/workspaces/:workspaceId/container/exec - 执行命令
router.post(
  '/:workspaceId/container/exec',
  validate({ params: workspaceIdParamSchema, body: execCommandSchema }),
  controller.exec
);

export default router;
