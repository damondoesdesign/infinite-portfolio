#!/bin/bash
# Push site to GitHub — no Actions workflow, no special token scopes.
set -e
cd "$(dirname "$0")/.."

REPO="damondoesdesign/infinite-portfolio"

echo "Building site into docs/ ..."
npm run build:pages

if ! git remote get-url origin &>/dev/null; then
  git remote add origin "https://github.com/${REPO}.git"
fi

git add -A
if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  git commit -m "Update site build for GitHub Pages"
fi

echo ""
echo "Pushing to GitHub..."
echo "(If asked: username = damondoesdesign, password = your Personal Access Token)"
echo ""

git push -u origin main

echo ""
echo "=== SUCCESS ==="
echo "One last step in the browser:"
echo "  https://github.com/${REPO}/settings/pages"
echo "  → Build and deployment → Deploy from a branch"
echo "  → Branch: main  →  Folder: /docs  →  Save"
echo ""
echo "Live in ~1 min: https://damondoesdesign.github.io/infinite-portfolio/"
