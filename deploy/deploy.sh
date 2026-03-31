#!/bin/bash
# 生产部署/更新脚本
# 用法: ./deploy/deploy.sh [api|web|admin|all]
set -e

APP_DIR="/opt/wanjukong"
cd "$APP_DIR"

TARGET=${1:-all}

echo "═══════════════════════════════════════════"
echo "  wanjukong deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════"

# 1. Pull latest code
echo ""
echo "▶ 拉取最新代码..."
git pull origin main --ff-only

# 2. Build and restart
echo ""
echo "▶ 构建并启动..."
if [ "$TARGET" = "all" ]; then
  docker compose up -d --build --remove-orphans
else
  docker compose up -d --build --no-deps "$TARGET"
fi

# 3. Run database migrations (only when deploying api or all)
if [ "$TARGET" = "all" ] || [ "$TARGET" = "api" ]; then
  echo ""
  echo "▶ 执行数据库迁移..."
  docker compose exec -T api npx prisma migrate deploy
fi

# 4. Clean up
echo ""
echo "▶ 清理旧镜像..."
docker image prune -f

# 5. Status
echo ""
echo "▶ 服务状态:"
docker compose ps

echo ""
echo "═══════════════════════════════════════════"
echo "  ✓ 部署完成"
echo "═══════════════════════════════════════════"
