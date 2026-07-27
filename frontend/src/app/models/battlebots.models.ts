export interface Robot {
  robot: string;
  weapon_type: string;
  weight_lb: number;
  wins: number;
  losses: number;
  ko_wins: number;
  builder: string;
  country: string;
}

export interface LeaderboardRow {
  rank: number;
  robot: string;
  weapon_type: string;
  wins: number;
  losses: number;
  win_rate: number;
  ko_rate: number;
  builder: string;
}

export interface RobotMatch {
  season: number;
  opponent: string;
  result: 'Win' | 'Loss';
  method: string;
}

export interface RobotDetail extends Robot {
  win_rate: number;
  ko_rate: number;
  rank: number | null;
  matches: RobotMatch[];
}

export interface Bucket {
  correct: number;
  total: number;
  accuracy: number;
}

export interface BacktestSample {
  season: number;
  robot_a: string;
  robot_b: string;
  actual: string;
  predicted: string;
  confidence: string;
  correct: boolean;
}

export interface BacktestResult {
  total: number;
  correct: number;
  accuracy: number;
  baseline: number;
  by_confidence: Record<string, Bucket>;
  by_method: Record<string, Bucket>;
  samples: BacktestSample[];
}

export interface WeaponMeta {
  weapon: string;
  robots: number;
  wins: number;
  losses: number;
  win_rate: number;
  ko_rate: number;
  battle_wins: number;
  battle_losses: number;
  battle_rate: number;
}

export interface Upset {
  season: number;
  favorite: string;
  fav_prob: number;
  actual_winner: string;
  method: string;
}

export interface BracketMatch {
  a: string;
  b: string;
  winner: string;
  prob_a: number;
  prob_b: number;
}

export interface TournamentResult {
  size: number;
  seeds: string[];
  rounds: BracketMatch[][];
  champion: string;
}

export interface Prediction {
  robot_a: string;
  robot_b: string;
  prob_a: number;
  prob_b: number;
  winner: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  head_to_head: { a: number; b: number };
  signals: {
    win_rate: { a: number; b: number };
    ko_rate: { a: number; b: number };
    weapon_edge: { a: number; b: number };
  };
  reasons: string[];
}
