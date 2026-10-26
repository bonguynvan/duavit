#!/usr/bin/env bash
# Pull the latest code and rebuild/restart the stack. Run from the repo root on the VPS.
set -euo pipefail

cd "$(dirname "$0")/.."
# Optional per-server settings, e.g. COMPOSE_FILE=deploy/edge/compose.yml behind a shared proxy.
if [ -f .deploy.env ]; then set -a; . ./.deploy.env; set +a; fi

echo "==> Backing up the database"
docker compose exec -T app node src/tools/backup.js || echo "(backup skipped: app not running yet)"
find data/backups -name "*.sqlite" -mtime +14 -delete 2>/dev/null || true # keep 14 days, as the privacy policy promises
echo "==> Pulling latest code"
git pull --ff-only
echo "==> Rebuilding and restarting"
docker compose up -d --build
docker image prune -f > /dev/null
echo "==> Health check"
for _ in $(seq 1 20); do
  if docker compose exec -T app wget -qO- http://127.0.0.1:3000/healthz > /dev/null 2>&1; then
    docker compose ps
    echo "OK"
    exit 0
  fi
  sleep 2
done
docker compose ps
echo "App chưa khỏe, kiểm tra lại: docker compose logs app"
exit 1
