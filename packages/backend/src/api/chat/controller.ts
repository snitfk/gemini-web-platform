import { Request, Response } from 'express';
import { chatService } from '../../services/chat.service.js';
import { ResponseHelper } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

/**
 * 创建会话
 * POST /api/chat/sessions
 */
export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await chatService.createSession(req.user!.id, req.body);
  ResponseHelper.created(res, session);
});

/**
 * 获取会话列表
 * GET /api/chat/sessions
 */
export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.query.workspaceId as string | undefined;
  const limit = parseInt(req.query.limit as string || '20', 10);
  const offset = parseInt(req.query.offset as string || '0', 10);

  const result = await chatService.listSessions(
    req.user!.id,
    workspaceId,
    limit,
    offset
  );

  ResponseHelper.success(res, result);
});

/**
 * 获取会话详情
 * GET /api/chat/sessions/:sessionId
 */
export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = await chatService.getSession(sessionId, req.user!.id);
  ResponseHelper.success(res, session);
});

/**
 * 更新会话
 * PATCH /api/chat/sessions/:sessionId
 */
export const updateSession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = await chatService.updateSession(sessionId, req.user!.id, req.body);
  ResponseHelper.success(res, session);
});

/**
 * 删除会话
 * DELETE /api/chat/sessions/:sessionId
 */
export const deleteSession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  await chatService.deleteSession(sessionId, req.user!.id);
  ResponseHelper.noContent(res);
});

/**
 * 获取会话消息
 * GET /api/chat/sessions/:sessionId/messages
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const limit = parseInt(req.query.limit as string || '50', 10);
  const offset = parseInt(req.query.offset as string || '0', 10);

  const messages = await chatService.getMessages(
    sessionId,
    req.user!.id,
    limit,
    offset
  );

  ResponseHelper.success(res, messages);
});

/**
 * 发送消息（非流式，用于测试）
 * POST /api/chat/sessions/:sessionId/messages
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { message } = req.body;

  const events: unknown[] = [];
  for await (const event of chatService.sendMessage(sessionId, req.user!.id, message)) {
    events.push(event);
  }

  ResponseHelper.success(res, { events });
});

/**
 * 发送消息（流式 SSE）
 * POST /api/chat/sessions/:sessionId/stream
 */
export const sendMessageStream = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { message } = req.body;
  const userId = req.user!.id;

  // 设置 SSE 头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲

  // 发送初始连接消息
  res.write('data: {"type":"connected"}\n\n');

  try {
    // 流式生成
    for await (const event of chatService.sendMessage(sessionId, userId, message)) {
      // 发送事件
      res.write(`data: ${JSON.stringify(event)}\n\n`);

      // 如果是完成或错误事件，结束流
      if (event.type === 'done' || event.type === 'error') {
        break;
      }
    }
  } catch (error) {
    logger.error('Error in stream', { error, sessionId });
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })}\n\n`
    );
  } finally {
    res.end();
  }
});

/**
 * 生成会话摘要
 * POST /api/chat/sessions/:sessionId/summary
 */
export const generateSummary = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const summary = await chatService.generateSummary(sessionId, req.user!.id);

  // 更新会话标题
  await chatService.updateSession(sessionId, req.user!.id, { title: summary });

  ResponseHelper.success(res, { summary });
});
