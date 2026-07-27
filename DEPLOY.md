# 🚀 Deploy to GitHub Pages — get a live public link

The Angular app runs in offline **demo mode** without the Python backend, so it
deploys as a static site and works fully on GitHub Pages. A GitHub Actions
workflow (`.github/workflows/deploy.yml`) builds and publishes it automatically
on every push to `main`.

You only need to do the GitHub-side steps below (they need **your** account, so
I can't do them for you).

---

## One-time setup

### 1. Create an empty repo on GitHub
Go to https://github.com/new → name it e.g. **`battlebots-predictor`** →
**Public** → **do NOT** add a README/.gitignore (the project already has them) →
**Create repository**.

### 2. Connect this folder and push
Run these in `G:\battle` (replace `YOUR-USERNAME` and repo name if different):

```bash
git remote add origin https://github.com/YOUR-USERNAME/battlebots-predictor.git
git branch -M main
git push -u origin main
```

> First push will ask you to sign in to GitHub (browser or token). That's your
> credentials — I never handle them.

### 3. Turn on GitHub Pages (Actions source)
On GitHub: **Settings → Pages → Build and deployment → Source = GitHub Actions**.

That's it. The workflow runs automatically. When it finishes (Actions tab → green
check), your live link is:

```
https://YOUR-USERNAME.github.io/battlebots-predictor/
```

---

## After that
Every `git push` re-deploys automatically. To update:
```bash
git add -A
git commit -m "Update"
git push
```

---

## Want the live Python backend too? (optional)
The site works without it. To also host the FastAPI backend (for live Bright
Data scraping), deploy `backend/` to a free host like **Render**:

1. https://render.com → New → Web Service → connect the repo
2. Root directory: `backend`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add env vars `BRIGHTDATA_API_KEY`, `BRIGHTDATA_ZONE`
6. Then set the backend URL in `frontend/src/app/services/battlebots.service.ts`
   (`base`) and push — the app switches from demo mode to live data.
