# Конфиги для production

| Файл | Назначение |
|------|------------|
| [nginx.conf.example](nginx.conf.example) | VPS: nginx + PHP-FPM |
| [../backend/public/.htaccess](../backend/public/.htaccess) | Shared-хостинг: Apache |

## Shared-хостинг (NetAngels): `www` рядом с `om-player`

```
/home/user/music.arturlun.ru/
├── om-player/
│   └── backend/public/
└── www -> .../om-player/backend/public     ← document root
```

```bash
cd om-player && bash scripts/setup-www-symlink.sh
```

Документация:

- VPS — [docs/deployment.md](../docs/deployment.md)
- Shared — [docs/deploy/shared-hosting.md](../docs/deploy/shared-hosting.md)
