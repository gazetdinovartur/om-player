#!/usr/bin/env bash
# NetAngels / shared-хостинг:
#
#   site-dir/
#   ├── om-player/
#   │   └── public -> backend/public   ← в репозитории
#   └── www -> site-dir/om-player/public
#
# Запуск из каталога om-player:
#   bash scripts/setup-www-symlink.sh
#
# Или явно указать каталог сайта (где лежат om-player и www):
#   SITE_DIR=/home/c502022/music.arturlun.ru bash scripts/setup-www-symlink.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="${SITE_DIR:-$(dirname "$ROOT")}"
PUBLIC_LINK="$ROOT/public"
WWW_LINK="$SITE_DIR/www"

ln -sfn backend/public "$PUBLIC_LINK"

if [[ -e "$WWW_LINK" && ! -L "$WWW_LINK" ]]; then
    echo "ERROR: $WWW_LINK exists and is not a symlink. Remove or rename it first." >&2
    exit 1
fi

ln -sfn "$PUBLIC_LINK" "$WWW_LINK"

echo "OK:"
echo "  $PUBLIC_LINK -> backend/public"
echo "  $WWW_LINK -> $PUBLIC_LINK"
ls -la "$PUBLIC_LINK" "$WWW_LINK"
