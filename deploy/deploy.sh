#!/bin/bash
# 生产部署/更新脚本
# 用法: ./deploy/deploy.sh [api|web|admin|all]
#
# 关键安全步骤：
#   每次部署 api（或 all）前，先对 Postgres 做 pg_dump 快照写到
#   /opt/wanjukong/backups/pre-deploy-<timestamp>.sql.gz。快照失败则中止
#   部署，宁可不上线也不要在没有回滚点的情况下动数据库。
#   用 deploy/restore.sh <file> 恢复任意一个快照。
set -e

APP_DIR="/opt/wanjukong"
BACKUP_DIR="${APP_DIR}/backups"
BACKUP_RETENTION=14   # keep last N snapshots
cd "$APP_DIR"

TARGET=${1:-all}

echo "═══════════════════════════════════════════"
echo "  wanjukong deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "  target: $TARGET"
echo "═══════════════════════════════════════════"

# 1. Pull latest code
echo ""
echo "▶ 拉取最新代码..."
git pull origin main --ff-only

# 2. Pre-deploy database snapshot (only when api is being touched)
if [ "$TARGET" = "all" ] || [ "$TARGET" = "api" ]; then
  echo ""
  echo "▶ 部署前 Postgres 快照..."
  mkdir -p "$BACKUP_DIR"

  # If postgres container isn't up yet (e.g. first deploy), skip with a warning.
  if docker compose ps --status running --services 2>/dev/null | grep -qx "postgres"; then
    TS=$(date +%Y%m%d-%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/pre-deploy-${TS}.sql.gz"

    # --clean --if-exists makes the dump self-contained: restore drops + recreates
    # objects before inserting. -Fp (plain SQL) so we can pipe to psql for restore.
    if ! docker compose exec -T postgres \
          pg_dump --clean --if-exists -U wanjukong wanjukong \
        | gzip > "$BACKUP_FILE"; then
      echo "❌ pg_dump 失败，部署已中止。"
      echo "   排查: docker compose logs postgres --tail 50"
      rm -f "$BACKUP_FILE"
      exit 1
    fi

    # Guard against silent empty-file writes (disk full, gzip truncated, etc.)
    if [ ! -s "$BACKUP_FILE" ]; then
      echo "❌ 快照文件为空，部署已中止。"
      rm -f "$BACKUP_FILE"
      exit 1
    fi

    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✓ 快照已保存: $BACKUP_FILE ($SIZE)"

    # Prune old snapshots — keep most recent $BACKUP_RETENTION
    ls -t "$BACKUP_DIR"/pre-deploy-*.sql.gz 2>/dev/null \
      | tail -n +$((BACKUP_RETENTION + 1)) \
      | xargs -r rm -f
  else
    echo "⚠️  postgres 容器未运行 — 假设首次部署，跳过快照。"
  fi
fi

# 3. Build and restart
echo ""
echo "▶ 构建并启动..."
if [ "$TARGET" = "all" ]; then
  docker compose up -d --build --remove-orphans
else
  docker compose up -d --build --no-deps "$TARGET"
fi

# 4. Run database migrations (only when deploying api or all)
if [ "$TARGET" = "all" ] || [ "$TARGET" = "api" ]; then
  echo ""
  echo "▶ 执行数据库迁移..."
  docker compose exec -T api npx prisma migrate deploy
fi

# 5. Clean up
echo ""
echo "▶ 清理旧镜像..."
docker image prune -f

# 6. Status
echo ""
echo "▶ 服务状态:"
docker compose ps

echo ""
echo "═══════════════════════════════════════════"
echo "  ✓ 部署完成"
echo "═══════════════════════════════════════════"
