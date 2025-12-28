import { ChatSession, Prisma } from '@prisma/client';

import { prisma } from '../utils/prisma.js';

import { BaseRepository } from './base.repository.js';

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

  async findUnique(
    where: Prisma.ChatSessionWhereUniqueInput
  ): Promise<ChatSession | null> {
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

  async delete(
    where: Prisma.ChatSessionWhereUniqueInput
  ): Promise<ChatSession> {
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
