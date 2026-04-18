#!/bin/bash
# Restore Postgres from a pre-deploy snapshot created by deploy.sh.
#
# Usage:
#   ./deploy/restore.sh                      # list available snapshots
#   ./deploy/restore.sh <backup-file.sql.gz> # restore from that file
#
# The snapshot is a pg_dump with --clean --if-exists so applying it will
# DROP and recreate each object — no manual cleanup needed first.
#
# This script intentionally:
#   - Stops the API container first (prevents half-applied writes).
#   - Requires an explicit 'yes' confirmation.
#   - Restarts the API at the end regardless of outcome.
set -e

APP_DIR="/opt/wanjukong"
BACKUP_DIR="${APP_DIR}/backups"
cd "$APP_DIR"

BACKUP="${1:-}"

if [ -z "$BACKUP" ]; then
  echo "Usage: $0 <backup-file>"
  echo ""
  echo "可用的快照（按时间倒序）:"
  if ls -t "$BACKUP_DIR"/pre-deploy-*.sql.gz >/dev/null 2>&1; then
    ls -lht "$BACKUP_DIR"/pre-deploy-*.sql.gz | head -20
  else
    echo "  (no snapshots in $BACKUP_DIR)"
  fi
  exit 1
fi

if [ ! -f "$BACKUP" ]; then
  echo "❌ 找不到备份文件: $BACKUP"
  exit 1
fi

echo "═══════════════════════════════════════════"
echo "  Postgres restore"
echo "═══════════════════════════════════════════"
echo "备份文件:  $BACKUP"
echo "大小:      $(du -h "$BACKUP" | cut -f1)"
echo "修改时间:  $(stat -f '%Sm' "$BACKUP" 2>/dev/null || stat -c '%y' "$BACKUP" 2>/dev/null)"
echo ""
echo "⚠️  这将覆盖当前数据库。当前数据会被丢弃。"
echo "    建议先跑一次 deploy.sh 让它自动生成最新快照作为保险。"
echo ""
read -p "继续吗？输入 'yes' 确认: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "已取消。"
  exit 1
fi

# Stop API to prevent concurrent writes during restore
echo ""
echo "▶ 停止 API 容器..."
docker compose stop api

# Always restart API even if the restore itself fails
cleanup() {
  echo ""
  echo "▶ 重启 API 容器..."
  docker compose start api
}
trap cleanup EXIT

# Sanity check postgres is up
if ! docker compose ps --status running --services 2>/dev/null | grep -qx "postgres"; then
  echo "❌ postgres 容器未运行。先跑: docker compose up -d postgres"
  exit 1
fi

# Stream restore. `pg_dump --clean --if-exists` makes this idempotent.
echo ""
echo "▶ 恢复中..."
if ! gunzip -c "$BACKUP" | docker compose exec -T postgres psql -U wanjukong wanjukong; then
  echo "❌ 恢复失败。数据库可能处于不一致状态。"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  ✓ 恢复完成"
echo "═══════════════════════════════════════════"
