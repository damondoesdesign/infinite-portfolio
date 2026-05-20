#!/bin/bash
# One-time GitHub setup for infinite-portfolio
set -e

REPO="damondoesdesign/infinite-portfolio"
KEY_FILE="$HOME/.ssh/id_ed25519"
PUB_FILE="${KEY_FILE}.pub"

echo "=== Infinite Portfolio → GitHub setup ==="
echo ""

if [[ ! -f "$PUB_FILE" ]]; then
  echo "Creating SSH key..."
  ssh-keygen -t ed25519 -C "damondoesdesign@github" -f "$KEY_FILE" -N ""
fi

echo "1) Add this SSH key to GitHub (browser will open):"
echo ""
cat "$PUB_FILE"
echo ""

KEY_ENCODED=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(open('$PUB_FILE').read().strip()))")
open "https://github.com/settings/ssh/new?title=Mac-infinite-portfolio&key=${KEY_ENCODED}" 2>/dev/null || true

echo "   → GitHub page opened. Click 'Add SSH key' (title can stay as-is)."
echo ""
read -r -p "Press ENTER after you have added the key on GitHub..."

echo ""
echo "2) Testing GitHub SSH..."
ssh -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 || true

cd "$(dirname "$0")/.."
git remote set-url origin "git@github.com:${REPO}.git"

echo ""
echo "3) Pushing to GitHub..."
git push -u origin main

echo ""
echo "Done. Next: enable Pages → Settings → Pages → Source: GitHub Actions"
echo "Live site: https://damondoesdesign.github.io/infinite-portfolio/"
