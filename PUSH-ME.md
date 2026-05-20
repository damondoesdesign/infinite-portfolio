# Push to GitHub (2 minutes)

I fixed the project so push **no longer needs** the annoying `workflow` token scope.

## Do this in **Terminal** (not Cursor chat)

Copy and paste this **entire block**:

```bash
cd ~/Documents/infinite-portfolio
ssh-add --apple-use-keychain ~/.ssh/id_ed25519 2>/dev/null
git remote set-url origin git@github.com:damondoesdesign/infinite-portfolio.git
git push -u origin main
```

### If that says `Permission denied (publickey)`

Run this instead (browser login — **one code**, then push):

```bash
cd ~/Documents/infinite-portfolio
gh auth login --hostname github.com --git-protocol ssh --web
git push -u origin main
```

`gh` will print a code like `ABCD-1234`. Enter it at https://github.com/login/device

### If it asks for username/password (HTTPS)

Your remote is HTTPS. Use:

- **Username:** `damondoesdesign`
- **Password:** a [Personal Access Token](https://github.com/settings/tokens) with **repo** checked (not your GitHub password)

---

## Turn on the live site (browser, 30 sec)

1. Open https://github.com/damondoesdesign/infinite-portfolio/settings/pages
2. **Deploy from a branch**
3. Branch: **main** → Folder: **/docs** → **Save**
4. Wait ~1 minute → https://damondoesdesign.github.io/infinite-portfolio/

---

## Why I can't "take over" GitHub

GitHub requires **you** to prove it's your account (SSH key or one-time code). No app can bypass that. I already:

- Built the site into `docs/`
- Removed the broken Actions workflow
- Committed everything locally

You only need **one successful `git push`** from your Terminal.
