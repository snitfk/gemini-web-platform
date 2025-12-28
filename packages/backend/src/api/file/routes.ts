import { Router, type IRouter } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './controller.js';
import {
  workspaceIdParamSchema,
  filePathQuerySchema,
  listFilesQuerySchema,
  writeFileSchema,
  editFileSchema,
  createDirectorySchema,
} from './schema.js';

const router: IRouter = Router();

// 所有路由都需要认证
router.use(authenticate);

/**
 * 文件操作路由
 * 挂载在 /api/workspaces/:workspaceId/files
 */

// 获取存储统计
router.get(
  '/:workspaceId/files/stats',
  validate({ params: workspaceIdParamSchema }),
  controller.getStorageStats
);

// 列出文件
router.get(
  '/:workspaceId/files/list',
  validate({
    params: workspaceIdParamSchema,
    query: listFilesQuerySchema,
  }),
  controller.listFiles
);

// 读取文件
router.get(
  '/:workspaceId/files',
  validate({
    params: workspaceIdParamSchema,
    query: filePathQuerySchema,
  }),
  controller.readFile
);

// 检查文件是否存在
router.head(
  '/:workspaceId/files',
  validate({
    params: workspaceIdParamSchema,
    query: filePathQuerySchema,
  }),
  controller.fileExists
);

// 写入文件
router.post(
  '/:workspaceId/files',
  validate({
    params: workspaceIdParamSchema,
    body: writeFileSchema,
  }),
  controller.writeFile
);

// 编辑文件
router.patch(
  '/:workspaceId/files',
  validate({
    params: workspaceIdParamSchema,
    body: editFileSchema,
  }),
  controller.editFile
);

// 删除文件
router.delete(
  '/:workspaceId/files',
  validate({
    params: workspaceIdParamSchema,
    query: filePathQuerySchema,
  }),
  controller.deleteFile
);

// 创建目录
router.post(
  '/:workspaceId/files/directory',
  validate({
    params: workspaceIdParamSchema,
    body: createDirectorySchema,
  }),
  controller.createDirectory
);

export default router;
