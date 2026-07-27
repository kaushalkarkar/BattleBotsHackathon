"""
FastAPI backend for the BattleBots Win Predictor.
Run:  uvicorn app.main:app --reload   (from the backend/ folder)
Docs: http://localhost:8000/docs
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import model
from . import scraper

app = FastAPI(
    title="BattleBots Win Predictor API",
    description="Predict BattleBots matchups from web data collected via Bright Data. #battlebotsdev",
    version="1.0.0",
)

# Public read-only API — allow any origin so the deployed frontend (and local
# dev server) can call it. No credentials are used.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["meta"])
def root():
    return {
        "name": "BattleBots Win Predictor API",
        "scraping_enabled": scraper.is_enabled(),
        "endpoints": ["/robots", "/leaderboard", "/predict?a=&b=", "/scrape/{robot}", "/docs"],
    }


@app.get("/robots", tags=["data"])
def get_robots():
    """All robots with raw stats."""
    return model.list_robots()


@app.get("/leaderboard", tags=["data"])
def get_leaderboard():
    """Robots ranked by win rate."""
    return model.leaderboard()


@app.get("/robot/{name}", tags=["data"])
def get_robot(name: str):
    """Full profile for one robot: stats, rank, and match history."""
    try:
        return model.robot_detail(name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/predict", tags=["prediction"])
def get_prediction(
    a: str = Query(..., description="Robot A name, e.g. Tombstone"),
    b: str = Query(..., description="Robot B name, e.g. Minotaur"),
):
    """Predict the winner of a matchup, with reasoning."""
    try:
        return model.predict(a, b)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/backtest", tags=["prediction"])
def get_backtest():
    """Validate the model against all historical matches; returns accuracy."""
    return model.backtest()


@app.get("/weapon-meta", tags=["data"])
def get_weapon_meta():
    """Aggregate performance by weapon type (career + actual battle record)."""
    return model.weapon_meta()


@app.get("/upsets", tags=["prediction"])
def get_upsets(limit: int = 10):
    """Biggest historical upsets — fights where the model's favorite lost."""
    return model.upsets(limit)


@app.get("/tournament", tags=["prediction"])
def get_tournament(
    robots: str = Query(..., description="Comma-separated robot names (2, 4, 8, 16…)"),
):
    """Simulate a single-elimination bracket and return every round + champion."""
    names = [n.strip() for n in robots.split(",") if n.strip()]
    try:
        return model.tournament(names)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class ScrapeResult(BaseModel):
    robot: str
    weapon_type: str
    weight_lb: str
    country: str


@app.get("/scrape/{robot}", response_model=ScrapeResult, tags=["scraping"])
def scrape(robot: str):
    """Live-scrape a robot's stats from the web via Bright Data."""
    if not scraper.is_enabled():
        raise HTTPException(
            status_code=503,
            detail="Bright Data is not configured. Add BRIGHTDATA_API_KEY to backend/.env.",
        )
    try:
        return scraper.scrape_robot(robot)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Scrape failed: {e}")
