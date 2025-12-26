import compression from 'compression';
import cors from 'cors';
import express, { Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import authRoutes from './api/auth/routes.js';
import { config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

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

  app.get('/health', (_req, res) => {
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
  app.use('/api/auth', authRoutes);
  // app.use('/api/chat', chatRoutes);
  // app.use('/api/workspaces', workspaceRoutes);

  // API 根路径
  app.get('/api', (_req, res) => {
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
