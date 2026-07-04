# Обзор проекта

OmPlayer — embeddable музыкальный плеер (Lit Web Component) + Symfony backend.  
Целевой production-домен: **https://music.arturlun.ru**

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│  Браузер                                                    │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │ Demo site    │  │ <om-player>     │  │ player-bridge │  │
│  │ (Twig+Turbo) │  │ Lit Web Comp.   │  │ analytics, UI │  │
│  └──────┬───────┘  └────────┬────────┘  └───────┬───────┘  │
│         └───────────────────┼───────────────────┘          │
│                             │ GET /api/v1/*                  │
│                             │ GET /media/audio/* (Range)     │
└─────────────────────────────┼───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Symfony 8 (backend/)                                       │
│  MusicApiController · MediaStreamController · EasyAdmin    │
│  Flysystem → public/media/{audio,covers}/                   │
│  MySQL (artists, albums, tracks, playlists, analytics)      │
└─────────────────────────────────────────────────────────────┘
```

| Компонент | Путь | Назначение |
|-----------|------|------------|
| Player | `player/` | `<om-player>` — embed / mini / full |
| Backend | `backend/` | API, админка, demo-сайт, медиа |
| OpenAPI | `openapi/om-api.v1.yaml` | Контракт API v1 |
| Docker | `docker/`, `docker-compose.yml` | MySQL + dev-контейнер |
| Сборка | `scripts/build.sh` | player → `backend/public/build/player/` |

---

## Что уже работает

### REST API (`/api/v1/*`)

Полный каталог: треки, альбомы, плейлисты, артисты, поиск, аналитика воспроизведения.  
Rate limit: 120 req/min на IP. OpenAPI: `/api/openapi.yaml`.

### Плеер (`@om/player`)

- Режимы: **embed** (карточка), **mini** (footer), **full** (страница альбома)
- Очередь, shuffle, repeat, избранное (`localStorage`)
- Media Session API (lock screen на iOS/Android)
- Восстановление сессии, координация вкладок (BroadcastChannel)
- SSR-гидрация очереди альбома через JSON в Twig

### Demo-сайт

- Главная, каталог `/music`, страницы альбомов, about, embed demo
- Turbo — музыка не прерывается при навигации
- Service worker — кэш shell + обложек

### Админка (EasyAdmin)

- CRUD: артисты, альбомы, треки, плейлисты
- Загрузка треков: drag-and-drop, preview ID3, двухшаговое подтверждение (`/admin/upload-track`)

### Импорт и медиа

- `app:import-album` — импорт папки с треками и обложкой
- `app:import-sqlite` — миграция legacy SQLite → MySQL
- HTTP Range для стриминга аудио
- Обложки: resize 800px + thumb 256px (GD)

### Тесты

3 PHPUnit-теста: API tracks list, OpenAPI YAML, home page.

---

## Что ещё не готово к production

| Приоритет | Задача | Почему важно |
|-----------|--------|--------------|
| 🔴 | ~~Аутентификация админки~~ | ✅ Symfony Security + `ADMIN_PASSWORD` в `.env` |
| 🔴 | ~~Reverse proxy + PHP-FPM~~ | ✅ Docker: nginx + php-fpm; prod: `deploy/nginx.conf.example` |
| 🔴 | ~~Production `.env`~~ | ✅ Единый `backend/.env`, `MEDIA_BASE_URL` |
| 🟡 | **CI/CD** | GitHub Actions удалён |
| 🟡 | ~~PWA-иконки~~ | ✅ `make icons` |
| 🟡 | ~~Страницы плейлистов~~ | ✅ `/music/playlists` |
| 🟡 | ~~Аналитика UI~~ | ✅ `/admin/analytics` |
| 🟢 | ~~Api Platform~~ | ✅ Удалён |
| 🟢 | **Howler.js** | В зависимостях, не используется |
| 🟢 | ~~MinIO/S3~~ | ✅ Удалён из docker-compose |

---

## Узкие и проблемные места

### Безопасность

- ~~**Открытая админка**~~ — закрыта (`ADMIN_USERNAME` / `ADMIN_PASSWORD`)
- **Dev-секреты** — генерируйте через `init-env.sh`; на prod — свои значения
- **Analytics POST** — нет лимита на размер массива `events[]` (DoS)
- **Upload без CSRF** — форма confirm в админке

### Баги и несогласованности

- **`MEDIA_BASE_URL` не везде** — playlist/artist cover в API идут как `/media/...` без CDN-префикса (`MusicApiController.php`)
- **`data-om-play` в embed.md** — документировал play по slug трека, но `player-bridge.js` играет альбом через `data-om-album`
- **Повторный импорт альбома** — без `--purge` копирует файлы (UUID), раздувает диск
- **Staging uploads** — `var/upload-staging/` не чистится по TTL для брошенных сессий
- **Hardcoded fallback** — `Track::getArtistName()` возвращает `'Артур Лун'` вместо env

### Производительность

- Аудио через PHP (`MediaStreamController`) — на prod лучше отдавать nginx напрямую из `public/media/audio/`
- Rate limiter in-memory — не шарится между PHP workers
- Playlist list — потенциальный N+1 на `getItems()->count()`

### CORS и embed

- Nelmio CORS покрывает Symfony-ответы; статика `/media/covers/` от nginx нуждается в `add_header Access-Control-Allow-Origin`
- Для lock screen iOS **coverUrl должен быть абсолютным HTTPS** → нужен `MEDIA_BASE_URL`

---

## База данных

MySQL 8.4, миграции в `backend/migrations/`:

| Таблица | Содержимое |
|---------|------------|
| `artists` | Артисты |
| `albums` | Альбомы, обложки, published |
| `tracks` | Треки, audio_path, duration, metadata |
| `playlists` / `playlist_items` | Плейлисты |
| `playback_events` | Аналитика (write-only) |

Медиа на диске (не в git):

```
backend/public/media/
├── audio/{year}/{uuid}.m4a
└── covers/{uuid}.jpg + {uuid}_thumb.jpg
```

---

## Версия и статус

**v0.1.0** — рабочий dev/reference implementation.  
Локально всё поднимается за 5 минут; для публичного домена нужны шаги из [deployment.md](deployment.md).

---

## Дальнейшие шаги (рекомендуемый порядок)

1. [Развернуть на music.arturlun.ru](deployment.md)
2. Закрыть `/admin` аутентификацией
3. Восстановить CI (PHPUnit + player build)
4. Добавить PWA-иконки и favicon
5. Починить `MediaUrlGenerator` для всех cover URL в API
6. Добавить TTL для upload-staging
