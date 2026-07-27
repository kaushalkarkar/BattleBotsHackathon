import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RobotDetail } from '../../models/battlebots.models';

/** Modal card showing a single robot's stats and full match history. */
@Component({
  selector: 'app-robot-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './robot-detail.component.html',
  styleUrl: './robot-detail.component.css',
})
export class RobotDetailComponent {
  @Input() detail: RobotDetail | null = null;
  @Input() loading = false;
  @Output() close = new EventEmitter<void>();
  /** Emitted when the user clicks an opponent to jump to their card. */
  @Output() openRobot = new EventEmitter<string>();

  pretty(weapon: string): string {
    return weapon.replace(/_/g, ' ');
  }
}
