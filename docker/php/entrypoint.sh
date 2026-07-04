#!/bin/sh
set -eu

cd /app

if [ ! -f vendor/autoload.php ]; then
  composer install --no-interaction --prefer-dist
fi

php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

exec php -c php.ini -S 0.0.0.0:8000 -t public public/router.php
