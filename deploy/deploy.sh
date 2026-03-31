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

# 1. Pull latest code (for docker-compose.yml, nginx, migrations)
echo ""
echo "▶ 拉取最新代码..."
git pull origin main --ff-only

# 2. Pull pre-built images (not build on server)
echo ""
echo "▶ 拉取最新镜像..."
if [ "$TARGET" = "all" ]; then
  docker compose pull api web admin
else
  docker compose pull "$TARGET"
fi

# 3. Restart services (zero-downtime: new container starts before old stops)
echo ""
echo "▶ 重启服务..."
if [ "$TARGET" = "all" ]; then
  docker compose up -d --remove-orphans
else
  docker compose up -d --no-deps "$TARGET"
fi

# 4. Run database migrations (only when deploying api or all)
if [ "$TARGET" = "all" ] || [ "$TARGET" = "api" ]; then
  echo ""
  echo "▶ 执行数据库迁移..."
  docker compose exec -T api npx prisma migrate deploy
fi

# 5. Clean up old images
echo ""
echo "▶ 清理旧镜像..."
docker image prune -f

# 6. Health check
echo ""
echo "▶ 服务状态:"
docker compose ps

echo ""
echo "═══════════════════════════════════════════"
echo "  ✓ 部署完成"
echo "═══════════════════════════════════════════"
