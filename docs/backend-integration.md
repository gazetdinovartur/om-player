# Backend + OmPlayer

Symfony backend и demo-сайт живут в **`backend/`** этого репозитория.

---

## Структура

```
om-player/
├── player/          → Web Component, собирается в backend/public/build/player/
├── backend/         → API, admin, Twig site, media
└── openapi/         → контракт, отдаётся на /api/openapi.yaml
```

---

## Быстрый старт

```bash
make install
make build      # player → backend/public/build/player/
make migrate
make server     # http://127.0.0.1:8000
```

---

## API

`MusicApiController` — `/api/v1/*`:

| Route | Назначение |
|-------|------------|
| `GET /tracks/{slug}` | TrackDetail + stream |
| `GET /albums/{slug}/tracks` | Очередь альбома |
| `GET /playlists/{slug}` | Плейлист |

`TrackApiSerializer` — entity → JSON (title, artist, album, year, cover, stream).

`MediaStreamController` — `/media/audio/*` с HTTP Range.

OpenAPI: [../openapi/om-api.v1.yaml](../openapi/om-api.v1.yaml) → `/api/openapi.yaml`

---

## Twig integration

`backend/templates/base.html.twig`:

```twig
<script type="module" src="{{ asset('build/player/om-player.iife.js') }}"></script>
<om-player id="om-global" mode="mini" api-base="/api/v1" theme="light"></om-player>
```

Site glue: `backend/public/js/player-bridge.js`, `theme.js`.

---

## Upload pipeline

1. `AudioMetadataExtractor` — ID3
2. `TrackUploadHandler` — persist
3. `CatalogResolver` — artist/album

Admin: `/admin/upload-track`

---

## CORS

`nelmio_cors` — для embed с других доменов. Настройка в `backend/config/packages/nelmio_cors.yaml`.

---

## Deploy

```bash
make build
cd backend && composer install --no-dev --optimize-autoloader
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console cache:clear --env=prod
```

Node.js на сервере не нужен.

---

## Docker

См. [../docker/README.md](../docker/README.md):

```bash
make docker-up      # MySQL + app
make docker-mysql   # только MySQL, backend на хосте
```
