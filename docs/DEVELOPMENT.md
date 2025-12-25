# 开发指南

## 环境要求

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker >= 20.0.0
- Docker Compose >= 2.0.0

## 快速开始

### 1. 克隆仓库

\`\`\`bash
git clone https://github.com/your-org/gemini-web-platform.git
cd gemini-web-platform
\`\`\`

### 2. 安装依赖

\`\`\`bash
pnpm install
\`\`\`

### 3. 配置环境变量

\`\`\`bash
cp .env.example .env
# 编辑 .env 文件，填入必要的配置
\`\`\`

### 4. 启动开发环境

\`\`\`bash
# 启动所有服务（数据库、Redis、MinIO）
docker-compose up -d

# 启动后端
pnpm dev:backend

# 启动前端（新终端）
pnpm dev:frontend
\`\`\`

### 5. 访问应用

- 前端: http://localhost:5173
- 后端 API: http://localhost:3000
- MinIO 控制台: http://localhost:9001

## 项目结构

见 README.md

## 开发工作流

### 分支策略

- `main` - 生产环境分支
- `develop` - 开发分支
- `feature/*` - 功能分支
- `bugfix/*` - 修复分支
- `hotfix/*` - 紧急修复分支

### 提交规范

使用 Conventional Commits:

- `feat:` - 新功能
- `fix:` - 修复
- `docs:` - 文档
- `style:` - 格式化
- `refactor:` - 重构
- `test:` - 测试
- `chore:` - 构建/工具

示例:
\`\`\`
feat(backend): add user authentication
fix(frontend): resolve chat message overflow
docs: update API documentation
\`\`\`

### 代码规范

在提交前运行:

\`\`\`bash
# 格式化代码
pnpm format

# 检查 lint
pnpm lint

# 类型检查
pnpm typecheck

# 运行测试
pnpm test
\`\`\`

## 常用命令

\`\`\`bash
# 开发
pnpm dev                    # 启动所有包的开发模式
pnpm dev:backend           # 只启动后端
pnpm dev:frontend          # 只启动前端

# 构建
pnpm build                 # 构建所有包
pnpm build:backend         # 只构建后端
pnpm build:frontend        # 只构建前端

# 测试
pnpm test                  # 运行所有测试
pnpm test:watch            # 监听模式运行测试
pnpm test:coverage         # 生成覆盖率报告

# 代码质量
pnpm lint                  # 运行 ESLint
pnpm lint:fix              # 自动修复 ESLint 问题
pnpm format                # 格式化代码
pnpm typecheck             # TypeScript 类型检查

# 清理
pnpm clean                 # 清理所有构建产物和依赖
\`\`\`

## 调试

### 后端调试

\`\`\`bash
cd packages/backend
pnpm dev:debug
\`\`\`

然后在 VS Code 中按 F5 或使用 Chrome DevTools。

### 前端调试

使用 React DevTools 和浏览器开发者工具。

## 故障排查

### pnpm install 失败

\`\`\`bash
rm -rf node_modules pnpm-lock.yaml
pnpm store prune
pnpm install
\`\`\`

### Docker 容器无法启动

\`\`\`bash
docker-compose down -v
docker-compose up -d
\`\`\`

### 端口被占用

修改 `.env` 文件中的端口配置。

## 更多信息

- [API 文档](./API.md)
- [部署指南](./DEPLOYMENT.md)
- [架构设计](../BS_MIGRATION_PLAN.md)
\`\`\`

**验证清单**:

- [ ] `pnpm install` 成功执行
- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] `.env` 文件已创建
- [ ] VS Code 扩展推荐已显示
- [ ] GitHub Actions CI 配置正确

---

## 🔬 任务 0.2: 技术验证 (2 天)

### 目标
验证核心技术栈的可行性，特别是 `packages/core` 在服务器环境的运行。

### 详细步骤

#### Day 1: Core 包验证 + Gemini API 测试

**步骤 1.1: 设置 Core 包引用** (1 小时)

```bash
# 方案 A: Git Submodule (推荐)
cd packages
git submodule add https://github.com/google-gemini/gemini-cli.git gemini-cli
ln -s gemini-cli/packages/core core

# 方案 B: 直接复制
# cp -r /path/to/gemini-cli/packages/core packages/core