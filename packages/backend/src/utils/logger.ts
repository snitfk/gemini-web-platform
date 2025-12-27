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
