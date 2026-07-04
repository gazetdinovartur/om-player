#!/usr/bin/env bash
# One-time: import catalog from legacy SQLite var/data.db into MySQL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if [ ! -f var/data.db ]; then
  echo "No var/data.db — nothing to import." >&2
  exit 1
fi

php bin/console app:import-sqlite "$@"
mv var/data.db "var/data.db.sqlite-bak.$(date +%Y%m%d)"
echo "Archived SQLite → var/data.db.sqlite-bak.*"
