# OmPlayer

Embeddable music player — Web Component + Symfony backend.

```
om-player/
├── player/      # @om/player — Lit Web Component (<om-player>)
├── backend/     # API, admin, demo site
├── openapi/     # REST API v1 contract
├── docker/      # PHP Dockerfile, entrypoint
├── docs/        # module documentation
└── scripts/     # build player → backend/public
```

---

## Быстрый старт

```bash
make docker-mysql   # MySQL в Docker (:3306)
make install
make build
make migrate
make server
# → http://127.0.0.1:8000/
```

БД: **MySQL** `om_player` (Docker volume `om-player_om_mysql_data`).  
Legacy SQLite импорт: `bash scripts/import-sqlite.sh`.

| URL | Назначение |
|-----|------------|
| http://127.0.0.1:8000/ | Demo site |
| http://127.0.0.1:8000/admin | EasyAdmin |
| http://127.0.0.1:8000/api/v1/albums | REST API |
| http://127.0.0.1:8000/api/openapi.yaml | OpenAPI spec |

---

## Сборка player

```bash
bash scripts/build.sh
# player/dist → backend/public/build/player/
```

На production Node.js не нужен — собранные `.js` коммитятся в git.

---

## Docker

**MySQL only** (backend на хосте):

```bash
make docker-mysql
# backend/.env.local → DATABASE_URL=mysql://om:om@127.0.0.1:3306/om_player?...
make migrate && make server
```

**Полный стек** (MySQL + PHP в контейнере):

```bash
make docker-up
# → http://127.0.0.1:8000/
```

Подробнее: [docker/README.md](docker/README.md)

---

## Документация

- [docs/README.md](docs/README.md) — index
- [docs/metadata.md](docs/metadata.md) — track metadata
- [docs/embed.md](docs/embed.md) — embedding
- [docs/mobile.md](docs/mobile.md) — mobile UX
- [docs/backend-integration.md](docs/backend-integration.md) — backend setup
- [ANNOUNCEMENT.md](ANNOUNCEMENT.md) — launch copy

Проект «Живая Музыка Ом» (Bitrix, бренд) — [`../Живая Музыка Ом`](../Живая%20Музыка%20Ом).
