import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),
  VITE_WS_BASE_URL: z.string().default('ws://localhost:8000'),
});

function getEnv() {
  const result = envSchema.safeParse({
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL,
  });

  if (!result.success) {
    console.warn('Environment validation failed, using defaults:', result.error);
    return {
      VITE_API_BASE_URL: '/api',
      VITE_WS_BASE_URL: 'ws://localhost:8000',
    };
  }

  return result.data;
}

export const env = getEnv();
