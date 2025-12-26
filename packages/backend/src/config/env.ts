import path from 'path';

import dotenv from 'dotenv';
import { z } from 'zod';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

// 环境变量 Schema
const envSchema = z.object({
  // Node 环境
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // 服务器配置
  BACKEND_PORT: z
    .string()
    .default('3000')
    .transform(Number)
    .pipe(z.number().int().positive()),
  BACKEND_HOST: z.string().default('localhost'),

  // 数据库
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // MinIO
  MINIO_ENDPOINT: z.string(),
  MINIO_PORT: z.string().transform(Number).pipe(z.number().int().positive()),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string(),
  MINIO_USE_SSL: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  // Gemini API
  GEMINI_API_KEY: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().default('15m'),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .default('100')
    .transform(Number)
    .pipe(z.number().int()),

  // 日志
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Docker
  DOCKER_HOST: z.string().default('unix:///var/run/docker.sock'),
  SANDBOX_IMAGE: z.string().default('gemini-sandbox:latest'),
  SANDBOX_MEMORY_LIMIT: z.string().default('512m'),
  SANDBOX_CPU_LIMIT: z.string().default('1').transform(Number).pipe(z.number()),
});

// 验证环境变量
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ 环境变量验证失败:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();

// 类型导出
export type Env = z.infer<typeof envSchema>;
