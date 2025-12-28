import { User, Workspace, ChatSession } from '@prisma/client';

import { hashPassword } from '../src/utils/crypto.js';
import { prisma } from '../src/utils/prisma.js';

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
