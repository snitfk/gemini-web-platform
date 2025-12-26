# Gemini Web Platform

> 基于 Google Gemini 的 Web AI Agent 平台

一个支持多用户、多工作区的 AI Agent 平台，提供与 Google Gemini 的交互能力，支持工具调用、容器化沙盒环境和会话管理。

## ✨ 特性

- 🤖 **Google Gemini 集成**: 支持最新的 Gemini 2.0 Flash 模型
- 👥 **多用户系统**: JWT + OAuth 认证，支持 Google 登录
- 🏢 **工作区管理**: 每个工作区对应独立的 Docker 沙盒环境
- 💬 **会话管理**: 完整的聊天历史记录和上下文管理
- 🔧 **工具执行**: 记录和追踪 AI 工具调用的执行过程
- 🔐 **安全性**: API Key 加密存储、速率限制、CORS 保护
- 📊 **可观测性**: Winston 结构化日志、请求追踪
- 🗄️ **数据持久化**: PostgreSQL + Prisma ORM
- ⚡ **缓存支持**: Redis 缓存层
- 📦 **对象存储**: MinIO (S3 兼容)

## 🏗️ 技术架构

### 技术栈

- **后端**: Node.js 20+ / TypeScript / Express.js
- **数据库**: PostgreSQL 16 + Prisma ORM
- **缓存**: Redis 7
- **对象存储**: MinIO
- **AI 引擎**: Google Gemini API
- **认证**: JWT + OAuth 2.0
- **容器化**: Docker + Docker Compose
- **包管理**: pnpm Workspaces (Monorepo)

### 项目结构

```
gemini-web-platform/
├── packages/
│   ├── backend/              # Express 后端服务
│   │   ├── src/
│   │   │   ├── api/         # API 路由
│   │   │   ├── services/    # 业务逻辑
│   │   │   ├── repositories/# 数据访问层
│   │   │   ├── middleware/  # Express 中间件
│   │   │   ├── utils/       # 工具函数
│   │   │   ├── config/      # 配置管理
│   │   │   └── types/       # TypeScript 类型
│   │   ├── prisma/          # 数据库 Schema
│   │   └── tests/           # 测试文件
│   ├── frontend/            # 前端应用 (待开发)
│   └── shared/              # 共享代码
├── infrastructure/
│   └── docker/              # Docker 配置
│       ├── docker-compose.yml
│       └── Dockerfile.sandbox
├── scripts/                 # 开发脚本
└── .env.example            # 环境变量模板
```

## 🚀 快速开始

### 前置要求

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose
- PostgreSQL 16 (通过 Docker)

### 安装步骤

1. **克隆仓库**

```bash
git clone <repository-url>
cd gemini-web-platform
```

2. **安装依赖**

```bash
pnpm install
```

3. **配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env` 文件，至少配置以下必需项：

```env
# 必需配置
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_here

# 数据库配置
DATABASE_URL=postgresql://postgres:password@localhost:5432/gemini_web

# 其他配置保持默认即可
```

4. **启动基础设施服务**

```bash
cd infrastructure/docker
docker-compose up -d
```

这将启动以下服务：
- PostgreSQL (5432)
- Redis (6379)
- MinIO (9000, 9001)
- Adminer (8080)

5. **运行数据库迁移**

```bash
cd packages/backend
pnpm prisma migrate dev
```

6. **启动开发服务器**

```bash
# 从项目根目录
pnpm dev:backend
```

后端服务将运行在 `http://localhost:3000`

### 快速设置脚本

或者使用自动化脚本一键设置：

```bash
./scripts/setup-dev.sh
```

## 📖 开发指南

### 常用命令

```bash
# 开发
pnpm dev                # 启动所有服务
pnpm dev:backend        # 仅启动后端
pnpm dev:frontend       # 仅启动前端

# 构建
pnpm build              # 构建所有包
pnpm typecheck          # TypeScript 类型检查

# 测试
pnpm test               # 运行所有测试
pnpm test:watch         # 监听模式

# 代码质量
pnpm lint               # ESLint 检查
pnpm format             # Prettier 格式化

# 清理
pnpm clean              # 清理构建产物
```

### 数据库操作

```bash
cd packages/backend

# 创建迁移
pnpm prisma migrate dev --name <migration_name>

# 打开数据库 GUI
pnpm prisma studio

# 重置数据库
pnpm prisma migrate reset

# 生成 Prisma Client
pnpm prisma generate
```

### API 文档

启动后端服务后，访问：

- **健康检查**: `GET http://localhost:3000/health`
- **API 信息**: `GET http://localhost:3000/api`
- **认证接口**: `http://localhost:3000/api/auth/*`

## 🗄️ 数据模型

### 核心实体

- **User**: 用户账户，支持密码和 OAuth 登录
- **Workspace**: 工作区，关联 Docker 容器沙盒
- **ChatSession**: 聊天会话，管理对话上下文
- **Message**: 消息记录 (USER/MODEL/TOOL)
- **ToolExecution**: 工具执行记录和状态追踪
- **RefreshToken**: JWT 刷新令牌

详见 `packages/backend/prisma/schema.prisma`

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `BACKEND_PORT` | 后端端口 | `3000` |
| `DATABASE_URL` | PostgreSQL 连接串 | - |
| `REDIS_URL` | Redis 连接串 | `redis://localhost:6379` |
| `GEMINI_API_KEY` | Gemini API 密钥 | **必填** |
| `JWT_SECRET` | JWT 签名密钥 | **必填** |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d` |
| `CORS_ORIGIN` | CORS 允许源 | `http://localhost:5173` |
| `LOG_LEVEL` | 日志级别 | `debug` |

完整配置参考 `.env.example`

### Docker 服务

| 服务 | 端口 | 凭据 |
|------|------|------|
| PostgreSQL | 5432 | `postgres/password` |
| Redis | 6379 | - |
| MinIO API | 9000 | `minioadmin/minioadmin` |
| MinIO Console | 9001 | `minioadmin/minioadmin` |
| Adminer | 8080 | - |

## 🏛️ 架构设计

### 分层架构

```
┌─────────────────────────────────────┐
│         API Routes Layer            │  HTTP 路由和验证
├─────────────────────────────────────┤
│        Services Layer               │  业务逻辑编排
├─────────────────────────────────────┤
│      Repositories Layer             │  数据访问抽象
├─────────────────────────────────────┤
│      Prisma ORM / Database          │  数据持久化
└─────────────────────────────────────┘
```

### 关键设计模式

- **Repository Pattern**: 数据访问抽象，便于测试和替换
- **Dependency Injection**: 通过构造函数注入依赖
- **Middleware Chain**: Express 中间件组合
- **Error Boundary**: 全局错误处理和标准化响应

## 🔐 安全特性

- ✅ JWT 访问令牌 + 刷新令牌机制
- ✅ bcrypt 密码哈希 (成本因子 10)
- ✅ AES-256-GCM API Key 加密存储
- ✅ Helmet 安全头设置
- ✅ CORS 跨域保护
- ✅ 速率限制 (默认 15 分钟 100 请求)
- ✅ 请求体大小限制 (10MB)
- ✅ Docker 沙盒隔离

## 📊 可观测性

### 日志

使用 Winston 结构化日志，支持：

- 控制台输出（开发环境）
- JSON 格式（生产环境）
- 自动请求 ID 追踪
- 错误堆栈记录

### 监控

- 健康检查端点: `/health`
- 数据库连接状态
- 服务启动时间和版本信息

## 🧪 测试

```bash
# 单元测试
pnpm test

# 监听模式
pnpm test:watch

# 覆盖率报告
pnpm test:coverage
```

测试框架: Vitest + Supertest

## 🚧 开发路线图

- [ ] 前端应用开发 (React/Vue)
- [ ] WebSocket 实时通信
- [ ] 流式响应支持
- [ ] 工具调用系统
- [ ] 文件上传和管理
- [ ] 工作区资源配额
- [ ] 用户使用统计和计费
- [ ] API 文档 (Swagger/OpenAPI)
- [ ] 容器编排 (Kubernetes)
- [ ] CI/CD 流水线

## 📝 开发规范

- **代码风格**: ESLint + Prettier
- **提交规范**: Conventional Commits
- **分支策略**: Git Flow (main/develop/feature/*)
- **TypeScript**: 严格模式
- **模块系统**: ESM (所有导入需 `.js` 扩展名)

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

MIT License

## 🙏 致谢

- [Google Gemini](https://ai.google.dev/) - AI 引擎
- [Prisma](https://www.prisma.io/) - 数据库 ORM
- [Express.js](https://expressjs.com/) - Web 框架

## 📮 联系方式

- 问题反馈: [GitHub Issues](https://github.com/your-org/gemini-web-platform/issues)
- 项目文档: [Wiki](https://github.com/your-org/gemini-web-platform/wiki)

---

**注意**: 本项目当前处于早期开发阶段，API 可能会有变动。
