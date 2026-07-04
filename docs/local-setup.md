# Локальная разработка

---

## Быстрый старт

```bash
bash scripts/init-env.sh          # backend/.env + пароль admin (показывается один раз)
make docker-mysql                 # MySQL в Docker
make install && make build && make icons
make migrate && make server
# → http://127.0.0.1:8000/
```

Или prod-like стек (nginx + PHP-FPM):

```bash
bash scripts/init-env.sh
make docker-up
# → http://127.0.0.1:8000/
```

---

## URL-адреса

| URL | Назначение |
|-----|------------|
| http://127.0.0.1:8000/ | Demo site |
| http://127.0.0.1:8000/music | Альбомы |
| http://127.0.0.1:8000/music/playlists | Плейлисты |
| http://127.0.0.1:8000/admin | EasyAdmin (**логин/пароль из `.env`**) |
| http://127.0.0.1:8000/admin/analytics | Аналитика |
| http://127.0.0.1:8000/api/v1/albums | REST API |

---

## Импорт альбома

```bash
php backend/bin/console app:import-album --path=/path/to/album --purge
```

---

## Переменные окружения

Единый файл **`backend/.env`** — см. [env.md](env.md).

---

## Тесты

```bash
make test
```
