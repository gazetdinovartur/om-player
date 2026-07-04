# Деплой на music.arturlun.ru

Пошаговый runbook для production (VPS + nginx). Локальная разработка — в [local-setup.md](local-setup.md).

> **Shared-хостинг (NetAngels, Apache, .htaccess):** [deploy/shared-hosting.md](deploy/shared-hosting.md)

---

## Требования к серверу

| Компонент | Версия |
|-----------|--------|
| PHP | 8.4+ (extensions: pdo_mysql, gd, mbstring, xml, ctype, iconv) |
| MySQL | 8.4+ |
| Composer | 2.x |
| nginx | 1.18+ (или Caddy/Apache) |
| TLS | Let's Encrypt (certbot) |

Node.js на сервере **не нужен** — player собирается локально/в CI и коммитится в `backend/public/build/player/`.

---

## 1. Клонирование и сборка

```bash
git clone git@github.com:YOUR/om-player.git
cd om-player

# Собрать player (или использовать уже закоммиченные assets)
make build

cd backend
composer install --no-dev --optimize-autoloader
```

---

## 2. Переменные окружения

```bash
cp backend/.env.example backend/.env
# или: bash scripts/init-env.sh  (сгенерирует APP_SECRET и ADMIN_PASSWORD)
```

Production-значения для **music.arturlun.ru**:

```bash
APP_ENV=prod
APP_SECRET=<openssl rand -hex 32>

DEFAULT_URI=https://music.arturlun.ru

DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/om_player?serverVersion=8.4&charset=utf8mb4"

# Embed с arturlun.ru и других своих доменов
CORS_ALLOW_ORIGIN='^https://(music\.arturlun\.ru|arturlun\.ru|www\.arturlun\.ru)$'

JMO_DEFAULT_ARTIST_NAME="Артур Лун"

MEDIA_BASE_URL=https://music.arturlun.ru

ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-password>
```

Полный справочник: [env.md](env.md).

За reverse proxy (nginx + TLS):

```bash
# .env.local — если Symfony за nginx/Cloudflare
TRUSTED_PROXIES=127.0.0.1,REMOTE_ADDR
TRUSTED_HOSTS='^music\.arturlun\.ru$'
```

---

## 3. База данных и миграции

```bash
# Создать БД и пользователя в MySQL
mysql -u root -p <<'SQL'
CREATE DATABASE om_player CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'om'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';
GRANT ALL ON om_player.* TO 'om'@'localhost';
FLUSH PRIVILEGES;
SQL

cd backend
php bin/console doctrine:migrations:migrate --no-interaction --env=prod
php bin/console cache:clear --env=prod
```

---

## 4. Импорт музыки

Медиафайлы **не в git**. Загрузите альбом на сервер и импортируйте:

```bash
# Скопировать папку альбома на сервер, например /var/music/nachalo/
php bin/console app:import-album \
  --path=/var/music/nachalo \
  --album="Начало" \
  --artist="Артур Лун" \
  --year=2025 \
  --purge
```

Флаг `--purge` удаляет старый каталог и медиа перед импортом — **всегда используйте при повторном импорте**, иначе файлы дублируются.

Альтернатива: загрузка через админку `/admin/upload-track` (после настройки auth!).

---

## 5. nginx

Пример конфига: [../deploy/nginx.conf.example](../deploy/nginx.conf.example).

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/music.arturlun.ru
sudo ln -s /etc/nginx/sites-available/music.arturlun.ru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Ключевые моменты:

- **Document root** → `backend/public/`
- **Аудио и обложки** — nginx отдаёт статику напрямую (Range для seek)
- **Symfony** — только `/index.php` через PHP-FPM
- **CORS** на `/media/` если embed с других доменов

---

## 6. TLS (Let's Encrypt)

```bash
sudo certbot --nginx -d music.arturlun.ru
```

---

## 7. Права на файлы

```bash
sudo chown -R www-data:www-data backend/var backend/public/media
sudo chmod -R 775 backend/var backend/public/media
```

`public/media/audio/` и `covers/` должны быть writable для загрузок через админку.

---

## 8. Post-deploy checklist

- [ ] https://music.arturlun.ru/ — главная открывается
- [ ] https://music.arturlun.ru/music — каталог альбомов
- [ ] Play → аудио играет, seek работает (Range)
- [ ] Lock screen — обложка и метаданные (нужен `MEDIA_BASE_URL`)
- [ ] https://music.arturlun.ru/api/v1/albums — JSON API
- [ ] https://music.arturlun.ru/admin — **закрыт паролем** (см. ниже)
- [ ] `php bin/console cache:clear --env=prod` после смены env

---

## ⚠️ Админка

`/admin` защищён логином и паролем из `.env`:

- `ADMIN_USERNAME` (default: `admin`)
- `ADMIN_PASSWORD` (генерируется `scripts/init-env.sh`)

Страница входа: `/admin/login`

---

## Обновление (release)

```bash
git pull
make build                    # если менялся player
cd backend
composer install --no-dev --optimize-autoloader
php bin/console doctrine:migrations:migrate --no-interaction --env=prod
php bin/console cache:clear --env=prod
sudo systemctl reload php8.4-fpm
```

---

## Бэкапы

| Что | Как |
|-----|-----|
| БД | `mysqldump om_player > backup.sql` |
| Медиа | `tar czf media.tar.gz backend/public/media/` |

Медиа не в git — бэкап обязателен.

---

## Troubleshooting

| Симптом | Решение |
|---------|---------|
| 502 Bad Gateway | Проверить php-fpm socket в nginx |
| Seek не работает | nginx должен отдавать `/media/audio/` с `Accept-Ranges` |
| Нет обложки на lock screen | `MEDIA_BASE_URL=https://music.arturlun.ru` |
| CORS error при embed | `CORS_ALLOW_ORIGIN` + nginx CORS на `/media/` |
| 500 после deploy | `backend/var/` writable, `cache:clear --env=prod` |
| Диск раздувается | Повторный import без `--purge` — см. [overview.md](overview.md) |
