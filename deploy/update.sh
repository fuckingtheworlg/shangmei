#!/usr/bin/env bash
# 拉取最新代码 → 重新构建后端和前端 → 重启服务
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/shangmei}"

cd "$APP_DIR"
echo "[update $(date +%H:%M:%S)] git pull..."
# 自动暂存本地修改，避免被 npm install / 手动改动卡住
if ! git diff --quiet HEAD || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "[update] detected local changes, stashing..."
  git stash push --include-untracked -m "auto-stash by update.sh $(date +%s)" || true
fi

# fetch 带 60s 超时；如失败自动降级到 ghfast 镜像
ORIGIN_URL="$(git remote get-url origin)"
echo "[update] fetching from $ORIGIN_URL (60s timeout)"
if ! timeout 60 git fetch origin --progress; then
  echo "[update] github fetch timeout, fallback to ghfast mirror"
  case "$ORIGIN_URL" in
    https://ghfast.top/*) MIRROR_URL="$ORIGIN_URL" ;;
    https://github.com/*) MIRROR_URL="https://ghfast.top/${ORIGIN_URL}" ;;
    *) MIRROR_URL="$ORIGIN_URL" ;;
  esac
  git remote set-url origin "$MIRROR_URL"
  if ! timeout 120 git fetch origin --progress; then
    echo "[update] ghfast mirror also failed, please check network"
    git remote set-url origin "$ORIGIN_URL"
    exit 1
  fi
fi
git reset --hard origin/main
echo "[update $(date +%H:%M:%S)] git pull done"

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
