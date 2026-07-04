.PHONY: install build dev migrate server test docker-up docker-down docker-logs docker-mysql init-env icons

install:
	cd backend && composer install
	cd player && npm install

build:
	bash scripts/build.sh

icons:
	php scripts/generate-icons.php

init-env:
	bash scripts/init-env.sh

init-admin:
	cd backend && php bin/console app:init-admin --write-env --force

migrate:
	bash scripts/migrate.sh

server:
	cd backend && php -c php.ini -S 127.0.0.1:8000 -t public public/router.php

test:
	cd backend && php bin/console doctrine:migrations:migrate --no-interaction --env=test
	cd backend && php -c php.ini vendor/bin/phpunit

dev: build migrate server

seed-album:
	cd backend && php bin/console app:import-album --purge

# Docker — nginx + PHP-FPM + MySQL
docker-up: build
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f nginx php mysql

# MySQL only — then use make migrate && make server on host
docker-mysql:
	docker compose up -d mysql
