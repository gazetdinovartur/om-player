# Docker

## MySQL only (backend на хосте)

```bash
docker compose up -d mysql
```

В `backend/.env.local`:

```bash
DATABASE_URL="mysql://om:om@127.0.0.1:3306/om_player?serverVersion=8.4&charset=utf8mb4"
```

Затем на хосте: `make migrate && make server`

---

## Полный стек (MySQL + PHP app)

```bash
make docker-up
# → http://127.0.0.1:8000/
```

Собирает player, поднимает MySQL и Symfony в контейнере `app`.

---

## MinIO (опционально)

```bash
docker compose --profile s3 up -d
# API: http://127.0.0.1:9000  Console: http://127.0.0.1:9001
```

---

## Команды

| Команда | Действие |
|---------|----------|
| `make docker-up` | build player + `docker compose up -d --build` |
| `make docker-down` | остановить контейнеры |
| `make docker-logs` | логи app + mysql |
