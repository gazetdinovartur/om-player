# Встраивание OmPlayer

OmPlayer — **platform-agnostic** Web Component. Нужны: script, `<om-player>`, REST API.

---

## Минимальный embed (один трек)

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Demo</title>
</head>
<body>
  <om-player
    mode="embed"
    track="demo-track-slug"
    api-base="https://api.example.com/api/v1"
    theme="dark"
    auto-play
  ></om-player>

  <script type="module" src="/build/player/om-player.iife.js"></script>
</body>
</html>
```

---

## Глобальный mini-player (мультистраничный сайт)

Persistent shell — элементы **не пересоздаются** при навигации:

```html
<body>
  <!-- контент страницы -->

  <div id="om-persistent-player" data-turbo-permanent>
    <audio id="om-audio-engine" data-turbo-permanent hidden playsinline preload="auto"></audio>
  </div>

  <om-player
    id="om-global"
    mode="mini"
    api-base="/api/v1"
    theme="light"
    data-turbo-permanent
  ></om-player>

  <script type="module" src="/build/player/om-player.iife.js"></script>
  <script src="/js/player-bridge.js" defer></script>
</body>
```

Кнопки на странице:

```html
<button type="button" data-om-play="track-slug">▶ Трек</button>
<button type="button" data-om-play-album="album-slug">▶ Альбом</button>
```

`player-bridge.js` — опциональная обвязка (Turbo, analytics, hotkeys). Логика воспроизведения в `@om/player`.

---

## Full mode (страница альбома)

```html
<om-player
  id="album-player"
  mode="full"
  album="album-slug"
  api-base="/api/v1"
  album-title="Название альбома"
  album-artist="Живая Музыка Ом"
  album-cover="/media/covers/album.jpg"
  theme="dark"
></om-player>

<!-- опционально: SSR-очередь без stream URLs -->
<script type="application/json" id="album-tracks-json">
  [{"slug":"t1","title":"...","artistName":"...","durationMs":180000}]
</script>
```

Атрибут `data-queue-source="album-tracks-json"` на `<om-player>` — player читает JSON и догружает stream URLs через API.

---

## Атрибуты `<om-player>`

| Атрибут | Описание |
|---------|----------|
| `mode` | `embed` \| `mini` \| `full` |
| `api-base` | Base URL API, default `/api/v1` |
| `theme` | `light` \| `dark` |
| `track` | Slug трека (embed) |
| `album` | Slug альбома (full / play album) |
| `playlist` | Slug плейлиста |
| `album-cover` | Fallback обложки до API |
| `album-title` | Fallback названия альбома |
| `album-artist` | Fallback артиста |
| `auto-play` | Автовоспроизведение в embed |

---

## Public JS API

Элемент `#om-global` (или любой `<om-player>`):

```javascript
const player = document.getElementById('om-global');

player.playAlbumPublic('album-slug');
player.loadTrackPublic('track-slug');
player.mediaPlayPausePublic();
player.restoreSessionPublic();
```

---

## CORS

Если embed на **другом домене**, backend должен разрешить origin:

```yaml
# nelmio_cors.yaml
nelmio_cors:
  paths:
    '^/api/':
      allow_origin: ['https://your-site.com']
      allow_methods: ['GET', 'POST', 'OPTIONS']
```

Stream URLs (`/media/audio/...`) тоже должны отдаваться с CORS, если audio грузится cross-origin.

---

## Сборка и деплой assets

```bash
cd om-player && bash scripts/build.sh
# Копировать player/dist/* на CDN или /public/build/player/
```

На production **Node не нужен** — в git коммитятся собранные `.js`.
