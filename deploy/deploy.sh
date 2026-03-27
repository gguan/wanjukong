#!/bin/bash
set -e

echo "=== Deploying wanjukong (staging) ==="

cd /opt/wanjukong

# 拉取最新代码
git pull origin main

# 构建并启动
docker compose build
docker compose up -d

# Staging: 用 db push 同步 schema（不需要迁移文件，可破坏性更新）
docker compose exec -T api npx prisma db push

echo "=== Deploy complete ==="
docker compose ps
