#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

# Resolve DATABASE_URL from Symfony env ( .env.local overrides .env )
DATABASE_URL="$(
  php -r '
    require "vendor/autoload.php";
    (new Symfony\Component\Dotenv\Dotenv())->bootEnv(__DIR__ . "/.env");
    echo $_ENV["DATABASE_URL"] ?? "";
  '
)"

case "$DATABASE_URL" in
  sqlite:*)
    # SQLite creates the file on first connection — database:create is unsupported
    ;;
  mysql:*|mariadb:*|postgresql:*|postgres:*)
    php bin/console doctrine:database:create --if-not-exists
    ;;
  *)
    echo "Unknown DATABASE_URL driver; skipping doctrine:database:create" >&2
    ;;
esac

php bin/console doctrine:migrations:migrate --no-interaction
