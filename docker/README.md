# Docker

Локальная разработка. Production — [docs/deployment.md](../docs/deployment.md).

## Стек

`docker compose up` поднимает **nginx + PHP-FPM + MySQL**:

| Сервис | Порт | Назначение |
|--------|------|------------|
| nginx | 8000 | Reverse proxy, статика, Range для audio |
| php | 9000 (internal) | Symfony через PHP-FPM |
| mysql | 3306 | База данных |

---

## Быстрый старт

```bash
bash scripts/init-env.sh    # создать backend/.env с паролем admin
make docker-up
# → http://127.0.0.1:8000/
```

---

## MySQL only (backend на хосте)

```bash
docker compose up -d mysql
make migrate && make server
```

В `backend/.env` используйте `127.0.0.1` как хост MySQL.

---

## Команды

| Команда | Действие |
|---------|----------|
| `make docker-up` | build player + nginx + php-fpm + mysql |
| `make docker-down` | остановить контейнеры |
| `make docker-logs` | логи nginx, php, mysql |

---

## Переменные окружения

Единый файл: **`backend/.env`** (см. [docs/env.md](../docs/env.md)).

Docker Compose читает его через `env_file`. Для PHP-контейнера `DATABASE_URL` переопределяется на хост `mysql`.
