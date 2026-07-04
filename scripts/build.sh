#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/player"
npm install
npm run build
mkdir -p "$ROOT/backend/public/build/player"
cp -r dist/* "$ROOT/backend/public/build/player/"
echo "Player built → backend/public/build/player/"
