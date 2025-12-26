# BS 架构迁移 - 所有阶段执行概览

本文档提供所有 8 个阶段的执行概览和关键要点。每个阶段都有对应的详细执行计划文档。

---

## 📅 整体时间线

| 阶段 | 时长 | 关键交付物 | 状态 |
|------|------|----------|------|
| [阶段 0](#阶段-0-准备阶段) | 1 周 | 开发环境 + 技术验证 | ✅ [详细计划](./PHASE_0_DETAILED_PLAN.md) |
| [阶段 1](#阶段-1-核心基础设施) | 2 周 | 后端框架 + 认证系统 | 🚧 [详细计划](./PHASE_1_DETAILED_PLAN.md) |
| [阶段 2](#阶段-2-core-包集成) | 3 周 | Gemini API + 工具适配 | 📋 [详细计划](./PHASE_2_DETAILED_PLAN.md) |
| [阶段 3](#阶段-3-工作区与沙箱) | 2 周 | Docker 沙箱 + 文件存储 | 📋 [详细计划](./PHASE_3_DETAILED_PLAN.md) |
| [阶段 4](#阶段-4-前端开发) | 3 周 | React UI + 聊天界面 | 📋 [详细计划](./PHASE_4_DETAILED_PLAN.md) |
| [阶段 5](#阶段-5-websocket-实时功能) | 1 周 | WebSocket + 实时同步 | 📋 [详细计划](./PHASE_5_DETAILED_PLAN.md) |
| [阶段 6](#阶段-6-高级功能) | 2 周 | 钩子 + MCP + 策略引擎 | 📋 [详细计划](./PHASE_6_DETAILED_PLAN.md) |
| [阶段 7](#阶段-7-测试与优化) | 2 周 | 测试 + 性能 + 安全 | 📋 [详细计划](./PHASE_7_DETAILED_PLAN.md) |
| [阶段 8](#阶段-8-部署与上线) | 1 周 | 生产部署 + 上线 | 📋 [详细计划](./PHASE_8_DETAILED_PLAN.md) |

**总计**: 17 周 (约 4 个月)

---

## 阶段 0: 准备阶段

**🎯 目标**: 搭建开发环境，验证技术可行性

### 关键任务
- ✅ 创建 Monorepo 项目结构
- ✅ 配置 TypeScript + ESLint + Prettier
- ✅ 设置 GitHub Actions CI/CD
- ✅ 验证 Core 包在服务器环境运行
- ✅ 测试 Gemini API 调用
- ✅ 验证 Docker 容器隔离
- ✅ 测试 WebSocket 通信
- ✅ 验证 MinIO 文件存储
- ✅ 创建沙箱 Docker 镜像
- ✅ 配置 Prisma + PostgreSQL

### 交付物
- ✅ 完整的开发环境
- ✅ 技术验证报告
- ✅ 9 个验证脚本
- ✅ 5 份文档

📖 **[查看详细计划](./PHASE_0_DETAILED_PLAN.md)**

---

## 阶段 1: 核心基础设施

**🎯 目标**: 搭建后端框架，实现认证和基础 API

### 关键任务

#### Week 1: 后端框架 + 数据库
- Express.js 应用结构
- 中间件系统（错误处理、日志、验证、限流）
- 环境变量管理（Zod 验证）
- Prisma Schema 设计（User, Workspace, ChatSession, Message, ToolExecution）
- Repository 模式实现
- 工具函数（JWT, Crypto, Response, Pagination）

#### Week 2: 认证系统 + 基础 API
- JWT 认证中间件
- 用户注册/登录 API
- Google OAuth 集成
- Refresh Token 机制
- 用户管理 API
- 健康检查 API
- 单元测试（80% 覆盖率）

### 核心代码示例

**环境变量验证**:
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  GEMINI_API_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  // ...
});

export const env = envSchema.parse(process.env);
```

**认证中间件**:
```typescript
export const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError();

  const payload = verifyToken(token);
  const user = await userRepository.findUnique({ id: payload.userId });
  if (!user) throw new UnauthorizedError();

  req.user = user;
  next();
});
```

### 交付物
- ✅ 可运行的后端服务
- ✅ 完整的认证系统
- ✅ Prisma Schema + 迁移
- ✅ Swagger API 文档
- ✅ 单元测试报告

📖 **[查看详细计划](./PHASE_1_DETAILED_PLAN.md)** (Part 1 已完成)

---

## 阶段 2: Core 包集成

**🎯 目标**: 集成 `packages/core`，实现对话和工具执行

### 关键任务

#### Week 1: Gemini API 集成
- 复用 GeminiClient 到后端
- 实现 ChatService
- 会话持久化（DB + Redis）
- 流式响应处理
- 错误处理和重试

#### Week 2: 工具适配器
- 文件系统工具适配（ReadFile, WriteFile, Edit, Glob）
- Shell 工具适配（容器内执行）
- Web 工具适配（WebFetch, WebSearch）
- 其他工具（Grep, Memory, WriteTodos）

#### Week 3: 工具调度集成
- 复用 CoreToolScheduler
- 工具确认机制（WebSocket 推送）
- 并发控制
- PolicyEngine 集成

### 核心架构

```
ChatService
  ↓
GeminiClient (from @gemini-cli-core)
  ↓
CoreToolScheduler
  ↓
Tool Adapters
  ├─ FileSystemAdapter → MinIO
  ├─ ShellAdapter → Docker Container
  ├─ WebToolsAdapter → Backend Proxy
  └─ MCPAdapter → MCP Servers
```

### 关键代码示例

**ChatService**:
```typescript
export class ChatService {
  async *sendMessage(sessionId: string, message: string) {
    const session = await this.getSession(sessionId);
    const geminiClient = this.getGeminiClient(session.userId);

    // 保存用户消息
    await this.saveMessage(sessionId, 'USER', message);

    // 流式生成
    for await (const event of geminiClient.sendMessage(message)) {
      // 推送事件给前端
      yield event;

      // 处理工具调用
      if (event.type === 'tool_call') {
        const result = await this.executeToolWithAdapter(event.tool);
        yield { type: 'tool_result', result };
      }
    }

    // 保存 AI 回复
    await this.saveMessage(sessionId, 'MODEL', response);
  }
}
```

**Shell 适配器**:
```typescript
export class ShellAdapter {
  async execute(workspaceId: string, command: string) {
    const container = await this.containerService.getContainer(workspaceId);

    // 安全检查
    if (!this.isCommandAllowed(command)) {
      throw new ForbiddenError('Command not allowed');
    }

    // 在容器中执行
    const stream = await this.containerService.exec(container.id, command);

    // 流式返回
    for await (const chunk of stream) {
      yield { type: 'stdout', data: chunk };
    }
  }
}
```

### 交付物
- ✅ 完整的对话管理服务
- ✅ 所有工具适配器实现
- ✅ 集成测试套件
- ✅ 性能基准报告

📖 **[查看详细计划](./PHASE_2_DETAILED_PLAN.md)** (即将创建)

---

## 阶段 3: 工作区与沙箱系统

**🎯 目标**: 实现 Docker 沙箱隔离和文件存储

### 关键任务

#### Week 1: 工作区管理
- WorkspaceService CRUD
- ContainerService (Docker SDK)
- 容器池管理（预热、复用）
- 资源限制（CPU、内存、网络）
- 健康检查和自动清理

#### Week 2: 文件存储
- FileStorageService (MinIO/S3)
- 文件上传/下载 API
- 容器与存储同步
- 文件版本控制（可选）
- 安全与权限控制

### 核心架构

```
Workspace
  ↓
Docker Container (隔离环境)
  ├─ User: sandbox (非 root)
  ├─ CPU: 0.5-1 core
  ├─ Memory: 256-512MB
  ├─ Network: isolated
  └─ Storage: /workspace (挂载)
  ↓
MinIO/S3 (持久化)
  └─ Bucket: gemini-workspaces/{workspaceId}/
```

### 关键代码示例

**ContainerService**:
```typescript
export class ContainerService {
  async createContainer(workspaceId: string) {
    const container = await this.docker.createContainer({
      Image: config.docker.sandboxImage,
      name: `workspace-${workspaceId}`,
      HostConfig: {
        Memory: 512 * 1024 * 1024,
        NanoCpus: 1000000000,
        NetworkMode: 'none',
      },
      Env: [`WORKSPACE_ID=${workspaceId}`],
    });

    await container.start();
    return container;
  }

  async exec(containerId: string, command: string) {
    const container = this.docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: ['sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({});
    return stream; // AsyncIterable
  }
}
```

**文件同步**:
```typescript
export class FileStorageService {
  async syncToContainer(workspaceId: string, containerId: string) {
    // 从 S3 下载所有文件
    const files = await this.listFiles(workspaceId);

    for (const file of files) {
      const content = await this.downloadFile(workspaceId, file.path);
      await this.containerService.writeFile(containerId, file.path, content);
    }
  }

  async syncFromContainer(containerId: string, workspaceId: string) {
    // 从容器读取文件
    const files = await this.containerService.listFiles(containerId);

    for (const file of files) {
      const content = await this.containerService.readFile(containerId, file.path);
      await this.uploadFile(workspaceId, file.path, content);
    }
  }
}
```

### 交付物
- ✅ 工作区管理系统
- ✅ Docker 沙箱环境
- ✅ 文件存储服务
- ✅ 安全测试报告

📖 **[查看详细计划](./PHASE_3_DETAILED_PLAN.md)** (即将创建)

---

## 阶段 4: 前端开发

**🎯 目标**: 构建完整的 Web 前端应用

### 关键任务

#### Week 1: 基础框架 + 认证
- Vite + React + TypeScript 项目初始化
- Tailwind CSS + shadcn/ui 配置
- React Router 路由
- Zustand 状态管理
- 登录/注册页面
- OAuth 登录流程

#### Week 2: 聊天界面
- ChatContainer 组件
- MessageList (无限滚动)
- MessageItem (Markdown + 代码高亮)
- MessageInput (多行输入)
- 流式消息接收
- 会话列表侧边栏

#### Week 3: 工作区界面
- 文件浏览器（树形结构）
- Monaco Editor 集成
- xterm.js 终端
- 工具执行面板
- 工具确认对话框

### 技术栈

```
React 18
  ├─ UI: shadcn/ui + Tailwind CSS
  ├─ 路由: React Router
  ├─ 状态: Zustand
  ├─ 数据: TanStack Query
  ├─ 实时: Socket.io Client
  ├─ 编辑器: Monaco Editor
  └─ 终端: xterm.js
```

### 核心组件示例

**ChatContainer**:
```tsx
export function ChatContainer() {
  const { sessionId } = useParams();
  const { messages, sendMessage } = useChat(sessionId);
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('chat:chunk', (chunk) => {
      appendMessageChunk(chunk);
    });

    socket.on('tool:execution', (toolEvent) => {
      handleToolExecution(toolEvent);
    });
  }, [socket]);

  return (
    <div className="flex flex-col h-full">
      <ChatHeader sessionId={sessionId} />
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

**WebSocket Hook**:
```typescript
export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const ws = io(WS_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
    });

    ws.on('connect', () => setConnected(true));
    ws.on('disconnect', () => setConnected(false));

    setSocket(ws);

    return () => {
      ws.disconnect();
    };
  }, []);

  return { socket, connected };
}
```

### 交付物
- ✅ 完整的前端应用
- ✅ 响应式 UI
- ✅ 实时通信功能
- ✅ UX 测试报告

📖 **[查看详细计划](./PHASE_4_DETAILED_PLAN.md)** (即将创建)

---

## 阶段 5: WebSocket 与实时功能

**🎯 目标**: 实现稳定的实时通信系统

### 关键任务
- Socket.io 服务器实现
- Room 管理（按 session 隔离）
- 事件推送（消息、工具、文件）
- 心跳检测
- 自动重连
- Redis Pub/Sub（多实例支持）

### 核心架构

```
Frontend (Socket.io Client)
  ↓ WebSocket
Backend (Socket.io Server)
  ↓
Redis Pub/Sub (多实例)
  ↓
ChatService / ToolExecutor
```

### 关键代码示例

**WebSocket 服务器**:
```typescript
export class ChatWebSocket {
  constructor(private io: SocketIOServer) {
    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', async (socket) => {
      const user = await this.authenticate(socket);

      socket.on('chat:join', async (sessionId) => {
        await socket.join(`session:${sessionId}`);
      });

      socket.on('chat:message', async (data) => {
        for await (const event of this.chatService.sendMessage(data)) {
          this.io.to(`session:${data.sessionId}`).emit('chat:event', event);
        }
      });

      socket.on('tool:approve', async (data) => {
        await this.toolService.approveExecution(data.toolCallId);
      });
    });
  }
}
```

### 交付物
- ✅ 稳定的 WebSocket 服务
- ✅ 实时同步功能
- ✅ 性能测试报告

📖 **[查看详细计划](./PHASE_5_DETAILED_PLAN.md)** (即将创建)

---

## 阶段 6: 高级功能

**🎯 目标**: 实现钩子、MCP、策略引擎

### 关键任务

#### Week 1: 钩子系统
- 复用 HookSystem
- 钩子管理 API
- 钩子编辑器 UI (Monaco)
- 钩子执行日志

#### Week 2: MCP + 策略引擎
- MCP 客户端集成
- MCP 服务器管理 UI
- OAuth 配置
- 策略引擎 UI (TOML 编辑器)
- 会话分享和导出

### 核心实现

**钩子系统**:
```typescript
export class HookService {
  async executeHook(hookName: string, context: any) {
    const hooks = await this.hookRepository.findByName(hookName);

    for (const hook of hooks) {
      const result = await this.executeHookCode(hook.code, context);

      // 记录执行日志
      await this.logHookExecution(hook.id, result);

      // 如果钩子返回 false，终止执行
      if (result === false) {
        throw new ForbiddenError('Hook blocked execution');
      }
    }
  }
}
```

### 交付物
- ✅ 钩子系统 Web UI
- ✅ MCP 服务器管理
- ✅ 策略引擎集成

📖 **[查看详细计划](./PHASE_6_DETAILED_PLAN.md)** (即将创建)

---

## 阶段 7: 测试与优化

**🎯 目标**: 完善测试，优化性能和安全

### 关键任务

#### Week 1: 测试完善
- 单元测试（80% 覆盖率）
- 集成测试（API + WebSocket）
- E2E 测试（Playwright）
- 性能测试（并发、稳定性）

#### Week 2: 优化与安全
- 数据库查询优化
- Redis 缓存策略
- 前端代码分割
- 安全审计（SQL 注入、XSS、CSRF）
- 渗透测试
- 监控系统（Prometheus + Grafana）

### 测试策略

```
单元测试 (Vitest)
  ├─ Utils (crypto, jwt, pagination)
  ├─ Repositories
  ├─ Services
  └─ Middleware

集成测试 (Supertest)
  ├─ API Endpoints
  ├─ WebSocket Events
  └─ Tool Execution Flow

E2E 测试 (Playwright)
  ├─ 用户登录流程
  ├─ 创建工作区
  ├─ 对话交互
  └─ 工具执行
```

### 性能优化清单
- [ ] 数据库索引优化
- [ ] API 响应缓存
- [ ] 静态资源 CDN
- [ ] 代码分割和懒加载
- [ ] 图片优化
- [ ] 异步处理队列（BullMQ）

### 交付物
- ✅ 完整测试报告
- ✅ 性能优化报告
- ✅ 安全审计报告
- ✅ 监控仪表板

📖 **[查看详细计划](./PHASE_7_DETAILED_PLAN.md)** (即将创建)

---

## 阶段 8: 部署与上线

**🎯 目标**: 部署到生产环境并上线

### 关键任务

#### Week 1 (前半): 部署准备
- 部署文档编写
- 生产环境配置
- CI/CD 流水线完善
- 备份和回滚方案

#### Week 1 (后半): 生产部署
- PostgreSQL 主从部署
- Redis 集群部署
- MinIO/S3 配置
- 后端服务部署（负载均衡）
- 前端部署（Nginx + CDN）
- 域名和 SSL 配置

#### 验证与上线
- 冒烟测试
- 性能测试
- 安全测试
- UAT（用户验收测试）
- 正式上线

### 部署架构

```
Internet
  ↓
CloudFlare / CDN
  ↓
Nginx (Load Balancer)
  ├─ Backend (Node.js × 3)
  │   ↓
  │   PostgreSQL (Primary + Replica)
  │   Redis Cluster
  │   MinIO / S3
  │   Docker (Sandbox Pool)
  │
  └─ Frontend (Static Files)
```

### Docker Compose 生产配置示例

```yaml
version: '3.9'

services:
  backend:
    image: gemini-web-backend:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
```

### 交付物
- ✅ 生产环境部署
- ✅ 部署文档
- ✅ 运维手册
- ✅ 上线报告

📖 **[查看详细计划](./PHASE_8_DETAILED_PLAN.md)** (即将创建)

---

## 🎯 整体成功指标

### 功能指标
- ✅ 实现 CLI 80%+ 核心功能
- ✅ 支持所有主要工具
- ✅ 完整的钩子和策略系统
- ✅ 多用户并发支持

### 性能指标
- ✅ 100+ 并发用户
- ✅ API 响应 < 200ms (P95)
- ✅ WebSocket 延迟 < 100ms
- ✅ 容器启动 < 5s

### 质量指标
- ✅ 代码覆盖率 > 80%
- ✅ 无关键安全漏洞
- ✅ 系统可用性 > 99.5%
- ✅ 错误率 < 0.1%

---

## 📚 相关文档

### 详细执行计划
- [阶段 0: 准备阶段](./PHASE_0_DETAILED_PLAN.md) ✅
- [阶段 1: 核心基础设施](./PHASE_1_DETAILED_PLAN.md) 🚧
- [阶段 2: Core 包集成](./PHASE_2_DETAILED_PLAN.md) 📋
- [阶段 3: 工作区与沙箱](./PHASE_3_DETAILED_PLAN.md) 📋
- [阶段 4: 前端开发](./PHASE_4_DETAILED_PLAN.md) 📋
- [阶段 5: WebSocket 实时功能](./PHASE_5_DETAILED_PLAN.md) 📋
- [阶段 6: 高级功能](./PHASE_6_DETAILED_PLAN.md) 📋
- [阶段 7: 测试与优化](./PHASE_7_DETAILED_PLAN.md) 📋
- [阶段 8: 部署与上线](./PHASE_8_DETAILED_PLAN.md) 📋

### 其他文档
- [总体架构设计](../BS_MIGRATION_PLAN.md)
- [开发指南](./DEVELOPMENT.md)
- [代码规范](./CODE_STANDARDS.md)
- [Git 工作流](./GIT_WORKFLOW.md)
- [API 文档](./API.md) (待创建)
- [部署文档](./DEPLOYMENT.md) (待创建)

---

## 🚀 快速开始

### 当前阶段：阶段 1

1. **确保阶段 0 已完成**
   ```bash
   # 检查开发环境
   docker-compose ps
   pnpm --version
   node --version
   ```

2. **开始阶段 1 任务**
   ```bash
   # 查看详细计划
   cat docs/PHASE_1_DETAILED_PLAN.md

   # 进入 backend 目录
   cd packages/backend

   # 安装依赖
   pnpm install

   # 启动开发服务器
   pnpm dev
   ```

3. **跟踪进度**
   - 使用项目看板（Jira/Linear/GitHub Projects）
   - 每日站会同步进度
   - 每周评审和演示

---

## 📞 需要帮助？

- 📖 查看对应阶段的详细执行计划
- 💬 在团队频道讨论
- 🐛 在 GitHub Issues 提问
- 📧 联系架构师获取支持

---

**最后更新**: 2025-12-17
**维护者**: Gemini Web Platform Team