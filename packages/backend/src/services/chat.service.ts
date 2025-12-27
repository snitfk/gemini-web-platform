import { GeminiClientManager } from './gemini.service.js';
import { prisma } from '../utils/prisma.js';
import { NotFoundError } from '../types/errors.js';
import { ChatEvent } from '../adapters/types.js';
import logger from '../utils/logger.js';

/**
 * 会话状态
 */
export type SessionStatus = 'active' | 'archived' | 'deleted';

/**
 * 消息角色
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

/**
 * 会话创建输入
 */
export interface CreateSessionInput {
  workspaceId: string;
  title?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Chat 服务
 * 管理对话会话和消息
 */
export class ChatService {
  /**
   * 创建新会话
   */
  async createSession(userId: string, input: CreateSessionInput) {
    // 验证工作区是否属于用户
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: input.workspaceId,
        userId,
      },
    });

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    // 创建会话
    const session = await prisma.chatSession.create({
      data: {
        userId,
        workspaceId: input.workspaceId,
        title: input.title || 'New Chat',
        model: input.model || 'gemini-2.0-flash-exp',
        temperature: input.temperature || 0.7,
        maxTokens: input.maxTokens || 8192,
      },
    });

    logger.info('Chat session created', {
      sessionId: session.id,
      userId,
      workspaceId: input.workspaceId,
    });

    return session;
  }

  /**
   * 获取会话
   */
  async getSession(sessionId: string, userId: string) {
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Chat session not found');
    }

    return session;
  }

  /**
   * 列出用户的会话
   */
  async listSessions(
    userId: string,
    workspaceId?: string,
    limit = 20,
    offset = 0
  ) {
    const where = {
      userId,
      ...(workspaceId && { workspaceId }),
    };

    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      prisma.chatSession.count({ where }),
    ]);

    return { sessions, total };
  }

  /**
   * 更新会话
   */
  async updateSession(
    sessionId: string,
    userId: string,
    data: { title?: string; model?: string; temperature?: number; maxTokens?: number }
  ) {
    // 验证会话所有权
    await this.getSession(sessionId, userId);

    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data,
    });

    return session;
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string, userId: string) {
    await this.getSession(sessionId, userId);

    await prisma.chatSession.delete({
      where: { id: sessionId },
    });

    // 清理 Gemini 客户端
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { workspaceId: true },
    });

    if (session) {
      GeminiClientManager.removeClient(userId, session.workspaceId);
    }

    logger.info('Chat session deleted', { sessionId, userId });
  }

  /**
   * 发送消息（流式）
   */
  async *sendMessage(
    sessionId: string,
    userId: string,
    message: string
  ): AsyncGenerator<ChatEvent> {
    // 获取会话
    const session = await this.getSession(sessionId, userId);

    try {
      // 保存用户消息
      await this.saveMessage(sessionId, 'user', message);

      // 获取 Gemini 客户端
      const client = GeminiClientManager.getClient(userId, session.workspaceId, {
        model: session.model,
        generationConfig: {
          temperature: session.temperature,
          maxOutputTokens: session.maxTokens,
        },
      });

      // 流式生成
      let fullResponse = '';
      let hasError = false;

      for await (const event of client.sendMessageStream(message)) {
        yield event;

        if (event.type === 'content' && event.content) {
          fullResponse += event.content;
        }

        if (event.type === 'error') {
          hasError = true;
        }
      }

      // 保存 AI 回复
      if (!hasError && fullResponse) {
        await this.saveMessage(sessionId, 'assistant', fullResponse);
      }

      // 更新会话时间
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

    } catch (error) {
      logger.error('Error in sendMessage', {
        error,
        sessionId,
        userId,
      });

      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取会话消息历史
   */
  async getMessages(sessionId: string, userId: string, limit = 50, offset = 0) {
    // 验证会话所有权
    await this.getSession(sessionId, userId);

    const messages = await prisma.message.findMany({
      where: { chatSessionId: sessionId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
      include: {
        toolExecutions: {
          select: {
            id: true,
            toolName: true,
            status: true,
            duration: true,
          },
        },
      },
    });

    return messages;
  }

  /**
   * 保存消息
   */
  private async saveMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
    metadata?: Record<string, unknown>
  ) {
    return prisma.message.create({
      data: {
        chatSessionId: sessionId,
        role,
        content,
        metadata: metadata || {},
      },
    });
  }

  /**
   * 记录工具执行
   */
  async recordToolExecution(
    messageId: string,
    toolName: string,
    input: Record<string, unknown>,
    output?: unknown,
    error?: string,
    duration?: number
  ) {
    return prisma.toolExecution.create({
      data: {
        messageId,
        toolName,
        toolInput: input,
        toolOutput: output || null,
        status: error ? 'failed' : 'completed',
        error,
        duration,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
  }

  /**
   * 生成会话摘要
   */
  async generateSummary(sessionId: string, userId: string): Promise<string> {
    const messages = await this.getMessages(sessionId, userId, 10);

    if (messages.length === 0) {
      return 'Empty conversation';
    }

    // 使用第一条用户消息作为摘要的基础
    const firstUserMessage = messages.find((m) => m.role === 'user');
    if (firstUserMessage) {
      const summary = firstUserMessage.content.substring(0, 100);
      return summary.length < firstUserMessage.content.length
        ? `${summary}...`
        : summary;
    }

    return 'Conversation';
  }
}

// 导出单例
export const chatService = new ChatService();
