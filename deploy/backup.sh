#!/usr/bin/env bash
# Daily SQLite backup with 14-day retention (the privacy policy promises it). For cron, e.g.:
#   15 3 * * * root /srv/duavit/deploy/backup.sh >> /var/log/duavit-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
if [ -f .deploy.env ]; then set -a; . ./.deploy.env; set +a; fi
docker compose exec -T app node src/tools/backup.js
find data/backups -name "*.sqlite" -mtime +14 -delete
