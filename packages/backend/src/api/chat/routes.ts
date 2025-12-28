import { Router, type IRouter } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import {
  createSessionSchema,
  updateSessionSchema,
  sendMessageSchema,
  sessionIdParamSchema,
  messagesQuerySchema,
  sessionsQuerySchema,
} from './schema.js';
import * as controller from './controller.js';

const router: IRouter = Router();

// 所有路由都需要认证
router.use(authenticate);

// 会话管理
router.post(
  '/sessions',
  validate({ body: createSessionSchema }),
  controller.createSession
);

router.get(
  '/sessions',
  validate({ query: sessionsQuerySchema }),
  controller.listSessions
);

router.get(
  '/sessions/:sessionId',
  validate({ params: sessionIdParamSchema }),
  controller.getSession
);

router.patch(
  '/sessions/:sessionId',
  validate({ params: sessionIdParamSchema, body: updateSessionSchema }),
  controller.updateSession
);

router.delete(
  '/sessions/:sessionId',
  validate({ params: sessionIdParamSchema }),
  controller.deleteSession
);

// 消息管理
router.get(
  '/sessions/:sessionId/messages',
  validate({ params: sessionIdParamSchema, query: messagesQuerySchema }),
  controller.getMessages
);

router.post(
  '/sessions/:sessionId/messages',
  validate({ params: sessionIdParamSchema, body: sendMessageSchema }),
  controller.sendMessage
);

// 流式消息 (SSE)
router.post(
  '/sessions/:sessionId/stream',
  validate({ params: sessionIdParamSchema, body: sendMessageSchema }),
  controller.sendMessageStream
);

// 会话摘要
router.post(
  '/sessions/:sessionId/summary',
  validate({ params: sessionIdParamSchema }),
  controller.generateSummary
);

export default router;
