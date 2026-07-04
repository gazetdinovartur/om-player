# OmPlayer

Embeddable music player — Lit Web Component + Symfony backend.

```
om-player/
├── player/      # @om/player — <om-player> Web Component
├── backend/     # API, admin, demo site, media
├── openapi/     # REST API v1 contract
├── deploy/      # nginx example for production
├── docker/      # PHP Dockerfile, entrypoint
├── docs/        # documentation
└── scripts/     # build player → backend/public
```

Production: **https://music.arturlun.ru** — см. [docs/deployment.md](docs/deployment.md)

---

## Быстрый старт (локально)

```bash
bash scripts/init-env.sh
make docker-mysql
make install && make build && make icons && make migrate && make server
# → http://127.0.0.1:8000/
```

| URL | Назначение |
|-----|------------|
| http://127.0.0.1:8000/ | Demo site |
| http://127.0.0.1:8000/admin | EasyAdmin |
| http://127.0.0.1:8000/api/v1/albums | REST API |

---

## Документация

| | |
|---|---|
| [docs/README.md](docs/README.md) | **Index — начните здесь** |
| [docs/overview.md](docs/overview.md) | Обзор проекта, статус, риски |
| [docs/deployment.md](docs/deployment.md) | **Деплой на VPS (nginx)** |
| [docs/deploy/shared-hosting.md](docs/deploy/shared-hosting.md) | **Shared-хостинг (NetAngels, Apache)** |
| [docs/local-setup.md](docs/local-setup.md) | Локальная разработка |
| [docs/env.md](docs/env.md) | Переменные окружения |

---

## Сборка player

```bash
bash scripts/build.sh
# player/dist → backend/public/build/player/
```

На production Node.js не нужен — собранные `.js` коммитятся в git.

---

## Docker

```bash
make docker-up       # MySQL + PHP app
make docker-mysql    # только MySQL, backend на хосте
```

Подробнее: [docker/README.md](docker/README.md)
