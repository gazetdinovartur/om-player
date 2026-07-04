#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

if [[ -f "$ENV_FILE" ]]; then
  echo "Файл backend/.env уже существует. Удалите его вручную, если нужна перегенерация." >&2
  exit 1
fi

APP_SECRET="$(openssl rand -hex 16)"

cp "$ROOT/backend/.env.example" "$ENV_FILE"
sed -i.bak "s/change_me_run_scripts_init_env_sh/${APP_SECRET}/" "$ENV_FILE" && rm -f "$ENV_FILE.bak"

cd "$ROOT/backend"
php bin/console app:init-admin --write-env --force

echo ""
echo "Создан backend/.env — пароль admin показан выше."
