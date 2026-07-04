#!/bin/sh
set -eu

cd /app

if [ ! -f vendor/autoload.php ]; then
  composer install --no-interaction --prefer-dist
fi

php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
php bin/console app:init-admin --write-env --if-unset --no-interaction 2>/dev/null || true

exec "$@"
