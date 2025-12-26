#!/bin/bash

set -e

echo "🔨 构建沙箱镜像..."
cd infrastructure/docker
docker build -f Dockerfile.sandbox -t gemini-sandbox:latest .
echo "✅ 沙箱镜像构建完成"

# 测试镜像
echo ""
echo "🧪 测试镜像..."
docker run --rm gemini-sandbox:latest node --version
docker run --rm gemini-sandbox:latest python3 --version
docker run --rm gemini-sandbox:latest npm --version
echo "✅ 镜像测试通过"