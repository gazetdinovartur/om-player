#!/usr/bin/env bash
# NetAngels / shared-хостинг:
#
#   site-dir/
#   ├── om-player/
#   │   └── backend/public/
#   └── www -> site-dir/om-player/backend/public
#
# Запуск из каталога om-player:
#   bash scripts/setup-www-symlink.sh
#
# Или явно указать каталог сайта:
#   SITE_DIR=/home/c502022/music.arturlun.ru bash scripts/setup-www-symlink.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="${SITE_DIR:-$(dirname "$ROOT")}"
TARGET="$ROOT/backend/public"
WWW_LINK="$SITE_DIR/www"

if [[ ! -d "$TARGET" ]]; then
    echo "ERROR: $TARGET not found." >&2
    exit 1
fi

if [[ -e "$WWW_LINK" && ! -L "$WWW_LINK" ]]; then
    echo "ERROR: $WWW_LINK exists and is not a symlink. Remove or rename it first." >&2
    exit 1
fi

ln -sfn "$TARGET" "$WWW_LINK"

echo "OK: $WWW_LINK -> $TARGET"
ls -la "$WWW_LINK"
