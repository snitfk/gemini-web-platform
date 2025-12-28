#!/bin/bash

set -e

echo "🚀 设置 Gemini Web Platform 开发环境"
echo "======================================"
echo ""

# 检查必要工具
echo "✓ 检查必要工具..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js 未安装"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm 未安装"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker 未安装"; exit 1; }
echo "  ✅ 所有必要工具已安装"
echo ""

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 版本过低，需要 >= 20.0.0"
  exit 1
fi
echo "  ✅ Node.js 版本: $(node -v)"
echo ""

# 创建 .env 文件
if [ ! -f .env ]; then
  echo "✓ 创建 .env 文件..."
  cp .env.example .env
  echo "  ✅ .env 文件已创建"
  echo "  ⚠️  请编辑 .env 文件，填入必要的配置（特别是 GEMINI_API_KEY）"
  echo ""
fi

# 安装依赖
echo "✓ 安装依赖..."
pnpm install
echo "  ✅ 依赖安装完成"
echo ""

# 启动 Docker 服务
echo "✓ 启动 Docker 服务..."
cd infrastructure/docker
docker-compose up -d
echo "  ✅ Docker 服务已启动"
echo ""

# 等待服务就绪
echo "✓ 等待服务就绪..."
sleep 5

# 检查服务健康状态
echo "  检查 PostgreSQL..."
docker exec gemini-web-postgres pg_isready -U postgres >/dev/null 2>&1 && echo "    ✅ PostgreSQL 就绪" || echo "    ❌ PostgreSQL 未就绪"

echo "  检查 Redis..."
docker exec gemini-web-redis redis-cli ping >/dev/null 2>&1 && echo "    ✅ Redis 就绪" || echo "    ❌ Redis 未就绪"

echo "  检查 MinIO..."
curl -sf http://localhost:9000/minio/health/live >/dev/null 2>&1 && echo "    ✅ MinIO 就绪" || echo "    ❌ MinIO 未就绪"
echo ""

# 运行数据库迁移（如果 Prisma 已配置）
if [ -f packages/backend/prisma/schema.prisma ]; then
  echo "✓ 运行数据库迁移..."
  cd ../../packages/backend
  pnpm prisma migrate dev --name init
  echo "  ✅ 数据库迁移完成"
  echo ""
fi

# 完成
echo "======================================"
echo "🎉 开发环境设置完成！"
echo ""
echo "服务访问地址:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - MinIO API: http://localhost:9000"
echo "  - MinIO 控制台: http://localhost:9001 (minioadmin/minioadmin)"
echo "  - Adminer: http://localhost:8080"
echo ""
echo "下一步:"
echo "  1. 编辑 .env 文件，配置 GEMINI_API_KEY"
echo "  2. 运行 'pnpm dev:backend' 启动后端"
echo "  3. 运行 'pnpm dev:frontend' 启动前端"
echo ""