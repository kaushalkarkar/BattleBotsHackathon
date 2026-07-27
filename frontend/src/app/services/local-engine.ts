// Offline prediction engine — a faithful TypeScript port of backend/app/model.py.
// Used only as a fallback when the FastAPI backend is unreachable, so the
// frontend (and a GitHub Pages deployment) stays fully functional on its own.
import {
  BacktestResult,
  BacktestSample,
  Bucket,
  LeaderboardRow,
  Prediction,
  Robot,
  RobotDetail,
  RobotMatch,
  TournamentResult,
  Upset,
  WeaponMeta,
} from '../models/battlebots.models';
import { DEMO_MATCHES, DEMO_ROBOTS } from './demo-data';

type EdgeTable = Record<string, Record<string, number>>;

const WEAPON_EDGE: EdgeTable = {
  horizontal_spinner: { flipper: 0.3, lifter: 0.35, drum_spinner: 0.05, vertical_spinner: -0.05, overhead_saw: 0.15, hammer: 0.25, crusher: 0.3, horizontal_spinner: 0 },
  vertical_spinner: { flipper: 0.25, lifter: 0.3, horizontal_spinner: 0.05, drum_spinner: 0.1, overhead_saw: 0.1, hammer: 0.25, crusher: 0.3, vertical_spinner: 0 },
  drum_spinner: { flipper: 0.2, lifter: 0.25, horizontal_spinner: -0.05, vertical_spinner: -0.1, overhead_saw: 0.05, hammer: 0.2, crusher: 0.25, drum_spinner: 0 },
  overhead_saw: { flipper: 0.1, lifter: 0.15, horizontal_spinner: -0.15, vertical_spinner: -0.1, drum_spinner: -0.05, hammer: 0.1, crusher: 0.15, overhead_saw: 0 },
  flipper: { horizontal_spinner: -0.3, vertical_spinner: -0.25, drum_spinner: -0.2, overhead_saw: -0.1, lifter: 0.1, hammer: 0.15, crusher: 0.2, flipper: 0 },
  lifter: { horizontal_spinner: -0.35, vertical_spinner: -0.3, drum_spinner: -0.25, overhead_saw: -0.15, flipper: -0.1, hammer: 0.05, crusher: 0.1, lifter: 0 },
  hammer: { horizontal_spinner: -0.25, vertical_spinner: -0.25, drum_spinner: -0.2, overhead_saw: -0.1, flipper: -0.15, lifter: -0.05, crusher: 0.05, hammer: 0 },
  crusher: { horizontal_spinner: -0.3, vertical_spinner: -0.3, drum_spinner: -0.25, overhead_saw: -0.15, flipper: -0.2, lifter: -0.1, hammer: -0.05, crusher: 0 },
};

const byName = new Map<string, Robot>(DEMO_ROBOTS.map((r) => [r.robot, r]));

const winRate = (r: Robot) => (r.wins + r.losses ? r.wins / (r.wins + r.losses) : 0.5);
const koRate = (r: Robot) => (r.wins ? r.ko_wins / r.wins : 0);
const edge = (a: string, b: string) => WEAPON_EDGE[a]?.[b] ?? 0;

function headToHead(a: string, b: string): [number, number] {
  let aw = 0;
  let bw = 0;
  for (const m of DEMO_MATCHES) {
    if ((m.robot_a === a && m.robot_b === b) || (m.robot_a === b && m.robot_b === a)) {
      if (m.winner === a) aw++;
      else if (m.winner === b) bw++;
    }
  }
  return [aw, bw];
}

export function localRobots(): Robot[] {
  return DEMO_ROBOTS;
}

export function localLeaderboard(): LeaderboardRow[] {
  return DEMO_ROBOTS.map((r) => ({
    rank: 0,
    robot: r.robot,
    weapon_type: r.weapon_type,
    wins: r.wins,
    losses: r.losses,
    win_rate: +(winRate(r) * 100).toFixed(1),
    ko_rate: +(koRate(r) * 100).toFixed(1),
    builder: r.builder,
  }))
    .sort((a, b) => b.win_rate - a.win_rate)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export function localRobotDetail(name: string): RobotDetail {
  const r = byName.get(name)!;
  const rank = localLeaderboard().find((row) => row.robot === name)?.rank ?? null;

  const matches: RobotMatch[] = DEMO_MATCHES.filter(
    (m) => m.robot_a === name || m.robot_b === name,
  )
    .map((m) => ({
      season: m.season,
      opponent: m.robot_a === name ? m.robot_b : m.robot_a,
      result: (m.winner === name ? 'Win' : 'Loss') as 'Win' | 'Loss',
      method: m.method,
    }))
    .sort((a, b) => b.season - a.season);

  return {
    ...r,
    win_rate: +(winRate(r) * 100).toFixed(1),
    ko_rate: +(koRate(r) * 100).toFixed(1),
    rank,
    matches,
  };
}

export function localPredict(aName: string, bName: string, useH2h = true): Prediction {
  const a = byName.get(aName)!;
  const b = byName.get(bName)!;

  const fa = winRate(a);
  const fb = winRate(b);
  const ka = koRate(a);
  const kb = koRate(b);
  const ea = edge(a.weapon_type, b.weapon_type);
  const eb = edge(b.weapon_type, a.weapon_type);

  let sa = 0.45 * fa + 0.25 * ka + 0.3 * (0.5 + ea);
  const sb = 0.45 * fb + 0.25 * kb + 0.3 * (0.5 + eb);

  const [ha, hb] = headToHead(aName, bName);
  if (useH2h && ha + hb > 0) sa += 0.05 * (ha - hb);

  const total = sa + sb;
  const probA = total ? sa / total : 0.5;
  const probB = 1 - probA;
  const margin = Math.abs(probA - probB);

  const reasons: string[] = [];
  if (fa !== fb) {
    const better = fa > fb ? aName : bName;
    reasons.push(
      `${better} has the stronger career win rate (${Math.round(Math.max(fa, fb) * 100)}% vs ${Math.round(Math.min(fa, fb) * 100)}%).`,
    );
  }
  if (ea > 0.05) reasons.push(`${aName}'s ${a.weapon_type.replace(/_/g, ' ')} matches up well against a ${b.weapon_type.replace(/_/g, ' ')}.`);
  else if (ea < -0.05) reasons.push(`${bName}'s ${b.weapon_type.replace(/_/g, ' ')} matches up well against a ${a.weapon_type.replace(/_/g, ' ')}.`);
  if (ka > kb + 0.1) reasons.push(`${aName} finishes fights — ${Math.round(ka * 100)}% of its wins are KOs.`);
  else if (kb > ka + 0.1) reasons.push(`${bName} finishes fights — ${Math.round(kb * 100)}% of its wins are KOs.`);
  if (ha + hb > 0) reasons.push(`Head-to-head record: ${aName} ${ha} - ${hb} ${bName}.`);
  if (!reasons.length) reasons.push('These two are evenly matched on every signal — near coin-flip.');

  return {
    robot_a: aName,
    robot_b: bName,
    prob_a: +(probA * 100).toFixed(1),
    prob_b: +(probB * 100).toFixed(1),
    winner: probA >= probB ? aName : bName,
    confidence: margin > 0.2 ? 'HIGH' : margin > 0.08 ? 'MEDIUM' : 'LOW',
    head_to_head: { a: ha, b: hb },
    signals: {
      win_rate: { a: +(fa * 100).toFixed(1), b: +(fb * 100).toFixed(1) },
      ko_rate: { a: +(ka * 100).toFixed(1), b: +(kb * 100).toFixed(1) },
      weapon_edge: { a: ea, b: eb },
    },
    reasons,
  };
}

export function localBacktest(): BacktestResult {
  const names = new Set(DEMO_ROBOTS.map((r) => r.robot));
  let total = 0;
  let correct = 0;
  const byConf: Record<string, [number, number]> = { HIGH: [0, 0], MEDIUM: [0, 0], LOW: [0, 0] };
  const byMethod: Record<string, [number, number]> = { KO: [0, 0], JD: [0, 0] };
  const samples: BacktestSample[] = [];

  for (const m of DEMO_MATCHES) {
    if (!names.has(m.robot_a) || !names.has(m.robot_b)) continue;
    if (m.winner !== m.robot_a && m.winner !== m.robot_b) continue;

    const p = localPredict(m.robot_a, m.robot_b, false); // no head-to-head leakage
    const ok = p.winner === m.winner;
    total++;
    correct += ok ? 1 : 0;

    byConf[p.confidence][1]++;
    byConf[p.confidence][0] += ok ? 1 : 0;
    if (byMethod[m.method]) {
      byMethod[m.method][1]++;
      byMethod[m.method][0] += ok ? 1 : 0;
    }

    if (samples.length < 12) {
      samples.push({
        season: m.season,
        robot_a: m.robot_a,
        robot_b: m.robot_b,
        actual: m.winner,
        predicted: p.winner,
        confidence: p.confidence,
        correct: ok,
      });
    }
  }

  const bucket = ([c, t]: [number, number]): Bucket => ({
    correct: c,
    total: t,
    accuracy: t ? +((c / t) * 100).toFixed(1) : 0,
  });

  return {
    total,
    correct,
    accuracy: total ? +((correct / total) * 100).toFixed(1) : 0,
    baseline: 50,
    by_confidence: Object.fromEntries(Object.entries(byConf).map(([k, v]) => [k, bucket(v)])),
    by_method: Object.fromEntries(Object.entries(byMethod).map(([k, v]) => [k, bucket(v)])),
    samples,
  };
}

export function localWeaponMeta(): WeaponMeta[] {
  const nameWeapon = new Map(DEMO_ROBOTS.map((r) => [r.robot, r.weapon_type]));
  const agg = new Map<string, { robots: number; wins: number; losses: number; ko: number }>();
  for (const r of DEMO_ROBOTS) {
    const a = agg.get(r.weapon_type) ?? { robots: 0, wins: 0, losses: 0, ko: 0 };
    a.robots++;
    a.wins += r.wins;
    a.losses += r.losses;
    a.ko += r.ko_wins;
    agg.set(r.weapon_type, a);
  }

  const battle = new Map<string, [number, number]>(); // weapon -> [wins, losses]
  for (const m of DEMO_MATCHES) {
    const loser = m.winner === m.robot_a ? m.robot_b : m.robot_a;
    const wl = nameWeapon.get(m.winner);
    const ll = nameWeapon.get(loser);
    if (wl) {
      const b = battle.get(wl) ?? [0, 0];
      b[0]++;
      battle.set(wl, b);
    }
    if (ll) {
      const b = battle.get(ll) ?? [0, 0];
      b[1]++;
      battle.set(ll, b);
    }
  }

  const rows: WeaponMeta[] = [];
  for (const [weapon, a] of agg) {
    const total = a.wins + a.losses;
    const [bw, bl] = battle.get(weapon) ?? [0, 0];
    const bt = bw + bl;
    rows.push({
      weapon,
      robots: a.robots,
      wins: a.wins,
      losses: a.losses,
      win_rate: total ? +((a.wins / total) * 100).toFixed(1) : 0,
      ko_rate: a.wins ? +((a.ko / a.wins) * 100).toFixed(1) : 0,
      battle_wins: bw,
      battle_losses: bl,
      battle_rate: bt ? +((bw / bt) * 100).toFixed(1) : 0,
    });
  }
  rows.sort((x, y) => y.battle_rate - x.battle_rate);
  return rows;
}

export function localUpsets(limit = 10): Upset[] {
  const names = new Set(DEMO_ROBOTS.map((r) => r.robot));
  const found: Upset[] = [];
  for (const m of DEMO_MATCHES) {
    if (!names.has(m.robot_a) || !names.has(m.robot_b)) continue;
    if (m.winner !== m.robot_a && m.winner !== m.robot_b) continue;
    const p = localPredict(m.robot_a, m.robot_b, false);
    if (p.winner !== m.winner) {
      const favorite = p.winner;
      const favProb = favorite === m.robot_a ? p.prob_a : p.prob_b;
      found.push({
        season: m.season,
        favorite,
        fav_prob: favProb,
        actual_winner: m.winner,
        method: m.method,
      });
    }
  }
  found.sort((a, b) => b.fav_prob - a.fav_prob);
  return found.slice(0, limit);
}

export function localTournament(names: string[]): TournamentResult {
  const valid = new Set(DEMO_ROBOTS.map((r) => r.robot));
  const seen = new Set<string>();
  const bracket: string[] = [];
  for (const n of names) {
    if (valid.has(n) && !seen.has(n)) {
      seen.add(n);
      bracket.push(n);
    }
  }

  let size = 1;
  while (size * 2 <= bracket.length) size *= 2;
  if (size < 2) throw new Error('Need at least two valid, distinct robots.');
  const seeds = bracket.slice(0, size);

  const rounds: TournamentResult['rounds'] = [];
  let current = seeds;
  while (current.length > 1) {
    const roundMatches: TournamentResult['rounds'][number] = [];
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i];
      const b = current[i + 1];
      const p = localPredict(a, b, true);
      roundMatches.push({ a, b, winner: p.winner, prob_a: p.prob_a, prob_b: p.prob_b });
      next.push(p.winner);
    }
    rounds.push(roundMatches);
    current = next;
  }

  return { size, seeds, rounds, champion: current[0] };
}
