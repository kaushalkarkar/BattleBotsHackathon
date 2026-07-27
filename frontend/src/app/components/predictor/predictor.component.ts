import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Prediction, Robot } from '../../models/battlebots.models';
import { ComparisonChartComponent, RadarAxis } from '../comparison-chart/comparison-chart.component';
import { CustomSelectComponent } from '../custom-select/custom-select.component';

@Component({
  selector: 'app-predictor',
  standalone: true,
  imports: [CommonModule, FormsModule, ComparisonChartComponent, CustomSelectComponent],
  templateUrl: './predictor.component.html',
  styleUrl: './predictor.component.css',
})
export class PredictorComponent implements OnChanges {
  @Input() robots: Robot[] = [];
  @Input() prediction: Prediction | null = null;
  @Input() loading = false;
  @Input() error: string | null = null;

  /** Emits [robotA, robotB] when the user asks for a prediction. */
  @Output() predict = new EventEmitter<[string, string]>();

  robotA = '';
  robotB = '';
  radarAxes: RadarAxis[] = [];

  get robotNames(): string[] {
    return this.robots.map((r) => r.robot);
  }

  ngOnChanges(): void {
    // Set sensible defaults once robots arrive.
    if (this.robots.length && !this.robotA) {
      this.robotA = this.robots.find(r => r.robot === 'Tombstone')?.robot ?? this.robots[0].robot;
      this.robotB = this.robots.find(r => r.robot === 'Minotaur')?.robot ?? this.robots[1]?.robot ?? '';
    }
    this.radarAxes = this.buildRadar();
  }

  onPredict(): void {
    if (this.robotA && this.robotB && this.robotA !== this.robotB) {
      this.predict.emit([this.robotA, this.robotB]);
    }
  }

  get sameRobot(): boolean {
    return !!this.robotA && this.robotA === this.robotB;
  }

  /** Turn the prediction's raw signals into normalized 0..1 radar axes. */
  private buildRadar(): RadarAxis[] {
    const p = this.prediction;
    if (!p) return [];

    const fights = (name: string) => {
      const r = this.robots.find(x => x.robot === name);
      return r ? r.wins + r.losses : 0;
    };
    const maxFights = Math.max(1, ...this.robots.map(r => r.wins + r.losses));

    return [
      { label: 'Win %', a: p.signals.win_rate.a / 100, b: p.signals.win_rate.b / 100 },
      { label: 'KO %', a: p.signals.ko_rate.a / 100, b: p.signals.ko_rate.b / 100 },
      { label: 'Weapon', a: 0.5 + p.signals.weapon_edge.a, b: 0.5 + p.signals.weapon_edge.b },
      { label: 'Experience', a: fights(p.robot_a) / maxFights, b: fights(p.robot_b) / maxFights },
    ];
  }
}
