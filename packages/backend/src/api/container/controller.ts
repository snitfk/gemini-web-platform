import { Request, Response } from 'express';
import { containerService } from '../../services/container.service.js';
import { workspaceService } from '../workspace/service.js';
import { ResponseHelper } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { NotFoundError } from '../../types/errors.js';

/**
 * 创建容器
 * POST /api/workspaces/:workspaceId/container
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.user!.id;

  // 验证工作区权限
  await workspaceService.getById(userId, workspaceId);

  const containerDetails = await containerService.createContainer(workspaceId, userId);

  ResponseHelper.created(res, containerDetails);
});

/**
 * 获取容器信息
 * GET /api/workspaces/:workspaceId/container
 */
export const get = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.user!.id;

  // 验证工作区权限
  const workspace = await workspaceService.getById(userId, workspaceId);

  if (!workspace.containerId) {
    throw new NotFoundError('Container not found');
  }

  const containerDetails = await containerService.getContainerDetails(
    workspace.containerId,
    workspaceId
  );

  ResponseHelper.success(res, containerDetails);
});

/**
 * 启动容器
 * POST /api/workspaces/:workspaceId/container/start
 */
export const start = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.user!.id;

  // 验证工作区权限
  const workspace = await workspaceService.getById(userId, workspaceId);

  if (!workspace.containerId) {
    throw new NotFoundError('Container not found');
  }

  await containerService.startContainer(workspace.containerId, workspaceId);

  ResponseHelper.success(res, { message: 'Container started' });
});

/**
 * 停止容器
 * POST /api/workspaces/:workspaceId/container/stop
 */
export const stop = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.user!.id;

  // 验证工作区权限
  const workspace = await workspaceService.getById(userId, workspaceId);

  if (!workspace.containerId) {
    throw new NotFoundError('Container not found');
  }

  await containerService.stopContainer(workspace.containerId, workspaceId);

  ResponseHelper.success(res, { message: 'Container stopped' });
});

/**
 * 重启容器
 * POST /api/workspaces/:workspaceId/container/restart
 */
export const restart = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.user!.id;

  // 验证工作区权限
  const workspace = await workspaceService.getById(userId, workspaceId);

  if (!workspace.containerId) {
    throw new NotFoundError('Container not found');
  }

  await containerService.restartContainer(workspace.containerId, workspaceId);

  ResponseHelper.success(res, { message: 'Container restarted' });
});

/**
 * 删除容器
 * DELETE /api/workspaces/:workspaceId/container
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.user!.id;

  // 验证工作区权限
  const workspace = await workspaceService.getById(userId, workspaceId);

  if (!workspace.containerId) {
    throw new NotFoundError('Container not found');
  }

  await containerService.removeContainer(workspace.containerId, workspaceId);

  ResponseHelper.noContent(res);
});

/**
 * 获取容器日志
 * GET /api/workspaces/:workspaceId/container/logs
 */
export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.user!.id;
  const tail = parseInt(req.query.tail as string || '100', 10);
  const since = parseInt(req.query.since as string || '0', 10);

  // 验证工作区权限
  const workspace = await workspaceService.getById(userId, workspaceId);

  if (!workspace.containerId) {
    throw new NotFoundError('Container not found');
  }

  const logs = await containerService.getContainerLogs(workspace.containerId, {
    tail,
    since,
  });

  ResponseHelper.success(res, { logs });
});

/**
 * 获取容器统计信息
 * GET /api/workspaces/:workspaceId/container/stats
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.user!.id;

  // 验证工作区权限
  const workspace = await workspaceService.getById(userId, workspaceId);

  if (!workspace.containerId) {
    throw new NotFoundError('Container not found');
  }

  const stats = await containerService.getContainerStats(workspace.containerId);

  ResponseHelper.success(res, stats);
});

/**
 * 在容器中执行命令
 * POST /api/workspaces/:workspaceId/container/exec
 */
export const exec = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { command, workDir } = req.body;
  const userId = req.user!.id;

  // 验证工作区权限
  const workspace = await workspaceService.getById(userId, workspaceId);

  if (!workspace.containerId) {
    throw new NotFoundError('Container not found');
  }

  const result = await containerService.execCommand(
    workspace.containerId,
    command,
    workDir
  );

  ResponseHelper.success(res, result);
});

/**
 * 健康检查
 * GET /api/containers/health
 */
export const healthCheck = asyncHandler(async (_req: Request, res: Response) => {
  const health = await containerService.healthCheck();
  ResponseHelper.success(res, health);
});
