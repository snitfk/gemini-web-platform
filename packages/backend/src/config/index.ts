import { env } from './env.js';

export const config = {
  // 服务器
  server: {
    port: env.BACKEND_PORT,
    host: env.BACKEND_HOST,
    env: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },

  // 数据库
  database: {
    url: env.DATABASE_URL,
  },

  // Redis
  redis: {
    url: env.REDIS_URL,
  },

  // MinIO
  minio: {
    endpoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
    bucket: env.MINIO_BUCKET,
    useSSL: env.MINIO_USE_SSL,
  },

  // Gemini
  gemini: {
    apiKey: env.GEMINI_API_KEY,
  },

  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  // OAuth
  oauth: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackUrl: env.GOOGLE_CALLBACK_URL,
    },
  },

  // CORS
  cors: {
    origin: env.CORS_ORIGIN,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseDuration(env.RATE_LIMIT_WINDOW),
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },

  // 日志
  logging: {
    level: env.LOG_LEVEL,
  },

  // Docker
  docker: {
    host: env.DOCKER_HOST,
    sandboxImage: env.SANDBOX_IMAGE,
    sandboxMemoryLimit: env.SANDBOX_MEMORY_LIMIT,
    sandboxCpuLimit: env.SANDBOX_CPU_LIMIT,
  },
} as const;

// 辅助函数：解析时间字符串
function parseDuration(duration: string): number {
  const units: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const match = duration.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const [, value, unit] = match;
  return parseInt(value) * units[unit];
}

export { env };
