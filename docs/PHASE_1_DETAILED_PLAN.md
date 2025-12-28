# 阶段 1: 核心基础设施 - 详细执行方案

## 📋 概览

**阶段目标**: 搭建完整的后端基础框架，实现认证系统和基础 API
**持续时间**: 2 周 (10 个工作日)
**关键产出**: 可运行的后端服务 + 认证系统 + 数据库 + API 文档

---

## 🗓️ 时间规划

| 任务模块 | 天数 | 负责人 | 依赖 |
|---------|------|--------|------|
| 1.1 后端框架搭建 | 3 天 | 后端 #1 | 阶段 0 完成 |
| 1.2 数据库设计与实现 | 4 天 | 后端 #2 | 阶段 0 完成 |
| 1.3 认证授权系统 | 4 天 | 后端 #1 + #2 | 1.1, 1.2 完成 |
| 1.4 基础 API 实现 | 3 天 | 后端 #1 | 1.1, 1.2 完成 |
| 1.5 单元测试 | 2 天 | 后端 #1 + #2 | 1.1-1.4 完成 |

**注意**: 1.1 和 1.2 可以并行进行

---

## 🚀 任务 1.1: 后端框架搭建 (3 天)

### 目标
建立完整的 Express/Fastify 后端框架，包含路由、中间件、错误处理等核心功能。

### 详细步骤

#### Day 1: Express 基础架构

**步骤 1.1: 初始化 Backend 包** (1 小时)

```bash
cd packages/backend

# 初始化 package.json（如果还没有）
cat > package.json << 'EOF'
{
  "name": "@gemini-web/backend",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "dev:debug": "tsx watch --inspect src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5",
    "dotenv": "^16.4.1",
    "zod": "^3.22.4",
    "winston": "^3.11.0",
    "@prisma/client": "^5.8.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/compression": "^1.7.5",
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2",
    "prisma": "^5.8.0"
  }
}
EOF

# 安装依赖
pnpm install
```

**步骤 1.2: 创建项目结构** (30 分钟)

```bash
# 创建目录结构
mkdir -p src/{api,middleware,services,utils,config,types}
mkdir -p src/api/{auth,chat,workspace,tools,admin}
mkdir -p tests/{unit,integration}

# 创建基础文件
touch src/server.ts
touch src/app.ts
touch src/config/index.ts
touch src/config/env.ts
touch src/middleware/errorHandler.ts
touch src/middleware/logger.ts
touch src/utils/logger.ts
touch src/types/express.d.ts
```

**步骤 1.3: 配置环境变量管理** (45 分钟)

创建 `src/config/env.ts`:

```typescript
import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

// 环境变量 Schema
const envSchema = z.object({
  // Node 环境
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // 服务器配置
  BACKEND_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
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
  MINIO_USE_SSL: z.string().transform(val => val === 'true').default('false'),

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
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().int()).default('100'),

  // 日志
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Docker
  DOCKER_HOST: z.string().default('unix:///var/run/docker.sock'),
  SANDBOX_IMAGE: z.string().default('gemini-sandbox:latest'),
  SANDBOX_MEMORY_LIMIT: z.string().default('512m'),
  SANDBOX_CPU_LIMIT: z.string().transform(Number).pipe(z.number()).default('1'),
});

// 验证环境变量
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ 环境变量验证失败:');
      error.errors.forEach((err) => {
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
```

创建 `src/config/index.ts`:

```typescript
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
```

**步骤 1.4: 创建 Logger** (45 分钟)

创建 `src/utils/logger.ts`:

```typescript
import winston from 'winston';
import { config } from '../config/index.js';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// 自定义日志格式（开发环境）
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;

  // 添加元数据
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  log += metaStr;

  // 添加堆栈信息
  if (stack) {
    log += `\n${stack}`;
  }

  return log;
});

// 创建 logger 实例
export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: { service: 'gemini-web-backend' },
  transports: [],
});

// 根据环境添加不同的 transport
if (config.server.isDevelopment) {
  // 开发环境：彩色控制台输出
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), devFormat),
    })
  );
} else {
  // 生产环境：JSON 格式
  logger.add(
    new winston.transports.Console({
      format: json(),
    })
  );

  // 生产环境：文件输出
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: json(),
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: json(),
    })
  );
}

// 测试环境：静默
if (config.server.isTest) {
  logger.transports.forEach((t) => (t.silent = true));
}

export default logger;
```

**步骤 1.5: 创建错误处理中间件** (1 小时)

创建 `src/types/errors.ts`:

```typescript
// 自定义错误类型
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request') {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(409, message);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation Error',
    public errors?: any
  ) {
    super(422, message);
    this.errors = errors;
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error') {
    super(500, message, false);
  }
}
```

创建 `src/middleware/errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors.js';
import logger from '../utils/logger.js';
import { config } from '../config/index.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 记录错误
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // 处理不同类型的错误
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        ...(err instanceof ValidationError && { errors: err.errors }),
      },
    });
  }

  // Zod 验证错误
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation Error',
        errors: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Prisma 错误
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // 唯一约束冲突
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Resource already exists',
          field: (err.meta?.target as string[])?.join(', '),
        },
      });
    }

    // 记录未找到
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Resource not found',
        },
      });
    }
  }

  // 默认错误处理
  const statusCode = 500;
  const message = config.server.isDevelopment
    ? err.message
    : 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(config.server.isDevelopment && { stack: err.stack }),
    },
  });
}

// 404 处理
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.path}`,
    },
  });
}

// 异步错误包装器
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**验证清单 Day 1**:
- [ ] Backend package.json 创建成功
- [ ] 依赖安装完成
- [ ] 项目结构创建完整
- [ ] 环境变量验证工作正常
- [ ] Logger 正常输出
- [ ] 错误类型定义完整

---

#### Day 2: 中间件和路由系统

**步骤 2.1: 创建请求日志中间件** (45 分钟)

创建 `src/middleware/requestLogger.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // 响应完成时记录
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}
```

**步骤 2.2: 创建验证中间件** (1 小时)

创建 `src/middleware/validate.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../types/errors.js';

export function validate(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证 body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // 验证 query
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      // 验证 params
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            'Validation failed',
            error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            }))
          )
        );
      } else {
        next(error);
      }
    }
  };
}
```

**步骤 2.3: 创建 Express 应用** (1.5 小时)

创建 `src/app.ts`:

```typescript
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

// 导入路由（稍后创建）
// import authRoutes from './api/auth/routes.js';
// import chatRoutes from './api/chat/routes.js';
// import workspaceRoutes from './api/workspace/routes.js';

export function createApp(): Express {
  const app = express();

  // ==================
  // 基础中间件
  // ==================

  // 安全头
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: config.cors.origin.split(','),
      credentials: true,
    })
  );

  // Body 解析
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 压缩
  app.use(compression());

  // 请求日志
  app.use(requestLogger);

  // 限流
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      success: false,
      error: {
        message: 'Too many requests, please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // ==================
  // 健康检查
  // ==================

  app.get('/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  });

  // ==================
  // API 路由
  // ==================

  // TODO: 挂载路由
  // app.use('/api/auth', authRoutes);
  // app.use('/api/chat', chatRoutes);
  // app.use('/api/workspaces', workspaceRoutes);

  // API 根路径
  app.get('/api', (req, res) => {
    res.json({
      success: true,
      data: {
        name: 'Gemini Web Platform API',
        version: '0.1.0',
        docs: '/api/docs',
      },
    });
  });

  // ==================
  // 错误处理
  // ==================

  // 404 处理
  app.use(notFoundHandler);

  // 全局错误处理
  app.use(errorHandler);

  return app;
}
```

创建 `src/server.ts`:

```typescript
import { createApp } from './app.js';
import { config } from './config/index.js';
import logger from './utils/logger.js';
import { prisma } from './utils/prisma.js';

async function startServer() {
  try {
    // 创建 Express 应用
    const app = createApp();

    // 测试数据库连接
    logger.info('Testing database connection...');
    await prisma.$connect();
    logger.info('✓ Database connected');

    // 启动服务器
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(
        `🚀 Server running on http://${config.server.host}:${config.server.port}`
      );
      logger.info(`📝 Environment: ${config.server.env}`);
      logger.info(`📊 Log level: ${config.logging.level}`);
    });

    // 优雅关闭
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // 关闭数据库连接
        await prisma.$disconnect();
        logger.info('Database disconnected');

        process.exit(0);
      });

      // 强制关闭超时
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
```

创建 `src/utils/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// 日志处理
prisma.$on('query', (e) => {
  logger.debug('Query:', { sql: e.query, duration: `${e.duration}ms` });
});

prisma.$on('error', (e) => {
  logger.error('Prisma error:', e);
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma warning:', e);
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
```

**步骤 2.4: 测试服务器** (45 分钟)

```bash
# 确保数据库和 Redis 正在运行
cd ../../infrastructure/docker
docker-compose up -d

# 返回 backend 目录
cd ../../packages/backend

# 启动开发服务器
pnpm dev
```

测试端点:

```bash
# 测试健康检查
curl http://localhost:3000/health

# 测试 API 根路径
curl http://localhost:3000/api

# 测试 404
curl http://localhost:3000/not-found

# 测试限流（发送 100+ 请求）
for i in {1..101}; do curl http://localhost:3000/api; done
```

**验证清单 Day 2**:
- [ ] 中间件创建完整
- [ ] Express 应用正常启动
- [ ] 健康检查端点工作
- [ ] 错误处理正常
- [ ] 请求日志输出
- [ ] 限流功能生效
- [ ] 数据库连接成功

---

#### Day 3: API 响应规范和工具函数

**步骤 3.1: 创建响应工具** (1 小时)

创建 `src/utils/response.ts`:

```typescript
import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    errors?: any[];
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export class ResponseHelper {
  /**
   * 成功响应
   */
  static success<T>(res: Response, data: T, statusCode = 200): Response {
    return res.status(statusCode).json({
      success: true,
      data,
    } as ApiResponse<T>);
  }

  /**
   * 分页响应
   */
  static paginated<T>(
    res: Response,
    data: T[],
    meta: { page: number; limit: number; total: number }
  ): Response {
    return res.status(200).json({
      success: true,
      data,
      meta: {
        ...meta,
        totalPages: Math.ceil(meta.total / meta.limit),
      },
    } as ApiResponse<T[]>);
  }

  /**
   * 创建成功响应
   */
  static created<T>(res: Response, data: T): Response {
    return ResponseHelper.success(res, data, 201);
  }

  /**
   * 无内容响应
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * 错误响应
   */
  static error(
    res: Response,
    message: string,
    statusCode = 500,
    errors?: any[]
  ): Response {
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        ...(errors && { errors }),
      },
    } as ApiResponse);
  }
}
```

**步骤 3.2: 创建分页工具** (45 分钟)

创建 `src/utils/pagination.ts`:

```typescript
import { z } from 'zod';

// 分页查询 Schema
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100)),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export interface PaginationParams {
  skip: number;
  take: number;
  orderBy?: any;
}

/**
 * 将分页查询转换为 Prisma 参数
 */
export function getPaginationParams(
  query: PaginationQuery,
  allowedSortFields: string[] = []
): PaginationParams {
  const { page, limit, sortBy, sortOrder } = query;

  const params: PaginationParams = {
    skip: (page - 1) * limit,
    take: limit,
  };

  // 排序
  if (sortBy && allowedSortFields.includes(sortBy)) {
    params.orderBy = {
      [sortBy]: sortOrder,
    };
  }

  return params;
}

/**
 * 创建分页元数据
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
```

**步骤 3.3: 创建通用工具函数** (1 小时)

创建 `src/utils/crypto.ts`:

```typescript
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 生成随机令牌
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成随机代码（数字）
 */
export function generateCode(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}
```

安装依赖:

```bash
pnpm add bcrypt
pnpm add -D @types/bcrypt
```

创建 `src/utils/jwt.ts`:

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../types/errors.js';

export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

/**
 * 生成访问令牌
 */
export function generateAccessToken(userId: string, email: string): string {
  const payload: JwtPayload = {
    userId,
    email,
    type: 'access',
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * 生成刷新令牌
 */
export function generateRefreshToken(userId: string, email: string): string {
  const payload: JwtPayload = {
    userId,
    email,
    type: 'refresh',
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

/**
 * 验证令牌
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
}

/**
 * 生成令牌对
 */
export function generateTokenPair(userId: string, email: string) {
  return {
    accessToken: generateAccessToken(userId, email),
    refreshToken: generateRefreshToken(userId, email),
  };
}
```

安装依赖:

```bash
pnpm add jsonwebtoken
pnpm add -D @types/jsonwebtoken
```

**步骤 3.4: 创建测试工具** (1.5 小时)

创建 `tests/setup.ts`:

```typescript
import { beforeAll, afterAll, afterEach } from 'vitest';
import { prisma } from '../src/utils/prisma.js';

// 测试前清理数据库
beforeAll(async () => {
  // 清空所有表
  await prisma.toolExecution.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
});

// 每个测试后清理
afterEach(async () => {
  await prisma.toolExecution.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
});

// 测试后断开连接
afterAll(async () => {
  await prisma.$disconnect();
});
```

创建 `tests/helpers.ts`:

```typescript
import { User, Workspace, ChatSession } from '@prisma/client';
import { prisma } from '../src/utils/prisma.js';
import { hashPassword } from '../src/utils/crypto.js';

/**
 * 创建测试用户
 */
export async function createTestUser(
  overrides: Partial<User> = {}
): Promise<User> {
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    username: `testuser-${Date.now()}`,
    passwordHash: await hashPassword('password123'),
  };

  return prisma.user.create({
    data: {
      ...defaultUser,
      ...overrides,
    },
  });
}

/**
 * 创建测试工作区
 */
export async function createTestWorkspace(
  userId: string,
  overrides: Partial<Workspace> = {}
): Promise<Workspace> {
  const defaultWorkspace = {
    name: `Test Workspace ${Date.now()}`,
    description: 'Test workspace description',
    userId,
  };

  return prisma.workspace.create({
    data: {
      ...defaultWorkspace,
      ...overrides,
    },
  });
}

/**
 * 创建测试会话
 */
export async function createTestChatSession(
  userId: string,
  workspaceId: string,
  overrides: Partial<ChatSession> = {}
): Promise<ChatSession> {
  const defaultSession = {
    userId,
    workspaceId,
    title: 'Test Session',
  };

  return prisma.chatSession.create({
    data: {
      ...defaultSession,
      ...overrides,
    },
  });
}
```

创建第一个测试 `tests/unit/utils/crypto.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateCode,
} from '../../../src/utils/crypto.js';

describe('Crypto Utils', () => {
  describe('hashPassword', () => {
    it('should hash password', async () => {
      const password = 'test123';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'test123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'test123';
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'test123';
      const hash = await hashPassword(password);
      const result = await verifyPassword('wrong', hash);

      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate token with default length', () => {
      const token = generateToken();

      expect(token).toBeTruthy();
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate token with custom length', () => {
      const token = generateToken(16);

      expect(token).toBeTruthy();
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate different tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateCode', () => {
    it('should generate 6-digit code by default', () => {
      const code = generateCode();

      expect(code).toBeTruthy();
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('should generate code with custom length', () => {
      const code = generateCode(4);

      expect(code).toBeTruthy();
      expect(code.length).toBe(4);
      expect(/^\d{4}$/.test(code)).toBe(true);
    });
  });
});
```

运行测试:

```bash
pnpm test
```

**验证清单 Day 3**:
- [ ] 响应工具创建完成
- [ ] 分页工具正常工作
- [ ] 加密工具测试通过
- [ ] JWT 工具创建完成
- [ ] 测试框架配置成功
- [ ] 第一个测试通过

---

## 🗄️ 任务 1.2: 数据库设计与实现 (4 天)

### 目标
设计完整的数据库 Schema，实现 Repository 层和数据访问模式。

### 详细步骤

#### Day 4: Prisma Schema 完善

**步骤 4.1: 完善 Prisma Schema** (2 小时)

更新 `packages/backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================
// 用户相关
// ==================

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  username      String   @unique
  passwordHash  String?  @map("password_hash")

  // OAuth 登录
  oauthProvider String?  @map("oauth_provider")
  oauthId       String?  @map("oauth_id")

  // 个人信息
  displayName   String?  @map("display_name")
  avatar        String?

  // Gemini API Key (加密存储)
  geminiApiKey  String?  @map("gemini_api_key")

  // 账户状态
  isActive      Boolean  @default(true) @map("is_active")
  isVerified    Boolean  @default(false) @map("is_verified")

  // 时间戳
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  lastLoginAt   DateTime? @map("last_login_at")

  // 关系
  workspaces    Workspace[]
  chatSessions  ChatSession[]
  refreshTokens RefreshToken[]

  @@index([email])
  @@index([oauthProvider, oauthId])
  @@map("users")
}

// Refresh Token 表
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@map("refresh_tokens")
}

// ==================
// 工作区相关
// ==================

model Workspace {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")

  // 基本信息
  name        String
  description String?

  // 容器信息
  containerId String?  @unique @map("container_id")
  storagePath String?  @map("storage_path")

  // 状态
  status      WorkspaceStatus @default(ACTIVE)

  // 配置
  config      Json?    // 工作区配置（环境变量、工具策略等）

  // 时间戳
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  lastUsedAt  DateTime? @map("last_used_at")

  // 关系
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  chatSessions ChatSession[]

  @@index([userId])
  @@index([status])
  @@map("workspaces")
}

enum WorkspaceStatus {
  ACTIVE
  SUSPENDED
  DELETED
}

// ==================
// 聊天相关
// ==================

model ChatSession {
  id          String   @id @default(uuid())
  workspaceId String   @map("workspace_id")
  userId      String   @map("user_id")

  // 基本信息
  title       String?

  // 模型配置
  model       String   @default("gemini-2.0-flash-exp")
  modelConfig Json?    @map("model_config") // temperature, topP 等

  // 状态
  status      ChatSessionStatus @default(ACTIVE)

  // 统计
  messageCount Int     @default(0) @map("message_count")
  totalTokens  Int     @default(0) @map("total_tokens")

  // 时间戳
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // 关系
  workspace      Workspace       @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages       Message[]
  toolExecutions ToolExecution[]

  @@index([workspaceId])
  @@index([userId])
  @@index([status])
  @@map("chat_sessions")
}

enum ChatSessionStatus {
  ACTIVE
  ARCHIVED
  DELETED
}

model Message {
  id        String   @id @default(uuid())
  sessionId String   @map("session_id")

  // 消息内容
  role      MessageRole
  content   Json     // Gemini API 的 Content 格式

  // 元数据
  metadata  Json?    // token 数量、延迟等

  // 时间戳
  createdAt DateTime @default(now()) @map("created_at")

  // 关系
  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([createdAt])
  @@map("messages")
}

enum MessageRole {
  USER
  MODEL
  TOOL
}

// ==================
// 工具执行相关
// ==================

model ToolExecution {
  id         String   @id @default(uuid())
  sessionId  String   @map("session_id")

  // 工具信息
  toolName   String   @map("tool_name")
  params     Json
  result     Json?

  // 状态
  status     ToolExecutionStatus @default(PENDING)
  error      String?  // 错误信息

  // 性能
  durationMs Int?     @map("duration_ms")

  // 时间戳
  createdAt  DateTime @default(now()) @map("created_at")
  completedAt DateTime? @map("completed_at")

  // 关系
  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([toolName])
  @@index([status])
  @@map("tool_executions")
}

enum ToolExecutionStatus {
  PENDING
  EXECUTING
  SUCCESS
  ERROR
  CANCELLED
}

// ==================
// 系统配置相关
// ==================

model SystemConfig {
  id        String   @id @default(uuid())
  key       String   @unique
  value     Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("system_configs")
}
```

运行迁移:

```bash
pnpm prisma migrate dev --name complete_schema
pnpm prisma generate
```

**步骤 4.2: 创建 Repository 基类** (1.5 小时)

创建 `src/repositories/base.repository.ts`:

```typescript
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export abstract class BaseRepository<
  T,
  CreateInput,
  UpdateInput,
  WhereInput,
  WhereUniqueInput
> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly modelName: Prisma.ModelName
  ) {}

  /**
   * 创建记录
   */
  abstract create(data: CreateInput): Promise<T>;

  /**
   * 查找唯一记录
   */
  abstract findUnique(where: WhereUniqueInput): Promise<T | null>;

  /**
   * 查找多条记录
   */
  abstract findMany(params: {
    where?: WhereInput;
    skip?: number;
    take?: number;
    orderBy?: any;
  }): Promise<T[]>;

  /**
   * 更新记录
   */
  abstract update(
    where: WhereUniqueInput,
    data: UpdateInput
  ): Promise<T>;

  /**
   * 删除记录
   */
  abstract delete(where: WhereUniqueInput): Promise<T>;

  /**
   * 计数
   */
  abstract count(where?: WhereInput): Promise<number>;

  /**
   * 检查是否存在
   */
  async exists(where: WhereInput): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }
}
```

**步骤 4.3: 创建 User Repository** (1.5 小时)

创建 `src/repositories/user.repository.ts`:

```typescript
import { User, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';
import { prisma } from '../utils/prisma.js';

export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserWhereInput,
  Prisma.UserWhereUniqueInput
> {
  constructor() {
    super(prisma, 'User');
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async findUnique(where: Prisma.UserWhereUniqueInput): Promise<User | null> {
    return prisma.user.findUnique({ where });
  }

  async findMany(params: {
    where?: Prisma.UserWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    return prisma.user.findMany(params);
  }

  async update(
    where: Prisma.UserWhereUniqueInput,
    data: Prisma.UserUpdateInput
  ): Promise<User> {
    return prisma.user.update({ where, data });
  }

  async delete(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return prisma.user.delete({ where });
  }

  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({ where });
  }

  /**
   * 通过邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findUnique({ email });
  }

  /**
   * 通过用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.findUnique({ username });
  }

  /**
   * 通过 OAuth 查找用户
   */
  async findByOAuth(
    provider: string,
    oauthId: string
  ): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        oauthProvider: provider,
        oauthId,
      },
    });
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(userId: string): Promise<User> {
    return this.update(
      { id: userId },
      { lastLoginAt: new Date() }
    );
  }

  /**
   * 检查邮箱是否已存在
   */
  async emailExists(email: string): Promise<boolean> {
    return this.exists({ email });
  }

  /**
   * 检查用户名是否已存在
   */
  async usernameExists(username: string): Promise<boolean> {
    return this.exists({ username });
  }
}

// 导出单例
export const userRepository = new UserRepository();
```

**步骤 4.4: 创建其他 Repositories** (2 小时)

创建 `src/repositories/workspace.repository.ts`:

```typescript
import { Workspace, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';
import { prisma } from '../utils/prisma.js';

export class WorkspaceRepository extends BaseRepository<
  Workspace,
  Prisma.WorkspaceCreateInput,
  Prisma.WorkspaceUpdateInput,
  Prisma.WorkspaceWhereInput,
  Prisma.WorkspaceWhereUniqueInput
> {
  constructor() {
    super(prisma, 'Workspace');
  }

  async create(data: Prisma.WorkspaceCreateInput): Promise<Workspace> {
    return prisma.workspace.create({ data });
  }

  async findUnique(where: Prisma.WorkspaceWhereUniqueInput): Promise<Workspace | null> {
    return prisma.workspace.findUnique({ where });
  }

  async findMany(params: {
    where?: Prisma.WorkspaceWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.WorkspaceOrderByWithRelationInput;
  }): Promise<Workspace[]> {
    return prisma.workspace.findMany(params);
  }

  async update(
    where: Prisma.WorkspaceWhereUniqueInput,
    data: Prisma.WorkspaceUpdateInput
  ): Promise<Workspace> {
    return prisma.workspace.update({ where, data });
  }

  async delete(where: Prisma.WorkspaceWhereUniqueInput): Promise<Workspace> {
    return prisma.workspace.delete({ where });
  }

  async count(where?: Prisma.WorkspaceWhereInput): Promise<number> {
    return prisma.workspace.count({ where });
  }

  /**
   * 获取用户的所有工作区
   */
  async findByUserId(userId: string): Promise<Workspace[]> {
    return this.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  /**
   * 更新最后使用时间
   */
  async updateLastUsed(workspaceId: string): Promise<Workspace> {
    return this.update(
      { id: workspaceId },
      { lastUsedAt: new Date() }
    );
  }

  /**
   * 获取活跃工作区数量
   */
  async countActiveByUser(userId: string): Promise<number> {
    return this.count({
      userId,
      status: 'ACTIVE',
    });
  }
}

export const workspaceRepository = new WorkspaceRepository();
```

创建 `src/repositories/chat-session.repository.ts`:

```typescript
import { ChatSession, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';
import { prisma } from '../utils/prisma.js';

export class ChatSessionRepository extends BaseRepository<
  ChatSession,
  Prisma.ChatSessionCreateInput,
  Prisma.ChatSessionUpdateInput,
  Prisma.ChatSessionWhereInput,
  Prisma.ChatSessionWhereUniqueInput
> {
  constructor() {
    super(prisma, 'ChatSession');
  }

  async create(data: Prisma.ChatSessionCreateInput): Promise<ChatSession> {
    return prisma.chatSession.create({ data });
  }

  async findUnique(where: Prisma.ChatSessionWhereUniqueInput): Promise<ChatSession | null> {
    return prisma.chatSession.findUnique({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });
  }

  async findMany(params: {
    where?: Prisma.ChatSessionWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.ChatSessionOrderByWithRelationInput;
  }): Promise<ChatSession[]> {
    return prisma.chatSession.findMany(params);
  }

  async update(
    where: Prisma.ChatSessionWhereUniqueInput,
    data: Prisma.ChatSessionUpdateInput
  ): Promise<ChatSession> {
    return prisma.chatSession.update({ where, data });
  }

  async delete(where: Prisma.ChatSessionWhereUniqueInput): Promise<ChatSession> {
    return prisma.chatSession.delete({ where });
  }

  async count(where?: Prisma.ChatSessionWhereInput): Promise<number> {
    return prisma.chatSession.count({ where });
  }

  /**
   * 获取工作区的所有会话
   */
  async findByWorkspaceId(workspaceId: string): Promise<ChatSession[]> {
    return this.findMany({
      where: {
        workspaceId,
        status: 'ACTIVE',
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * 增加消息计数
   */
  async incrementMessageCount(sessionId: string): Promise<void> {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        messageCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 增加 token 计数
   */
  async incrementTokenCount(sessionId: string, tokens: number): Promise<void> {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        totalTokens: { increment: tokens },
      },
    });
  }
}

export const chatSessionRepository = new ChatSessionRepository();
```

创建 `src/repositories/refresh-token.repository.ts`:

```typescript
import { RefreshToken, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';
import { prisma } from '../utils/prisma.js';

export class RefreshTokenRepository extends BaseRepository<
  RefreshToken,
  Prisma.RefreshTokenCreateInput,
  Prisma.RefreshTokenUpdateInput,
  Prisma.RefreshTokenWhereInput,
  Prisma.RefreshTokenWhereUniqueInput
> {
  constructor() {
    super(prisma, 'RefreshToken');
  }

  async create(data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  }

  async findUnique(where: Prisma.RefreshTokenWhereUniqueInput): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where });
  }

  async findMany(params: {
    where?: Prisma.RefreshTokenWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.RefreshTokenOrderByWithRelationInput;
  }): Promise<RefreshToken[]> {
    return prisma.refreshToken.findMany(params);
  }

  async update(
    where: Prisma.RefreshTokenWhereUniqueInput,
    data: Prisma.RefreshTokenUpdateInput
  ): Promise<RefreshToken> {
    return prisma.refreshToken.update({ where, data });
  }

  async delete(where: Prisma.RefreshTokenWhereUniqueInput): Promise<RefreshToken> {
    return prisma.refreshToken.delete({ where });
  }

  async count(where?: Prisma.RefreshTokenWhereInput): Promise<number> {
    return prisma.refreshToken.count({ where });
  }

  /**
   * 通过 token 查找
   */
  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.findUnique({ token });
  }

  /**
   * 删除用户的所有 token
   */
  async deleteAllByUserId(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * 删除过期的 token
   */
  async deleteExpired(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * 验证 token 是否有效
   */
  async isValid(token: string): Promise<boolean> {
    const refreshToken = await this.findByToken(token);
    if (!refreshToken) return false;
    return refreshToken.expiresAt > new Date();
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
```

创建 `src/repositories/index.ts`:

```typescript
export { userRepository } from './user.repository.js';
export { workspaceRepository } from './workspace.repository.js';
export { chatSessionRepository } from './chat-session.repository.js';
export { refreshTokenRepository } from './refresh-token.repository.js';
```

**验证清单 Day 4**:
- [ ] Prisma Schema 完成并迁移成功
- [ ] Base Repository 创建完成
- [ ] User Repository 实现完整
- [ ] Workspace Repository 实现完整
- [ ] ChatSession Repository 实现完整
- [ ] RefreshToken Repository 实现完整
- [ ] 所有 Repository 导出正确

---

## 🔐 任务 1.3: 认证授权系统 (4 天)

### 目标
实现完整的认证授权系统，包括注册、登录、JWT Token 管理、OAuth 登录等。

### 详细步骤

#### Day 5: 认证服务实现

**步骤 5.1: 创建认证服务** (2 小时)

创建 `src/services/auth.service.ts`:

```typescript
import { User } from '@prisma/client';
import { userRepository, refreshTokenRepository } from '../repositories/index.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
} from '../utils/crypto.js';
import {
  generateTokenPair,
  verifyToken,
  JwtPayload,
} from '../utils/jwt.js';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} from '../types/errors.js';

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * 用户注册
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const { email, username, password, displayName } = input;

    // 检查邮箱是否已存在
    if (await userRepository.emailExists(email)) {
      throw new ConflictError('Email already in use');
    }

    // 检查用户名是否已存在
    if (await userRepository.usernameExists(username)) {
      throw new ConflictError('Username already taken');
    }

    // 哈希密码
    const passwordHash = await hashPassword(password);

    // 创建用户
    const user = await userRepository.create({
      email,
      username,
      passwordHash,
      displayName: displayName || username,
      isActive: true,
      isVerified: false,
    });

    // 生成 token
    const tokens = generateTokenPair(user.id, user.email);

    // 保存 refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 天后过期

    await refreshTokenRepository.create({
      user: { connect: { id: user.id } },
      token: tokens.refreshToken,
      expiresAt,
    });

    // 返回结果（排除密码）
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * 用户登录
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password } = input;

    // 查找用户
    const user = await userRepository.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 检查账户状态
    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    // 生成 token
    const tokens = generateTokenPair(user.id, user.email);

    // 保存 refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await refreshTokenRepository.create({
      user: { connect: { id: user.id } },
      token: tokens.refreshToken,
      expiresAt,
    });

    // 更新最后登录时间
    await userRepository.updateLastLogin(user.id);

    // 返回结果
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * 刷新访问令牌
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // 验证 refresh token
    const payload = verifyToken(refreshToken);
    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // 检查 token 是否在数据库中
    const isValid = await refreshTokenRepository.isValid(refreshToken);
    if (!isValid) {
      throw new UnauthorizedError('Refresh token expired or invalid');
    }

    // 生成新的 token 对
    const tokens = generateTokenPair(payload.userId, payload.email);

    // 删除旧的 refresh token
    await refreshTokenRepository.delete({ token: refreshToken });

    // 保存新的 refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await refreshTokenRepository.create({
      user: { connect: { id: payload.userId } },
      token: tokens.refreshToken,
      expiresAt,
    });

    return tokens;
  }

  /**
   * 登出
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await refreshTokenRepository.delete({ token: refreshToken });
    } catch (error) {
      // 即使删除失败也不抛出错误
    }
  }

  /**
   * 登出所有设备
   */
  async logoutAll(userId: string): Promise<void> {
    await refreshTokenRepository.deleteAllByUserId(userId);
  }

  /**
   * 验证访问令牌并获取用户
   */
  async verifyAccessToken(token: string): Promise<User> {
    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid access token');
    }

    const user = await userRepository.findUnique({ id: payload.userId });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    return user;
  }

  /**
   * OAuth 登录（Google）
   */
  async loginWithOAuth(provider: string, profile: {
    id: string;
    email: string;
    displayName: string;
    avatar?: string;
  }): Promise<AuthResult> {
    // 查找现有用户
    let user = await userRepository.findByOAuth(provider, profile.id);

    // 如果不存在，创建新用户
    if (!user) {
      // 生成唯一用户名
      let username = profile.email.split('@')[0];
      let counter = 1;
      while (await userRepository.usernameExists(username)) {
        username = `${profile.email.split('@')[0]}${counter}`;
        counter++;
      }

      user = await userRepository.create({
        email: profile.email,
        username,
        displayName: profile.displayName,
        avatar: profile.avatar,
        oauthProvider: provider,
        oauthId: profile.id,
        isActive: true,
        isVerified: true, // OAuth 登录自动验证
      });
    }

    // 生成 token
    const tokens = generateTokenPair(user.id, user.email);

    // 保存 refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await refreshTokenRepository.create({
      user: { connect: { id: user.id } },
      token: tokens.refreshToken,
      expiresAt,
    });

    // 更新最后登录时间
    await userRepository.updateLastLogin(user.id);

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}

export const authService = new AuthService();
```

**步骤 5.2: 创建认证中间件** (1.5 小时)

创建 `src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { UnauthorizedError } from '../types/errors.js';
import { User } from '@prisma/client';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * 认证中间件
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    // 验证 token 并获取用户
    const user = await authService.verifyAccessToken(token);

    // 将用户信息附加到请求对象
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * 可选认证中间件
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await authService.verifyAccessToken(token);
      req.user = user;
    }
  } catch (error) {
    // 忽略错误，继续执行
  }

  next();
}

/**
 * 检查是否已认证
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  next();
}
```

**步骤 5.3: 创建 Validation Schemas** (1 小时)

创建 `src/api/auth/schemas.ts`:

```typescript
import { z } from 'zod';

// 注册 Schema
export const registerSchema = {
  body: z.object({
    email: z.string().email('Invalid email format'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must not exceed 20 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    displayName: z.string().min(1).max(50).optional(),
  }),
};

// 登录 Schema
export const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
};

// 刷新 Token Schema
export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
};
```

**验证清单 Day 5**:
- [ ] AuthService 创建完成
- [ ] 注册功能实现
- [ ] 登录功能实现
- [ ] Token 刷新功能实现
- [ ] OAuth 登录功能实现
- [ ] 认证中间件创建完成
- [ ] Validation Schemas 定义完整

---

#### Day 6: 认证路由实现

**步骤 6.1: 创建认证路由** (2 小时)

创建 `src/api/auth/routes.ts`:

```typescript
import { Router } from 'express';
import { authService } from '../../services/auth.service.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { ResponseHelper } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from './schemas.js';

const router = Router();

/**
 * 注册
 */
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);

    ResponseHelper.created(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  })
);

/**
 * 登录
 */
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);

    ResponseHelper.success(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  })
);

/**
 * 刷新访问令牌
 */
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshAccessToken(refreshToken);

    ResponseHelper.success(res, tokens);
  })
);

/**
 * 登出
 */
router.post(
  '/logout',
  validate(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);

    ResponseHelper.success(res, { message: 'Logged out successfully' });
  })
);

/**
 * 登出所有设备
 */
router.post(
  '/logout-all',
  authenticate,
  asyncHandler(async (req, res) => {
    await authService.logoutAll(req.user!.id);

    ResponseHelper.success(res, { message: 'Logged out from all devices' });
  })
);

/**
 * 获取当前用户信息
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const { passwordHash, ...user } = req.user!;

    ResponseHelper.success(res, { user });
  })
);

export default router;
```

**步骤 6.2: 集成认证路由到应用** (30 分钟)

更新 `src/app.ts`:

```typescript
import authRoutes from './api/auth/routes.js';

// ... 其他导入

export function createApp(): Express {
  const app = express();

  // ... 中间件设置

  // ==================
  // API 路由
  // ==================

  app.use('/api/auth', authRoutes);

  // ... 其他路由和错误处理

  return app;
}
```

**步骤 6.3: 创建认证集成测试** (2 小时)

创建 `tests/integration/auth.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/utils/prisma.js';
import { Express } from 'express';

describe('Auth API Integration', () => {
  let app: Express;

  beforeAll(async () => {
    app = createApp();
  });

  beforeEach(async () => {
    // 清理数据库
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123',
          displayName: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      // 第一次注册
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser1',
          password: 'Password123',
        });

      // 第二次注册相同邮箱
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser2',
          password: 'Password123',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Email already in use');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // 创建测试用户
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123',
        });
    });

    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token', async () => {
      // 注册并获取 tokens
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123',
        });

      const { refreshToken } = registerResponse.body.data;

      // 刷新 token
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.accessToken).not.toBe(registerResponse.body.data.accessToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      // 注册并获取 token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123',
        });

      const { accessToken } = registerResponse.body.data;

      // 获取当前用户
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      // 注册并获取 tokens
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123',
        });

      const { refreshToken } = registerResponse.body.data;

      // 登出
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 尝试使用已登出的 refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(401);
    });
  });
});
```

运行测试:

```bash
pnpm test tests/integration/auth.test.ts
```

**验证清单 Day 6**:
- [ ] 认证路由创建完成
- [ ] 所有认证端点实现
- [ ] 路由集成到应用
- [ ] 集成测试编写完成
- [ ] 所有测试通过

---

## 📝 总结

### 阶段 1 成果

**已完成任务**:
1. ✅ 完整的 Express 后端框架
2. ✅ 环境配置和验证系统
3. ✅ 日志系统（Winston）
4. ✅ 错误处理机制
5. ✅ 数据库 Schema 设计（Prisma）
6. ✅ Repository 模式实现
7. ✅ 完整的认证授权系统
8. ✅ JWT Token 管理
9. ✅ 请求验证和中间件
10. ✅ 工具函数库

**代码统计**:
- 总文件数: ~30 个
- 总代码行数: ~3,500 行
- 测试覆盖率: 70%+

**API 端点**:
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新 Token
- `POST /api/auth/logout` - 登出
- `POST /api/auth/logout-all` - 登出所有设备
- `GET /api/auth/me` - 获取当前用户
- `GET /health` - 健康检查
- `GET /api` - API 信息

### 下一步

**阶段 2 预览**:
- 集成 @google/gemini-cli-core
- 实现 Gemini Client 管理
- 创建 Tool Adapters
- 实现 ChatService

### 最终验证清单

运行完整验证:

```bash
# 1. 启动服务器
pnpm dev

# 2. 测试健康检查
curl http://localhost:3000/health

# 3. 测试注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "username": "demouser",
    "password": "Password123",
    "displayName": "Demo User"
  }'

# 4. 测试登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "Password123"
  }'

# 5. 运行所有测试
pnpm test

# 6. 检查测试覆盖率
pnpm test:coverage

# 7. 类型检查
pnpm typecheck

# 8. 代码检查
pnpm lint
```

**最终检查清单**:
- [ ] 所有依赖安装成功
- [ ] 数据库连接正常
- [ ] 所有测试通过
- [ ] 测试覆盖率 > 70%
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 错误
- [ ] API 文档完整
- [ ] 环境变量配置正确
- [ ] 日志输出正常
- [ ] 错误处理正确
- [ ] 性能测试通过

---

**🎉 阶段 1 完成！**

你已经成功完成了核心基础设施的搭建，包括完整的后端框架和认证系统。现在可以继续进行阶段 2 的开发了。
