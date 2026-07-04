# OmPlayer — анонс

## Одной строкой

**OmPlayer** — embeddable музыкальный плеер: один `<script>`, один тег `<om-player>`, любой сайт с REST API.

---

## Для кого

- Сайты на **Symfony** (или любом PHP/Node backend с REST)
- Лендинги, каталоги, блоги — где нужно «нажал и слушает»
- Проекты, где музыка **не прерывается** при переходе между страницами

Bitrix и прочие CMS подключаются тем же способом — через script + API (примеры в основном репозитории).

---

## Что умеет

- **Три режима**: embed (карточка), mini (footer), full (страница альбома)
- **Непрерывное воспроизведение** при SPA/Turbo-навигации
- **Очередь**: альбом, плейлист, next/prev, shuffle, repeat
- **Метаданные**: название, артист, альбом, год, обложка, жанр, текст
- **Lock screen** на iOS/Android через Media Session API
- **Избранное** в localStorage
- **Светлая и тёмная** тема

---

## Как подключить за 5 минут

```html
<script type="module" src="https://cdn.example.com/om-player.iife.js"></script>

<om-player
  mode="embed"
  track="my-track-slug"
  api-base="https://api.example.com/api/v1"
  theme="dark"
></om-player>
```

Backend отдаёт JSON по [OpenAPI](openapi/om-api.v1.yaml). Symfony-референс уже есть.

---

## На мобилке

- Крупные touch-таргеты (play, seek, next)
- `playsinline` — без принудительного fullscreen на iOS
- Обложка и название на **экране блокировки**
- Управление с наушников и CarPlay (Media Session)
- Прогресс-бар с drag-to-seek

Подробнее → [docs/mobile.md](docs/mobile.md)

---

## Архитектура

```
┌─────────────┐     REST /api/v1      ┌──────────────┐
│  <om-player>│ ◄──────────────────► │ Symfony API  │
│  Web Comp.  │     JSON + stream URL  │ (reference)  │
└──────┬──────┘                        └──────────────┘
       │
       ▼
  #om-audio-engine  ← один HTMLAudioElement на вкладку
```

Плеер **не знает** про Symfony, Twig или Bitrix — только `api-base` и slug треков.

---

## Статус

- v0.1 — рабочий dev/reference implementation
- Production: [docs/deployment.md](docs/deployment.md) (music.arturlun.ru)
- OpenAPI v1 — стабильный контракт

---

## Ссылки

- Документация: [README.md](README.md)
- Метаданные трека: [docs/metadata.md](docs/metadata.md)
- Embed guide: [docs/embed.md](docs/embed.md)
