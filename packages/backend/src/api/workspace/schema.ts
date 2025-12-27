import { z } from 'zod';

// 创建工作区 Schema
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  settings: z.record(z.unknown()).optional(),
});

// 更新工作区 Schema
export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  settings: z.record(z.unknown()).optional(),
});

// 工作区 ID 参数 Schema
export const workspaceIdParamSchema = z.object({
  id: z.string().uuid('Invalid workspace ID'),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
