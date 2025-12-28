import { z } from 'zod';

// 更新用户资料 Schema
export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional().nullable(),
});

// 更新 Gemini API Key Schema
export const updateApiKeySchema = z.object({
  geminiApiKey: z.string().min(1, 'API key is required'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
