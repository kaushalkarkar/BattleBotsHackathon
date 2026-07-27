import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BracketMatch, Robot, TournamentResult } from '../../models/battlebots.models';

@Component({
  selector: 'app-tournament',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tournament.component.html',
  styleUrl: './tournament.component.css',
})
export class TournamentComponent implements OnChanges {
  @Input() robots: Robot[] = [];
  /** Suggested seeds (e.g. top 8 from the leaderboard). */
  @Input() defaultSeeds: string[] = [];
  @Input() result: TournamentResult | null = null;
  @Input() loading = false;

  @Output() run = new EventEmitter<string[]>();

  seeds: string[] = [];
  readonly slots = 8;

  ngOnChanges(): void {
    if (this.robots.length && this.seeds.length === 0) {
      const pool = this.defaultSeeds.length ? this.defaultSeeds : this.robots.map((r) => r.robot);
      this.seeds = Array.from({ length: this.slots }, (_, i) => pool[i] ?? this.robots[i]?.robot ?? '');
    }
  }

  onRun(): void {
    const chosen = this.seeds.filter(Boolean);
    if (new Set(chosen).size >= 2) this.run.emit(chosen);
  }

  get hasDuplicates(): boolean {
    const chosen = this.seeds.filter(Boolean);
    return new Set(chosen).size !== chosen.length;
  }

  roundTitle(matchesInRound: number): string {
    switch (matchesInRound) {
      case 1: return 'Final';
      case 2: return 'Semifinals';
      case 4: return 'Quarterfinals';
      case 8: return 'Round of 16';
      default: return `Round of ${matchesInRound * 2}`;
    }
  }

  loserProb(m: BracketMatch): number {
    return m.winner === m.a ? m.prob_b : m.prob_a;
  }

  winnerProb(m: BracketMatch): number {
    return m.winner === m.a ? m.prob_a : m.prob_b;
  }
}
