import { z } from 'zod';

// 创建会话 Schema
export const createSessionSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  title: z.string().min(1).max(200).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(100000).optional(),
});

// 更新会话 Schema
export const updateSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(100000).optional(),
});

// 发送消息 Schema
export const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(100000),
});

// 会话 ID 参数 Schema
export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
});

// 消息列表查询 Schema
export const messagesQuerySchema = z.object({
  limit: z.string().optional().default('50').transform(Number),
  offset: z.string().optional().default('0').transform(Number),
});

// 会话列表查询 Schema
export const sessionsQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  limit: z.string().optional().default('20').transform(Number),
  offset: z.string().optional().default('0').transform(Number),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
