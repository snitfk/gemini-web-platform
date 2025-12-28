import { createServer } from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import logger from './utils/logger.js';
import { prisma } from './utils/prisma.js';
import { WebSocketService } from './services/websocket.service.js';

let wsService: WebSocketService | null = null;

async function startServer() {
  try {
    // 创建 Express 应用
    const app = createApp();

    // 创建 HTTP 服务器
    const httpServer = createServer(app);

    // 测试数据库连接
    logger.info('Testing database connection...');
    await prisma.$connect();
    logger.info('✓ Database connected');

    // 初始化 WebSocket 服务
    wsService = new WebSocketService(httpServer);
    logger.info('✓ WebSocket service initialized');

    // 启动服务器
    httpServer.listen(config.server.port, config.server.host, () => {
      logger.info(
        `🚀 Server running on http://${config.server.host}:${config.server.port}`
      );
      logger.info(`📝 Environment: ${config.server.env}`);
      logger.info(`📊 Log level: ${config.logging.level}`);
      logger.info(`🔌 WebSocket enabled`);
    });

    // 优雅关闭
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      // 关闭 WebSocket 服务
      if (wsService) {
        await wsService.close();
        logger.info('WebSocket server closed');
      }

      httpServer.close(async () => {
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
