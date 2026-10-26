#!/usr/bin/env bash
# Pull the latest code and rebuild/restart the stack. Run from the repo root on the VPS.
set -euo pipefail

cd "$(dirname "$0")/.."
echo "==> Backing up the database"
docker compose exec -T app node src/tools/backup.js || echo "(backup skipped: app not running yet)"
find data/backups -name "*.sqlite" -mtime +14 -delete 2>/dev/null || true # keep 14 days, as the privacy policy promises
echo "==> Pulling latest code"
git pull --ff-only
echo "==> Rebuilding and restarting"
docker compose up -d --build
docker image prune -f > /dev/null
echo "==> Health check"
sleep 5
docker compose ps
curl -fsS "http://127.0.0.1/healthz" -H "Host: duavit.peti.vn" > /dev/null 2>&1 \
  && echo "OK" || echo "Kiểm tra lại: docker compose logs app"
