#!/usr/bin/env bash
# 拉取最新代码 → 重新构建后端和前端 → 重启服务
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/shangmei}"

cd "$APP_DIR"
echo "[update] git pull..."
git pull --rebase

echo "[update] backend build..."
NPM_MIRROR="${NPM_MIRROR:-https://registry.npmmirror.com}"

cd "$APP_DIR/backend"
npm install --registry "$NPM_MIRROR"
npx prisma generate
if [[ -d prisma/migrations ]] && [[ -n "$(ls -A prisma/migrations 2>/dev/null)" ]]; then
  npx prisma migrate deploy
else
  npx prisma db push --skip-generate
fi
npm run build

echo "[update] admin-web build..."
cd "$APP_DIR/admin-web"
npm install --registry "$NPM_MIRROR"
npm run build

echo "[update] restart..."
systemctl restart shangmei-api
systemctl reload nginx
echo "[update] done"
