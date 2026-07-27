import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BattlebotsService } from './services/battlebots.service';
import {
  BacktestResult,
  LeaderboardRow,
  Prediction,
  Robot,
  RobotDetail,
  TournamentResult,
} from './models/battlebots.models';
import { PredictorComponent } from './components/predictor/predictor.component';
import { LeaderboardComponent } from './components/leaderboard/leaderboard.component';
import { RobotDetailComponent } from './components/robot-detail/robot-detail.component';
import { BacktestComponent } from './components/backtest/backtest.component';
import { TournamentComponent } from './components/tournament/tournament.component';

type View = 'predict' | 'tournament' | 'backtest';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    PredictorComponent,
    LeaderboardComponent,
    RobotDetailComponent,
    BacktestComponent,
    TournamentComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  view: View = 'predict';
  theme: 'dark' | 'light' = 'dark';

  robots: Robot[] = [];
  leaderboard: LeaderboardRow[] = [];
  prediction: Prediction | null = null;

  loading = false;
  error: string | null = null;

  // Robot detail modal
  detail: RobotDetail | null = null;
  detailOpen = false;
  detailLoading = false;

  // Tournament
  tournament: TournamentResult | null = null;
  tournamentLoading = false;

  // Backtest
  backtest: BacktestResult | null = null;

  constructor(public api: BattlebotsService) {}

  ngOnInit(): void {
    this.initTheme();

    this.api.getRobots().subscribe((robots) => {
      this.robots = robots;
      this.onPredict(['Tombstone', 'Minotaur']);
    });
    this.api.getLeaderboard().subscribe((rows) => (this.leaderboard = rows));
  }

  private initTheme(): void {
    const saved = localStorage.getItem('bb-theme') as 'dark' | 'light' | null;
    const prefersLight =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: light)').matches;
    this.theme = saved ?? (prefersLight ? 'light' : 'dark');
    this.applyTheme();
  }

  toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('bb-theme', this.theme);
    this.applyTheme();
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  setView(v: View): void {
    this.view = v;
    if (v === 'backtest' && !this.backtest) {
      this.api.getBacktest().subscribe((r) => (this.backtest = r));
    }
  }

  get topSeeds(): string[] {
    return this.leaderboard.slice(0, 8).map((r) => r.robot);
  }

  onPredict([a, b]: [string, string]): void {
    this.loading = true;
    this.error = null;
    this.api.predict(a, b).subscribe({
      next: (p) => {
        this.prediction = p;
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.detail ?? 'Prediction failed.';
      },
    });
  }

  onRunTournament(names: string[]): void {
    this.tournamentLoading = true;
    this.api.getTournament(names).subscribe({
      next: (t) => {
        this.tournament = t;
        this.tournamentLoading = false;
      },
      error: () => (this.tournamentLoading = false),
    });
  }

  openRobot(name: string): void {
    this.detailOpen = true;
    this.detailLoading = true;
    this.detail = null;
    this.api.getRobot(name).subscribe((d) => {
      this.detail = d;
      this.detailLoading = false;
    });
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.detail = null;
  }
}
