#!/usr/bin/env bash
# 彬渭中心设备管理系统 - 一键安装脚本（Ubuntu 22.04 / 24.04）
# 在干净的服务器上以 root 运行
# 完成：基础环境、MySQL、建库、Node 20、PM2、Nginx、依赖、构建、systemd
set -euo pipefail

# =============== 可在这里调整变量 ===============
APP_DIR="${APP_DIR:-/opt/shangmei}"
DB_NAME="${DB_NAME:-shangmei}"
DB_USER="${DB_USER:-shangmei}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -hex 12)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
NGINX_SERVER_NAME="${NGINX_SERVER_NAME:-_}"   # 公网域名或 _ 表示默认
API_PORT="${API_PORT:-3000}"
# ===============================================

log() { echo -e "\033[1;32m[install]\033[0m $*"; }
err() { echo -e "\033[1;31m[error]\033[0m $*" >&2; }

[[ $EUID -eq 0 ]] || { err "请用 root 或 sudo 运行"; exit 1; }
[[ -f "$APP_DIR/backend/package.json" ]] || { err "找不到 $APP_DIR/backend，请先把代码 git clone 到 $APP_DIR"; exit 1; }

log "1/8 更新 apt 并安装基础工具"
export DEBIAN_FRONTEND=noninteractive
apt update -qq
apt install -y -qq curl ca-certificates gnupg lsb-release ufw

log "2/8 安装 Node.js 20"
if ! command -v node >/dev/null || ! node -v | grep -q "^v20"; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y -qq nodejs
fi
node -v
npm install -g pm2 >/dev/null 2>&1 || true

log "3/8 安装 MySQL Server"
if ! command -v mysql >/dev/null; then
  apt install -y -qq mysql-server
  systemctl enable --now mysql
fi

log "4/8 创建数据库与账号"
mysql -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

log "5/8 写入后端 .env"
cat > "$APP_DIR/backend/.env" <<ENV
DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@localhost:3306/${DB_NAME}"
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="7d"
PORT=${API_PORT}
ENV

log "6/8 安装后端依赖 + 迁移 + 构建"
cd "$APP_DIR/backend"
npm ci --omit=dev || npm install --omit=dev
npx prisma generate
npx prisma migrate deploy
if [[ "${RUN_SEED:-yes}" == "yes" ]]; then
  npm install --save-dev ts-node typescript @types/node >/dev/null 2>&1 || true
  npx ts-node prisma/seed.ts || log "seed 失败可忽略（重复执行）"
fi
npm install --save-dev @nestjs/cli typescript >/dev/null 2>&1 || true
npm run build

log "7/8 构建 PC 后台"
cd "$APP_DIR/admin-web"
npm ci || npm install
npm run build

log "8/8 安装 systemd + Nginx"
install -m 0644 "$APP_DIR/deploy/shangmei-api.service" /etc/systemd/system/shangmei-api.service
sed -i "s#__APP_DIR__#$APP_DIR#g" /etc/systemd/system/shangmei-api.service
systemctl daemon-reload
systemctl enable --now shangmei-api

apt install -y -qq nginx
install -m 0644 "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/shangmei
sed -i "s#__APP_DIR__#$APP_DIR#g" /etc/nginx/sites-available/shangmei
sed -i "s#__SERVER_NAME__#$NGINX_SERVER_NAME#g" /etc/nginx/sites-available/shangmei
sed -i "s#__API_PORT__#$API_PORT#g" /etc/nginx/sites-available/shangmei
ln -sf /etc/nginx/sites-available/shangmei /etc/nginx/sites-enabled/shangmei
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

if command -v ufw >/dev/null; then
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
fi

echo
log "完成！"
echo "  - 后端：http://127.0.0.1:${API_PORT}/api  (systemctl status shangmei-api)"
echo "  - PC 后台：http://${NGINX_SERVER_NAME}/  (Nginx 已反代)"
echo "  - 数据库：${DB_NAME} / ${DB_USER} / ${DB_PASSWORD}"
echo "  - JWT_SECRET 已写入 backend/.env"
echo "  - 演示账号：admin / admin123"
