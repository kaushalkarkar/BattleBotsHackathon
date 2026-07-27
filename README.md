<div align="center">

# ⚔️ BattleBots Win Predictor

**Predict any BattleBots matchup — and understand _why_ — from real web data collected with [Bright Data](https://brightdata.com).**

`Angular` frontend · `Python / FastAPI` backend · `Bright Data` web scraping

`#battlebotsdev`

</div>

---

## 🎯 What this is

A full-stack developer project for the **Bright Data × BattleBots** challenge.
It uses **Bright Data** to collect BattleBots web data (match history, weapon
specs, KO records), serves predictions through a **FastAPI** backend, and
presents them in an **Angular** dashboard.

Pick two robots → the app predicts the winner, shows a win-probability bar, a
confidence level, and a plain-English explanation of the reasoning — plus a live
leaderboard of every robot.

> **Design principle:** the judges are engineers who value *substance over polish*.
> So the model is fully **transparent and explainable** — no black box. Every
> prediction shows the exact signals behind it.

---

## 🏗️ Architecture

```
┌─────────────────────┐      HTTP/JSON      ┌──────────────────────┐      Web Unlocker      ┌─────────────┐
│   Angular frontend   │  ───────────────▶  │   FastAPI backend     │  ──────────────────▶  │ Bright Data │
│  (predictor + board) │  ◀───────────────  │  (model + scraper)    │  ◀──────────────────  │   network   │
└─────────────────────┘   predictions       └──────────────────────┘   BattleBots pages     └─────────────┘
       :4200                                        :8000
```

| Layer | Tech | Responsibility |
|-------|------|----------------|
| **Frontend** | Angular 17 (standalone components) | Matchup UI, probability bar, leaderboard |
| **Backend** | FastAPI + pandas | REST API, prediction model |
| **Data** | Bright Data Web Unlocker | Collect BattleBots stats from the web |

---

## 📁 Project structure

```
battle/
├── backend/                     # Python / FastAPI
│   ├── app/
│   │   ├── main.py              # API endpoints (/robots, /leaderboard, /predict, /scrape)
│   │   ├── model.py             # win-probability model (the core logic)
│   │   ├── scraper.py           # Bright Data Web Unlocker scraper
│   │   └── data/
│   │       ├── robots.csv       # robot stats
│   │       └── matches.csv      # historical results
│   ├── requirements.txt
│   ├── .env.example             # Bright Data credentials template
│   └── README.md
│
├── frontend/                    # Angular 17
│   ├── src/app/
│   │   ├── app.component.*       # shell + data loading
│   │   ├── components/predictor/ # matchup picker + result
│   │   ├── components/leaderboard/
│   │   ├── services/battlebots.service.ts
│   │   └── models/battlebots.models.ts
│   ├── package.json
│   └── README.md
│
├── publish/social_post.md       # ready-to-post #battlebotsdev copy
└── README.md                    # you are here
```

---

## 🚀 Quick start

### 1. Backend (terminal 1)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```
→ API at http://localhost:8000  ·  interactive docs at http://localhost:8000/docs

### 2. Frontend (terminal 2)
```bash
cd frontend
npm install
npm start
```
→ App at http://localhost:4200

> **Prerequisites:** Python 3.10+ and Node.js 18+.
> The app runs on the bundled dataset out of the box — Bright Data credentials
> are only needed for *live* scraping (below).

---

## 🌐 Bright Data — live scraping

1. Sign up (free trial): https://brightdata.com
2. Create a **Web Unlocker** zone in the dashboard.
3. `cd backend`, copy `.env.example` → `.env`, and fill in:
   ```
   BRIGHTDATA_API_KEY=your_key
   BRIGHTDATA_ZONE=your_zone
   ```
4. Live-scrape a robot:
   ```
   GET http://localhost:8000/scrape/Tombstone
   ```
The `scraper.py` module fetches public BattleBots pages *through Bright Data's
network* (Web Unlocker handles blocks, CAPTCHAs, and geo-restrictions) and
parses robot stats from the HTML.

---

## 🧠 How the model works

Each matchup is scored from three transparent signals:

```
score = 0.45 · win_rate  +  0.25 · ko_rate  +  0.30 · (0.5 + weapon_edge)
```

| Signal | Meaning |
|--------|---------|
| **Win rate** | Career form — `wins / (wins + losses)` |
| **KO rate** | Finishing power — `ko_wins / wins` |
| **Weapon edge** | Rock-paper-scissors matchup table (e.g. horizontal spinner vs flipper) |

Head-to-head history then nudges the score, probabilities are normalized
between the two robots, and **confidence** is derived from the margin.
The API returns the winner, both probabilities, the raw signals, and a list of
human-readable reasons.

**Example — `GET /predict?a=Tombstone&b=Minotaur`:**
```json
{
  "winner": "Tombstone",
  "prob_a": 55.2,
  "prob_b": 44.8,
  "confidence": "LOW",
  "reasons": [
    "Tombstone has the stronger career win rate (72% vs 68%).",
    "Tombstone finishes fights — 73% of its wins are KOs.",
    "Head-to-head record: Tombstone 0 - 1 Minotaur."
  ]
}
```

---

## 📡 API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/robots` | All robots with raw stats |
| `GET` | `/leaderboard` | Robots ranked by win rate |
| `GET` | `/predict?a=&b=` | Predicted winner + reasoning |
| `GET` | `/scrape/{robot}` | Live-scrape a robot via Bright Data |
| `GET` | `/docs` | Swagger UI |

---

## 🏆 How this maps to the judging criteria

| Criterion | How the project delivers |
|-----------|--------------------------|
| **Clarity & creativity** | A focused idea — predict + explain matchups — not a data dump |
| **Technical execution (Bright Data)** | Real Web Unlocker integration with graceful offline fallback |
| **Real-world impact / originality** | Explainable predictions with confidence, not a black box |
| **Published with #battlebotsdev** | Ready-to-post copy in `publish/social_post.md` |

---

## 📤 Publishing (for the challenge)

1. Push to a **public GitHub repo**.
2. Deploy the frontend (GitHub Pages / Netlify / Vercel) and the backend
   (Render / Railway / Fly.io) for a live link.
3. Post on GitHub / X / LinkedIn / Dev.to tagged **#battlebotsdev**
   (copy in [`publish/social_post.md`](publish/social_post.md)).
4. Submit at https://brightdata.com/lp/battlebots **before 31 July 2026**.

---

<div align="center">

Built with [Bright Data](https://brightdata.com) · **#battlebotsdev**

</div>
