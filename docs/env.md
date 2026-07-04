# Переменные окружения

**Единый файл:** `backend/.env` (gitignored).

Создать с автогенерацией пароля admin:

```bash
bash scripts/init-env.sh
```

Шаблон: [backend/.env.example](../backend/.env.example)

> Не используйте `.env.local` — все переменные только в `.env`.

---

## Обязательные

| Переменная | Пример (dev) | Пример (prod) | Назначение |
|------------|--------------|---------------|------------|
| `APP_ENV` | `dev` | `prod` | Окружение Symfony |
| `APP_SECRET` | auto (`init-env.sh`) | `openssl rand -hex 32` | Шифрование, CSRF |
| `DATABASE_URL` | `mysql://om:om@127.0.0.1:3306/om_player?...` | prod credentials | Doctrine |
| `DEFAULT_URI` | `http://127.0.0.1:8000` | `https://music.arturlun.ru` | Absolute URLs |
| `CORS_ALLOW_ORIGIN` | localhost regex | `'^https://music\.arturlun\.ru$'` | Nelmio CORS |
| `JMO_DEFAULT_ARTIST_NAME` | `Артур Лун` | `Артур Лун` | Fallback-артист |
| `ADMIN_USERNAME` | `admin` | `admin` | Логин админки |
| `ADMIN_PASSWORD` | plain-text | plain-text | **Как при входе.** Пример: `my_secret_password` |

`app:init-admin --write-env` генерирует пароль и пишет в `.env`. Можно также вставить свой вручную:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=мой_пароль
```

---

## Каталог и импорт

| Переменная | Пример | Назначение |
|------------|--------|------------|
| `JMO_DEFAULT_ARTIST_NAME` | `Артур Лун` | Имя артиста, если в MP3/M4A нет тега artist и при импорте не указан `--artist` |
| `JMO_SEED_ALBUM_PATH` | `/path/to/album` | **Опционально.** Папка альбома для `make seed-album` без `--path`. Можно не задавать — импорт через `--path` |

---

## MEDIA_BASE_URL

| Окружение | Значение | Зачем |
|-----------|----------|-------|
| **Локально** | пусто | Обложки и stream в API как `/media/...` — работает на том же домене |
| **Production** | `https://music.arturlun.ru` | Абсолютные HTTPS URL для lock screen iOS и embed с других сайтов |

---

## Production (дополнительно)

| Переменная | Пример | Назначение |
|------------|--------|------------|
| `TRUSTED_PROXIES` | `127.0.0.1,REMOTE_ADDR` | За nginx |
| `TRUSTED_HOSTS` | `'^music\.arturlun\.ru$'` | Host validation |

---

## Admin: команды

```bash
# Сгенерировать случайный пароль и записать в .env
php bin/console app:init-admin --write-env --force

# Задать свой пароль
php bin/console app:init-admin --write-env --password='мой-пароль'
```

Пароль в `.env` = пароль при входе на `/admin/login` (plain-text).

---

## Docker MySQL

Используются docker-compose и `backend/.env`:

| Переменная | Default |
|------------|---------|
| `MYSQL_ROOT_PASSWORD` | `root` |
| `MYSQL_DATABASE` | `om_player` |
| `MYSQL_USER` | `om` |
| `MYSQL_PASSWORD` | `om` |

---

## Опциональные

Конфиг CORS: `backend/config/packages/nelmio_cors.yaml`
