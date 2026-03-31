#!/bin/bash
# 服务器首次部署脚本
# 在服务器上运行: bash setup.sh
set -e

SERVER_IP=$(curl -s ifconfig.me)

echo "═══════════════════════════════════════════"
echo "  wanjukong server setup"
echo "═══════════════════════════════════════════"

# 1. Docker
echo ""
echo "▶ 1. 安装 Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "  ✓ Docker 已安装"
else
  echo "  ✓ Docker 已存在"
fi

# 2. Nginx + Certbot
echo ""
echo "▶ 2. 安装 Nginx + Certbot..."
apt-get update -qq && apt-get install -y -qq nginx certbot python3-certbot-nginx
echo "  ✓ Nginx 已安装"

# 3. Clone project
echo ""
echo "▶ 3. 克隆项目..."
mkdir -p /opt
cd /opt
if [ ! -d "wanjukong" ]; then
  git clone git@github.com:gguan/wanjukong.git wanjukong
  echo "  ✓ 项目已克隆"
else
  echo "  ✓ 项目已存在"
fi
cd wanjukong

# 4. Login to GitHub Container Registry
echo ""
echo "▶ 4. 登录 GitHub Container Registry..."
echo "  请运行: docker login ghcr.io"

# 5. Create .env
echo ""
echo "▶ 5. 创建 .env..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "  ✓ .env 已从模板创建"
  echo "  ⚠ 请编辑 /opt/wanjukong/.env 填入真实密钥"
else
  echo "  ✓ .env 已存在"
fi

# 6. Nginx config
echo ""
echo "▶ 6. 配置 Nginx..."
cp deploy/nginx.conf /etc/nginx/sites-available/wanjukong
ln -sf /etc/nginx/sites-available/wanjukong /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "  ✓ Nginx 已配置"

# 7. SSL
echo ""
echo "▶ 7. SSL 证书"
echo ""
echo "  请先确保以下 DNS 解析到此服务器 ($SERVER_IP):"
echo ""
echo "    overrealm.shop       → $SERVER_IP"
echo "    www.overrealm.shop   → $SERVER_IP"
echo "    wanjukong.com        → $SERVER_IP"
echo "    www.wanjukong.com    → $SERVER_IP"
echo "    api.wanjukong.com    → $SERVER_IP"
echo "    admin.wanjukong.com  → $SERVER_IP"
echo ""
echo "  DNS 生效后运行:"
echo ""
echo "    certbot --nginx -d overrealm.shop -d www.overrealm.shop"
echo "    certbot --nginx -d wanjukong.com -d www.wanjukong.com -d api.wanjukong.com -d admin.wanjukong.com"
echo ""

# 8. Start
echo ""
echo "▶ 8. 启动服务"
echo ""
echo "  编辑 .env 后运行:"
echo ""
echo "    cd /opt/wanjukong"
echo "    docker compose pull"
echo "    docker compose up -d"
echo "    docker compose exec api npx prisma migrate deploy"
echo "    docker compose exec api npx tsx prisma/seed.ts"
echo ""

echo "═══════════════════════════════════════════"
echo "  ✓ 初始化完成"
echo "═══════════════════════════════════════════"
