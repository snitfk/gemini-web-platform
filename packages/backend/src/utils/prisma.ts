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
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// 日志处理
prisma.$on('query', (e: unknown) => {
  const event = e as { query: string; duration: number };
  logger.debug('Query:', { sql: event.query, duration: `${event.duration}ms` });
});

prisma.$on('error', (e: unknown) => {
  logger.error('Prisma error:', e);
});

prisma.$on('warn', (e: unknown) => {
  logger.warn('Prisma warning:', e);
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
