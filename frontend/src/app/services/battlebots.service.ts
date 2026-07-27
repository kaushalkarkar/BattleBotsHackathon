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

@Injectable({ providedIn: 'root' })
export class BattlebotsService {
  /**
   * FastAPI backend base URL.
   * Set `window.__API_BASE__` (in index.html) to a deployed backend for live
   * data; otherwise defaults to localhost and, if unreachable, offline demo mode.
   */
  private readonly base =
    (typeof window !== 'undefined' && (window as unknown as { __API_BASE__?: string }).__API_BASE__) ||
    'http://localhost:8000';

  /** True once any call has fallen back to the offline engine. */
  readonly demoMode = signal(false);

  constructor(private http: HttpClient) {}

  getRobots(): Observable<Robot[]> {
    return this.http.get<Robot[]>(`${this.base}/robots`).pipe(
      catchError(() => this.fallback(localRobots())),
    );
  }

  getLeaderboard(): Observable<LeaderboardRow[]> {
    return this.http.get<LeaderboardRow[]>(`${this.base}/leaderboard`).pipe(
      catchError(() => this.fallback(localLeaderboard())),
    );
  }

  predict(a: string, b: string): Observable<Prediction> {
    return this.http.get<Prediction>(`${this.base}/predict`, { params: { a, b } }).pipe(
      catchError(() => this.fallback(localPredict(a, b))),
    );
  }

  getRobot(name: string): Observable<RobotDetail> {
    return this.http.get<RobotDetail>(`${this.base}/robot/${encodeURIComponent(name)}`).pipe(
      catchError(() => this.fallback(localRobotDetail(name))),
    );
  }

  getBacktest(): Observable<BacktestResult> {
    return this.http.get<BacktestResult>(`${this.base}/backtest`).pipe(
      catchError(() => this.fallback(localBacktest())),
    );
  }

  getTournament(names: string[]): Observable<TournamentResult> {
    const params = { robots: names.join(',') };
    return this.http.get<TournamentResult>(`${this.base}/tournament`, { params }).pipe(
      catchError(() => this.fallback(localTournament(names))),
    );
  }

  getWeaponMeta(): Observable<WeaponMeta[]> {
    return this.http.get<WeaponMeta[]>(`${this.base}/weapon-meta`).pipe(
      catchError(() => this.fallback(localWeaponMeta())),
    );
  }

  getUpsets(): Observable<Upset[]> {
    return this.http.get<Upset[]>(`${this.base}/upsets`).pipe(
      catchError(() => this.fallback(localUpsets(10))),
    );
  }

  /** Flip the app into demo mode and emit locally-computed data instead. */
  private fallback<T>(value: T): Observable<T> {
    return of(value).pipe(tap(() => this.demoMode.set(true)));
  }
}
