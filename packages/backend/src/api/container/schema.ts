import { z } from 'zod';

/**
 * 工作区 ID 参数 Schema
 */
export const workspaceIdParamSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

/**
 * 容器日志查询参数 Schema
 */
export const containerLogsQuerySchema = z.object({
  tail: z.string().optional().transform(val => val ? parseInt(val, 10) : 100),
  since: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
});

/**
 * 容器命令执行 Schema
 */
export const execCommandSchema = z.object({
  command: z.array(z.string()).min(1, 'Command is required'),
  workDir: z.string().optional(),
});

// 类型导出
export type WorkspaceIdParam = z.infer<typeof workspaceIdParamSchema>;
export type ContainerLogsQuery = z.infer<typeof containerLogsQuerySchema>;
export type ExecCommandInput = z.infer<typeof execCommandSchema>;
