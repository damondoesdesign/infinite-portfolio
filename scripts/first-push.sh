#!/bin/bash
# Run this in the macOS Terminal app (interactive). Cursor cannot enter your GitHub code.
set -e
cd "$(dirname "$0")/.."

echo ""
echo "=========================================="
echo "  Step 1: Log into GitHub (browser)"
echo "=========================================="
echo ""
echo "A code will appear below. Copy it."
echo "Browser opens → paste code → Authorize"
echo ""

gh auth login --hostname github.com --git-protocol https --web
gh auth setup-git

echo ""
echo "=========================================="
echo "  Step 2: Push your site"
echo "=========================================="
echo ""

git remote set-url origin https://github.com/damondoesdesign/infinite-portfolio.git
git push -u origin main

echo ""
echo "=========================================="
echo "  Step 3: Enable Pages (do in browser)"
echo "=========================================="
echo ""
echo "https://github.com/damondoesdesign/infinite-portfolio/settings/pages"
echo "  → Deploy from a branch"
echo "  → main + /docs folder → Save"
echo ""
open "https://github.com/damondoesdesign/infinite-portfolio/settings/pages" 2>/dev/null || true

echo "Live soon at: https://damondoesdesign.github.io/infinite-portfolio/"
