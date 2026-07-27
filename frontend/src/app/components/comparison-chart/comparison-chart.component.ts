import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RadarAxis {
  label: string;
  /** normalized 0..1 for robot A */
  a: number;
  /** normalized 0..1 for robot B */
  b: number;
}

interface Point { x: number; y: number; }

/**
 * Dependency-free SVG radar (spider) chart comparing two robots across
 * several normalized signals. No charting library — keeps the bundle small
 * and works offline.
 */
@Component({
  selector: 'app-comparison-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comparison-chart.component.html',
  styleUrl: './comparison-chart.component.css',
})
export class ComparisonChartComponent implements OnChanges {
  @Input() axes: RadarAxis[] = [];
  @Input() labelA = 'A';
  @Input() labelB = 'B';

  readonly size = 260;
  readonly cx = 130;
  readonly cy = 135;
  readonly r = 95;
  readonly rings = [0.25, 0.5, 0.75, 1];

  axisPoints: Point[] = [];      // outer tip of each axis (for labels/spokes)
  labelPoints: Point[] = [];     // slightly outside for text
  polyA = '';
  polyB = '';

  ngOnChanges(): void {
    const n = this.axes.length;
    if (!n) return;

    this.axisPoints = this.axes.map((_, i) => this.pointAt(i, n, 1));
    this.labelPoints = this.axes.map((_, i) => this.pointAt(i, n, 1.18));
    this.polyA = this.axes.map((ax, i) => this.coord(this.pointAt(i, n, clamp(ax.a)))).join(' ');
    this.polyB = this.axes.map((ax, i) => this.coord(this.pointAt(i, n, clamp(ax.b)))).join(' ');
  }

  ringPolygon(scale: number): string {
    const n = this.axes.length;
    return this.axes.map((_, i) => this.coord(this.pointAt(i, n, scale))).join(' ');
  }

  private pointAt(i: number, n: number, scale: number): Point {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2; // start at top
    return {
      x: this.cx + this.r * scale * Math.cos(angle),
      y: this.cy + this.r * scale * Math.sin(angle),
    };
  }

  private coord(p: Point): string {
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }

  anchor(p: Point): string {
    if (p.x < this.cx - 5) return 'end';
    if (p.x > this.cx + 5) return 'start';
    return 'middle';
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}
