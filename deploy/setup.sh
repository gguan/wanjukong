#!/bin/bash
# 服务器首次部署脚本
# 在服务器上运行: curl -sL <gist_url> | bash
set -e

echo "=== 1. 安装 Docker ==="
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

echo "=== 2. 安装 Nginx ==="
apt-get update && apt-get install -y nginx certbot python3-certbot-nginx

echo "=== 3. 克隆项目 ==="
mkdir -p /opt
cd /opt
if [ ! -d "wanjukong" ]; then
  git clone git@github.com:gguan/wanjukong.git wanjukong
fi
cd wanjukong

echo "=== 4. 创建 .env 文件 ==="
if [ ! -f ".env" ]; then
  cat > .env << 'ENVEOF'
POSTGRES_PASSWORD=changeme_strong_password
SESSION_SECRET=changeme_random_session_secret
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
ENVEOF
  echo ">>> 请编辑 /opt/wanjukong/.env 填入真实密钥"
fi

echo "=== 5. 配置 Nginx ==="
cp deploy/nginx.conf /etc/nginx/sites-available/overrealm.store
ln -sf /etc/nginx/sites-available/overrealm.store /etc/nginx/sites-enabled/

echo "=== 6. 申请 SSL 证书 ==="
echo ">>> 请先将以下 DNS 解析到此服务器 IP:"
echo "    overrealm.store -> $(curl -s ifconfig.me)"
echo "    admin.overrealm.store -> $(curl -s ifconfig.me)"
echo ""
echo ">>> DNS 生效后运行:"
echo "    certbot --nginx -d overrealm.store -d admin.overrealm.store"

echo "=== 7. 启动服务 ==="
echo ">>> 编辑 .env 后运行:"
echo "    cd /opt/wanjukong && docker compose up -d --build"
echo "    docker compose exec api npx prisma migrate deploy"

echo "=== 初始化完成 ==="
