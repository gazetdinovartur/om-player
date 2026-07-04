# OmPlayer — документация

Embeddable music player + Symfony backend. Production: **https://music.arturlun.ru**

---

## С чего начать

| Цель | Документ |
|------|----------|
| Понять проект целиком | [overview.md](overview.md) |
| Поднять локально | [local-setup.md](local-setup.md) |
| **Развернуть на music.arturlun.ru** | [deployment.md](deployment.md) |
| **Shared-хостинг (NetAngels, Apache)** | [deploy/shared-hosting.md](deploy/shared-hosting.md) |
| Переменные окружения | [env.md](env.md) |

---

## Интеграция и API

| Документ | Содержание |
|----------|------------|
| [backend-integration.md](backend-integration.md) | API, Twig, upload pipeline |
| [metadata.md](metadata.md) | Поля трека: ID3 → API → плеер |
| [embed.md](embed.md) | Встраивание `<om-player>` на сайт |
| [mobile.md](mobile.md) | Mobile UX, lock screen, iOS quirks |

---

## Конфиги и контракты

| Файл | Назначение |
|------|------------|
| [../openapi/om-api.v1.yaml](../openapi/om-api.v1.yaml) | OpenAPI v1 (source of truth) |
| [../deploy/nginx.conf.example](../deploy/nginx.conf.example) | nginx для VPS |
| [../backend/public/.htaccess](../backend/public/.htaccess) | Apache / shared-хостинг |
| [../backend/.env.example](../backend/.env.example) | Шаблон переменных окружения |

OpenAPI отдаётся live: `GET /api/openapi.yaml`

---

## Прочее

- [../README.md](../README.md) — краткий обзор репозитория
- [../docker/README.md](../docker/README.md) — Docker MySQL / full stack
- [../ANNOUNCEMENT.md](../ANNOUNCEMENT.md) — текст анонса
