# ▲ Deploy to Vercel — frontend + backend

Both parts deploy from the **same GitHub repo** as **two separate Vercel
projects** (different Root Directories). Config files are already in place:

- `frontend/vercel.json` — Angular static build
- `backend/vercel.json` + `backend/api/index.py` — FastAPI as a Python serverless function

You do the Vercel-side clicks (they need **your** Vercel login — I never handle it).
Sign up free at https://vercel.com with your GitHub account.

---

## 1️⃣ Deploy the backend (do this first to get its URL)

1. https://vercel.com/new → **Import** the `BattleBotsHackathon` repo.
2. **Root Directory** → click *Edit* → select **`backend`**.
3. Framework Preset: **Other** (Vercel auto-detects Python from `requirements.txt` + `api/`).
4. (Optional) Environment Variables → add `BRIGHTDATA_API_KEY` and `BRIGHTDATA_ZONE` for live scraping.
5. **Deploy.**

When it finishes you get a URL like `https://battlebots-backend.vercel.app`.
Check it works: open `https://<that-url>/docs` → the Swagger API page.

---

## 2️⃣ Deploy the frontend

1. https://vercel.com/new → **Import** the **same** repo again (New Project).
2. **Root Directory** → **`frontend`**.
3. Framework Preset: **Angular** (or Other — `vercel.json` sets build + output).
4. **Deploy.**

You get a URL like `https://battlebots-hackathon.vercel.app`. It works
immediately in **offline demo mode** (all features functional).

---

## 3️⃣ Connect frontend → backend (live data)

Point the frontend at your deployed backend so it uses live API data instead of
the offline dataset:

1. Edit `frontend/src/index.html`, set the backend URL:
   ```html
   <script>window.__API_BASE__ = "https://battlebots-backend.vercel.app";</script>
   ```
2. Commit & push:
   ```bash
   git add -A
   git commit -m "Wire frontend to deployed backend"
   git push
   ```
Vercel auto-redeploys the frontend. The "Demo mode" banner disappears — it's now
pulling from the live FastAPI backend.

> Prefer to keep it standalone? Leave `__API_BASE__` empty — the site stays in
> demo mode and still works everywhere (great for GitHub Pages too).

---

## Notes
- Every `git push` auto-redeploys both Vercel projects.
- The backend bundles `app/**` (including the CSV data) via `includeFiles` in
  `backend/vercel.json`, so predictions work even without Bright Data credentials.
- CORS is open (`allow_origins=["*"]`) so the frontend origin can call the API.
