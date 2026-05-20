# Infinite Portfolio

A black-and-white infinite canvas portfolio. Pan by dragging whitespace or the canvas; click a tile to open detail view with optional carousel (2–5 images per project).

**Local dev:** `npm install` → `npm run dev` → open http://localhost:5173

**Content admin (after GitHub setup):** `/admin` — see [Connecting GitHub](#connecting-github) below.

---

## Connecting GitHub

Your machine is **not** linked to GitHub yet for this project. Here is what we found:

| Check | Status |
|-------|--------|
| Git installed | Yes (`damon` / `damon@…`) |
| GitHub CLI (`gh`) | **Not installed** |
| This project git repo | Will be initialized on first commit |
| Remote `origin` | **None yet** |

### Step 1 — Create the repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Repository name: **`infinite-portfolio`** (must match `vite.config.ts` base path, or update both)
3. Visibility: Public (required for free GitHub Pages on personal accounts)
4. **Do not** add README, .gitignore, or license (we already have them)
5. Click **Create repository**

### Step 2 — Push this project from your Mac

In Terminal:

```bash
cd ~/Documents/infinite-portfolio

git init
git add .
git commit -m "Initial infinite portfolio site"

git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/infinite-portfolio.git
git push -u origin main
```

Replace `YOUR_GITHUB_USERNAME` with your real GitHub username.

**Authentication:** GitHub no longer accepts account passwords for `git push`. Use one of:

- **HTTPS + Personal Access Token:** GitHub → Settings → Developer settings → Personal access tokens → Generate (scope: `repo`). Use the token as the password when `git push` asks.
- **SSH:** Add an SSH key to GitHub, then use `git@github.com:USERNAME/infinite-portfolio.git` as the remote URL.

### Step 3 — Enable GitHub Pages

1. On GitHub, open the repo → **Settings** → **Pages**
2. **Build and deployment** → Source: **GitHub Actions**
3. After the first push, the workflow **Deploy to GitHub Pages** runs automatically
4. Live URL: `https://YOUR_GITHUB_USERNAME.github.io/infinite-portfolio/`

If the site is blank, confirm the repo name matches the `base` in `vite.config.ts` (`/infinite-portfolio/`).

### Step 4 — (Optional) Install GitHub CLI

```bash
brew install gh
gh auth login
```

Then you can create repos and open PRs from the terminal.

### Step 5 — Content admin (`/admin`)

1. Edit `public/admin/index.html` — set `repo: 'YOUR_GITHUB_USERNAME/infinite-portfolio'`
2. For **local** editing without OAuth: run `npx decap-server` in one terminal and use `local_backend: true` (already in config when developing)
3. For **production** admin on GitHub Pages, you need a **GitHub OAuth App** + auth proxy (documented in [Sveltia CMS GitHub backend](https://sveltia.com/docs/backends/github/)). We can wire this once the repo exists.

---

## Adding work (drop folder — no code)

1. Drop a folder of images into **`public/images/drop/your-project-name/`**
2. Tell Cursor **“sync the gallery”** or run `npm run publish`
3. Site updates automatically

Optional inside each project folder: `_title.txt`, `_year.txt`, `_sort.txt`

**Auto-publish while you work:** `npm run watch` (watches the drop folder)

---

## Project structure

- `src/canvas.ts` — infinite pan, wrap, grip-drag, desktop drift
- `src/detail.ts` — fullscreen detail + carousel
- `content/projects.json` — built manifest (do not hand-edit if using per-file CMS entries)
- `public/images/placeholders/` — demo SVG tiles
- `public/admin/` — Sveltia CMS

---

## Cursor / VS Code

Open the folder: **File → Open Folder → `~/Documents/infinite-portfolio`**
