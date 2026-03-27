#!/bin/bash
set -e

echo "=== Deploying wanjukong ==="

cd /opt/wanjukong

# 拉取最新代码
git pull origin main

# 构建并启动
docker compose build
docker compose up -d

# 运行数据库迁移
docker compose exec -T api npx prisma migrate deploy

echo "=== Deploy complete ==="
docker compose ps
