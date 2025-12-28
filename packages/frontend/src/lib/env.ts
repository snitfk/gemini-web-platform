import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),
  VITE_WS_BASE_URL: z.string().default('ws://localhost:8000'),
});

function parseEnv() {
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

export const env = parseEnv();

/**
 * Get environment variable by key
 */
export function getEnv(key: string): string {
  const envKey = key as keyof typeof env;
  if (envKey in env) {
    return env[envKey];
  }
  // Fallback to import.meta.env
  const metaEnvValue = import.meta.env[key];
  return typeof metaEnvValue === 'string' ? metaEnvValue : '';
}
