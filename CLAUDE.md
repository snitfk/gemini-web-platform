# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Gemini Web Platform 是一个基于 Google Gemini 的 Web AI Agent 平台。这是一个 monorepo 项目，采用 pnpm workspaces 管理多个包。

- **Backend**: Express + TypeScript + Prisma + PostgreSQL
- **Frontend**: (待实现)
- **Shared**: 共享类型和工具库

## 开发环境设置

### 首次设置

```bash
# 1. 安装依赖
pnpm install

# 2. 创建环境变量文件
cp .env.example .env
# 编辑 .env，至少需要配置 GEMINI_API_KEY

# 3. 启动基础设施服务（PostgreSQL, Redis, MinIO）
cd infrastructure/docker
docker-compose up -d

# 4. 运行数据库迁移
cd packages/backend
pnpm prisma migrate dev

# 或使用自动化脚本
./scripts/setup-dev.sh
```

### 基础设施服务

项目依赖以下 Docker 服务（通过 `infrastructure/docker/docker-compose.yml` 管理）：

- **PostgreSQL**: localhost:5432（默认密码: password）
- **Redis**: localhost:6379
- **MinIO**:
  - API: localhost:9000
  - Console: localhost:9001（minioadmin/minioadmin）
- **Adminer**: localhost:8080（数据库管理工具）

启动服务：`cd infrastructure/docker && docker-compose up -d`
停止服务：`cd infrastructure/docker && docker-compose down`

## 常用命令

### 根目录

```bash
# 并行启动所有服务
pnpm dev

# 单独启动后端/前端
pnpm dev:backend
pnpm dev:frontend

# 构建所有包
pnpm build

# 运行所有测试
pnpm test

# 代码检查
pnpm lint

# 类型检查
pnpm typecheck

# 代码格式化
pnpm format

# 清理所有构建产物和依赖
pnpm clean
```

### Backend 开发

```bash
cd packages/backend

# 启动开发服务器（热重载）
pnpm dev

# 启动调试模式
pnpm dev:debug

# 构建
pnpm build

# 生产启动
pnpm start

# 测试
pnpm test              # 运行测试
pnpm test:watch        # 监听模式
pnpm test:coverage     # 覆盖率报告

# 代码检查
pnpm lint
pnpm typecheck
```

### Prisma 数据库操作

```bash
cd packages/backend

# 创建并应用迁移
pnpm prisma migrate dev --name <migration_name>

# 应用迁移（生产）
pnpm prisma migrate deploy

# 生成 Prisma Client
pnpm prisma generate

# 打开 Prisma Studio（数据库 GUI）
pnpm prisma studio

# 重置数据库（危险！）
pnpm prisma migrate reset

# 格式化 schema
pnpm prisma format
```

## 架构设计

### 技术栈

- **运行时**: Node.js 20+ (ESM modules)
- **包管理**: pnpm 8+
- **后端框架**: Express.js
- **数据库**: PostgreSQL + Prisma ORM
- **缓存**: Redis
- **对象存储**: MinIO (S3-compatible)
- **AI**: Google Gemini API
- **认证**: JWT + OAuth (Google)
- **安全**: helmet, cors, rate-limiting
- **日志**: winston

### 后端架构（Repository Pattern）

```
packages/backend/src/
├── api/                    # API 路由层
│   ├── auth/              # 认证相关路由
│   │   ├── routes.ts      # 路由定义
│   │   └── schemas.ts     # Zod 验证 schema
│   ├── chat/              # 聊天相关路由
│   └── workspace/         # 工作区相关路由
├── services/              # 业务逻辑层
│   └── auth.service.ts    # 认证服务
├── repositories/          # 数据访问层
│   ├── base.repository.ts         # 基础仓库类
│   ├── user.repository.ts         # 用户数据访问
│   ├── workspace.repository.ts    # 工作区数据访问
│   ├── chat-session.repository.ts # 会话数据访问
│   └── refresh-token.repository.ts
├── middleware/            # Express 中间件
│   ├── auth.ts           # 认证中间件
│   ├── errorHandler.ts   # 错误处理
│   ├── validate.ts       # 请求验证
│   └── requestLogger.ts  # 请求日志
├── utils/                # 工具函数
│   ├── logger.ts         # winston 日志
│   ├── prisma.ts         # Prisma 客户端
│   ├── jwt.ts            # JWT 工具
│   ├── crypto.ts         # 加密工具
│   ├── response.ts       # 统一响应格式
│   └── pagination.ts     # 分页工具
├── config/               # 配置管理
│   ├── env.ts           # 环境变量验证（Zod）
│   └── index.ts         # 配置导出
├── types/               # TypeScript 类型
│   ├── express.d.ts     # Express 扩展类型
│   └── errors.ts        # 错误类型
├── app.ts               # Express 应用配置
└── server.ts            # 服务器入口
```

**分层原则**：
- **Routes**: 处理 HTTP 请求/响应，调用 Service 层
- **Services**: 包含业务逻辑，协调多个 Repository
- **Repositories**: 封装数据库操作，继承自 BaseRepository
- **Middleware**: 请求拦截、验证、认证、错误处理

### 数据模型关系（Prisma Schema）

核心模型位于 `packages/backend/prisma/schema.prisma`：

```
User (用户)
  ├── workspaces[]      → Workspace
  ├── chatSessions[]    → ChatSession
  └── refreshTokens[]   → RefreshToken

Workspace (工作区)
  ├── user              → User
  └── chatSessions[]    → ChatSession

ChatSession (聊天会话)
  ├── workspace         → Workspace
  ├── user              → User
  ├── messages[]        → Message
  └── toolExecutions[]  → ToolExecution

Message (消息)
  └── session           → ChatSession

ToolExecution (工具执行记录)
  └── session           → ChatSession
```

**重要字段**：
- `User.geminiApiKey`: 加密存储的用户 API Key
- `Workspace.containerId`: Docker 沙盒容器 ID
- `Message.content`: JSON 格式（Gemini API Content 结构）
- `ToolExecution.status`: PENDING | EXECUTING | SUCCESS | ERROR | CANCELLED

### 配置管理

所有配置通过环境变量管理，定义在 `packages/backend/src/config/env.ts`（使用 Zod 验证）。

**关键配置**：
- `DATABASE_URL`: PostgreSQL 连接字符串
- `GEMINI_API_KEY`: Gemini API 密钥（必填）
- `JWT_SECRET`: JWT 签名密钥
- `DOCKER_HOST`: Docker daemon 地址（用于沙盒容器管理）

访问配置：`import { config } from './config/index.js'`

### 错误处理

使用全局错误处理中间件（`middleware/errorHandler.ts`）：

```typescript
// 抛出应用错误
throw new AppError('错误信息', 400, 'VALIDATION_ERROR');

// 自动处理 Prisma、Zod 错误
// 返回统一格式：{ success: false, error: { message, code } }
```

### 响应格式

所有 API 返回统一格式（`utils/response.ts`）：

```typescript
// 成功
{ success: true, data: {...} }

// 失败
{ success: false, error: { message: '...', code: '...' } }

// 分页
{ success: true, data: [...], pagination: { page, pageSize, total, totalPages } }
```

### 模块系统

项目使用 **ESM** (ES Modules)，所有导入必须带 `.js` 扩展名：

```typescript
// ✅ 正确
import { config } from './config/index.js';
import { UserRepository } from './repositories/user.repository.js';

// ❌ 错误
import { config } from './config/index';
```

### 依赖注入

Repository 通过构造函数注入 Prisma 实例：

```typescript
import { prisma } from './utils/prisma.js';
import { UserRepository } from './repositories/user.repository.js';

const userRepo = new UserRepository(prisma);
```

## 开发规范

### 文件命名

- **TypeScript**: `kebab-case.ts` (如 `user.repository.ts`)
- **类型声明**: `*.d.ts`
- **测试文件**: `*.test.ts`

### 代码风格

- 使用 ESLint + Prettier
- 严格模式 TypeScript（`strict: true`）
- 优先使用 `const`，避免 `var`
- 异步操作使用 `async/await`

### Git 工作流

- 主分支: `main`
- 开发分支: `develop`
- 功能分支: `feature/xxx`
- 修复分支: `fix/xxx`

## 注意事项

1. **数据库迁移**: 修改 `schema.prisma` 后必须运行 `prisma migrate dev`
2. **环境变量**: 新增环境变量需同时更新 `.env.example` 和 `config/env.ts`
3. **敏感信息**: API Key 使用 `utils/crypto.ts` 加密后存储
4. **Docker 沙盒**: 工作区对应独立的 Docker 容器，通过 `DOCKER_HOST` 管理
5. **日志级别**: 生产环境使用 `info`，开发环境使用 `debug`
