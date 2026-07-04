# Backend + OmPlayer

Symfony backend и demo-сайт в **`backend/`**.

---

## Структура

```
backend/
├── src/Controller/Api/     MusicApiController — /api/v1/*
├── src/Controller/Web/     Demo site, media streaming
├── src/Controller/Admin/   EasyAdmin CRUD + upload
├── src/Service/            Upload, metadata, catalog
├── public/media/           Аудио и обложки (gitignored)
├── public/build/player/    Собранный @om/player
└── templates/              Twig demo site
```

Player собирается из `player/` → `public/build/player/` через `scripts/build.sh`.

---

## API

`MusicApiController` — `/api/v1/*`:

| Route | Назначение |
|-------|------------|
| `GET /tracks`, `/tracks/{slug}` | Список и detail + stream URL |
| `GET /albums`, `/albums/{slug}/tracks` | Каталог и очередь альбома |
| `GET /playlists/{slug}` | Плейлист |
| `GET /artists/{slug}` | Артист + альбомы |
| `GET /search?q=` | Поиск |
| `POST /analytics/playback` | События воспроизведения |

`TrackApiSerializer` → JSON. `MediaUrlGenerator` → абсолютные URL (если `MEDIA_BASE_URL`).

`MediaStreamController` — `/media/audio/*` с HTTP Range (dev server через `router.php`).

OpenAPI: [../openapi/om-api.v1.yaml](../openapi/om-api.v1.yaml) → `GET /api/openapi.yaml`

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

1. `AudioMetadataExtractor` — ID3 через getID3
2. `TrackUploadHandler` — stage → preview → confirm → persist
3. `CatalogResolver` — artist/album resolution

Admin: `/admin/upload-track`

CLI: `app:import-album --path=... --purge`

---

## CORS

`nelmio_cors` — regex из `CORS_ALLOW_ORIGIN`.  
На production также нужен CORS на статике `/media/` в nginx — см. [deployment.md](deployment.md).

---

## Deploy

Production runbook: **[deployment.md](deployment.md)**

Кратко:

```bash
make build
cd backend && composer install --no-dev --optimize-autoloader
php bin/console doctrine:migrations:migrate --no-interaction --env=prod
php bin/console cache:clear --env=prod
```

Node.js на сервере не нужен.

---

## Docker

[../docker/README.md](../docker/README.md) · [local-setup.md](local-setup.md)
