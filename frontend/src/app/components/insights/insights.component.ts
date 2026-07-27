import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Upset, WeaponMeta } from '../../models/battlebots.models';

/** Data-storytelling tab: weapon-type meta analysis + biggest upsets. */
@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './insights.component.html',
  styleUrl: './insights.component.css',
})
export class InsightsComponent {
  @Input() meta: WeaponMeta[] = [];
  @Input() upsets: Upset[] = [];

  pretty(weapon: string): string {
    return weapon.replace(/_/g, ' ');
  }
}
