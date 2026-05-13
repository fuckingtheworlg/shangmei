#!/usr/bin/env bash
# 拉取最新代码 → 重新构建后端和前端 → 重启服务
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/shangmei}"

cd "$APP_DIR"
echo "[update] git pull..."
git pull --rebase

echo "[update] backend build..."
cd "$APP_DIR/backend"
npm ci --omit=dev || npm install --omit=dev
npx prisma generate
npx prisma migrate deploy
npm install --save-dev @nestjs/cli typescript >/dev/null 2>&1 || true
npm run build

echo "[update] admin-web build..."
cd "$APP_DIR/admin-web"
npm ci || npm install
npm run build

echo "[update] restart..."
systemctl restart shangmei-api
systemctl reload nginx
echo "[update] done"
