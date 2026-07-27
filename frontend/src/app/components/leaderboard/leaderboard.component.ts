import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaderboardRow } from '../../models/battlebots.models';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.css',
})
export class LeaderboardComponent {
  @Input() rows: LeaderboardRow[] = [];
  /** Emitted when a row is clicked, to open that robot's detail card. */
  @Output() openRobot = new EventEmitter<string>();

  pretty(weapon: string): string {
    return weapon.replace(/_/g, ' ');
  }
}
