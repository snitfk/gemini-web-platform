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
