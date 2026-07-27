# Backend — FastAPI

Prediction API for the BattleBots Win Predictor.

## Setup
```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API runs at http://localhost:8000 — interactive docs at http://localhost:8000/docs

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/robots` | All robots with raw stats |
| GET | `/leaderboard` | Robots ranked by win rate |
| GET | `/predict?a=Tombstone&b=Minotaur` | Predicted winner + reasoning |
| GET | `/scrape/{robot}` | Live-scrape a robot via Bright Data |

## Bright Data (live scraping)
Copy `.env.example` → `.env`, add `BRIGHTDATA_API_KEY` and `BRIGHTDATA_ZONE`.
Without it, `/predict` and `/leaderboard` still work on the bundled dataset.
