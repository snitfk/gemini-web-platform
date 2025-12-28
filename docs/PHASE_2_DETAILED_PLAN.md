# 阶段 2: Core 包集成 - 详细执行方案

## 📋 概览

**阶段目标**: 集成 `packages/core`，实现完整的对话功能和工具执行系统
**持续时间**: 3 周 (15 个工作日)
**关键产出**: 可用的对话 API + 工具适配器 + 端到端集成测试

---

## 🗓️ 时间规划

| 任务模块 | 天数 | 负责人 | 依赖 |
|---------|------|--------|------|
| 2.1 Core 包分析与准备 | 2 天 | 后端 #1 + #2 | 阶段 1 完成 |
| 2.2 Gemini API 集成 | 3 天 | 后端 #1 | 2.1 完成 |
| 2.3 对话管理服务 | 4 天 | 后端 #1 | 2.2 完成 |
| 2.4 工具系统适配 | 6 天 | 后端 #2 | 2.1 完成 |
| 2.5 CoreToolScheduler 集成 | 3 天 | 后端 #1 + #2 | 2.3, 2.4 完成 |
| 2.6 集成测试 | 3 天 | 后端 #1 + #2 | 2.1-2.5 完成 |

**注意**: 2.2-2.3 和 2.4 可以并行进行

---

## 🔍 任务 2.1: Core 包分析与准备 (2 天)

### 目标
深入分析 `packages/core` 的架构和依赖，设计适配器接口。

### 详细步骤

#### Day 1: Core 包依赖分析

**步骤 1.1: 创建 Core 包链接** (1 小时)

```bash
# 方案 A: 使用 pnpm workspace
cd packages
ln -s ../../gemini-cli/packages/core ./core

# 更新 packages/backend/package.json
pnpm add @google/gemini-cli-core@workspace:*
```

更新 `packages/backend/package.json`:

```json
{
  "dependencies": {
    "@google/gemini-cli-core": "workspace:*",
    "@google/genai": "^1.30.0"
  }
}
```

**步骤 1.2: 分析 Core 包导出** (2 小时)

创建 `docs/CORE_PACKAGE_ANALYSIS.md`:

```markdown
# Core 包分析报告

## 核心类

### GeminiClient
- **位置**: `packages/core/src/core/client.ts`
- **职责**: 管理与 Gemini API 的交互
- **关键方法**:
  - `initialize()`: 初始化客户端
  - `sendMessage(message: string)`: 发送消息并返回流式响应
  - `getSessionHistory()`: 获取会话历史

### GeminiChat
- **位置**: `packages/core/src/core/geminiChat.ts`
- **职责**: 底层 Gemini API 调用
- **关键方法**:
  - `sendMessage(content)`: 发送消息
  - `streamGenerateContent()`: 流式生成内容

### CoreToolScheduler
- **位置**: `packages/core/src/core/coreToolScheduler.ts`
- **职责**: 工具调度和执行
- **关键方法**:
  - `scheduleTool()`: 调度工具执行
  - `executeTool()`: 执行工具

## 工具系统

### 工具列表
1. ReadFileTool - 读取文件
2. WriteFileTool - 写入文件
3. EditTool - 编辑文件
4. ShellTool - 执行 Shell 命令
5. GrepTool - 文本搜索
6. GlobTool - 文件匹配
7. WebFetchTool - 网页抓取
8. WebSearchTool - 网页搜索
9. MemoryTool - 内存管理
10. WriteTodosTool - Todo 管理

### 工具接口
```typescript
interface Tool {
  name: string;
  description: string;
  schema: object;
  execute(params: any): Promise<ToolResult>;
}
```

## 依赖关系

### 核心依赖
- `@google/genai`: Gemini API SDK
- Node.js 文件系统 API
- Docker/PTY (用于 Shell 执行)

### 需要适配的部分
1. 文件系统访问 → MinIO/S3
2. Shell 执行 → Docker 容器
3. CLI 特定代码 → Web 环境
```

**步骤 1.3: 设计适配器架构** (2 小时)

创建 `packages/backend/src/adapters/types.ts`:

```typescript
/**
 * 工具适配器基础接口
 */
export interface ToolAdapter<TParams = any, TResult = any> {
  /**
   * 执行工具
   */
  execute(params: TParams): Promise<TResult>;

  /**
   * 验证参数
   */
  validate?(params: TParams): Promise<boolean>;

  /**
   * 获取工具名称
   */
  getName(): string;
}

/**
 * 异步流式适配器
 */
export interface StreamingToolAdapter<TParams = any, TChunk = any>
  extends ToolAdapter<TParams, AsyncIterable<TChunk>> {
  /**
   * 流式执行
   */
  executeStream(params: TParams): AsyncIterable<TChunk>;
}

/**
 * 文件系统适配器接口
 */
export interface FileSystemAdapter {
  readFile(workspaceId: string, path: string): Promise<string>;
  writeFile(workspaceId: string, path: string, content: string): Promise<void>;
  editFile(workspaceId: string, path: string, edits: FileEdit[]): Promise<void>;
  listFiles(workspaceId: string, pattern: string): Promise<string[]>;
  deleteFile(workspaceId: string, path: string): Promise<void>;
}

export interface FileEdit {
  oldText: string;
  newText: string;
}

/**
 * Shell 适配器接口
 */
export interface ShellAdapter {
  execute(
    workspaceId: string,
    command: string,
    options?: ShellExecuteOptions
  ): AsyncIterable<ShellOutput>;

  kill(workspaceId: string, processId: string): Promise<void>;
}

export interface ShellExecuteOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface ShellOutput {
  type: 'stdout' | 'stderr' | 'exit';
  data: string | number;
}

/**
 * Web 工具适配器接口
 */
export interface WebToolsAdapter {
  fetch(url: string, options?: FetchOptions): Promise<string>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface SearchOptions {
  limit?: number;
  language?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}
```

**步骤 1.4: 创建适配器工厂** (2 小时)

创建 `packages/backend/src/adapters/factory.ts`:

```typescript
import { FileSystemAdapter, ShellAdapter, WebToolsAdapter } from './types.js';
import { MinIOFileSystemAdapter } from './filesystem/minio.adapter.js';
import { DockerShellAdapter } from './shell/docker.adapter.js';
import { ProxyWebToolsAdapter } from './web/proxy.adapter.js';
import { config } from '../config/index.js';

/**
 * 适配器工厂
 */
export class AdapterFactory {
  private static fileSystemAdapter: FileSystemAdapter;
  private static shellAdapter: ShellAdapter;
  private static webToolsAdapter: WebToolsAdapter;

  /**
   * 获取文件系统适配器
   */
  static getFileSystemAdapter(): FileSystemAdapter {
    if (!this.fileSystemAdapter) {
      this.fileSystemAdapter = new MinIOFileSystemAdapter({
        endpoint: config.minio.endpoint,
        port: config.minio.port,
        accessKey: config.minio.accessKey,
        secretKey: config.minio.secretKey,
        bucket: config.minio.bucket,
        useSSL: config.minio.useSSL,
      });
    }
    return this.fileSystemAdapter;
  }

  /**
   * 获取 Shell 适配器
   */
  static getShellAdapter(): ShellAdapter {
    if (!this.shellAdapter) {
      this.shellAdapter = new DockerShellAdapter({
        host: config.docker.host,
        sandboxImage: config.docker.sandboxImage,
        memoryLimit: config.docker.sandboxMemoryLimit,
        cpuLimit: config.docker.sandboxCpuLimit,
      });
    }
    return this.shellAdapter;
  }

  /**
   * 获取 Web 工具适配器
   */
  static getWebToolsAdapter(): WebToolsAdapter {
    if (!this.webToolsAdapter) {
      this.webToolsAdapter = new ProxyWebToolsAdapter();
    }
    return this.webToolsAdapter;
  }
}
```

**验证清单 Day 1**:
- [ ] Core 包成功链接到项目
- [ ] Core 包分析文档完成
- [ ] 适配器接口设计完成
- [ ] 适配器工厂实现完成

---

#### Day 2: 配置管理和工具注册表

**步骤 2.1: 创建 Core 配置适配器** (2 小时)

创建 `packages/backend/src/services/core-config.service.ts`:

```typescript
import { Config as CoreConfig } from '@google/gemini-cli-core';
import { config } from '../config/index.js';
import { ToolRegistry } from '@google/gemini-cli-core';
import logger from '../utils/logger.js';

/**
 * Core 配置服务
 * 将 Web 平台配置转换为 Core 包需要的格式
 */
export class CoreConfigService {
  /**
   * 为用户创建 Core Config
   */
  static createConfig(userId: string, workspaceId: string): CoreConfig {
    return new CoreConfig({
      // API Key (从用户配置或环境变量获取)
      apiKey: config.gemini.apiKey,

      // 目标目录 (工作区路径)
      targetDir: `/workspaces/${workspaceId}`,

      // 会话 ID
      sessionId: `${userId}-${workspaceId}-${Date.now()}`,

      // 工具配置
      tools: {
        enabled: [
          'read-file',
          'write-file',
          'edit',
          'shell',
          'grep',
          'glob',
          'web-fetch',
          'web-search',
          'memory',
          'write-todos',
        ],
      },

      // 沙箱配置
      sandbox: {
        enabled: true,
        image: config.docker.sandboxImage,
      },

      // 日志配置
      logging: {
        level: config.logging.level,
      },
    });
  }

  /**
   * 创建工具注册表
   */
  static createToolRegistry(workspaceId: string): ToolRegistry {
    const registry = new ToolRegistry();

    // 注册适配后的工具
    // 将在后续步骤中实现

    return registry;
  }
}
```

**步骤 2.2: 创建用户特定的 Gemini Client 管理器** (2.5 小时)

创建 `packages/backend/src/services/gemini-client-manager.service.ts`:

```typescript
import { GeminiClient } from '@google/gemini-cli-core';
import { CoreConfigService } from './core-config.service.js';
import logger from '../utils/logger.js';

/**
 * Gemini Client 管理器
 * 为每个用户/工作区维护独立的 GeminiClient 实例
 */
export class GeminiClientManager {
  private static clients = new Map<string, GeminiClient>();

  /**
   * 获取或创建客户端
   */
  static async getClient(
    userId: string,
    workspaceId: string
  ): Promise<GeminiClient> {
    const key = `${userId}:${workspaceId}`;

    if (!this.clients.has(key)) {
      logger.info('Creating new GeminiClient', { userId, workspaceId });

      const config = CoreConfigService.createConfig(userId, workspaceId);
      const client = new GeminiClient(config);

      await client.initialize();

      this.clients.set(key, client);
    }

    return this.clients.get(key)!;
  }

  /**
   * 移除客户端
   */
  static removeClient(userId: string, workspaceId: string): void {
    const key = `${userId}:${workspaceId}`;
    this.clients.delete(key);
    logger.info('Removed GeminiClient', { userId, workspaceId });
  }

  /**
   * 清理空闲客户端
   */
  static cleanupIdleClients(idleTimeMs: number = 30 * 60 * 1000): void {
    // TODO: 实现空闲检测和清理
  }
}
```

**步骤 2.3: 创建集成测试计划** (1.5 小时)

创建 `packages/backend/tests/integration/core-integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GeminiClientManager } from '../../src/services/gemini-client-manager.service.js';
import { createTestUser, createTestWorkspace } from '../helpers.js';

describe('Core Package Integration', () => {
  let userId: string;
  let workspaceId: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;

    const workspace = await createTestWorkspace(userId);
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    GeminiClientManager.removeClient(userId, workspaceId);
  });

  it('should create GeminiClient instance', async () => {
    const client = await GeminiClientManager.getClient(userId, workspaceId);

    expect(client).toBeDefined();
    expect(client).toHaveProperty('initialize');
    expect(client).toHaveProperty('sendMessage');
  });

  it('should reuse existing client instance', async () => {
    const client1 = await GeminiClientManager.getClient(userId, workspaceId);
    const client2 = await GeminiClientManager.getClient(userId, workspaceId);

    expect(client1).toBe(client2);
  });

  it('should send simple message', async () => {
    const client = await GeminiClientManager.getClient(userId, workspaceId);

    const events: any[] = [];
    for await (const event of client.sendMessage('Hello, respond with "Hi"')) {
      events.push(event);
      if (event.type === 'content' && event.text) {
        expect(event.text.toLowerCase()).toContain('hi');
        break;
      }
    }

    expect(events.length).toBeGreaterThan(0);
  });
});
```

**验证清单 Day 2**:
- [ ] Core 配置服务创建完成
- [ ] GeminiClient 管理器实现完成
- [ ] 集成测试计划编写完成
- [ ] 测试可以运行（即使暂时跳过）

---

## 🤖 任务 2.2: Gemini API 集成 (3 天)

### 目标
实现完整的 Gemini API 调用封装，支持流式响应和错误处理。

### 详细步骤

#### Day 3: ChatService 基础实现

**步骤 3.1: 创建 ChatService** (3 小时)

创建 `packages/backend/src/services/chat.service.ts`:

```typescript
import { GeminiClientManager } from './gemini-client-manager.service.js';
import { prisma } from '../utils/prisma.js';
import { ChatSession, Message } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../types/errors.js';
import logger from '../utils/logger.js';

export interface ChatEvent {
  type: 'content' | 'tool_call' | 'tool_result' | 'thinking' | 'done' | 'error';
  content?: string;
  toolCall?: any;
  toolResult?: any;
  thinking?: string;
  error?: string;
}

export class ChatService {
  /**
   * 创建新会话
   */
  async createSession(
    userId: string,
    workspaceId: string,
    title?: string
  ): Promise<ChatSession> {
    // 验证工作区是否属于用户
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
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
        workspaceId,
        title: title || 'New Chat',
        status: 'ACTIVE',
      },
    });

    logger.info('Chat session created', {
      sessionId: session.id,
      userId,
      workspaceId,
    });

    return session;
  }

  /**
   * 获取会话
   */
  async getSession(sessionId: string, userId: string): Promise<ChatSession> {
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundError('Chat session not found');
    }

    return session;
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

    if (session.status !== 'ACTIVE') {
      throw new BadRequestError('Chat session is not active');
    }

    try {
      // 保存用户消息
      await this.saveMessage(sessionId, 'USER', { text: message });

      // 获取 GeminiClient
      const client = await GeminiClientManager.getClient(
        userId,
        session.workspaceId
      );

      // 流式生成
      let fullResponse = '';
      for await (const event of client.sendMessage(message)) {
        // 转换事件格式
        const chatEvent = this.convertToChatEvent(event);
        yield chatEvent;

        // 收集完整响应
        if (chatEvent.type === 'content' && chatEvent.content) {
          fullResponse += chatEvent.content;
        }
      }

      // 保存 AI 回复
      await this.saveMessage(sessionId, 'MODEL', { text: fullResponse });

      // 更新统计
      await this.updateSessionStats(sessionId);

      yield { type: 'done' };
    } catch (error) {
      logger.error('Error in sendMessage', { error, sessionId, userId });
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 保存消息
   */
  private async saveMessage(
    sessionId: string,
    role: 'USER' | 'MODEL' | 'TOOL',
    content: any
  ): Promise<Message> {
    return prisma.message.create({
      data: {
        sessionId,
        role,
        content,
      },
    });
  }

  /**
   * 转换事件格式
   */
  private convertToChatEvent(coreEvent: any): ChatEvent {
    // TODO: 实现事件转换逻辑
    return {
      type: 'content',
      content: coreEvent.text || '',
    };
  }

  /**
   * 更新会话统计
   */
  private async updateSessionStats(sessionId: string): Promise<void> {
    const messageCount = await prisma.message.count({
      where: { sessionId },
    });

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        messageCount,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 获取会话历史
   */
  async getSessionHistory(
    sessionId: string,
    userId: string,
    limit: number = 50
  ): Promise<Message[]> {
    // 验证会话所有权
    await this.getSession(sessionId, userId);

    return prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    await this.getSession(sessionId, userId);

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'DELETED' },
    });

    logger.info('Chat session deleted', { sessionId, userId });
  }

  /**
   * 列出用户的会话
   */
  async listUserSessions(
    userId: string,
    workspaceId?: string
  ): Promise<ChatSession[]> {
    return prisma.chatSession.findMany({
      where: {
        userId,
        ...(workspaceId && { workspaceId }),
        status: 'ACTIVE',
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}

// 导出单例
export const chatService = new ChatService();
```

**步骤 3.2: 创建 Chat API 路由** (2 小时)

创建 `packages/backend/src/api/chat/routes.ts`:

```typescript
import { Router } from 'express';
import { chatService } from '../../services/chat.service.js';
import { authMiddleware } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';
import { ResponseHelper } from '../../utils/response.js';

const router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

// Schema 定义
const createSessionSchema = z.object({
  body: z.object({
    workspaceId: z.string().uuid(),
    title: z.string().optional(),
  }),
});

const sendMessageSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid(),
  }),
  body: z.object({
    message: z.string().min(1),
  }),
});

/**
 * POST /api/chat/sessions
 * 创建新会话
 */
router.post(
  '/sessions',
  validate(createSessionSchema),
  asyncHandler(async (req, res) => {
    const { workspaceId, title } = req.body;
    const userId = req.user!.id;

    const session = await chatService.createSession(userId, workspaceId, title);

    return ResponseHelper.created(res, session);
  })
);

/**
 * GET /api/chat/sessions
 * 列出用户的会话
 */
router.get(
  '/sessions',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { workspaceId } = req.query;

    const sessions = await chatService.listUserSessions(
      userId,
      workspaceId as string | undefined
    );

    return ResponseHelper.success(res, sessions);
  })
);

/**
 * GET /api/chat/sessions/:sessionId
 * 获取会话详情
 */
router.get(
  '/sessions/:sessionId',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    const session = await chatService.getSession(sessionId, userId);

    return ResponseHelper.success(res, session);
  })
);

/**
 * GET /api/chat/sessions/:sessionId/messages
 * 获取会话消息历史
 */
router.get(
  '/sessions/:sessionId/messages',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await chatService.getSessionHistory(
      sessionId,
      userId,
      limit
    );

    return ResponseHelper.success(res, messages);
  })
);

/**
 * POST /api/chat/sessions/:sessionId/messages
 * 发送消息（非流式，用于测试）
 */
router.post(
  '/sessions/:sessionId/messages',
  validate(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { message } = req.body;
    const userId = req.user!.id;

    const events: any[] = [];
    for await (const event of chatService.sendMessage(
      sessionId,
      userId,
      message
    )) {
      events.push(event);
    }

    return ResponseHelper.success(res, { events });
  })
);

/**
 * DELETE /api/chat/sessions/:sessionId
 * 删除会话
 */
router.delete(
  '/sessions/:sessionId',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    await chatService.deleteSession(sessionId, userId);

    return ResponseHelper.noContent(res);
  })
);

export default router;
```

**步骤 3.3: 挂载 Chat 路由** (30 分钟)

更新 `packages/backend/src/app.ts`:

```typescript
// 导入路由
import chatRoutes from './api/chat/routes.js';

// ... 其他代码

// API 路由
app.use('/api/chat', chatRoutes);
```

**步骤 3.4: 测试 Chat API** (1.5 小时)

创建 `packages/backend/tests/integration/chat-api.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  createTestUser,
  createTestWorkspace,
  generateAccessToken,
} from '../helpers.js';
import { Express } from 'express';

describe('Chat API', () => {
  let app: Express;
  let accessToken: string;
  let userId: string;
  let workspaceId: string;

  beforeAll(async () => {
    app = createApp();

    // 创建测试用户和工作区
    const user = await createTestUser();
    userId = user.id;
    accessToken = generateAccessToken(userId, user.email);

    const workspace = await createTestWorkspace(userId);
    workspaceId = workspace.id;
  });

  describe('POST /api/chat/sessions', () => {
    it('should create new chat session', async () => {
      const response = await request(app)
        .post('/api/chat/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          workspaceId,
          title: 'Test Session',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Test Session');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/chat/sessions')
        .send({ workspaceId });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/chat/sessions', () => {
    it('should list user sessions', async () => {
      const response = await request(app)
        .get('/api/chat/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/chat/sessions/:sessionId/messages', () => {
    it('should send message and get response', async () => {
      // 创建会话
      const createResponse = await request(app)
        .post('/api/chat/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ workspaceId });

      const sessionId = createResponse.body.data.id;

      // 发送消息
      const response = await request(app)
        .post(`/api/chat/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          message: 'Hello, respond with "Hi"',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toBeDefined();
      expect(response.body.data.events.length).toBeGreaterThan(0);
    }, 30000); // 30秒超时
  });
});
```

运行测试:

```bash
cd packages/backend
pnpm test chat-api
```

**验证清单 Day 3**:
- [ ] ChatService 实现完成
- [ ] Chat API 路由创建完成
- [ ] 路由挂载成功
- [ ] 集成测试通过
- [ ] 可以创建会话和发送消息

---

#### Day 4-5: 流式响应和错误处理

**步骤 4.1: 实现 SSE 流式端点** (3 小时)

创建 `packages/backend/src/api/chat/stream.routes.ts`:

```typescript
import { Router } from 'express';
import { chatService } from '../../services/chat.service.js';
import { authMiddleware } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

const router = Router();

router.use(authMiddleware);

/**
 * POST /api/chat/sessions/:sessionId/stream
 * 流式发送消息（SSE）
 */
router.post(
  '/sessions/:sessionId/stream',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { message } = req.body;
    const userId = req.user!.id;

    // 设置 SSE 头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 发送初始连接消息
    res.write('data: {"type":"connected"}\n\n');

    try {
      // 流式生成
      for await (const event of chatService.sendMessage(
        sessionId,
        userId,
        message
      )) {
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
  })
);

export default router;
```

挂载到 `app.ts`:

```typescript
import chatStreamRoutes from './api/chat/stream.routes.js';

app.use('/api/chat', chatStreamRoutes);
```

**步骤 4.2: 改进错误处理** (2 小时)

更新 `packages/backend/src/services/chat.service.ts`:

```typescript
// 在 sendMessage 方法中添加更详细的错误处理
async *sendMessage(
  sessionId: string,
  userId: string,
  message: string
): AsyncGenerator<ChatEvent> {
  const session = await this.getSession(sessionId, userId);

  if (session.status !== 'ACTIVE') {
    throw new BadRequestError('Chat session is not active');
  }

  try {
    await this.saveMessage(sessionId, 'USER', { text: message });

    const client = await GeminiClientManager.getClient(
      userId,
      session.workspaceId
    );

    let fullResponse = '';
    let hasError = false;

    try {
      for await (const event of client.sendMessage(message)) {
        const chatEvent = this.convertToChatEvent(event);
        yield chatEvent;

        if (chatEvent.type === 'content' && chatEvent.content) {
          fullResponse += chatEvent.content;
        }

        if (chatEvent.type === 'error') {
          hasError = true;
        }
      }
    } catch (streamError) {
      logger.error('Stream error', { streamError, sessionId });
      yield {
        type: 'error',
        error: streamError instanceof Error
          ? streamError.message
          : 'Stream error occurred',
      };
      hasError = true;
    }

    // 只在成功时保存响应
    if (!hasError && fullResponse) {
      await this.saveMessage(sessionId, 'MODEL', { text: fullResponse });
      await this.updateSessionStats(sessionId);
    }

    yield { type: 'done' };
  } catch (error) {
    logger.error('Error in sendMessage', {
      error,
      sessionId,
      userId,
      message: error instanceof Error ? error.message : 'Unknown'
    });

    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

**步骤 4.3: 实现重试机制** (2 小时)

创建 `packages/backend/src/utils/retry.ts`:

```typescript
import logger from './logger.js';

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

const defaultOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * 带重试的异步函数执行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // 检查是否应该重试
      if (attempt === opts.maxAttempts) {
        break;
      }

      if (opts.retryableErrors && !isRetryableError(error, opts.retryableErrors)) {
        throw error;
      }

      logger.warn('Operation failed, retrying', {
        attempt,
        maxAttempts: opts.maxAttempts,
        error: lastError.message,
        nextRetryInMs: delay,
      });

      // 等待后重试
      await sleep(delay);

      // 指数退避
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError!;
}

function isRetryableError(error: any, retryableErrors: string[]): boolean {
  const errorMessage = error.message || error.toString();
  return retryableErrors.some((msg) => errorMessage.includes(msg));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

在 `chat.service.ts` 中使用重试:

```typescript
import { withRetry } from '../utils/retry.js';

// 在 sendMessage 中
const client = await withRetry(
  () => GeminiClientManager.getClient(userId, session.workspaceId),
  {
    maxAttempts: 3,
    retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT'],
  }
);
```

**步骤 4.4: 测试流式端点** (2 小时)

创建测试客户端 `scripts/test-stream.ts`:

```typescript
import fetch from 'node-fetch';

async function testStream() {
  const accessToken = process.env.ACCESS_TOKEN;
  const sessionId = process.env.SESSION_ID;

  if (!accessToken || !sessionId) {
    console.error('Please set ACCESS_TOKEN and SESSION_ID environment variables');
    process.exit(1);
  }

  const response = await fetch(
    `http://localhost:3000/api/chat/sessions/${sessionId}/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: 'Write a short poem about coding',
      }),
    }
  );

  if (!response.ok) {
    console.error('Stream failed:', response.statusText);
    process.exit(1);
  }

  console.log('Stream started...\n');

  // 读取流
  const reader = response.body!;
  let buffer = '';

  reader.on('data', (chunk) => {
    buffer += chunk.toString();

    // 处理完整的事件
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.substring(6));
        console.log('Event:', data.type);

        if (data.type === 'content') {
          process.stdout.write(data.content);
        } else if (data.type === 'done') {
          console.log('\n\nStream completed!');
        } else if (data.type === 'error') {
          console.error('\nError:', data.error);
        }
      }
    }
  });

  reader.on('end', () => {
    console.log('\nStream ended');
  });

  reader.on('error', (error) => {
    console.error('Stream error:', error);
  });
}

testStream();
```

运行测试:

```bash
ACCESS_TOKEN=your_token SESSION_ID=your_session_id pnpm tsx scripts/test-stream.ts
```

**验证清单 Day 4-5**:
- [ ] SSE 流式端点实现完成
- [ ] 错误处理完善
- [ ] 重试机制实现
- [ ] 流式测试通过
- [ ] 可以实时接收 AI 响应

---

## Day 6: 文件系统适配器实现（MinIO 集成）

### 目标

实现 FileSystemAdapter 将 Core 包的文件操作桥接到 MinIO/S3 对象存储。

### 任务分解

#### 1. MinIO 客户端配置

创建 `packages/backend/src/adapters/minio-client.ts`:

```typescript
import { Client } from 'minio';
import { config } from '../config';
import { logger } from '../utils/logger';

export class MinIOClient {
  private static instance: Client;

  static getInstance(): Client {
    if (!this.instance) {
      this.instance = new Client({
        endPoint: config.minio.endpoint,
        port: config.minio.port,
        useSSL: config.minio.useSSL,
        accessKey: config.minio.accessKey,
        secretKey: config.minio.secretKey,
      });

      logger.info('MinIO client initialized', {
        endpoint: config.minio.endpoint,
        port: config.minio.port,
      });
    }

    return this.instance;
  }

  /**
   * 确保工作区 bucket 存在
   */
  static async ensureBucket(bucketName: string): Promise<void> {
    const client = this.getInstance();
    const exists = await client.bucketExists(bucketName);

    if (!exists) {
      await client.makeBucket(bucketName, 'us-east-1');
      logger.info(`Created bucket: ${bucketName}`);
    }
  }

  /**
   * 获取工作区的 bucket 名称
   */
  static getWorkspaceBucket(workspaceId: string): string {
    return `workspace-${workspaceId}`;
  }
}
```

#### 2. FileSystemAdapter 实现

创建 `packages/backend/src/adapters/filesystem-adapter.ts`:

```typescript
import { Readable, Writable } from 'stream';
import { MinIOClient } from './minio-client';
import { logger } from '../utils/logger';
import { InternalServerError } from '../utils/errors';

export interface FileSystemAdapter {
  readFile(workspaceId: string, filePath: string): Promise<Buffer>;
  writeFile(workspaceId: string, filePath: string, content: Buffer | string): Promise<void>;
  deleteFile(workspaceId: string, filePath: string): Promise<void>;
  listFiles(workspaceId: string, dirPath: string): Promise<string[]>;
  fileExists(workspaceId: string, filePath: string): Promise<boolean>;
  createReadStream(workspaceId: string, filePath: string): Promise<Readable>;
  createWriteStream(workspaceId: string, filePath: string): Promise<Writable>;
}

export class MinIOFileSystemAdapter implements FileSystemAdapter {
  private client = MinIOClient.getInstance();

  async readFile(workspaceId: string, filePath: string): Promise<Buffer> {
    try {
      const bucketName = MinIOClient.getWorkspaceBucket(workspaceId);
      await MinIOClient.ensureBucket(bucketName);

      const stream = await this.client.getObject(bucketName, filePath);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to read file from MinIO', { workspaceId, filePath, error });
      throw new InternalServerError(`Failed to read file: ${filePath}`);
    }
  }

  async writeFile(
    workspaceId: string,
    filePath: string,
    content: Buffer | string
  ): Promise<void> {
    try {
      const bucketName = MinIOClient.getWorkspaceBucket(workspaceId);
      await MinIOClient.ensureBucket(bucketName);

      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
      await this.client.putObject(bucketName, filePath, buffer, buffer.length);

      logger.debug('File written to MinIO', { workspaceId, filePath, size: buffer.length });
    } catch (error) {
      logger.error('Failed to write file to MinIO', { workspaceId, filePath, error });
      throw new InternalServerError(`Failed to write file: ${filePath}`);
    }
  }

  async deleteFile(workspaceId: string, filePath: string): Promise<void> {
    try {
      const bucketName = MinIOClient.getWorkspaceBucket(workspaceId);
      await this.client.removeObject(bucketName, filePath);

      logger.debug('File deleted from MinIO', { workspaceId, filePath });
    } catch (error) {
      logger.error('Failed to delete file from MinIO', { workspaceId, filePath, error });
      throw new InternalServerError(`Failed to delete file: ${filePath}`);
    }
  }

  async listFiles(workspaceId: string, dirPath: string): Promise<string[]> {
    try {
      const bucketName = MinIOClient.getWorkspaceBucket(workspaceId);
      await MinIOClient.ensureBucket(bucketName);

      const prefix = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
      const stream = this.client.listObjects(bucketName, prefix, false);

      const files: string[] = [];
      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          if (obj.name) {
            files.push(obj.name);
          }
        });
        stream.on('end', () => resolve(files));
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to list files from MinIO', { workspaceId, dirPath, error });
      throw new InternalServerError(`Failed to list files: ${dirPath}`);
    }
  }

  async fileExists(workspaceId: string, filePath: string): Promise<boolean> {
    try {
      const bucketName = MinIOClient.getWorkspaceBucket(workspaceId);
      await this.client.statObject(bucketName, filePath);
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  async createReadStream(workspaceId: string, filePath: string): Promise<Readable> {
    try {
      const bucketName = MinIOClient.getWorkspaceBucket(workspaceId);
      await MinIOClient.ensureBucket(bucketName);

      return await this.client.getObject(bucketName, filePath);
    } catch (error) {
      logger.error('Failed to create read stream from MinIO', { workspaceId, filePath, error });
      throw new InternalServerError(`Failed to read file: ${filePath}`);
    }
  }

  async createWriteStream(workspaceId: string, filePath: string): Promise<Writable> {
    const bucketName = MinIOClient.getWorkspaceBucket(workspaceId);
    await MinIOClient.ensureBucket(bucketName);

    // MinIO 不直接支持 writable stream，我们创建一个自定义的
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    // 当流结束时，上传到 MinIO
    writable.on('finish', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        await this.writeFile(workspaceId, filePath, buffer);
      } catch (error) {
        logger.error('Failed to upload file on stream finish', { workspaceId, filePath, error });
      }
    });

    return writable;
  }
}
```

#### 3. FileSystemAdapter 集成测试

创建 `packages/backend/src/adapters/__tests__/filesystem-adapter.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MinIOFileSystemAdapter } from '../filesystem-adapter';
import { MinIOClient } from '../minio-client';

describe('MinIOFileSystemAdapter', () => {
  const adapter = new MinIOFileSystemAdapter();
  const testWorkspaceId = 'test-workspace';
  const testFilePath = 'test-file.txt';
  const testContent = 'Hello, MinIO!';

  beforeAll(async () => {
    // 确保测试 bucket 存在
    await MinIOClient.ensureBucket(MinIOClient.getWorkspaceBucket(testWorkspaceId));
  });

  afterAll(async () => {
    // 清理测试文件
    try {
      await adapter.deleteFile(testWorkspaceId, testFilePath);
    } catch (error) {
      // 忽略清理错误
    }
  });

  it('should write and read file', async () => {
    await adapter.writeFile(testWorkspaceId, testFilePath, testContent);
    const content = await adapter.readFile(testWorkspaceId, testFilePath);

    expect(content.toString()).toBe(testContent);
  });

  it('should check file exists', async () => {
    await adapter.writeFile(testWorkspaceId, testFilePath, testContent);
    const exists = await adapter.fileExists(testWorkspaceId, testFilePath);

    expect(exists).toBe(true);
  });

  it('should list files', async () => {
    await adapter.writeFile(testWorkspaceId, 'dir/file1.txt', 'content1');
    await adapter.writeFile(testWorkspaceId, 'dir/file2.txt', 'content2');

    const files = await adapter.listFiles(testWorkspaceId, 'dir');

    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(files.some((f) => f.includes('file1.txt'))).toBe(true);
  });

  it('should delete file', async () => {
    await adapter.writeFile(testWorkspaceId, testFilePath, testContent);
    await adapter.deleteFile(testWorkspaceId, testFilePath);

    const exists = await adapter.fileExists(testWorkspaceId, testFilePath);
    expect(exists).toBe(false);
  });

  it('should create read stream', async () => {
    await adapter.writeFile(testWorkspaceId, testFilePath, testContent);
    const stream = await adapter.createReadStream(testWorkspaceId, testFilePath);

    const chunks: Buffer[] = [];
    return new Promise<void>((resolve) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        const content = Buffer.concat(chunks).toString();
        expect(content).toBe(testContent);
        resolve();
      });
    });
  });
});
```

运行测试:

```bash
# 确保 MinIO 容器运行
docker-compose up -d minio

# 运行测试
pnpm --filter @gemini-cli/backend test adapters/filesystem-adapter
```

**验证清单 Day 6**:
- [ ] MinIOClient 单例实现
- [ ] FileSystemAdapter 接口定义
- [ ] 所有文件操作方法实现
- [ ] 流式读写支持
- [ ] 集成测试通过
- [ ] MinIO 连接正常

---

## Day 7-8: Shell 适配器实现（Docker 沙箱）

### 目标

实现 ShellAdapter 将 Core 包的 Shell 执行桥接到 Docker 容器沙箱环境。

### 任务分解

#### 1. Docker 客户端包装

创建 `packages/backend/src/adapters/docker-client.ts`:

```typescript
import Docker from 'dockerode';
import { config } from '../config';
import { logger } from '../utils/logger';
import { InternalServerError } from '../utils/errors';

export class DockerClientManager {
  private static instance: Docker;

  static getInstance(): Docker {
    if (!this.instance) {
      this.instance = new Docker(config.docker.options);
      logger.info('Docker client initialized');
    }

    return this.instance;
  }

  /**
   * 为工作区创建容器
   */
  static async createWorkspaceContainer(
    workspaceId: string,
    userId: string
  ): Promise<Docker.Container> {
    const docker = this.getInstance();

    try {
      const container = await docker.createContainer({
        Image: config.docker.sandboxImage,
        name: `workspace-${workspaceId}`,
        Env: [
          `WORKSPACE_ID=${workspaceId}`,
          `USER_ID=${userId}`,
        ],
        HostConfig: {
          Memory: config.docker.sandboxMemoryLimit,
          CpuQuota: config.docker.sandboxCpuQuota,
          NetworkMode: 'bridge',
          ReadonlyRootfs: false,
          AutoRemove: false,
        },
        WorkingDir: '/workspace',
        Tty: true,
        OpenStdin: true,
      });

      await container.start();
      logger.info(`Created and started container for workspace ${workspaceId}`);

      return container;
    } catch (error) {
      logger.error('Failed to create workspace container', { workspaceId, error });
      throw new InternalServerError('Failed to create workspace container');
    }
  }

  /**
   * 获取工作区容器
   */
  static async getWorkspaceContainer(containerId: string): Promise<Docker.Container | null> {
    const docker = this.getInstance();

    try {
      const container = docker.getContainer(containerId);
      await container.inspect();
      return container;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 停止并删除容器
   */
  static async removeWorkspaceContainer(containerId: string): Promise<void> {
    try {
      const container = await this.getWorkspaceContainer(containerId);
      if (!container) {
        logger.warn(`Container ${containerId} not found`);
        return;
      }

      await container.stop({ t: 10 });
      await container.remove();

      logger.info(`Removed container ${containerId}`);
    } catch (error) {
      logger.error('Failed to remove container', { containerId, error });
      throw new InternalServerError('Failed to remove container');
    }
  }

  /**
   * 在容器中执行命令
   */
  static async execCommand(
    containerId: string,
    command: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const container = await this.getWorkspaceContainer(containerId);
      if (!container) {
        throw new InternalServerError(`Container ${containerId} not found`);
      }

      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ hijack: true, stdin: false });

      let stdout = '';
      let stderr = '';

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          // Docker multiplexes stdout/stderr in the stream
          // First byte indicates stream type: 1=stdout, 2=stderr
          const streamType = chunk[0];
          const content = chunk.slice(8).toString();

          if (streamType === 1) {
            stdout += content;
          } else if (streamType === 2) {
            stderr += content;
          }
        });

        stream.on('end', async () => {
          const inspectResult = await exec.inspect();
          resolve({
            stdout,
            stderr,
            exitCode: inspectResult.ExitCode ?? 0,
          });
        });

        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to execute command in container', { containerId, command, error });
      throw new InternalServerError('Failed to execute command');
    }
  }
}
```

#### 2. ShellAdapter 实现

创建 `packages/backend/src/adapters/shell-adapter.ts`:

```typescript
import { DockerClientManager } from './docker-client';
import { logger } from '../utils/logger';
import { InternalServerError, BadRequestError } from '../utils/errors';
import { Readable } from 'stream';

export interface ShellExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ShellAdapter {
  executeCommand(
    workspaceId: string,
    containerId: string,
    command: string,
    options?: ShellExecutionOptions
  ): Promise<ShellExecutionResult>;

  executeCommandStream(
    workspaceId: string,
    containerId: string,
    command: string
  ): Promise<Readable>;

  isContainerRunning(containerId: string): Promise<boolean>;
}

export interface ShellExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export class DockerShellAdapter implements ShellAdapter {
  async executeCommand(
    workspaceId: string,
    containerId: string,
    command: string,
    options: ShellExecutionOptions = {}
  ): Promise<ShellExecutionResult> {
    try {
      logger.debug('Executing command in container', { workspaceId, containerId, command });

      // 构建完整的命令
      const fullCommand = this.buildCommand(command, options);

      // 执行命令
      const result = await DockerClientManager.execCommand(containerId, fullCommand);

      logger.debug('Command executed', {
        workspaceId,
        exitCode: result.exitCode,
        stdoutLength: result.stdout.length,
        stderrLength: result.stderr.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to execute command', { workspaceId, containerId, command, error });
      throw new InternalServerError('Failed to execute command');
    }
  }

  async executeCommandStream(
    workspaceId: string,
    containerId: string,
    command: string
  ): Promise<Readable> {
    try {
      const container = await DockerClientManager.getWorkspaceContainer(containerId);
      if (!container) {
        throw new BadRequestError(`Container ${containerId} not found`);
      }

      const exec = await container.exec({
        Cmd: ['sh', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });

      const stream = await exec.start({ hijack: true, stdin: false });

      logger.debug('Started streaming command execution', { workspaceId, containerId, command });

      return stream;
    } catch (error) {
      logger.error('Failed to start streaming execution', {
        workspaceId,
        containerId,
        command,
        error,
      });
      throw new InternalServerError('Failed to start streaming execution');
    }
  }

  async isContainerRunning(containerId: string): Promise<boolean> {
    try {
      const container = await DockerClientManager.getWorkspaceContainer(containerId);
      if (!container) {
        return false;
      }

      const info = await container.inspect();
      return info.State.Running;
    } catch (error) {
      logger.error('Failed to check container status', { containerId, error });
      return false;
    }
  }

  private buildCommand(command: string, options: ShellExecutionOptions): string[] {
    const parts: string[] = ['sh', '-c'];

    let fullCommand = command;

    // 添加工作目录
    if (options.cwd) {
      fullCommand = `cd ${options.cwd} && ${fullCommand}`;
    }

    // 添加环境变量
    if (options.env) {
      const envPrefix = Object.entries(options.env)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      fullCommand = `${envPrefix} ${fullCommand}`;
    }

    parts.push(fullCommand);

    return parts;
  }
}
```

#### 3. ShellAdapter 集成测试

创建 `packages/backend/src/adapters/__tests__/shell-adapter.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DockerShellAdapter } from '../shell-adapter';
import { DockerClientManager } from '../docker-client';

describe('DockerShellAdapter', () => {
  const adapter = new DockerShellAdapter();
  let containerId: string;
  const testWorkspaceId = 'test-workspace';
  const testUserId = 'test-user';

  beforeAll(async () => {
    // 创建测试容器
    const container = await DockerClientManager.createWorkspaceContainer(
      testWorkspaceId,
      testUserId
    );
    containerId = container.id;
  }, 30000);

  afterAll(async () => {
    // 清理测试容器
    if (containerId) {
      await DockerClientManager.removeWorkspaceContainer(containerId);
    }
  });

  it('should execute simple command', async () => {
    const result = await adapter.executeCommand(testWorkspaceId, containerId, 'echo "Hello"');

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('Hello');
  });

  it('should capture stderr', async () => {
    const result = await adapter.executeCommand(
      testWorkspaceId,
      containerId,
      'echo "Error" >&2'
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr.trim()).toBe('Error');
  });

  it('should handle command failure', async () => {
    const result = await adapter.executeCommand(testWorkspaceId, containerId, 'exit 1');

    expect(result.exitCode).toBe(1);
  });

  it('should execute command with cwd option', async () => {
    await adapter.executeCommand(testWorkspaceId, containerId, 'mkdir -p /workspace/test');

    const result = await adapter.executeCommand(testWorkspaceId, containerId, 'pwd', {
      cwd: '/workspace/test',
    });

    expect(result.stdout.trim()).toContain('/workspace/test');
  });

  it('should execute command with env variables', async () => {
    const result = await adapter.executeCommand(
      testWorkspaceId,
      containerId,
      'echo $MY_VAR',
      {
        env: { MY_VAR: 'test-value' },
      }
    );

    expect(result.stdout.trim()).toBe('test-value');
  });

  it('should check container running status', async () => {
    const isRunning = await adapter.isContainerRunning(containerId);
    expect(isRunning).toBe(true);
  });

  it('should stream command output', async () => {
    const stream = await adapter.executeCommandStream(
      testWorkspaceId,
      containerId,
      'for i in 1 2 3; do echo $i; sleep 0.1; done'
    );

    const chunks: Buffer[] = [];
    return new Promise<void>((resolve) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        const output = Buffer.concat(chunks).toString();
        expect(output).toContain('1');
        expect(output).toContain('2');
        expect(output).toContain('3');
        resolve();
      });
    });
  }, 10000);
});
```

运行测试:

```bash
# 确保 Docker 可用
docker ps

# 运行测试
pnpm --filter @gemini-cli/backend test adapters/shell-adapter
```

**验证清单 Day 7-8**:
- [ ] DockerClientManager 实现
- [ ] 容器创建和管理
- [ ] ShellAdapter 接口定义
- [ ] 命令执行实现
- [ ] 流式输出支持
- [ ] 工作目录和环境变量支持
- [ ] 集成测试通过

---

## Day 9-10: Web 工具适配器和适配器工厂

### 目标

实现 Web 工具适配器并整合所有适配器到统一的工厂模式。

### 任务分解

#### 1. WebToolsAdapter 实现

创建 `packages/backend/src/adapters/web-tools-adapter.ts`:

```typescript
import axios, { AxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger';
import { InternalServerError } from '../utils/errors';

export interface WebToolsAdapter {
  fetch(url: string, options?: FetchOptions): Promise<FetchResult>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface FetchResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export interface SearchOptions {
  limit?: number;
  region?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class HttpWebToolsAdapter implements WebToolsAdapter {
  async fetch(url: string, options: FetchOptions = {}): Promise<FetchResult> {
    try {
      logger.debug('Fetching URL', { url, method: options.method });

      const config: AxiosRequestConfig = {
        method: options.method || 'GET',
        url,
        headers: options.headers || {},
        data: options.body,
        timeout: options.timeout || 30000,
        maxRedirects: 5,
        validateStatus: () => true, // 不抛出错误，返回所有状态码
      };

      const response = await axios(config);

      logger.debug('URL fetched', { url, status: response.status });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        body: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      };
    } catch (error: any) {
      logger.error('Failed to fetch URL', { url, error: error.message });
      throw new InternalServerError(`Failed to fetch URL: ${url}`);
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      logger.debug('Searching web', { query, options });

      // 这里可以集成真实的搜索 API（Google Custom Search, Bing Search API 等）
      // 示例使用 DuckDuckGo HTML 抓取（生产环境应该使用官方 API）

      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await this.fetch(searchUrl, { timeout: 10000 });

      // 简单的 HTML 解析（生产环境应该使用专业的 HTML 解析库）
      const results = this.parseSearchResults(response.body, options.limit || 10);

      logger.debug('Search completed', { query, resultCount: results.length });

      return results;
    } catch (error: any) {
      logger.error('Failed to search web', { query, error: error.message });
      throw new InternalServerError('Failed to search web');
    }
  }

  private parseSearchResults(html: string, limit: number): SearchResult[] {
    // 简化的 HTML 解析逻辑
    // 生产环境应该使用 cheerio 或类似库
    const results: SearchResult[] = [];

    // 这里只是一个占位实现
    // 实际应该使用正确的 HTML 解析逻辑

    return results.slice(0, limit);
  }
}
```

#### 2. 适配器工厂整合

创建 `packages/backend/src/adapters/adapter-factory.ts`:

```typescript
import { MinIOFileSystemAdapter, FileSystemAdapter } from './filesystem-adapter';
import { DockerShellAdapter, ShellAdapter } from './shell-adapter';
import { HttpWebToolsAdapter, WebToolsAdapter } from './web-tools-adapter';
import { logger } from '../utils/logger';

/**
 * 适配器工厂 - 统一创建和管理所有适配器
 */
export class AdapterFactory {
  private static fileSystemAdapter: FileSystemAdapter;
  private static shellAdapter: ShellAdapter;
  private static webToolsAdapter: WebToolsAdapter;

  /**
   * 获取文件系统适配器（单例）
   */
  static getFileSystemAdapter(): FileSystemAdapter {
    if (!this.fileSystemAdapter) {
      this.fileSystemAdapter = new MinIOFileSystemAdapter();
      logger.info('FileSystemAdapter initialized');
    }
    return this.fileSystemAdapter;
  }

  /**
   * 获取 Shell 适配器（单例）
   */
  static getShellAdapter(): ShellAdapter {
    if (!this.shellAdapter) {
      this.shellAdapter = new DockerShellAdapter();
      logger.info('ShellAdapter initialized');
    }
    return this.shellAdapter;
  }

  /**
   * 获取 Web 工具适配器（单例）
   */
  static getWebToolsAdapter(): WebToolsAdapter {
    if (!this.webToolsAdapter) {
      this.webToolsAdapter = new HttpWebToolsAdapter();
      logger.info('WebToolsAdapter initialized');
    }
    return this.webToolsAdapter;
  }

  /**
   * 重置所有适配器（主要用于测试）
   */
  static resetAdapters(): void {
    this.fileSystemAdapter = undefined as any;
    this.shellAdapter = undefined as any;
    this.webToolsAdapter = undefined as any;
    logger.info('All adapters reset');
  }
}
```

#### 3. 适配器工厂测试

创建 `packages/backend/src/adapters/__tests__/adapter-factory.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AdapterFactory } from '../adapter-factory';
import { MinIOFileSystemAdapter } from '../filesystem-adapter';
import { DockerShellAdapter } from '../shell-adapter';
import { HttpWebToolsAdapter } from '../web-tools-adapter';

describe('AdapterFactory', () => {
  beforeEach(() => {
    AdapterFactory.resetAdapters();
  });

  it('should create FileSystemAdapter singleton', () => {
    const adapter1 = AdapterFactory.getFileSystemAdapter();
    const adapter2 = AdapterFactory.getFileSystemAdapter();

    expect(adapter1).toBeInstanceOf(MinIOFileSystemAdapter);
    expect(adapter1).toBe(adapter2); // 相同实例
  });

  it('should create ShellAdapter singleton', () => {
    const adapter1 = AdapterFactory.getShellAdapter();
    const adapter2 = AdapterFactory.getShellAdapter();

    expect(adapter1).toBeInstanceOf(DockerShellAdapter);
    expect(adapter1).toBe(adapter2);
  });

  it('should create WebToolsAdapter singleton', () => {
    const adapter1 = AdapterFactory.getWebToolsAdapter();
    const adapter2 = AdapterFactory.getWebToolsAdapter();

    expect(adapter1).toBeInstanceOf(HttpWebToolsAdapter);
    expect(adapter1).toBe(adapter2);
  });

  it('should reset all adapters', () => {
    const adapter1 = AdapterFactory.getFileSystemAdapter();
    AdapterFactory.resetAdapters();
    const adapter2 = AdapterFactory.getFileSystemAdapter();

    expect(adapter1).not.toBe(adapter2); // 不同实例
  });
});
```

**验证清单 Day 9-10**:
- [ ] WebToolsAdapter 实现
- [ ] HTTP fetch 支持
- [ ] Web 搜索支持（可选）
- [ ] AdapterFactory 实现
- [ ] 所有适配器单例管理
- [ ] 单元测试通过

---

## Day 11-13: CoreToolScheduler 集成

### 目标

将 Core 包的 ToolScheduler 集成到后端，实现工具调度和执行管理。

### 任务分解

#### 1. CoreToolScheduler 包装

创建 `packages/backend/src/services/tool-scheduler.service.ts`:

```typescript
import { ToolScheduler, ToolCall, ToolResult } from '@google/gemini-cli-core';
import { AdapterFactory } from '../adapters/adapter-factory';
import { logger } from '../utils/logger';
import { InternalServerError } from '../utils/errors';
import { EventEmitter } from 'events';

export interface ToolExecutionContext {
  workspaceId: string;
  userId: string;
  containerId: string | null;
  sessionId: string;
}

export class ToolSchedulerService extends EventEmitter {
  private scheduler: ToolScheduler;
  private context: ToolExecutionContext;

  constructor(context: ToolExecutionContext) {
    super();
    this.context = context;

    // 初始化 ToolScheduler 并注入适配器
    this.scheduler = new ToolScheduler({
      fileSystemAdapter: AdapterFactory.getFileSystemAdapter(),
      shellAdapter: AdapterFactory.getShellAdapter(),
      webToolsAdapter: AdapterFactory.getWebToolsAdapter(),
    });

    logger.info('ToolScheduler initialized', { workspaceId: context.workspaceId });
  }

  /**
   * 调度并执行工具调用
   */
  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    try {
      logger.info('Executing tool call', {
        toolName: toolCall.name,
        workspaceId: this.context.workspaceId,
      });

      // 发出开始事件
      this.emit('tool:start', { toolCall, context: this.context });

      // 执行工具
      const result = await this.scheduler.execute(toolCall, {
        workspaceId: this.context.workspaceId,
        containerId: this.context.containerId,
      });

      // 发出完成事件
      this.emit('tool:complete', { toolCall, result, context: this.context });

      logger.info('Tool call executed successfully', {
        toolName: toolCall.name,
        success: result.success,
      });

      return result;
    } catch (error: any) {
      logger.error('Tool call execution failed', {
        toolName: toolCall.name,
        error: error.message,
      });

      // 发出错误事件
      this.emit('tool:error', { toolCall, error, context: this.context });

      throw new InternalServerError(`Tool execution failed: ${error.message}`);
    }
  }

  /**
   * 批量执行工具调用
   */
  async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await this.executeToolCall(toolCall);
      results.push(result);

      // 如果工具执行失败，可以选择中断或继续
      if (!result.success) {
        logger.warn('Tool execution failed, continuing with next tool', {
          toolName: toolCall.name,
        });
      }
    }

    return results;
  }

  /**
   * 获取支持的工具列表
   */
  getSupportedTools(): string[] {
    return this.scheduler.getSupportedTools();
  }

  /**
   * 检查工具是否需要用户确认
   */
  requiresConfirmation(toolName: string): boolean {
    // 危险操作需要确认
    const dangerousTools = ['shell_execute', 'file_delete', 'file_write'];
    return dangerousTools.includes(toolName);
  }
}
```

#### 2. 工具执行 API

创建 `packages/backend/src/api/tools.routes.ts`:

```typescript
import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { authenticate } from '../middleware/auth';
import { ToolSchedulerService } from '../services/tool-scheduler.service';
import { WorkspaceService } from '../services/workspace.service';
import { BadRequestError } from '../utils/errors';
import { z } from 'zod';

const router = Router();

// 工具调用请求 schema
const executeToolSchema = z.object({
  toolName: z.string(),
  parameters: z.record(z.any()),
  requireConfirmation: z.boolean().optional(),
});

const executeToolsSchema = z.object({
  toolCalls: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      parameters: z.record(z.any()),
    })
  ),
});

/**
 * POST /api/workspaces/:workspaceId/tools/execute
 * 执行单个工具调用
 */
router.post(
  '/workspaces/:workspaceId/tools/execute',
  authenticate,
  asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const userId = req.user!.id;

    // 验证请求体
    const { toolName, parameters, requireConfirmation } = executeToolSchema.parse(req.body);

    // 获取工作区
    const workspaceService = new WorkspaceService();
    const workspace = await workspaceService.getWorkspace(workspaceId, userId);

    // 创建工具调度器
    const scheduler = new ToolSchedulerService({
      workspaceId,
      userId,
      containerId: workspace.containerId,
      sessionId: req.headers['x-session-id'] as string,
    });

    // 检查是否需要确认
    if (requireConfirmation && scheduler.requiresConfirmation(toolName)) {
      // 如果需要确认但客户端未确认，返回确认请求
      return res.status(200).json({
        success: true,
        data: {
          requiresConfirmation: true,
          toolName,
          parameters,
          message: `Tool '${toolName}' requires user confirmation`,
        },
      });
    }

    // 执行工具
    const result = await scheduler.executeToolCall({
      id: `tool-${Date.now()}`,
      name: toolName,
      parameters,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/workspaces/:workspaceId/tools/execute-batch
 * 批量执行工具调用
 */
router.post(
  '/workspaces/:workspaceId/tools/execute-batch',
  authenticate,
  asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const userId = req.user!.id;

    // 验证请求体
    const { toolCalls } = executeToolsSchema.parse(req.body);

    if (toolCalls.length === 0) {
      throw new BadRequestError('No tool calls provided');
    }

    if (toolCalls.length > 10) {
      throw new BadRequestError('Maximum 10 tool calls per batch');
    }

    // 获取工作区
    const workspaceService = new WorkspaceService();
    const workspace = await workspaceService.getWorkspace(workspaceId, userId);

    // 创建工具调度器
    const scheduler = new ToolSchedulerService({
      workspaceId,
      userId,
      containerId: workspace.containerId,
      sessionId: req.headers['x-session-id'] as string,
    });

    // 执行工具
    const results = await scheduler.executeToolCalls(toolCalls);

    res.status(200).json({
      success: true,
      data: {
        results,
        successCount: results.filter((r) => r.success).length,
        failureCount: results.filter((r) => !r.success).length,
      },
    });
  })
);

/**
 * GET /api/workspaces/:workspaceId/tools
 * 获取支持的工具列表
 */
router.get(
  '/workspaces/:workspaceId/tools',
  authenticate,
  asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const userId = req.user!.id;

    // 验证工作区权限
    const workspaceService = new WorkspaceService();
    await workspaceService.getWorkspace(workspaceId, userId);

    // 创建工具调度器
    const scheduler = new ToolSchedulerService({
      workspaceId,
      userId,
      containerId: null,
      sessionId: '',
    });

    const tools = scheduler.getSupportedTools();

    res.status(200).json({
      success: true,
      data: { tools },
    });
  })
);

export default router;
```

#### 3. 工具执行测试

创建 `packages/backend/src/api/__tests__/tools.routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { generateTestToken } from '../../utils/test-helpers';

describe('Tools API', () => {
  let accessToken: string;
  let workspaceId: string;

  beforeAll(async () => {
    // 创建测试用户和工作区
    accessToken = await generateTestToken();

    const workspaceRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Workspace' });

    workspaceId = workspaceRes.body.data.id;
  });

  afterAll(async () => {
    // 清理测试数据
  });

  it('should get supported tools', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/tools`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.tools)).toBe(true);
  });

  it('should execute tool call', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/tools/execute`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        toolName: 'file_read',
        parameters: { path: '/workspace/test.txt' },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should require confirmation for dangerous tools', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/tools/execute`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        toolName: 'shell_execute',
        parameters: { command: 'rm -rf /' },
        requireConfirmation: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.requiresConfirmation).toBe(true);
  });

  it('should execute batch tool calls', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/tools/execute-batch`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        toolCalls: [
          { id: '1', name: 'file_read', parameters: { path: '/workspace/file1.txt' } },
          { id: '2', name: 'file_read', parameters: { path: '/workspace/file2.txt' } },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results.length).toBe(2);
  });

  it('should reject batch with too many tools', async () => {
    const toolCalls = Array.from({ length: 11 }, (_, i) => ({
      id: `${i}`,
      name: 'file_read',
      parameters: { path: `/workspace/file${i}.txt` },
    }));

    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/tools/execute-batch`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ toolCalls });

    expect(res.status).toBe(400);
  });
});
```

**验证清单 Day 11-13**:
- [ ] ToolSchedulerService 实现
- [ ] 适配器注入到 ToolScheduler
- [ ] 工具执行 API 路由
- [ ] 危险工具确认机制
- [ ] 批量工具执行支持
- [ ] 集成测试通过
- [ ] 工具执行事件系统

---

## Day 14-15: 工具执行确认机制和最终集成

### 目标

实现工具执行确认流程，整合所有 Core 包功能。

### 任务分解

#### 1. 工具确认服务

创建 `packages/backend/src/services/tool-confirmation.service.ts`:

```typescript
import { Redis } from 'ioredis';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { BadRequestError } from '../utils/errors';

export interface PendingToolConfirmation {
  id: string;
  userId: string;
  workspaceId: string;
  sessionId: string;
  toolName: string;
  parameters: Record<string, any>;
  createdAt: number;
  expiresAt: number;
}

export class ToolConfirmationService {
  private redis: Redis;
  private readonly CONFIRMATION_TTL = 300; // 5 minutes

  constructor() {
    this.redis = redisClient;
  }

  /**
   * 创建待确认的工具执行请求
   */
  async createPendingConfirmation(
    userId: string,
    workspaceId: string,
    sessionId: string,
    toolName: string,
    parameters: Record<string, any>
  ): Promise<PendingToolConfirmation> {
    const confirmationId = `tool-confirm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const confirmation: PendingToolConfirmation = {
      id: confirmationId,
      userId,
      workspaceId,
      sessionId,
      toolName,
      parameters,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.CONFIRMATION_TTL * 1000,
    };

    // 存储到 Redis
    const key = `tool:confirmation:${confirmationId}`;
    await this.redis.setex(key, this.CONFIRMATION_TTL, JSON.stringify(confirmation));

    logger.info('Created pending tool confirmation', { confirmationId, toolName });

    return confirmation;
  }

  /**
   * 获取待确认的工具执行请求
   */
  async getPendingConfirmation(confirmationId: string): Promise<PendingToolConfirmation | null> {
    const key = `tool:confirmation:${confirmationId}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as PendingToolConfirmation;
  }

  /**
   * 确认工具执行
   */
  async confirmToolExecution(confirmationId: string, userId: string): Promise<PendingToolConfirmation> {
    const confirmation = await this.getPendingConfirmation(confirmationId);

    if (!confirmation) {
      throw new BadRequestError('Confirmation request not found or expired');
    }

    if (confirmation.userId !== userId) {
      throw new BadRequestError('Unauthorized to confirm this tool execution');
    }

    // 删除确认请求
    const key = `tool:confirmation:${confirmationId}`;
    await this.redis.del(key);

    logger.info('Tool execution confirmed', { confirmationId, toolName: confirmation.toolName });

    return confirmation;
  }

  /**
   * 拒绝工具执行
   */
  async rejectToolExecution(confirmationId: string, userId: string): Promise<void> {
    const confirmation = await this.getPendingConfirmation(confirmationId);

    if (!confirmation) {
      throw new BadRequestError('Confirmation request not found or expired');
    }

    if (confirmation.userId !== userId) {
      throw new BadRequestError('Unauthorized to reject this tool execution');
    }

    // 删除确认请求
    const key = `tool:confirmation:${confirmationId}`;
    await this.redis.del(key);

    logger.info('Tool execution rejected', { confirmationId, toolName: confirmation.toolName });
  }

  /**
   * 获取用户的所有待确认请求
   */
  async getUserPendingConfirmations(userId: string): Promise<PendingToolConfirmation[]> {
    const keys = await this.redis.keys('tool:confirmation:*');
    const confirmations: PendingToolConfirmation[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const confirmation = JSON.parse(data) as PendingToolConfirmation;
        if (confirmation.userId === userId) {
          confirmations.push(confirmation);
        }
      }
    }

    return confirmations.sort((a, b) => b.createdAt - a.createdAt);
  }
}
```

#### 2. 工具确认 API

更新 `packages/backend/src/api/tools.routes.ts`:

```typescript
import { ToolConfirmationService } from '../services/tool-confirmation.service';

// ... 之前的代码 ...

/**
 * POST /api/workspaces/:workspaceId/tools/execute
 * 更新版本 - 支持确认流程
 */
router.post(
  '/workspaces/:workspaceId/tools/execute',
  authenticate,
  asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const userId = req.user!.id;

    const { toolName, parameters, confirmationId } = executeToolSchema
      .extend({ confirmationId: z.string().optional() })
      .parse(req.body);

    const workspaceService = new WorkspaceService();
    const workspace = await workspaceService.getWorkspace(workspaceId, userId);

    const scheduler = new ToolSchedulerService({
      workspaceId,
      userId,
      containerId: workspace.containerId,
      sessionId: req.headers['x-session-id'] as string,
    });

    // 如果是确认执行
    if (confirmationId) {
      const confirmationService = new ToolConfirmationService();
      const confirmation = await confirmationService.confirmToolExecution(confirmationId, userId);

      // 执行工具
      const result = await scheduler.executeToolCall({
        id: `tool-${Date.now()}`,
        name: confirmation.toolName,
        parameters: confirmation.parameters,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    }

    // 检查是否需要确认
    if (scheduler.requiresConfirmation(toolName)) {
      const confirmationService = new ToolConfirmationService();
      const confirmation = await confirmationService.createPendingConfirmation(
        userId,
        workspaceId,
        req.headers['x-session-id'] as string,
        toolName,
        parameters
      );

      return res.status(200).json({
        success: true,
        data: {
          requiresConfirmation: true,
          confirmationId: confirmation.id,
          toolName,
          parameters,
          expiresAt: confirmation.expiresAt,
          message: `Tool '${toolName}' requires user confirmation`,
        },
      });
    }

    // 直接执行
    const result = await scheduler.executeToolCall({
      id: `tool-${Date.now()}`,
      name: toolName,
      parameters,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/tools/confirmations/pending
 * 获取用户的待确认工具执行列表
 */
router.get(
  '/tools/confirmations/pending',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const confirmationService = new ToolConfirmationService();
    const confirmations = await confirmationService.getUserPendingConfirmations(userId);

    res.status(200).json({
      success: true,
      data: { confirmations },
    });
  })
);

/**
 * POST /api/tools/confirmations/:confirmationId/reject
 * 拒绝工具执行
 */
router.post(
  '/tools/confirmations/:confirmationId/reject',
  authenticate,
  asyncHandler(async (req, res) => {
    const { confirmationId } = req.params;
    const userId = req.user!.id;

    const confirmationService = new ToolConfirmationService();
    await confirmationService.rejectToolExecution(confirmationId, userId);

    res.status(200).json({
      success: true,
      data: { message: 'Tool execution rejected' },
    });
  })
);

export default router;
```

#### 3. 完整的集成测试

创建 `packages/backend/src/__tests__/integration/core-integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { generateTestToken, createTestWorkspace } from '../../utils/test-helpers';

describe('Core Package Integration', () => {
  let accessToken: string;
  let workspaceId: string;

  beforeAll(async () => {
    accessToken = await generateTestToken();
    workspaceId = await createTestWorkspace(accessToken);
  });

  it('should complete full AI chat with tool execution flow', async () => {
    // 1. 创建聊天会话
    const sessionRes = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ workspaceId });

    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.data.id;

    // 2. 发送消息 - AI 会请求工具执行
    const messageRes = await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        message: 'Please create a file called test.txt with content "Hello World"',
      });

    expect(messageRes.status).toBe(200);

    // 3. 假设 AI 返回了工具调用请求
    // 执行工具 - 会要求确认
    const toolRes = await request(app)
      .post(`/api/workspaces/${workspaceId}/tools/execute`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Session-Id', sessionId)
      .send({
        toolName: 'file_write',
        parameters: {
          path: '/workspace/test.txt',
          content: 'Hello World',
        },
      });

    expect(toolRes.status).toBe(200);
    expect(toolRes.body.data.requiresConfirmation).toBe(true);

    const confirmationId = toolRes.body.data.confirmationId;

    // 4. 用户确认工具执行
    const confirmRes = await request(app)
      .post(`/api/workspaces/${workspaceId}/tools/execute`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Session-Id', sessionId)
      .send({
        toolName: 'file_write',
        parameters: {
          path: '/workspace/test.txt',
          content: 'Hello World',
        },
        confirmationId,
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.success).toBe(true);

    // 5. 验证文件已创建
    const readRes = await request(app)
      .post(`/api/workspaces/${workspaceId}/tools/execute`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Session-Id', sessionId)
      .send({
        toolName: 'file_read',
        parameters: { path: '/workspace/test.txt' },
      });

    expect(readRes.status).toBe(200);
    expect(readRes.body.data.content).toBe('Hello World');
  });

  it('should handle tool execution rejection', async () => {
    // 执行危险工具 - 要求确认
    const toolRes = await request(app)
      .post(`/api/workspaces/${workspaceId}/tools/execute`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        toolName: 'shell_execute',
        parameters: { command: 'rm -rf /' },
      });

    const confirmationId = toolRes.body.data.confirmationId;

    // 用户拒绝执行
    const rejectRes = await request(app)
      .post(`/api/tools/confirmations/${confirmationId}/reject`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(rejectRes.status).toBe(200);

    // 确认请求已被删除
    const confirmRes = await request(app)
      .post(`/api/workspaces/${workspaceId}/tools/execute`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        toolName: 'shell_execute',
        parameters: { command: 'rm -rf /' },
        confirmationId,
      });

    expect(confirmRes.status).toBe(400);
  });
});
```

#### 4. 更新主应用路由

更新 `packages/backend/src/app.ts`:

```typescript
// ... 之前的代码 ...

import toolsRoutes from './api/tools.routes';

// ... 中间件 ...

// API 路由
app.use('/api', sessionRoutes);
app.use('/api', workspaceRoutes);
app.use('/api', toolsRoutes); // 新增

// ... 错误处理 ...

export { app };
```

**验证清单 Day 14-15**:
- [ ] ToolConfirmationService 实现
- [ ] Redis 存储确认请求
- [ ] 工具确认 API 完整
- [ ] 工具拒绝流程
- [ ] 待确认列表查询
- [ ] 完整集成测试通过
- [ ] 所有 Core 包功能集成完成

---

## 阶段 2 总结

### 已完成的功能

✅ **Core 包依赖管理**
- GeminiClientManager 实现
- 客户端池和生命周期管理
- 错误重试机制

✅ **聊天服务集成**
- ChatService 实现
- SSE 流式响应
- 消息持久化

✅ **适配器架构**
- FileSystemAdapter（MinIO 集成）
- ShellAdapter（Docker 集成）
- WebToolsAdapter（HTTP 请求）
- AdapterFactory（统一管理）

✅ **工具调度系统**
- ToolSchedulerService 实现
- 工具执行 API
- 批量工具执行
- 工具事件系统

✅ **工具确认机制**
- ToolConfirmationService 实现
- 危险工具确认流程
- 确认请求管理
- 用户确认/拒绝 API

### 技术成果

**代码量**: ~3,000 行生产代码 + 1,000 行测试代码

**测试覆盖**:
- 单元测试: 所有服务和适配器
- 集成测试: API 端到端流程
- E2E 测试: 完整的 AI 对话 + 工具执行流程

**性能指标**:
- SSE 流式响应延迟 < 100ms
- 工具执行平均响应时间 < 500ms
- MinIO 文件操作 < 200ms
- Docker 容器命令执行 < 300ms

### 下一阶段预告

**阶段 3: 工作区与沙箱管理** (10 天)
- Docker 容器管理服务
- 容器池和生命周期
- 文件存储和同步
- 安全和权限控制

---

## 附录: 常见问题和解决方案

### Q1: MinIO 连接失败

**症状**: `Failed to connect to MinIO` 错误

**解决方案**:
```bash
# 检查 MinIO 容器状态
docker-compose ps minio

# 查看 MinIO 日志
docker-compose logs minio

# 重启 MinIO
docker-compose restart minio

# 验证连接
pnpm tsx scripts/verify-minio.ts
```

### Q2: Docker 容器创建失败

**症状**: `Failed to create workspace container` 错误

**解决方案**:
```bash
# 检查 Docker 守护进程
docker ps

# 拉取沙箱镜像
docker pull node:20-alpine

# 检查资源限制
docker info | grep -i memory

# 清理未使用的容器
docker container prune
```

### Q3: 工具执行超时

**症状**: 工具执行长时间无响应

**解决方案**:
```typescript
// 调整超时配置
const scheduler = new ToolSchedulerService({
  ...context,
  timeout: 60000, // 60 seconds
});

// 添加超时处理
const result = await Promise.race([
  scheduler.executeToolCall(toolCall),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Tool execution timeout')), 60000)
  ),
]);
```

### Q4: SSE 连接断开

**症状**: 流式响应中断

**解决方案**:
```typescript
// 添加心跳机制
const heartbeatInterval = setInterval(() => {
  res.write(': heartbeat\n\n');
}, 15000);

// 清理资源
res.on('close', () => {
  clearInterval(heartbeatInterval);
});
```

---

**阶段 2 完成！** 🎉

现在我们已经成功将 Core 包集成到后端，建立了完整的适配器架构，实现了工具调度和确认机制。可以继续进入阶段 3 的工作区管理功能开发。
