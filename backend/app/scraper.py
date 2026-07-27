"""
Bright Data scraper for BattleBots web data.
--------------------------------------------
Fetches public BattleBots pages through Bright Data's Web Unlocker API and
parses robot stats out of the HTML.

Docs: https://docs.brightdata.com/scraping-automation/web-unlocker/quickstart

If BRIGHTDATA_API_KEY is not set, scraping is disabled and the API falls back
to the bundled dataset in app/data/ — so you can develop offline.
"""
import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("BRIGHTDATA_API_KEY")
ZONE = os.getenv("BRIGHTDATA_ZONE", "battlebots_unlocker")
BRIGHTDATA_ENDPOINT = "https://api.brightdata.com/request"

WIKI_URL = "https://battlebots.fandom.com/wiki/{robot}"


def is_enabled() -> bool:
    return bool(API_KEY)


def fetch_via_brightdata(url: str) -> str:
    """Fetch a URL's HTML through Bright Data's Web Unlocker."""
    if not API_KEY:
        raise RuntimeError(
            "BRIGHTDATA_API_KEY is not set. Copy backend/.env.example to backend/.env "
            "and add your key. Get one free at https://brightdata.com"
        )
    payload = {"zone": ZONE, "url": url, "format": "raw"}
    headers = {"Authorization": f"Bearer {API_KEY}"}
    resp = requests.post(BRIGHTDATA_ENDPOINT, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    return resp.text


def parse_robot_stats(html: str, robot: str) -> dict:
    """Dependency-free regex parser for the wiki infobox."""
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)

    def find(pattern, default=""):
        m = re.search(pattern, text, re.IGNORECASE)
        return m.group(1).strip() if m else default

    return {
        "robot": robot,
        "weapon_type": (find(r"Weapon(?:\(s\))?[:\s]+([A-Za-z ]{3,30})")
                        .lower().replace(" ", "_") or "unknown"),
        "weight_lb": find(r"Weight[:\s]+(\d{2,3})\s*(?:lbs|pounds)", "250"),
        "country": find(r"Country[:\s]+([A-Za-z ]{3,30})", "USA"),
    }


def scrape_robot(robot: str) -> dict:
    url = WIKI_URL.format(robot=robot.replace(" ", "_"))
    html = fetch_via_brightdata(url)
    return parse_robot_stats(html, robot)
