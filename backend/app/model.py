"""
BattleBots win-probability model.
---------------------------------
Given two robots, estimate each one's probability of winning.

The score blends three transparent signals (judges care about *reasoning*,
not a black box):

  1. Form       -> career win rate      (wins / (wins + losses))
  2. Finishing  -> KO rate              (ko_wins / wins)
  3. Matchup    -> weapon-vs-weapon advantage table

Head-to-head history nudges the final number. Everything is explainable so
the API can return *why* a robot is favored.
"""
from __future__ import annotations
import os
from functools import lru_cache
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# Rock-paper-scissors style weapon matchup edge.
# value = advantage of ROW weapon when facing COLUMN weapon (-1 .. +1)
# Weapon types: horizontal_spinner, vertical_spinner, drum_spinner, overhead_saw,
#               flipper, lifter, hammer, crusher
WEAPON_EDGE = {
    "horizontal_spinner": {"flipper": 0.30, "lifter": 0.35, "drum_spinner": 0.05,
                           "vertical_spinner": -0.05, "overhead_saw": 0.15,
                           "hammer": 0.25, "crusher": 0.30, "horizontal_spinner": 0.0},
    "vertical_spinner":   {"flipper": 0.25, "lifter": 0.30, "horizontal_spinner": 0.05,
                           "drum_spinner": 0.10, "overhead_saw": 0.10,
                           "hammer": 0.25, "crusher": 0.30, "vertical_spinner": 0.0},
    "drum_spinner":       {"flipper": 0.20, "lifter": 0.25, "horizontal_spinner": -0.05,
                           "vertical_spinner": -0.10, "overhead_saw": 0.05,
                           "hammer": 0.20, "crusher": 0.25, "drum_spinner": 0.0},
    "overhead_saw":       {"flipper": 0.10, "lifter": 0.15, "horizontal_spinner": -0.15,
                           "vertical_spinner": -0.10, "drum_spinner": -0.05,
                           "hammer": 0.10, "crusher": 0.15, "overhead_saw": 0.0},
    "flipper":            {"horizontal_spinner": -0.30, "vertical_spinner": -0.25,
                           "drum_spinner": -0.20, "overhead_saw": -0.10, "lifter": 0.10,
                           "hammer": 0.15, "crusher": 0.20, "flipper": 0.0},
    "lifter":             {"horizontal_spinner": -0.35, "vertical_spinner": -0.30,
                           "drum_spinner": -0.25, "overhead_saw": -0.15, "flipper": -0.10,
                           "hammer": 0.05, "crusher": 0.10, "lifter": 0.0},
    "hammer":             {"horizontal_spinner": -0.25, "vertical_spinner": -0.25,
                           "drum_spinner": -0.20, "overhead_saw": -0.10, "flipper": -0.15,
                           "lifter": -0.05, "crusher": 0.05, "hammer": 0.0},
    "crusher":            {"horizontal_spinner": -0.30, "vertical_spinner": -0.30,
                           "drum_spinner": -0.25, "overhead_saw": -0.15, "flipper": -0.20,
                           "lifter": -0.10, "hammer": -0.05, "crusher": 0.0},
}


@lru_cache(maxsize=1)
def load_data():
    robots = pd.read_csv(os.path.join(DATA_DIR, "robots.csv"))
    matches = pd.read_csv(os.path.join(DATA_DIR, "matches.csv"))
    return robots, matches


def win_rate(row) -> float:
    total = row["wins"] + row["losses"]
    return row["wins"] / total if total else 0.5


def ko_rate(row) -> float:
    return row["ko_wins"] / row["wins"] if row["wins"] else 0.0


def weapon_edge(weapon_a: str, weapon_b: str) -> float:
    return WEAPON_EDGE.get(weapon_a, {}).get(weapon_b, 0.0)


def head_to_head(matches: pd.DataFrame, a: str, b: str):
    mask = (((matches.robot_a == a) & (matches.robot_b == b)) |
            ((matches.robot_a == b) & (matches.robot_b == a)))
    hh = matches[mask]
    return int((hh.winner == a).sum()), int((hh.winner == b).sum())


def list_robots() -> list[dict]:
    robots, _ = load_data()
    return robots.to_dict(orient="records")


def leaderboard() -> list[dict]:
    robots, _ = load_data()
    rows = []
    for _, r in robots.iterrows():
        rows.append({
            "robot": r.robot,
            "weapon_type": r.weapon_type,
            "wins": int(r.wins),
            "losses": int(r.losses),
            "win_rate": round(win_rate(r) * 100, 1),
            "ko_rate": round(ko_rate(r) * 100, 1),
            "builder": r.get("builder", ""),
        })
    rows.sort(key=lambda x: x["win_rate"], reverse=True)
    for i, row in enumerate(rows, 1):
        row["rank"] = i
    return rows


def robot_detail(name: str) -> dict:
    """Full profile for one robot: stats, rank, and match history."""
    robots, matches = load_data()
    if name not in set(robots.robot):
        raise ValueError("Unknown robot name.")
    r = robots[robots.robot == name].iloc[0]

    rank = next((row["rank"] for row in leaderboard() if row["robot"] == name), None)

    history = []
    for _, m in matches.iterrows():
        if m.robot_a == name or m.robot_b == name:
            opponent = m.robot_b if m.robot_a == name else m.robot_a
            history.append({
                "season": int(m.season),
                "opponent": opponent,
                "result": "Win" if m.winner == name else "Loss",
                "method": m.method,
            })
    history.sort(key=lambda x: x["season"], reverse=True)

    return {
        "robot": r.robot,
        "weapon_type": r.weapon_type,
        "weight_lb": int(r.weight_lb),
        "wins": int(r.wins),
        "losses": int(r.losses),
        "ko_wins": int(r.ko_wins),
        "builder": r.get("builder", ""),
        "country": r.get("country", ""),
        "win_rate": round(win_rate(r) * 100, 1),
        "ko_rate": round(ko_rate(r) * 100, 1),
        "rank": rank,
        "matches": history,
    }


def predict(robot_a: str, robot_b: str, use_h2h: bool = True) -> dict:
    robots, matches = load_data()
    names = set(robots.robot)
    if robot_a not in names or robot_b not in names:
        raise ValueError("Unknown robot name.")
    if robot_a == robot_b:
        raise ValueError("Pick two different robots.")

    ra = robots[robots.robot == robot_a].iloc[0]
    rb = robots[robots.robot == robot_b].iloc[0]

    form_a, form_b = win_rate(ra), win_rate(rb)
    ko_a, ko_b = ko_rate(ra), ko_rate(rb)
    edge_a = weapon_edge(ra.weapon_type, rb.weapon_type)
    edge_b = weapon_edge(rb.weapon_type, ra.weapon_type)

    score_a = 0.45 * form_a + 0.25 * ko_a + 0.30 * (0.5 + edge_a)
    score_b = 0.45 * form_b + 0.25 * ko_b + 0.30 * (0.5 + edge_b)

    # Head-to-head is disabled during backtesting to avoid leaking the very
    # match we are trying to predict.
    hh_a, hh_b = head_to_head(matches, robot_a, robot_b)
    if use_h2h and hh_a + hh_b > 0:
        score_a += 0.05 * (hh_a - hh_b)

    total = score_a + score_b
    prob_a = score_a / total if total else 0.5
    prob_b = 1 - prob_a

    winner = robot_a if prob_a >= prob_b else robot_b
    margin = abs(prob_a - prob_b)
    confidence = "HIGH" if margin > 0.20 else "MEDIUM" if margin > 0.08 else "LOW"

    return {
        "robot_a": robot_a,
        "robot_b": robot_b,
        "prob_a": round(prob_a * 100, 1),
        "prob_b": round(prob_b * 100, 1),
        "winner": winner,
        "confidence": confidence,
        "head_to_head": {"a": hh_a, "b": hh_b},
        "signals": {
            "win_rate": {"a": round(form_a * 100, 1), "b": round(form_b * 100, 1)},
            "ko_rate": {"a": round(ko_a * 100, 1), "b": round(ko_b * 100, 1)},
            "weapon_edge": {"a": edge_a, "b": edge_b},
        },
        "reasons": _reasons(ra, rb, form_a, form_b, ko_a, ko_b, edge_a, hh_a, hh_b),
    }


def _reasons(ra, rb, form_a, form_b, ko_a, ko_b, edge_a, hh_a, hh_b) -> list[str]:
    r = []
    if form_a != form_b:
        better = ra.robot if form_a > form_b else rb.robot
        r.append(f"{better} has the stronger career win rate "
                 f"({max(form_a, form_b)*100:.0f}% vs {min(form_a, form_b)*100:.0f}%).")
    if edge_a > 0.05:
        r.append(f"{ra.robot}'s {ra.weapon_type.replace('_', ' ')} matches up well "
                 f"against a {rb.weapon_type.replace('_', ' ')}.")
    elif edge_a < -0.05:
        r.append(f"{rb.robot}'s {rb.weapon_type.replace('_', ' ')} matches up well "
                 f"against a {ra.weapon_type.replace('_', ' ')}.")
    if ko_a > ko_b + 0.1:
        r.append(f"{ra.robot} finishes fights — {ko_a*100:.0f}% of its wins are KOs.")
    elif ko_b > ko_a + 0.1:
        r.append(f"{rb.robot} finishes fights — {ko_b*100:.0f}% of its wins are KOs.")
    if hh_a + hh_b > 0:
        r.append(f"Head-to-head record: {ra.robot} {hh_a} - {hh_b} {rb.robot}.")
    if not r:
        r.append("These two are evenly matched on every signal — near coin-flip.")
    return r


def backtest() -> dict:
    """Validate the model against every historical match.

    Head-to-head is disabled (use_h2h=False) so the model cannot 'cheat' by
    seeing the result of the very fight it is predicting — a fair test of the
    form + finishing + weapon-matchup signals.
    """
    robots, matches = load_data()
    names = set(robots.robot)

    total = correct = 0
    by_conf = {"HIGH": [0, 0], "MEDIUM": [0, 0], "LOW": [0, 0]}   # [correct, total]
    by_method = {"KO": [0, 0], "JD": [0, 0]}
    samples = []

    for _, m in matches.iterrows():
        if m.robot_a not in names or m.robot_b not in names:
            continue
        if m.winner not in (m.robot_a, m.robot_b):
            continue

        p = predict(m.robot_a, m.robot_b, use_h2h=False)
        ok = p["winner"] == m.winner
        total += 1
        correct += int(ok)

        by_conf[p["confidence"]][1] += 1
        by_conf[p["confidence"]][0] += int(ok)
        if m.method in by_method:
            by_method[m.method][1] += 1
            by_method[m.method][0] += int(ok)

        if len(samples) < 12:
            samples.append({
                "season": int(m.season),
                "robot_a": m.robot_a,
                "robot_b": m.robot_b,
                "actual": m.winner,
                "predicted": p["winner"],
                "confidence": p["confidence"],
                "correct": ok,
            })

    def pct(bucket):
        c, t = bucket
        return {"correct": c, "total": t, "accuracy": round(c / t * 100, 1) if t else 0.0}

    return {
        "total": total,
        "correct": correct,
        "accuracy": round(correct / total * 100, 1) if total else 0.0,
        "baseline": 50.0,  # coin-flip
        "by_confidence": {k: pct(v) for k, v in by_conf.items()},
        "by_method": {k: pct(v) for k, v in by_method.items()},
        "samples": samples,
    }


def weapon_meta() -> list[dict]:
    """Aggregate performance by weapon type.

    Combines two views: career record (from the roster) and actual battle
    record (who won when weapon types met in recorded matches).
    """
    robots, matches = load_data()
    name_weapon = dict(zip(robots.robot, robots.weapon_type))

    agg: dict[str, dict] = {}
    for _, r in robots.iterrows():
        a = agg.setdefault(r.weapon_type, {"robots": 0, "wins": 0, "losses": 0, "ko_wins": 0})
        a["robots"] += 1
        a["wins"] += int(r.wins)
        a["losses"] += int(r.losses)
        a["ko_wins"] += int(r.ko_wins)

    battle: dict[str, list[int]] = {}  # weapon -> [wins, losses]
    for _, m in matches.iterrows():
        loser = m.robot_b if m.winner == m.robot_a else m.robot_a
        wl, ll = name_weapon.get(m.winner), name_weapon.get(loser)
        if wl:
            battle.setdefault(wl, [0, 0])[0] += 1
        if ll:
            battle.setdefault(ll, [0, 0])[1] += 1

    rows = []
    for weapon, a in agg.items():
        total = a["wins"] + a["losses"]
        bw, bl = battle.get(weapon, [0, 0])
        btotal = bw + bl
        rows.append({
            "weapon": weapon,
            "robots": a["robots"],
            "wins": a["wins"],
            "losses": a["losses"],
            "win_rate": round(a["wins"] / total * 100, 1) if total else 0.0,
            "ko_rate": round(a["ko_wins"] / a["wins"] * 100, 1) if a["wins"] else 0.0,
            "battle_wins": bw,
            "battle_losses": bl,
            "battle_rate": round(bw / btotal * 100, 1) if btotal else 0.0,
        })
    rows.sort(key=lambda x: x["battle_rate"], reverse=True)
    return rows


def upsets(limit: int = 10) -> list[dict]:
    """Biggest upsets: historical fights where the model's favorite lost.

    Ranked by how confident the model was in the (wrong) favorite — a high
    number means a big underdog win. Head-to-head is disabled for a fair test.
    """
    robots, matches = load_data()
    names = set(robots.robot)

    found = []
    for _, m in matches.iterrows():
        if m.robot_a not in names or m.robot_b not in names:
            continue
        if m.winner not in (m.robot_a, m.robot_b):
            continue
        p = predict(m.robot_a, m.robot_b, use_h2h=False)
        if p["winner"] != m.winner:
            favorite = p["winner"]
            fav_prob = p["prob_a"] if favorite == m.robot_a else p["prob_b"]
            found.append({
                "season": int(m.season),
                "favorite": favorite,
                "fav_prob": fav_prob,
                "actual_winner": m.winner,
                "method": m.method,
            })
    found.sort(key=lambda x: x["fav_prob"], reverse=True)
    return found[:limit]


def tournament(names: list[str]) -> dict:
    """Simulate a single-elimination bracket over the given robots.

    Trims to the largest power of two so the bracket is balanced.
    """
    robots, _ = load_data()
    valid_names = set(robots.robot)

    seen, bracket = set(), []
    for n in names:
        if n in valid_names and n not in seen:
            seen.add(n)
            bracket.append(n)

    size = 1
    while size * 2 <= len(bracket):
        size *= 2
    if size < 2:
        raise ValueError("Need at least two valid, distinct robots.")
    bracket = bracket[:size]

    rounds = []
    current = bracket
    while len(current) > 1:
        round_matches, next_round = [], []
        for i in range(0, len(current), 2):
            a, b = current[i], current[i + 1]
            p = predict(a, b, use_h2h=True)
            round_matches.append({
                "a": a, "b": b, "winner": p["winner"],
                "prob_a": p["prob_a"], "prob_b": p["prob_b"],
            })
            next_round.append(p["winner"])
        rounds.append(round_matches)
        current = next_round

    return {"size": size, "seeds": bracket, "rounds": rounds, "champion": current[0]}
