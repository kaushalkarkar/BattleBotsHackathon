import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  BacktestResult,
  LeaderboardRow,
  Prediction,
  Robot,
  RobotDetail,
  TournamentResult,
  Upset,
  WeaponMeta,
} from '../models/battlebots.models';
import {
  localBacktest,
  localLeaderboard,
  localPredict,
  localRobotDetail,
  localRobots,
  localTournament,
  localUpsets,
  localWeaponMeta,
} from './local-engine';

/**
 * Resolve the backend base URL:
 *  - `window.__API_BASE__` (set in index.html) wins if provided,
 *  - otherwise use localhost only when the app is actually served from localhost
 *    (local dev),
 *  - otherwise ('' = empty) run fully offline on the built-in engine — so the
 *    deployed site never tries to reach the visitor's own localhost.
 */
function resolveBase(): string {
  if (typeof window === 'undefined') return '';
  const override = (window as unknown as { __API_BASE__?: string }).__API_BASE__;
  if (override) return override;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:8000' : '';
}

@Injectable({ providedIn: 'root' })
export class BattlebotsService {
  private readonly base = resolveBase();

  /** True whenever data is served by the offline engine instead of a live API. */
  readonly demoMode = signal(false);

  constructor(private http: HttpClient) {}

  getRobots(): Observable<Robot[]> {
    return this.wrap(() => this.http.get<Robot[]>(`${this.base}/robots`), () => localRobots());
  }

  getLeaderboard(): Observable<LeaderboardRow[]> {
    return this.wrap(() => this.http.get<LeaderboardRow[]>(`${this.base}/leaderboard`), () => localLeaderboard());
  }

  predict(a: string, b: string): Observable<Prediction> {
    return this.wrap(
      () => this.http.get<Prediction>(`${this.base}/predict`, { params: { a, b } }),
      () => localPredict(a, b),
    );
  }

  getRobot(name: string): Observable<RobotDetail> {
    return this.wrap(
      () => this.http.get<RobotDetail>(`${this.base}/robot/${encodeURIComponent(name)}`),
      () => localRobotDetail(name),
    );
  }

  getBacktest(): Observable<BacktestResult> {
    return this.wrap(() => this.http.get<BacktestResult>(`${this.base}/backtest`), () => localBacktest());
  }

  getTournament(names: string[]): Observable<TournamentResult> {
    return this.wrap(
      () => this.http.get<TournamentResult>(`${this.base}/tournament`, { params: { robots: names.join(',') } }),
      () => localTournament(names),
    );
  }

  getWeaponMeta(): Observable<WeaponMeta[]> {
    return this.wrap(() => this.http.get<WeaponMeta[]>(`${this.base}/weapon-meta`), () => localWeaponMeta());
  }

  getUpsets(): Observable<Upset[]> {
    return this.wrap(() => this.http.get<Upset[]>(`${this.base}/upsets`), () => localUpsets(10));
  }

  /**
   * If no backend is configured, serve the offline result directly (no network
   * request). Otherwise hit the API and fall back to offline on any error.
   */
  private wrap<T>(live: () => Observable<T>, local: () => T): Observable<T> {
    if (!this.base) return this.fallback(local());
    return live().pipe(catchError(() => this.fallback(local())));
  }

  private fallback<T>(value: T): Observable<T> {
    return of(value).pipe(tap(() => this.demoMode.set(true)));
  }
}
