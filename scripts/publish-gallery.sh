#!/bin/bash
# Sync drop folder → build site → push to GitHub. Run after adding images.
set -e
cd "$(dirname "$0")/.."

echo "→ Syncing gallery from drop folder..."
node scripts/sync-gallery.mjs
npm run merge

echo "→ Building site..."
npm run build:pages

echo "→ Publishing to GitHub..."
git add -A
if git diff --cached --quiet; then
  echo "Nothing new to publish (no file changes)."
  exit 0
fi

git commit -m "Gallery update $(date '+%Y-%m-%d %H:%M')"
git push origin main

echo ""
echo "Live soon: https://damondoesdesign.github.io/infinite-portfolio/"
