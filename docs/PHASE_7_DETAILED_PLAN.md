# Phase 7 详细计划: 测试和优化

## 📋 概览

**阶段目标**: 完善测试覆盖、性能优化、安全加固
**持续时间**: 15 天
**关键产出**: 70%+ 测试覆盖率 + 性能优化 + 安全审计报告 + 负载测试报告

---

## 🗓️ 时间规划

| 任务模块 | 天数 | 负责人 | 依赖 |
|---------|------|--------|------|
| 7.1 单元测试和集成测试 | 5 天 | 全员 | 阶段 6 完成 |
| 7.2 E2E 测试 | 2 天 | 前端 #1 + #2 | 7.1 Day 3 完成 |
| 7.3 性能优化 | 5 天 | 后端 #1 + 前端 #1 | 7.1 完成 |
| 7.4 安全审计 | 2 天 | 后端 #1 + #2 | 7.3 Day 3 完成 |
| 7.5 负载测试和监控 | 1 天 | DevOps + 后端 #1 | 7.3, 7.4 完成 |

**注意**: 7.2 和 7.1 后半部分可以并行，7.3 和 7.4 可以部分并行

---

## 概览

Phase 7 确保应用的质量、性能和安全性:

### 核心任务
- ✅ 单元测试和集成测试
- ✅ E2E 测试
- ✅ 性能优化（前后端）
- ✅ 数据库查询优化
- ✅ 安全审计
- ✅ 负载测试
- ✅ 监控和日志

### 技术栈
- **测试**: Vitest, Testing Library, Playwright
- **性能**: Lighthouse, Web Vitals, Clinic.js
- **安全**: Snyk, OWASP ZAP, npm audit
- **负载**: k6, Apache Bench
- **监控**: Prometheus, Grafana, Winston

---

## 阶段架构图

```
┌──────────────────────────────────────────────────────────────┐
│                      Testing Pyramid                          │
│                                                                │
│                    ┌────────────────┐                         │
│                    │   E2E Tests    │  (Playwright)           │
│                    │   10% coverage │                         │
│                    └────────────────┘                         │
│                  ┌────────────────────┐                       │
│                  │ Integration Tests  │  (Vitest + Supertest)│
│                  │   30% coverage     │                       │
│                  └────────────────────┘                       │
│              ┌──────────────────────────┐                     │
│              │     Unit Tests           │  (Vitest)          │
│              │     60% coverage         │                     │
│              └──────────────────────────┘                     │
│                                                                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   Performance Optimization                     │
│                                                                │
│  Frontend:                      Backend:                       │
│  ┌──────────────────┐          ┌──────────────────┐          │
│  │ Code Splitting   │          │ Query Optimization│          │
│  │ Lazy Loading     │          │ Caching (Redis)   │          │
│  │ Bundle Analysis  │          │ Connection Pool   │          │
│  │ Image Optimization│         │ Index Tuning      │          │
│  └──────────────────┘          └──────────────────┘          │
│                                                                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                       Security Layers                          │
│                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Input      │  │    Auth     │  │  Output     │          │
│  │ Validation  │  │  & AuthZ    │  │ Sanitization│          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  HTTPS/TLS  │  │   CSRF      │  │   XSS       │          │
│  │  Encryption │  │ Protection  │  │ Prevention  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

# Day 1-5: 单元测试和集成测试

## 目标
- 设置测试框架和环境
- 编写后端单元测试
- 编写前端组件测试
- 实现集成测试
- 达到 70%+ 代码覆盖率

---

## 步骤 1.1: 后端测试环境设置

安装依赖:

```bash
cd packages/backend
pnpm add -D vitest@^1.0.0
pnpm add -D @vitest/coverage-v8@^1.0.0
pnpm add -D supertest@^6.3.3
pnpm add -D @types/supertest
```

创建 `packages/backend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/index.ts',
        'dist/',
      ],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

创建 `packages/backend/tests/setup.ts`:

```typescript
import { beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 数据库设置
beforeAll(async () => {
  // 清理测试数据库
  await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Workspace" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "File" CASCADE`;
});

// 每次测试后清理
afterEach(async () => {
  // 可选：清理每个测试后的数据
});

// 测试结束后关闭连接
afterAll(async () => {
  await prisma.$disconnect();
});

// 全局测试工具
global.testUtils = {
  prisma,

  // 创建测试用户
  async createTestUser(data?: Partial<any>) {
    return await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        ...data,
      },
    });
  },

  // 创建测试工作区
  async createTestWorkspace(userId: string, data?: Partial<any>) {
    return await prisma.workspace.create({
      data: {
        name: 'Test Workspace',
        userId,
        status: 'ACTIVE',
        ...data,
      },
    });
  },

  // 清理测试数据
  async cleanup() {
    await prisma.file.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.user.deleteMany();
  },
};
```

---

## 步骤 1.2: 后端单元测试示例

创建 `packages/backend/tests/services/auth.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '@/services/auth.service';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Mock Prisma
vi.mock('@prisma/client');

describe('AuthService', () => {
  let authService: AuthService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };
    authService = new AuthService(prismaMock);
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: '1',
        ...userData,
        password: 'hashed_password',
      });

      const result = await authService.register(userData);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(result.email).toBe(userData.email);
    });

    it('should throw error if email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
      });

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'password',
          name: 'Test',
        })
      ).rejects.toThrow('Email already in use');
    });
  });

  describe('login', () => {
    it('should return user and token for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = {
        id: '1',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
      };

      prismaMock.user.findUnique.mockResolvedValue(user);

      const result = await authService.login('test@example.com', 'password123');

      expect(result.user.email).toBe(user.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

创建 `packages/backend/tests/services/workspace.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkspaceService } from '@/services/workspace.service';

describe('WorkspaceService', () => {
  let workspaceService: WorkspaceService;
  let prismaMock: any;
  let containerServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      workspace: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    containerServiceMock = {
      createContainer: vi.fn(),
      startContainer: vi.fn(),
      stopContainer: vi.fn(),
      deleteContainer: vi.fn(),
    };

    workspaceService = new WorkspaceService(prismaMock, containerServiceMock);
  });

  describe('createWorkspace', () => {
    it('should create workspace and container', async () => {
      const userId = 'user-1';
      const workspaceData = {
        name: 'My Workspace',
        description: 'Test workspace',
      };

      const mockWorkspace = {
        id: 'workspace-1',
        ...workspaceData,
        userId,
        status: 'CREATED',
      };

      prismaMock.workspace.create.mockResolvedValue(mockWorkspace);
      containerServiceMock.createContainer.mockResolvedValue({
        id: 'container-1',
      });

      const result = await workspaceService.createWorkspace(userId, workspaceData);

      expect(prismaMock.workspace.create).toHaveBeenCalledWith({
        data: {
          ...workspaceData,
          userId,
          status: 'CREATED',
        },
      });
      expect(containerServiceMock.createContainer).toHaveBeenCalledWith(
        mockWorkspace.id
      );
      expect(result.id).toBe(mockWorkspace.id);
    });
  });

  describe('startWorkspace', () => {
    it('should start container and update workspace status', async () => {
      const workspaceId = 'workspace-1';
      const mockWorkspace = {
        id: workspaceId,
        name: 'Test',
        status: 'STOPPED',
        containerId: 'container-1',
      };

      prismaMock.workspace.findUnique.mockResolvedValue(mockWorkspace);
      containerServiceMock.startContainer.mockResolvedValue(true);
      prismaMock.workspace.update.mockResolvedValue({
        ...mockWorkspace,
        status: 'RUNNING',
      });

      const result = await workspaceService.startWorkspace(workspaceId);

      expect(containerServiceMock.startContainer).toHaveBeenCalledWith(
        mockWorkspace.containerId
      );
      expect(prismaMock.workspace.update).toHaveBeenCalledWith({
        where: { id: workspaceId },
        data: { status: 'RUNNING' },
      });
      expect(result.status).toBe('RUNNING');
    });

    it('should throw error if workspace not found', async () => {
      prismaMock.workspace.findUnique.mockResolvedValue(null);

      await expect(
        workspaceService.startWorkspace('nonexistent')
      ).rejects.toThrow('Workspace not found');
    });
  });
});
```

---

## 步骤 1.3: 后端集成测试

创建 `packages/backend/tests/api/auth.integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    // 清理数据库
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 409 for duplicate email', async () => {
      // 首次注册
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'User 1',
        });

      // 重复注册
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password456',
          name: 'User 2',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      // 创建测试用户
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@example.com',
          password: 'password123',
          name: 'Login User',
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
```

创建 `packages/backend/tests/api/workspaces.integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/app';

describe('Workspaces API Integration Tests', () => {
  let accessToken: string;
  let workspaceId: string;

  beforeAll(async () => {
    // 注册并登录获取 token
    const authResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'workspace-test@example.com',
        password: 'password123',
        name: 'Workspace Tester',
      });

    accessToken = authResponse.body.data.accessToken;
  });

  describe('POST /api/workspaces', () => {
    it('should create a new workspace', async () => {
      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Workspace',
          description: 'A test workspace',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Workspace');

      workspaceId = response.body.data.id;
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/workspaces')
        .send({
          name: 'Unauthorized Workspace',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/workspaces', () => {
    it('should list user workspaces', async () => {
      const response = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/workspaces/:id', () => {
    it('should get workspace by id', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(workspaceId);
    });

    it('should return 404 for non-existent workspace', async () => {
      const response = await request(app)
        .get('/api/workspaces/nonexistent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/workspaces/:id/start', () => {
    it('should start workspace', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/start`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('RUNNING');
    });
  });

  describe('DELETE /api/workspaces/:id', () => {
    it('should delete workspace', async () => {
      const response = await request(app)
        .delete(`/api/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 验证已删除
      const getResponse = await request(app)
        .get(`/api/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
});
```

---

## 步骤 1.4: 前端测试环境设置

```bash
cd packages/frontend
pnpm add -D vitest@^1.0.0
pnpm add -D @vitest/ui@^1.0.0
pnpm add -D @testing-library/react@^14.1.2
pnpm add -D @testing-library/jest-dom@^6.1.5
pnpm add -D @testing-library/user-event@^14.5.1
pnpm add -D jsdom@^23.0.1
```

创建 `packages/frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.tsx',
        '**/*.test.tsx',
        'src/main.tsx',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

创建 `packages/frontend/tests/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;
```

---

## 步骤 1.5: 前端组件测试

创建 `packages/frontend/tests/components/Button.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });

  it('should render different variants', () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    expect(screen.getByText('Default')).toHaveClass('bg-primary');

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByText('Destructive')).toHaveClass('bg-destructive');
  });
});
```

创建 `packages/frontend/tests/components/WorkspaceCard.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WorkspaceCard from '@/components/workspace/WorkspaceCard';

const mockWorkspace = {
  id: '1',
  name: 'Test Workspace',
  description: 'Test description',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
};

describe('WorkspaceCard', () => {
  it('should render workspace information', () => {
    render(<WorkspaceCard workspace={mockWorkspace} />);

    expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should show status badge', () => {
    render(<WorkspaceCard workspace={mockWorkspace} />);
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('should call onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(<WorkspaceCard workspace={mockWorkspace} onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(mockWorkspace.id);
  });

  it('should call onStart when start button clicked', () => {
    const onStart = vi.fn();
    const stoppedWorkspace = { ...mockWorkspace, status: 'STOPPED' };

    render(<WorkspaceCard workspace={stoppedWorkspace} onStart={onStart} />);

    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);

    expect(onStart).toHaveBeenCalledWith(stoppedWorkspace.id);
  });
});
```

---

## 步骤 1.6: 更新 package.json 测试脚本

后端 `packages/backend/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

前端 `packages/frontend/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

---

## Day 1-5 验证检查

```bash
# 1. 运行后端测试
cd packages/backend
pnpm test

# 2. 查看测试覆盖率
pnpm test:coverage
# 目标: > 70% 覆盖率

# 3. 运行前端测试
cd packages/frontend
pnpm test

# 4. 运行集成测试
cd packages/backend
pnpm test tests/api

# 5. 生成覆盖率报告
pnpm test:coverage
# 打开 coverage/index.html 查看详细报告
```

### 预期结果
- ✅ 所有测试通过
- ✅ 代码覆盖率 > 70%
- ✅ 集成测试覆盖主要 API
- ✅ 组件测试覆盖核心 UI

---

# Day 6-10: 性能优化

## 目标
- 前端 bundle 优化
- 数据库查询优化
- Redis 缓存实现
- 图片和资源优化
- React 性能优化

---

## 步骤 6.1: 前端 Bundle 分析和优化

安装分析工具:

```bash
cd packages/frontend
pnpm add -D rollup-plugin-visualizer
pnpm add -D vite-plugin-compression
```

更新 `packages/frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    // Gzip 压缩
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // Brotli 压缩
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    // Bundle 分析（仅在分析时启用）
    process.env.ANALYZE &&
      visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
  ],
  build: {
    // 启用代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 第三方库分离
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'editor-vendor': ['monaco-editor'],
          'terminal-vendor': ['xterm', 'xterm-addon-fit'],
          'chart-vendor': ['recharts'],
        },
      },
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 压缩选项
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // 设置 chunk 大小警告限制
    chunkSizeWarningLimit: 1000,
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@tanstack/react-query',
    ],
  },
});
```

---

## 步骤 6.2: React 组件性能优化

创建 `packages/frontend/src/lib/performance.ts`:

```typescript
import { useEffect, useRef } from 'react';

/**
 * 性能监控 Hook
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current++;
    const renderTime = performance.now() - startTime.current;

    if (renderTime > 16) {
      // > 16ms 可能导致掉帧
      console.warn(
        `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (render #${renderCount.current})`
      );
    }

    startTime.current = performance.now();
  });
}

/**
 * 防抖 Hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 节流 Hook
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();

    if (now - lastUpdated.current >= interval) {
      setThrottledValue(value);
      lastUpdated.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastUpdated.current = Date.now();
      }, interval - (now - lastUpdated.current));

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}
```

优化 File Explorer 组件:

```typescript
import React, { useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// 使用 React.memo 优化
export const FileTreeNode = React.memo(
  ({ node, onSelect }: FileTreeNodeProps) => {
    // ... 组件逻辑
  },
  (prevProps, nextProps) => {
    // 自定义比较函数
    return (
      prevProps.node.path === nextProps.node.path &&
      prevProps.node.isExpanded === nextProps.node.isExpanded
    );
  }
);

export default function FileExplorer({ workspaceId }: FileExplorerProps) {
  const { data: files } = useQuery(['files', workspaceId]);

  // 使用 useMemo 缓存计算结果
  const sortedFiles = useMemo(() => {
    if (!files) return [];
    return [...files].sort((a, b) => {
      // 文件夹优先
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [files]);

  // 使用 useCallback 缓存函数
  const handleFileSelect = useCallback((file: FileNode) => {
    // 处理文件选择
  }, []);

  // 虚拟滚动优化大列表
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: sortedFiles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // 每行高度
    overscan: 5, // 预渲染行数
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const file = sortedFiles[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <FileTreeNode node={file} onSelect={handleFileSelect} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 步骤 6.3: 数据库查询优化

添加数据库索引 `packages/backend/prisma/schema.prisma`:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@index([createdAt])
}

model Workspace {
  id          String   @id @default(uuid())
  name        String
  userId      String
  status      String
  containerId String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user  User   @relation(fields: [userId], references: [id])
  files File[]

  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@index([userId, status])
}

model File {
  id          String   @id @default(uuid())
  workspaceId String
  path        String
  content     String   @db.Text
  mimeType    String
  size        Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, path])
  @@index([workspaceId])
  @@index([workspaceId, path])
}
```

优化查询示例:

```typescript
// ❌ 差的查询
async getAllWorkspaces() {
  return await prisma.workspace.findMany({
    include: {
      user: true,
      files: true, // 加载所有文件！
    },
  });
}

// ✅ 好的查询
async getAllWorkspaces(userId: string, page = 1, limit = 20) {
  return await prisma.workspace.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      // 只选择需要的字段
      _count: {
        select: { files: true }, // 只获取文件数量
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });
}
```

---

## 步骤 6.4: Redis 缓存实现

创建 `packages/backend/src/services/cache.service.ts`:

```typescript
import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected');
    });

    this.redis.on('error', (err) => {
      logger.error('Redis error:', err);
    });
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);

      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * 批量删除缓存（通过模式匹配）
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  /**
   * 检查 key 是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redis.expire(key, seconds);
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}
```

使用缓存优化 WorkspaceService:

```typescript
export class WorkspaceService {
  constructor(
    private prisma: PrismaClient,
    private containerService: ContainerService,
    private cacheService: CacheService
  ) {}

  /**
   * 获取工作区（带缓存）
   */
  async getWorkspace(id: string): Promise<Workspace> {
    const cacheKey = `workspace:${id}`;

    // 尝试从缓存获取
    const cached = await this.cacheService.get<Workspace>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for workspace ${id}`);
      return cached;
    }

    // 从数据库获取
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        _count: {
          select: { files: true },
        },
      },
    });

    if (!workspace) {
      throw new AppError('Workspace not found', 404);
    }

    // 缓存结果（5 分钟）
    await this.cacheService.set(cacheKey, workspace, 300);

    return workspace;
  }

  /**
   * 更新工作区（清除缓存）
   */
  async updateWorkspace(id: string, data: UpdateWorkspaceDto): Promise<Workspace> {
    const workspace = await this.prisma.workspace.update({
      where: { id },
      data,
    });

    // 清除缓存
    await this.cacheService.del(`workspace:${id}`);

    return workspace;
  }
}
```

---

## Day 6-10 验证检查

```bash
# 1. 分析前端 bundle
cd packages/frontend
ANALYZE=true pnpm build
# 打开 dist/stats.html 查看 bundle 分析

# 2. 运行数据库迁移（添加索引）
cd packages/backend
pnpm prisma migrate dev --name add_indexes

# 3. 测试 Redis 缓存
# 启动 Redis
docker-compose up -d redis

# 发送请求并检查缓存命中
curl http://localhost:8000/api/workspaces/123
# 第二次请求应该更快（缓存命中）

# 4. 使用 Lighthouse 测试性能
# 打开 Chrome DevTools -> Lighthouse
# 运行性能测试，目标分数 > 90
```

### 预期结果
- ✅ Bundle 大小优化 > 30%
- ✅ 首屏加载时间 < 2s
- ✅ 数据库查询优化 > 50%
- ✅ 缓存命中率 > 80%
- ✅ Lighthouse 性能分数 > 90

---

# Day 11-15: 安全审计和负载测试

## 目标
- OWASP Top 10 安全检查
- 依赖安全扫描
- API 速率限制
- 负载测试
- 监控告警设置

---

## 步骤 11.1: 安全加固

安装安全相关依赖:

```bash
cd packages/backend
pnpm add helmet@^7.1.0
pnpm add express-rate-limit@^7.1.5
pnpm add express-mongo-sanitize@^2.2.0
pnpm add hpp@^0.2.3
pnpm add xss-clean@^0.1.4
```

更新 `packages/backend/src/app.ts`:

```typescript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import xss from 'xss-clean';

const app = express();

// ========== 安全中间件 ==========

// Helmet - 设置安全 HTTP 头
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 限制每个 IP 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// 更严格的速率限制用于认证路由
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 每 15 分钟最多 5 次登录尝试
  skipSuccessfulRequests: true,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// NoSQL 注入防护
app.use(mongoSanitize());

// XSS 防护
app.use(xss());

// HTTP 参数污染防护
app.use(hpp());

// CORS 配置
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ... 其他中间件
```

---

## 步骤 11.2: 输入验证和消毒

创建 `packages/backend/src/middleware/validation.ts`:

```typescript
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

/**
 * Zod schema 验证中间件
 */
export function validateRequest(schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }

      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }

      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}

// 验证 schemas
export const schemas = {
  // 用户注册
  register: {
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain uppercase, lowercase, and number'
        ),
      name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    }),
  },

  // 创建工作区
  createWorkspace: {
    body: z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
    }),
  },

  // 文件上传
  uploadFile: {
    body: z.object({
      path: z.string().regex(/^[a-zA-Z0-9_\-\/\.]+$/, 'Invalid file path'),
      content: z.string(),
    }),
    params: z.object({
      workspaceId: z.string().uuid('Invalid workspace ID'),
    }),
  },
};
```

使用验证中间件:

```typescript
import { validateRequest, schemas } from '../middleware/validation';

router.post(
  '/register',
  validateRequest(schemas.register),
  async (req, res, next) => {
    // req.body 已经过验证和类型转换
    const { email, password, name } = req.body;
    // ...
  }
);

router.post(
  '/workspaces',
  authenticate,
  validateRequest(schemas.createWorkspace),
  async (req, res, next) => {
    // ...
  }
);
```

---

## 步骤 11.3: 依赖安全扫描

添加安全扫描脚本到 `package.json`:

```json
{
  "scripts": {
    "security:audit": "pnpm audit --audit-level=moderate",
    "security:snyk": "pnpm dlx snyk test",
    "security:check": "pnpm run security:audit && pnpm run security:snyk"
  }
}
```

创建 `.github/workflows/security.yml`:

```yaml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # 每天运行一次
    - cron: '0 0 * * *'

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run npm audit
        run: pnpm audit --audit-level=moderate

      - name: Run Snyk test
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Run OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'gemini-cli'
          path: '.'
          format: 'HTML'

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: reports/
```

---

## 步骤 11.4: 负载测试

安装 k6:

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

创建 `tests/load/auth-load.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // 逐步增加到 50 用户
    { duration: '3m', target: 50 },   // 保持 50 用户 3 分钟
    { duration: '1m', target: 100 },  // 增加到 100 用户
    { duration: '3m', target: 100 },  // 保持 100 用户 3 分钟
    { duration: '1m', target: 0 },    // 逐步减少到 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% 的请求应在 500ms 内完成
    http_req_failed: ['rate<0.1'],    // 错误率应 < 10%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'http://localhost:8000';

export default function () {
  // 注册
  const registerPayload = JSON.stringify({
    email: `user${Date.now()}${__VU}@example.com`,
    password: 'Password123!',
    name: `User ${__VU}`,
  });

  let res = http.post(`${BASE_URL}/api/auth/register`, registerPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'register status is 201': (r) => r.status === 201,
    'register has token': (r) => r.json('data.accessToken') !== undefined,
  }) || errorRate.add(1);

  const token = res.json('data.accessToken');

  sleep(1);

  // 登录
  const loginPayload = JSON.stringify({
    email: registerPayload.email,
    password: 'Password123!',
  });

  res = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'login status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // 获取工作区列表
  res = http.get(`${BASE_URL}/api/workspaces`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(res, {
    'get workspaces status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);
}
```

创建 `tests/load/workspace-load.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:8000';
let token;

export function setup() {
  // 创建测试用户并获取 token
  const res = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      email: `loadtest${Date.now()}@example.com`,
      password: 'Password123!',
      name: 'Load Test User',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  return { token: res.json('data.accessToken') };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // 创建工作区
  let res = http.post(
    `${BASE_URL}/api/workspaces`,
    JSON.stringify({
      name: `Workspace ${Date.now()}_${__VU}`,
      description: 'Load test workspace',
    }),
    { headers }
  );

  check(res, {
    'create workspace status is 201': (r) => r.status === 201,
  }) || errorRate.add(1);

  const workspaceId = res.json('data.id');

  sleep(1);

  // 获取工作区
  res = http.get(`${BASE_URL}/api/workspaces/${workspaceId}`, { headers });

  check(res, {
    'get workspace status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // 更新工作区
  res = http.put(
    `${BASE_URL}/api/workspaces/${workspaceId}`,
    JSON.stringify({
      name: `Updated Workspace ${Date.now()}`,
    }),
    { headers }
  );

  check(res, {
    'update workspace status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);

  // 删除工作区
  res = http.del(`${BASE_URL}/api/workspaces/${workspaceId}`, { headers });

  check(res, {
    'delete workspace status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}
```

运行负载测试:

```bash
# 运行认证负载测试
k6 run tests/load/auth-load.js

# 运行工作区负载测试
k6 run tests/load/workspace-load.js

# 生成 HTML 报告
k6 run --out json=test-results.json tests/load/auth-load.js
```

---

## Day 11-15 验证检查

```bash
# 1. 运行安全审计
pnpm run security:check

# 2. 检查依赖漏洞
pnpm audit --audit-level=moderate

# 3. 运行负载测试
k6 run tests/load/auth-load.js

# 4. 测试速率限制
# 快速发送多个请求
for i in {1..20}; do
  curl http://localhost:8000/api/auth/login -X POST &
done
# 应该看到 429 Too Many Requests

# 5. 检查安全响应头
curl -I http://localhost:8000/api/health
# 应该看到 X-Content-Type-Options, X-Frame-Options 等安全头
```

### 预期结果
- ✅ 无高危依赖漏洞
- ✅ 速率限制正常工作
- ✅ 95% 请求响应时间 < 500ms
- ✅ 错误率 < 1%
- ✅ 安全头正确设置

---

# 总结

## Phase 7 完成清单

### 测试
- ✅ 单元测试覆盖率 > 70%
- ✅ 集成测试覆盖主要 API
- ✅ 前端组件测试
- ✅ E2E 测试（可选）

### 性能优化
- ✅ 前端 bundle 优化
- ✅ 代码分割和懒加载
- ✅ 数据库索引优化
- ✅ Redis 缓存实现
- ✅ React 性能优化
- ✅ 虚拟滚动

### 安全加固
- ✅ Helmet 安全头
- ✅ 速率限制
- ✅ 输入验证
- ✅ XSS/CSRF 防护
- ✅ 依赖安全扫描

### 负载测试
- ✅ k6 负载测试
- ✅ 性能基准测试
- ✅ 并发测试
- ✅ 压力测试

## 性能指标

- **前端**:
  - 首屏加载: < 2s
  - Lighthouse 分数: > 90
  - Bundle 大小: < 500KB (gzipped)

- **后端**:
  - API 响应时间 (p95): < 500ms
  - 数据库查询: < 100ms
  - 缓存命中率: > 80%

- **负载**:
  - 支持并发用户: 200+
  - 错误率: < 1%
  - 吞吐量: 1000+ req/s

## 下一步

Phase 8 将实现:
- Docker 容器化
- CI/CD 配置
- 监控和日志
- 生产部署

---

**Phase 7 完成！** 🎉