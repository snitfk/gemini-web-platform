# Phase 8 详细计划: 部署和上线

## 📋 概览

**阶段目标**: 生产环境部署、CI/CD、监控告警、正式上线
**持续时间**: 8 天
**关键产出**: Docker 镜像 + CI/CD Pipeline + 监控系统 + 生产环境

---

## 🗓️ 时间规划

| 任务模块 | 天数 | 负责人 | 依赖 |
|---------|------|--------|------|
| 8.1 Docker 容器化和编排 | 3 天 | DevOps + 后端 #1 | 阶段 7 完成 |
| 8.2 CI/CD Pipeline 配置 | 2 天 | DevOps | 8.1 Day 2 完成 |
| 8.3 监控和日志系统 | 2 天 | DevOps + 后端 #1 | 8.1 完成 |
| 8.4 生产上线和验证 | 1 天 | 全员 | 8.1, 8.2, 8.3 完成 |

**注意**: 8.2 和 8.1 后半部分可以并行，8.3 和 8.2 可以部分并行

---

## 概览

Phase 8 是项目的最后阶段，将应用部署到生产环境并上线:

### 核心任务
- ✅ Docker 容器化
- ✅ Docker Compose 编排
- ✅ CI/CD Pipeline 配置
- ✅ 监控和日志系统
- ✅ 备份和恢复策略
- ✅ 生产环境配置
- ✅ 上线检查和验证

### 技术栈
- **容器**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **监控**: Prometheus, Grafana
- **日志**: Winston, Loki
- **反向代理**: Nginx
- **SSL**: Let's Encrypt

---

## 阶段架构图

```
┌────────────────────────────────────────────────────────────────┐
│                      Production Architecture                    │
│                                                                  │
│                          Internet                                │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │  Nginx (HTTPS)  │                          │
│                    │  Reverse Proxy  │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│           ┌─────────────────┴─────────────────┐                │
│           │                                     │                │
│    ┌──────▼──────┐                    ┌───────▼───────┐        │
│    │   Frontend  │                    │    Backend    │        │
│    │  (React)    │                    │  (Express)    │        │
│    │  Container  │                    │   Container   │        │
│    └─────────────┘                    └───────┬───────┘        │
│                                                │                 │
│                                    ┌───────────┴───────────┐    │
│                                    │                       │    │
│                            ┌───────▼───────┐    ┌────────▼────┐│
│                            │   PostgreSQL  │    │    Redis    ││
│                            │   Container   │    │  Container  ││
│                            └───────────────┘    └─────────────┘│
│                                                                  │
│    ┌──────────────────────────────────────────────────────┐   │
│    │              Monitoring & Logging                     │   │
│    │  ┌────────────┐  ┌────────────┐  ┌─────────────┐    │   │
│    │  │ Prometheus │  │  Grafana   │  │    Loki     │    │   │
│    │  └────────────┘  └────────────┘  └─────────────┘    │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

---

# Day 1-3: Docker 容器化和编排

## 目标
- 创建生产级 Dockerfile
- 配置 Docker Compose
- 优化镜像大小
- 设置健康检查
- 配置持久化存储

---

## 步骤 1.1: 后端 Dockerfile

创建 `packages/backend/Dockerfile`:

```dockerfile
# ========== Build Stage ==========
FROM node:20-alpine AS builder

# 安装 pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/

# 安装依赖（利用 Docker 缓存）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY packages/backend ./packages/backend
COPY prisma ./prisma

# 生成 Prisma Client
RUN cd packages/backend && pnpm prisma generate

# 构建应用
RUN cd packages/backend && pnpm build

# ========== Production Stage ==========
FROM node:20-alpine AS production

# 安装生产依赖
RUN npm install -g pnpm@8

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# 复制依赖文件
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml ./
COPY --chown=nodejs:nodejs pnpm-workspace.yaml ./
COPY --chown=nodejs:nodejs packages/backend/package.json ./packages/backend/

# 安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 复制构建产物
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "packages/backend/dist/index.js"]
```

创建 `packages/backend/.dockerignore`:

```
node_modules
dist
coverage
*.log
.env
.env.local
.DS_Store
*.test.ts
*.spec.ts
tests
```

---

## 步骤 1.2: 前端 Dockerfile

创建 `packages/frontend/Dockerfile`:

```dockerfile
# ========== Build Stage ==========
FROM node:20-alpine AS builder

RUN npm install -g pnpm@8

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY packages/frontend/package.json ./packages/frontend/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY packages/frontend ./packages/frontend

# 设置环境变量
ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL

# 构建应用
RUN cd packages/frontend && pnpm build

# ========== Production Stage ==========
FROM nginx:alpine AS production

# 复制 Nginx 配置
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
```

创建 `packages/frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # SPA 路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket 代理
    location /socket.io {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 步骤 1.3: Docker Compose 生产配置

创建 `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # ========== Frontend ==========
  frontend:
    build:
      context: .
      dockerfile: packages/frontend/Dockerfile
      args:
        VITE_API_BASE_URL: ${API_BASE_URL}
        VITE_WS_BASE_URL: ${WS_BASE_URL}
    container_name: gemini-cli-frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - app-network
    restart: unless-stopped
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:80/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # ========== Backend ==========
  backend:
    build:
      context: .
      dockerfile: packages/backend/Dockerfile
    container_name: gemini-cli-backend
    environment:
      NODE_ENV: production
      PORT: 8000
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
    ports:
      - "8000:8000"
    networks:
      - app-network
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_started
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ========== PostgreSQL ==========
  postgres:
    image: postgres:15-alpine
    container_name: gemini-cli-postgres
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups/postgres:/backups
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ========== Redis ==========
  redis:
    image: redis:7-alpine
    container_name: gemini-cli-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ========== MinIO ==========
  minio:
    image: minio/minio:latest
    container_name: gemini-cli-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ========== Prometheus (监控) ==========
  prometheus:
    image: prom/prometheus:latest
    container_name: gemini-cli-prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    ports:
      - "9090:9090"
    networks:
      - app-network
    restart: unless-stopped

  # ========== Grafana (可视化) ==========
  grafana:
    image: grafana/grafana:latest
    container_name: gemini-cli-grafana
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN_USER}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD}
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "3001:3000"
    networks:
      - app-network
    restart: unless-stopped
    depends_on:
      - prometheus

networks:
  app-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
```

创建 `.env.production`:

```bash
# Database
DB_NAME=gemini_cli
DB_USER=postgres
DB_PASSWORD=<SECURE_PASSWORD>

# Redis
REDIS_PASSWORD=<SECURE_PASSWORD>

# JWT
JWT_SECRET=<SECURE_RANDOM_STRING>
JWT_REFRESH_SECRET=<SECURE_RANDOM_STRING>

# MinIO
MINIO_ACCESS_KEY=<ACCESS_KEY>
MINIO_SECRET_KEY=<SECRET_KEY>

# URLs
FRONTEND_URL=https://yourdomain.com
API_BASE_URL=https://yourdomain.com/api
WS_BASE_URL=wss://yourdomain.com

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<SECURE_PASSWORD>
```

---

## 步骤 1.4: Prometheus 配置

创建 `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'gemini-cli-monitor'

scrape_configs:
  # Backend 指标
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'

  # Postgres Exporter
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis Exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Node Exporter (系统指标)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

---

## Day 1-3 验证检查

```bash
# 1. 构建 Docker 镜像
docker-compose -f docker-compose.prod.yml build

# 2. 启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 3. 检查容器状态
docker-compose -f docker-compose.prod.yml ps

# 4. 查看日志
docker-compose -f docker-compose.prod.yml logs -f backend

# 5. 健康检查
curl http://localhost:8000/api/health

# 6. 检查 Prometheus
curl http://localhost:9090/metrics

# 7. 访问 Grafana
# 打开 http://localhost:3001
```

### 预期结果
- ✅ 所有容器正常运行
- ✅ 健康检查通过
- ✅ 数据持久化正常
- ✅ 日志正确输出
- ✅ Prometheus 采集数据

---

# Day 4-5: CI/CD 配置

## 目标
- 配置 GitHub Actions
- 自动化测试
- 自动化构建和部署
- 环境管理

---

## 步骤 4.1: GitHub Actions 工作流

创建 `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # ========== 代码检查 ==========
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run ESLint
        run: pnpm lint

      - name: Run TypeScript type check
        run: pnpm type-check

  # ========== 测试 ==========
  test:
    name: Test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run backend tests
        run: cd packages/backend && pnpm test:coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - name: Run frontend tests
        run: cd packages/frontend && pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./packages/backend/coverage/lcov.info,./packages/frontend/coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

  # ========== 构建 ==========
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build backend
        run: cd packages/backend && pnpm build

      - name: Build frontend
        run: cd packages/frontend && pnpm build
        env:
          VITE_API_BASE_URL: /api
          VITE_WS_BASE_URL: /

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            packages/backend/dist
            packages/frontend/dist

  # ========== Docker 构建 ==========
  docker:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push backend image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./packages/backend/Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/gemini-cli-backend:latest
            ${{ secrets.DOCKER_USERNAME }}/gemini-cli-backend:${{ github.sha }}
          cache-from: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/gemini-cli-backend:buildcache
          cache-to: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/gemini-cli-backend:buildcache,mode=max

      - name: Build and push frontend image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./packages/frontend/Dockerfile
          push: true
          build-args: |
            VITE_API_BASE_URL=${{ secrets.API_BASE_URL }}
            VITE_WS_BASE_URL=${{ secrets.WS_BASE_URL }}
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/gemini-cli-frontend:latest
            ${{ secrets.DOCKER_USERNAME }}/gemini-cli-frontend:${{ github.sha }}
          cache-from: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/gemini-cli-frontend:buildcache
          cache-to: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/gemini-cli-frontend:buildcache,mode=max
```

---

## 步骤 4.2: 部署工作流

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags:
      - 'v*'

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /app/gemini-cli

            # 拉取最新代码
            git pull origin main

            # 拉取最新镜像
            docker-compose -f docker-compose.prod.yml pull

            # 停止旧容器
            docker-compose -f docker-compose.prod.yml down

            # 备份数据库
            docker exec gemini-cli-postgres pg_dump -U postgres gemini_cli > /backups/db_$(date +%Y%m%d_%H%M%S).sql

            # 启动新容器
            docker-compose -f docker-compose.prod.yml up -d

            # 运行数据库迁移
            docker exec gemini-cli-backend pnpm prisma migrate deploy

            # 健康检查
            sleep 10
            curl -f http://localhost:8000/api/health || exit 1

            # 清理旧镜像
            docker image prune -f

      - name: Notify deployment
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment to production successful! 🚀'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

      - name: Notify failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment to production failed! ❌'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Day 4-5 验证检查

```bash
# 1. 测试 GitHub Actions
# 推送代码到 GitHub，观察 Actions 运行

# 2. 检查测试运行
# 查看 GitHub Actions 日志

# 3. 验证 Docker 镜像
docker pull <your-username>/gemini-cli-backend:latest
docker pull <your-username>/gemini-cli-frontend:latest

# 4. 测试部署脚本
# 在服务器上手动运行部署步骤
```

### 预期结果
- ✅ CI 流水线成功运行
- ✅ 测试全部通过
- ✅ Docker 镜像构建成功
- ✅ 部署到生产环境成功

---

# Day 6-7: 监控和日志

## 目标
- 配置 Prometheus 指标
- 创建 Grafana 仪表板
- 设置日志聚合
- 配置告警规则

---

## 步骤 6.1: 后端指标暴露

安装依赖:

```bash
cd packages/backend
pnpm add prom-client@^15.0.0
```

创建 `packages/backend/src/middleware/metrics.ts`:

```typescript
import promClient from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// 创建 Registry
export const register = new promClient.Registry();

// 默认指标（CPU、内存等）
promClient.collectDefaultMetrics({ register });

// HTTP 请求计数器
export const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP 请求持续时间直方图
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// 活跃连接数
export const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// 数据库查询持续时间
export const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'model'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// WebSocket 连接数
export const wsConnections = new promClient.Gauge({
  name: 'websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

/**
 * Prometheus 指标中间件
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // 增加活跃连接数
  activeConnections.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    // 记录请求
    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    // 记录持续时间
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
      },
      duration
    );

    // 减少活跃连接数
    activeConnections.dec();
  });

  next();
}
```

添加指标端点 `packages/backend/src/api/metrics.routes.ts`:

```typescript
import { Router } from 'express';
import { register } from '../middleware/metrics';

const router = Router();

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
```

---

## 步骤 6.2: Grafana 仪表板

创建 `monitoring/grafana/dashboards/overview.json`:

```json
{
  "dashboard": {
    "title": "Gemini CLI Overview",
    "panels": [
      {
        "title": "HTTP Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "HTTP Request Duration (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Active Connections",
        "targets": [
          {
            "expr": "active_connections"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Database Query Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "WebSocket Connections",
        "targets": [
          {
            "expr": "websocket_connections"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

---

## 步骤 6.3: 日志配置

更新 `packages/backend/src/utils/logger.ts`:

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// 自定义日志格式
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  if (stack) {
    msg += `\n${stack}`;
  }

  return msg;
});

// 创建 logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  defaultMeta: { service: 'gemini-cli-backend' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),

    // 错误日志文件
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),

    // 综合日志文件
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),

    // 生产环境：发送到 Loki
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.Http({
            host: process.env.LOKI_HOST || 'loki',
            port: parseInt(process.env.LOKI_PORT || '3100'),
            path: '/loki/api/v1/push',
          }),
        ]
      : []),
  ],
});

// 在非生产环境记录未捕获的异常
if (process.env.NODE_ENV !== 'production') {
  logger.exceptions.handle(
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  );
}
```

---

## 步骤 6.4: 告警规则

创建 `monitoring/prometheus/alerts.yml`:

```yaml
groups:
  - name: gemini-cli-alerts
    interval: 30s
    rules:
      # 高错误率告警
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/second"

      # 高响应时间告警
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      # 数据库查询慢告警
      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "95th percentile query time is {{ $value }}s"

      # 服务宕机告警
      - alert: ServiceDown
        expr: up{job="backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"

      # 高内存使用率告警
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"
```

---

## Day 6-7 验证检查

```bash
# 1. 检查 Prometheus 指标
curl http://localhost:8000/metrics

# 2. 访问 Grafana 仪表板
# 打开 http://localhost:3001
# 登录并查看仪表板

# 3. 检查日志文件
tail -f packages/backend/logs/combined-*.log

# 4. 测试告警
# 发送大量错误请求触发告警
for i in {1..100}; do
  curl http://localhost:8000/api/nonexistent &
done

# 5. 查看 Prometheus 告警
# 打开 http://localhost:9090/alerts
```

### 预期结果
- ✅ Prometheus 正常采集指标
- ✅ Grafana 仪表板显示数据
- ✅ 日志正确写入文件
- ✅ 告警规则正常触发

---

# Day 8: 上线和验证

## 目标
- SSL 证书配置
- 域名配置
- 最终上线检查
- 生产环境验证

---

## 步骤 8.1: SSL 证书配置（Let's Encrypt）

安装 Certbot:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

更新 Nginx 配置支持 HTTPS:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ... 其余配置
}
```

---

## 步骤 8.2: 上线检查清单

创建 `docs/LAUNCH_CHECKLIST.md`:

```markdown
# 生产上线检查清单

## 环境配置
- [ ] 所有环境变量已配置（.env.production）
- [ ] 数据库连接已测试
- [ ] Redis 连接已测试
- [ ] MinIO/S3 连接已测试
- [ ] JWT 密钥已更新为随机值
- [ ] 所有密码已更新为强密码

## 安全
- [ ] SSL 证书已配置
- [ ] HTTPS 强制重定向已启用
- [ ] 安全响应头已设置
- [ ] 速率限制已启用
- [ ] CORS 配置正确
- [ ] 输入验证已启用
- [ ] 依赖安全扫描通过

## 性能
- [ ] 数据库索引已创建
- [ ] Redis 缓存已启用
- [ ] Gzip 压缩已启用
- [ ] 静态资源 CDN 已配置（可选）
- [ ] 图片优化已完成
- [ ] Bundle 大小优化完成

## 监控和日志
- [ ] Prometheus 已配置
- [ ] Grafana 仪表板已创建
- [ ] 告警规则已设置
- [ ] 日志文件轮转已配置
- [ ] 错误追踪已启用（如 Sentry）

## 备份
- [ ] 数据库自动备份已配置
- [ ] 备份恢复流程已测试
- [ ] 备份保留策略已定义

## 测试
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 负载测试通过
- [ ] 安全扫描通过
- [ ] 浏览器兼容性测试通过

## 文档
- [ ] API 文档已更新
- [ ] 用户文档已更新
- [ ] 运维文档已更新
- [ ] 故障排除指南已创建

## 部署
- [ ] CI/CD 流水线已配置
- [ ] 回滚计划已准备
- [ ] 数据库迁移脚本已准备
- [ ] 健康检查端点已测试
- [ ] Docker 镜像已构建并推送

## 上线后
- [ ] 健康检查通过
- [ ] 监控指标正常
- [ ] 日志无错误
- [ ] 用户访问正常
- [ ] 性能指标达标
- [ ] 告警未触发
```

---

## 步骤 8.3: 上线脚本

创建 `scripts/deploy-production.sh`:

```bash
#!/bin/bash

set -e

echo "🚀 Starting production deployment..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查环境变量
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    exit 1
fi

# 加载环境变量
source .env.production

# 1. 备份数据库
echo -e "${YELLOW}📦 Backing up database...${NC}"
docker exec gemini-cli-postgres pg_dump -U $DB_USER $DB_NAME > backups/db_$(date +%Y%m%d_%H%M%S).sql
echo -e "${GREEN}✓ Database backup completed${NC}"

# 2. 拉取最新代码
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"

# 3. 构建 Docker 镜像
echo -e "${YELLOW}🔨 Building Docker images...${NC}"
docker-compose -f docker-compose.prod.yml build
echo -e "${GREEN}✓ Images built${NC}"

# 4. 停止旧容器
echo -e "${YELLOW}🛑 Stopping old containers...${NC}"
docker-compose -f docker-compose.prod.yml down
echo -e "${GREEN}✓ Old containers stopped${NC}"

# 5. 启动新容器
echo -e "${YELLOW}▶️  Starting new containers...${NC}"
docker-compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ New containers started${NC}"

# 6. 等待服务启动
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 15

# 7. 运行数据库迁移
echo -e "${YELLOW}🔄 Running database migrations...${NC}"
docker exec gemini-cli-backend pnpm prisma migrate deploy
echo -e "${GREEN}✓ Migrations completed${NC}"

# 8. 健康检查
echo -e "${YELLOW}🏥 Performing health checks...${NC}"
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
else
    echo -e "${RED}❌ Backend health check failed!${NC}"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# 9. 清理
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
docker image prune -f
echo -e "${GREEN}✓ Cleanup completed${NC}"

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"

# 显示运行状态
echo -e "\n${YELLOW}📊 Container Status:${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "\n${YELLOW}📈 Quick Stats:${NC}"
echo "Backend: http://localhost:8000"
echo "Grafana: http://localhost:3001"
echo "Prometheus: http://localhost:9090"
```

---

## Day 8 最终验证

```bash
# 1. 运行上线脚本
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh

# 2. 健康检查
curl https://yourdomain.com/api/health

# 3. SSL 检查
curl -I https://yourdomain.com

# 4. 性能测试
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://yourdomain.com

# 5. 负载测试（最后一次）
k6 run --vus 100 --duration 5m tests/load/production-load.js

# 6. 监控检查
# 打开 Grafana，检查所有指标正常

# 7. 日志检查
docker-compose -f docker-compose.prod.yml logs --tail=100

# 8. 数据库连接检查
docker exec gemini-cli-postgres psql -U postgres -c "SELECT version();"

# 9. Redis 检查
docker exec gemini-cli-redis redis-cli ping

# 10. 用户访问测试
# 在浏览器中访问应用，完成一次完整的用户流程
```

---

## 步骤 8.4: 监控仪表板截图

在上线后，记录以下关键指标：

1. **响应时间**: p50, p95, p99
2. **吞吐量**: requests/second
3. **错误率**: %
4. **CPU 使用率**: %
5. **内存使用率**: %
6. **数据库连接数**: 个
7. **WebSocket 连接数**: 个

---

# 总结

## Phase 8 完成清单

### Docker & 容器编排
- ✅ 生产级 Dockerfile
- ✅ Docker Compose 配置
- ✅ 健康检查配置
- ✅ 日志配置
- ✅ 数据持久化

### CI/CD
- ✅ GitHub Actions 工作流
- ✅ 自动化测试
- ✅ 自动化构建
- ✅ 自动化部署
- ✅ 通知集成

### 监控 & 日志
- ✅ Prometheus 指标
- ✅ Grafana 仪表板
- ✅ 日志聚合
- ✅ 告警规则
- ✅ 性能监控

### 安全 & 部署
- ✅ SSL/TLS 配置
- ✅ 安全响应头
- ✅ 速率限制
- ✅ 备份策略
- ✅ 回滚计划

## 🎉 项目完成！

恭喜！你已经完成了 Gemini CLI 的完整 BS 化改造，从第 0 天的环境准备到第 70 天的生产上线。

### 项目成果

**代码统计**:
- 总代码行数: ~15,000+ 行
- 测试覆盖率: 70%+
- 组件数量: 50+
- API 端点: 30+

**性能指标**:
- 首屏加载: < 2s
- API 响应时间 (p95): < 500ms
- 支持并发用户: 200+
- Lighthouse 分数: 90+

**功能完整性**:
- ✅ 用户认证和授权
- ✅ 工作区管理
- ✅ 文件系统操作
- ✅ 代码编辑器（Monaco）
- ✅ 终端集成
- ✅ 实时协作
- ✅ WebSocket 通信
- ✅ 容器管理
- ✅ Hook 系统

### 下一步建议

1. **持续优化**:
   - 监控生产环境性能
   - 根据用户反馈改进 UX
   - 定期更新依赖

2. **功能扩展**:
   - 移动端适配
   - 插件市场
   - AI 功能增强

3. **团队协作**:
   - 完善开发文档
   - 建立代码审查流程
   - 定期技术分享

---

**祝贺你完成了这个项目！** 🚀✨

如需更多帮助，请参考各阶段的详细文档。