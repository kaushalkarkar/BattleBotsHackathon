import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BacktestResult } from '../../models/battlebots.models';

/** Shows how well the model predicts actual historical results. */
@Component({
  selector: 'app-backtest',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backtest.component.html',
  styleUrl: './backtest.component.css',
})
export class BacktestComponent {
  @Input() result: BacktestResult | null = null;

  get confidenceRows() {
    if (!this.result) return [];
    return ['HIGH', 'MEDIUM', 'LOW']
      .filter((k) => this.result!.by_confidence[k])
      .map((k) => ({ label: k, ...this.result!.by_confidence[k] }));
  }

  get methodRows() {
    if (!this.result) return [];
    const labels: Record<string, string> = { KO: 'Knockout', JD: 'Judge decision' };
    return Object.keys(this.result.by_method).map((k) => ({
      label: labels[k] ?? k,
      ...this.result!.by_method[k],
    }));
  }
}
