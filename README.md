# Gemini Web Platform

> 基于 Google Gemini 的 Web AI Agent 开发平台

一个功能完整的 AI 辅助开发平台，集成 Google Gemini API，提供智能代码编辑、实时协作、终端模拟和工作区管理功能。

## ✨ 功能特性

### 核心功能
- 🤖 **AI 代码助手** - 集成 Google Gemini 2.0，支持智能对话和代码生成
- 📝 **Monaco 编辑器** - 专业级代码编辑器，支持 IntelliSense、自定义主题和代码格式化
- 💻 **Web 终端** - 基于 xterm.js 的完整终端模拟器
- 🔄 **实时协作** - Socket.IO WebSocket 实时通信，文件变更即时同步
- 📁 **工作区管理** - 独立的开发环境，支持容器化沙盒隔离
- 👥 **多用户系统** - JWT + OAuth 认证，支持 Google 登录

### 技术亮点
- 🏗️ **Monorepo 架构** - pnpm workspaces 管理前后端代码
- 🧪 **完善测试** - 219 个测试用例（199 后端 + 20 前端）+ E2E 测试
- ⚡ **性能优化** - 代码分割、Gzip/Brotli 压缩、懒加载
- 🔐 **安全加固** - Helmet、CORS、Rate Limiting、加密存储

## 🏗️ 技术架构

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20+ | 运行时环境 |
| Express.js | 4.x | Web 框架 |
| TypeScript | 5.x | 类型系统 |
| Prisma | 5.x | ORM |
| PostgreSQL | 16 | 主数据库 |
| Redis | 7 | 缓存层 |
| Socket.IO | 4.x | WebSocket |
| Winston | 3.x | 日志系统 |

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型系统 |
| Vite | 6.x | 构建工具 |
| Tailwind CSS | 3.x | 样式框架 |
| Zustand | 5.x | 状态管理 |
| React Query | 5.x | 数据获取 |
| Monaco Editor | 0.52 | 代码编辑器 |
| xterm.js | 5.x | 终端模拟 |
| Radix UI | - | 无障碍组件 |

### 测试和工具

| 技术 | 用途 |
|------|------|
| Vitest | 单元测试和集成测试 |
| Playwright | E2E 测试 |
| Testing Library | React 组件测试 |
| Supertest | API 集成测试 |

## 📁 项目结构

```
gemini-web-platform/
├── packages/
│   ├── backend/                 # 后端服务
│   │   ├── src/
│   │   │   ├── api/            # API 路由和控制器
│   │   │   │   ├── auth/       # 认证接口
│   │   │   │   ├── chat/       # 聊天接口
│   │   │   │   ├── workspace/  # 工作区接口
│   │   │   │   ├── file/       # 文件接口
│   │   │   │   └── container/  # 容器接口
│   │   │   ├── services/       # 业务逻辑层
│   │   │   │   ├── gemini.service.ts
│   │   │   │   ├── websocket.service.ts
│   │   │   │   ├── file.service.ts
│   │   │   │   ├── cache.service.ts
│   │   │   │   └── ...
│   │   │   ├── repositories/   # 数据访问层
│   │   │   ├── adapters/       # 外部服务适配器
│   │   │   ├── middleware/     # Express 中间件
│   │   │   ├── config/         # 配置管理
│   │   │   ├── utils/          # 工具函数
│   │   │   └── types/          # TypeScript 类型
│   │   ├── prisma/             # 数据库模型
│   │   └── tests/              # 测试文件
│   │       ├── unit/           # 单元测试
│   │       └── integration/    # 集成测试
│   │
│   └── frontend/               # 前端应用
│       ├── src/
│       │   ├── components/     # React 组件
│       │   │   ├── ui/         # 基础 UI 组件
│       │   │   ├── editor/     # 编辑器组件
│       │   │   ├── chat/       # 聊天组件
│       │   │   ├── terminal/   # 终端组件
│       │   │   └── layout/     # 布局组件
│       │   ├── pages/          # 页面组件
│       │   ├── stores/         # Zustand 状态
│       │   ├── services/       # API 服务
│       │   ├── hooks/          # 自定义 Hooks
│       │   └── lib/            # 工具库
│       │       ├── monaco/     # Monaco 配置
│       │       ├── websocket/  # WebSocket 客户端
│       │       └── performance.ts
│       └── public/             # 静态资源
│
├── infrastructure/
│   └── docker/                 # Docker 配置
│       └── docker-compose.yml
│
├── e2e/                        # E2E 测试
│   ├── auth.spec.ts
│   ├── home.spec.ts
│   └── workspace.spec.ts
│
├── docs/                       # 项目文档
├── scripts/                    # 脚本工具
└── playwright.config.ts        # Playwright 配置
```

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Docker** & Docker Compose
- **PostgreSQL** 15+
- **Redis** 7+

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/your-repo/gemini-web-platform.git
cd gemini-web-platform

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量

# 4. 启动基础设施服务
cd infrastructure/docker
docker-compose up -d

# 5. 初始化数据库
cd ../../packages/backend
pnpm prisma migrate dev

# 6. 启动开发服务器
cd ../..
pnpm dev
```

服务启动后：
- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **健康检查**: http://localhost:8000/health

### 环境变量配置

```env
# 必填配置
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=postgresql://postgres:password@localhost:5432/gemini_web
JWT_SECRET=your-jwt-secret-key-at-least-32-chars

# 可选配置
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

## 📖 开发命令

### 根目录命令

```bash
# 开发
pnpm dev              # 启动所有服务（前端 + 后端）
pnpm build            # 构建所有包
pnpm clean            # 清理构建产物

# 测试
pnpm test             # 运行所有测试
pnpm test:e2e         # 运行 E2E 测试
pnpm test:e2e:ui      # E2E 测试（带 UI）
pnpm test:e2e:headed  # E2E 测试（有头浏览器）

# 代码质量
pnpm lint             # ESLint 检查
```

### 后端命令

```bash
cd packages/backend

pnpm dev              # 启动开发服务器（热重载）
pnpm dev:debug        # 调试模式
pnpm build            # TypeScript 编译
pnpm start            # 生产启动

# 测试
pnpm test             # 运行测试
pnpm test:watch       # 监听模式
pnpm test:coverage    # 覆盖率报告

# 数据库
pnpm db:migrate       # 运行迁移
pnpm db:studio        # Prisma Studio
pnpm db:generate      # 生成 Prisma Client
```

### 前端命令

```bash
cd packages/frontend

pnpm dev              # 启动开发服务器
pnpm build            # 构建生产版本
pnpm preview          # 预览生产构建

# 测试
pnpm test             # 运行测试
pnpm test:watch       # 监听模式
pnpm test:coverage    # 覆盖率报告
```

## 📡 API 接口

### 认证接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| POST | `/api/auth/refresh` | 刷新令牌 |
| GET | `/api/auth/me` | 获取当前用户 |
| POST | `/api/auth/change-password` | 修改密码 |

### 工作区接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/workspaces` | 获取工作区列表 |
| POST | `/api/workspaces` | 创建工作区 |
| GET | `/api/workspaces/:id` | 获取工作区详情 |
| PUT | `/api/workspaces/:id` | 更新工作区 |
| DELETE | `/api/workspaces/:id` | 删除工作区 |
| POST | `/api/workspaces/:id/start` | 启动工作区 |
| POST | `/api/workspaces/:id/stop` | 停止工作区 |

### 文件接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/workspaces/:id/files` | 获取文件列表 |
| GET | `/api/workspaces/:id/files/*` | 读取文件内容 |
| POST | `/api/workspaces/:id/files/*` | 创建/更新文件 |
| PUT | `/api/workspaces/:id/files/*` | 编辑文件 |
| DELETE | `/api/workspaces/:id/files/*` | 删除文件 |

### 聊天接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/chat/sessions` | 创建聊天会话 |
| GET | `/api/chat/sessions/:id` | 获取会话详情 |
| POST | `/api/chat/sessions/:id/messages` | 发送消息 |
| GET | `/api/chat/sessions/:id/messages` | 获取消息历史 |

## 🧪 测试

项目包含完整的测试套件：

### 测试统计

| 类型 | 数量 | 框架 |
|------|------|------|
| 后端单元测试 | 150+ | Vitest |
| 后端集成测试 | 40+ | Vitest + Supertest |
| 前端组件测试 | 20 | Vitest + Testing Library |
| E2E 测试 | 10+ | Playwright |

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行后端测试（带覆盖率）
cd packages/backend && pnpm test:coverage

# 运行前端测试
cd packages/frontend && pnpm test

# 运行 E2E 测试
pnpm test:e2e
```

## 🏛️ 架构设计

### 后端分层架构

```
┌─────────────────────────────────────────┐
│           API Routes Layer              │  路由定义和请求验证
├─────────────────────────────────────────┤
│         Controllers Layer               │  请求处理和响应格式化
├─────────────────────────────────────────┤
│          Services Layer                 │  业务逻辑和编排
├─────────────────────────────────────────┤
│        Repositories Layer               │  数据访问抽象
├─────────────────────────────────────────┤
│          Adapters Layer                 │  外部服务集成
├─────────────────────────────────────────┤
│      Prisma ORM / Database              │  数据持久化
└─────────────────────────────────────────┘
```

### 前端架构

```
┌─────────────────────────────────────────┐
│              Pages                      │  页面级组件和路由
├─────────────────────────────────────────┤
│            Components                   │  可复用 UI 组件
├─────────────────────────────────────────┤
│         Stores (Zustand)                │  全局状态管理
├─────────────────────────────────────────┤
│      Services / API Client              │  后端通信
├─────────────────────────────────────────┤
│        Hooks / Utilities                │  逻辑复用
└─────────────────────────────────────────┘
```

### WebSocket 事件

| 事件 | 方向 | 描述 |
|------|------|------|
| `connection` | 客户端→服务端 | 建立连接 |
| `join:workspace` | 客户端→服务端 | 加入工作区房间 |
| `file:changed` | 服务端→客户端 | 文件变更通知 |
| `container:status` | 服务端→客户端 | 容器状态更新 |

## 🔐 安全特性

- ✅ **JWT 认证** - 访问令牌 + 刷新令牌机制
- ✅ **密码加密** - bcrypt 哈希（成本因子 10）
- ✅ **API Key 加密** - AES-256-GCM 加密存储
- ✅ **安全头** - Helmet 中间件
- ✅ **CORS 保护** - 可配置跨域策略
- ✅ **速率限制** - 默认 15 分钟 100 请求
- ✅ **输入验证** - Zod schema 验证
- ✅ **XSS 防护** - 输出转义和 CSP

## 🐳 Docker 服务

| 服务 | 端口 | 凭据 |
|------|------|------|
| PostgreSQL | 5432 | `postgres` / `password` |
| Redis | 6379 | - |
| MinIO API | 9000 | `minioadmin` / `minioadmin` |
| MinIO Console | 9001 | `minioadmin` / `minioadmin` |
| Adminer | 8080 | - |

## 📊 性能优化

### 前端优化

- **代码分割** - React.lazy 和动态导入
- **Vendor 分包** - react-vendor, ui-vendor, editor-vendor
- **压缩** - Gzip 和 Brotli 双压缩
- **懒加载** - 路由级别懒加载

### 后端优化

- **缓存层** - Redis / 内存缓存服务
- **连接池** - Prisma 连接池管理
- **响应压缩** - compression 中间件

## 📝 开发规范

- **代码风格**: ESLint + Prettier
- **提交规范**: [Conventional Commits](https://www.conventionalcommits.org/)
- **分支策略**: Git Flow (`main` / `develop` / `feature/*`)
- **TypeScript**: 严格模式
- **模块系统**: ESM（导入需 `.js` 扩展名）

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 提交类型

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式化
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具

## 📄 许可证

[MIT License](LICENSE)

## 🔗 相关链接

- [Google Gemini API](https://ai.google.dev/)
- [Prisma 文档](https://www.prisma.io/docs)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Socket.IO](https://socket.io/)
- [Playwright](https://playwright.dev/)

---

**版本**: 0.1.0 | **状态**: 开发中
