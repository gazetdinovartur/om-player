# Деплой на shared-хостинг (Apache)

Runbook для **NetAngels «Базовый»** и похожих тарифов: PHP 8.4, SSH, MySQL, Apache + `.htaccess`.

Docker **не нужен**. Node.js на сервере **не нужен** — player собирается локально (`make build`).

VPS с nginx — см. [deployment.md](deployment.md).

---

## Подходит ли ваш тариф

| Параметр | NetAngels Базовый | OmPlayer |
|----------|-------------------|----------|
| PHP 8.4 | ✅ | требуется `>=8.4` |
| MySQL | ✅ | да |
| SSH | ✅ | для composer и миграций |
| RAM 512 МБ | ⚠️ | хватает для небольшого каталога при `APP_ENV=prod` |
| upload 128M | ✅ | загрузка треков в админке |
| Apache + .htaccess | ✅ | см. `backend/public/.htaccess` |

При росте трафика или частых перемотках в плеере лучше перейти на VPS.

---

## 1. Подготовка локально

```bash
git clone git@github.com:YOUR/om-player.git
cd om-player

# Собрать player (или использовать уже закоммиченные assets в public/build/)
make build

cd backend
composer install --no-dev --optimize-autoloader
```

Сгенерируйте `.env` для production:

```bash
bash scripts/init-env.sh   # локально
# отредактируйте backend/.env под хостинг (см. раздел 3)
```

---

## 2. Структура на хостинге

Как на NetAngels: **`www` и `om-player` — соседи**, на одном уровне (как у sacred-geometry-lab).

```
/home/c502022/music.arturlun.ru/
├── om-player/                         ← git clone
│   ├── public -> backend/public       ← в репозитории
│   ├── backend/
│   │   ├── public/                    ← index.php, .htaccess, media/
│   │   ├── var/
│   │   ├── vendor/
│   │   └── .env
│   └── scripts/setup-www-symlink.sh
└── www -> .../om-player/public        ← корень сайта в панели (symlink)
```

Пример (как у другого проекта):

```text
lrwxrwxrwx www -> /home/c502022/music.arturlun.ru/om-player/public
```

После `git clone`:

```bash
cd /home/c502022/music.arturlun.ru/om-player
bash scripts/setup-www-symlink.sh
```

Скрипт создаёт `om-player/public` и `../www` → `om-player/public`.  
Если каталог сайта другой — укажите явно:

```bash
SITE_DIR=/home/c502022/music.arturlun.ru bash scripts/setup-www-symlink.sh
```

### Почему это работает

- Apache document root = `www/` → `om-player/public` → `backend/public/`
- PHP `kernel.project_dir` = `backend/` (реальный путь через `index.php`)
- `.env`, `var/`, `config/` — **вне** document root
- Пути в коде (`%kernel.project_dir%/public/media`) не зависят от `www/`

### Панель NetAngels

1. **Сайты** → домен → **Корневая папка** = `www` (рядом с `om-player`, не внутри репозитория)
2. **PHP** → версия **8.4**
3. Расширения: `pdo_mysql`, `gd`, `mbstring`, `xml`, `ctype`, `iconv`, `json`, `zlib`
4. Переменные PHP (у вас уже хорошие значения):

   | Переменная | Рекомендация |
   |------------|--------------|
   | `upload_max_filesize` | `128M` |
   | `post_max_size` | `128M` |
   | `memory_limit` | `256M` |
   | `max_execution_time` | `300` |
   | `max_input_vars` | `10000` (20000 тоже ок) |

5. **MySQL** → создать БД и пользователя, записать host/login/password/database

---

## 3. Загрузка на сервер

### Вариант A — Git по SSH (предпочтительно)

```bash
ssh ВАШ_ЛОГИН@ssh.netangels.ru   # хост уточните в панели

cd ~
git clone git@github.com:YOUR/om-player.git
cd om-player/backend
composer install --no-dev --optimize-autoloader
```

Если `composer` на хостинге недоступен — выполните `composer install --no-dev` **локально** и залейте папку `vendor/` по SFTP.

### Вариант B — SFTP

Залейте содержимое репозитория, **кроме** `backend/var/cache/*` и локальных медиа.  
`vendor/` должен быть на месте (с локальной машины после `composer install --no-dev`).

---

## 4. Файл `backend/.env`

```bash
APP_ENV=prod
APP_SECRET=<openssl rand -hex 32>

DEFAULT_URI=https://music.arturlun.ru

DATABASE_URL="mysql://DB_USER:DB_PASS@localhost/DB_NAME?serverVersion=8.0&charset=utf8mb4"

CORS_ALLOW_ORIGIN='^https://(music\.arturlun\.ru|arturlun\.ru|www\.arturlun\.ru)$'

JMO_DEFAULT_ARTIST_NAME="Артур Лун"

MEDIA_BASE_URL=https://music.arturlun.ru

MEDIA_STREAM_PROTECT=1
MEDIA_STREAM_TTL=14400

ADMIN_USERNAME=admin
ADMIN_PASSWORD=<сильный-пароль>
```

> На shared MySQL часто `localhost`, не `127.0.0.1`. Host смотрите в панели NetAngels.  
> `serverVersion=8.0` — если точная версия неизвестна; иначе укажите `8.4`.

Полный справочник: [env.md](env.md).

---

## 5. Права на каталоги

По SSH:

```bash
cd ~/om-player/backend

mkdir -p public/media/audio public/media/covers var/cache var/log var/upload-staging

chmod -R u+rwX var public/media
```

PHP-FPM на NetAngels обычно работает от вашего пользователя — `chown www-data` **не нужен** (в отличие от VPS).

---

## 6. Миграции и кэш

```bash
cd ~/om-player/backend

php bin/console doctrine:migrations:migrate --no-interaction --env=prod
php bin/console cache:clear --env=prod
php bin/console cache:warmup --env=prod
```

После каждого обновления кода:

```bash
git pull
cd backend
composer install --no-dev --optimize-autoloader
php bin/console doctrine:migrations:migrate --no-interaction --env=prod
php bin/console cache:clear --env=prod
```

---

## 7. Музыка и медиа

Медиа **не в git**. Варианты:

**Админка** — https://music.arturlun.ru/admin/upload-track (логин из `.env`).

**Импорт альбома по SSH** (если залили папку с треками):

```bash
php bin/console app:import-album \
  --path=/home/ВАШ_ЛОГИН/music/nachalo \
  --album="Начало" \
  --artist="Артур Лун" \
  --year=2025 \
  --purge
```

---

## 8. TLS (HTTPS)

В панели NetAngels включите **Let's Encrypt** для домена.  
В `.env` используйте `https://` в `DEFAULT_URI` и `MEDIA_BASE_URL`.

---

## 9. Как работает `.htaccess`

Файл в `backend/public/.htaccess` (читается Apache через `www/`):

- `/media/audio/*` → всегда через `index.php` (подписанные URL, перемотка)
- `/media/covers/*`, css, js, player — **статически** Apache (быстрее)
- остальное → Symfony

Если сайт открывается, но **404 на все страницы** — проверьте, что document root = `backend/public` и включён `mod_rewrite`.

Если сайт в **подкаталоге** (редко) — в `.htaccess` раскомментируйте `RewriteBase /подкаталог/`.

---

## 10. Checklist после деплоя

- [ ] https://ваш-домен/ — главная
- [ ] https://ваш-домен/music — каталог
- [ ] Play → звук, **seek** (перемотка) работает
- [ ] Lock screen — обложка (нужен `MEDIA_BASE_URL`)
- [ ] https://ваш-домен/api/v1/albums — JSON
- [ ] https://ваш-домен/admin — только после логина
- [ ] Загрузка трека в админке (файл до 128 МБ)

---

## Производительность на 512 МБ RAM

| Фактор | Влияние |
|--------|---------|
| `APP_ENV=prod` + warmup кэша | обязательно |
| Аудио через PHP | каждая перемотка = запрос к PHP; на shared медленнее, чем nginx-статика |
| OPcache | обычно включён на NetAngels — не отключайте |
| Docker | на shared не используется; на скорость не влияет |

Для десятков треков и личного сайта — **нормально**. При тысячах прослушиваний в день — VPS.

---

## Troubleshooting

| Симптом | Решение |
|---------|---------|
| 500 на всех страницах | Права на `backend/var/`; `open_basedir` должен включать каталог `om-player/` (не только `www/`); `cache:clear --env=prod` |
| 404, белая страница | `www` — symlink на `om-player/public` рядом с репозиторием; `bash scripts/setup-www-symlink.sh` |
| Аудио не играет / 403 | API отдаёт URL с `sig=`; прямой `/media/audio/...` без подписи блокируется |
| Seek не работает | Убедитесь, что `.htaccess` не отдаёт audio как статику (правило `media/audio/` → index.php) |
| Upload failed | Лимиты PHP в панели; права на `var/upload-staging` и `public/media` |
| Composer memory error | `COMPOSER_MEMORY_LIMIT=-1 composer install ...` или install локально |
| MySQL connection refused | Host в `DATABASE_URL` — часто `localhost`, не IP |

---

## Бэкапы

```bash
mysqldump -u DB_USER -p DB_NAME > backup-$(date +%F).sql
tar czf media-$(date +%F).tar.gz -C backend/public media/
```

Медиа не в git — бэкап обязателен.

---

## См. также

- [deployment.md](deployment.md) — VPS + nginx
- [env.md](env.md) — переменные окружения
- [local-setup.md](local-setup.md) — локальная разработка
