import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Robot } from '../../models/battlebots.models';
import { CustomSelectComponent } from '../custom-select/custom-select.component';

interface Bot {
  name: string;
  x: number; y: number; vx: number; vy: number;
  angle: number;          // facing (radians)
  hp: number; maxHp: number;
  power: number;          // weapon damage
  accel: number; turn: number;
  radius: number;
  color: string;
  weapon: string;
  spin: number;           // weapon visual angle
  isPlayer: boolean;
  hitCd: number;
}

/**
 * Real-time top-down arena battle. Drive your robot with WASD and ram the
 * opponent with your weapon. Each robot's damage and agility are derived from
 * its real BattleBots stats (KO rate, win rate) — the Bright Data meta calibrates
 * the fight, so stronger robots genuinely hit harder.
 */
@Component({
  selector: 'app-arena',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomSelectComponent],
  templateUrl: './arena.component.html',
  styleUrl: './arena.component.css',
})
export class ArenaComponent implements AfterViewInit, OnDestroy {
  @Input() robots: Robot[] = [];
  @ViewChild('cv') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly Wd = 720;
  readonly Ht = 460;

  playerName = 'Tombstone';
  oppName = 'Minotaur';
  autoSim = false;
  running = false;
  winner: string | null = null;
  countdown = 0;

  private ctx!: CanvasRenderingContext2D;
  private raf = 0;
  private keys = new Set<string>();
  private p!: Bot;
  private o!: Bot;

  get robotNames(): string[] {
    return this.robots.map((r) => r.robot);
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.reset();
    this.draw(); // static first frame
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd'].includes(k)) {
      this.keys.add(k);
      if (this.running) e.preventDefault();
    }
  }
  @HostListener('document:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  private makeBot(name: string, isPlayer: boolean): Bot {
    const r = this.robots.find((x) => x.robot === name);
    const wins = r?.wins ?? 10, losses = r?.losses ?? 10, ko = r?.ko_wins ?? 5;
    const winRate = wins + losses ? wins / (wins + losses) : 0.5;
    const koRate = wins ? ko / wins : 0.3;
    const weapon = r?.weapon_type ?? 'drum_spinner';
    const fast = /horizontal_spinner|drum_spinner/.test(weapon);
    return {
      name,
      x: isPlayer ? this.Wd * 0.28 : this.Wd * 0.72,
      y: this.Ht / 2,
      vx: 0, vy: 0,
      angle: isPlayer ? 0 : Math.PI,
      hp: 100, maxHp: 100,
      power: 5 + koRate * 12,                 // 5 .. 17 damage
      accel: 0.20 + (fast ? 0.05 : 0) + winRate * 0.06,
      turn: 0.045 + winRate * 0.02,
      radius: 26,
      color: isPlayer ? '#ff5c33' : '#33b1ff',
      weapon,
      spin: 0,
      isPlayer,
      hitCd: 0,
    };
  }

  reset(): void {
    cancelAnimationFrame(this.raf);
    this.running = false;
    this.winner = null;
    this.p = this.makeBot(this.playerName, true);
    this.o = this.makeBot(this.oppName, false);
    if (this.ctx) this.draw();
  }

  start(): void {
    if (this.playerName === this.oppName) return;
    this.reset();
    this.countdown = 3;
    this.draw();
    const tick = () => {
      this.countdown--;
      if (this.countdown > 0) {
        this.draw();
        setTimeout(tick, 700);
      } else {
        this.countdown = 0;
        this.running = true;
        this.loop();
      }
    };
    setTimeout(tick, 700);
  }

  private loop = (): void => {
    if (!this.running) return;
    this.step();
    this.draw();
    if (this.p.hp <= 0 || this.o.hp <= 0) {
      this.running = false;
      this.winner = this.p.hp <= 0 && this.o.hp <= 0
        ? 'Draw'
        : this.p.hp <= 0 ? this.o.name : this.p.name;
      this.draw();
      return;
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private step(): void {
    // ---- controls ----
    if (this.autoSim) this.driveAI(this.p, this.o);
    else this.drivePlayer(this.p);
    this.driveAI(this.o, this.p);

    for (const b of [this.p, this.o]) {
      b.x += b.vx; b.y += b.vy;
      b.vx *= 0.94; b.vy *= 0.94;
      b.spin += 0.6;
      if (b.hitCd > 0) b.hitCd--;
      // walls
      const m = b.radius;
      if (b.x < m) { b.x = m; b.vx = Math.abs(b.vx) * 0.5; }
      if (b.x > this.Wd - m) { b.x = this.Wd - m; b.vx = -Math.abs(b.vx) * 0.5; }
      if (b.y < m) { b.y = m; b.vy = Math.abs(b.vy) * 0.5; }
      if (b.y > this.Ht - m) { b.y = this.Ht - m; b.vy = -Math.abs(b.vy) * 0.5; }
    }
    this.collide();
  }

  private drivePlayer(b: Bot): void {
    if (this.keys.has('a')) b.angle -= b.turn;
    if (this.keys.has('d')) b.angle += b.turn;
    if (this.keys.has('w')) { b.vx += Math.cos(b.angle) * b.accel; b.vy += Math.sin(b.angle) * b.accel; }
    if (this.keys.has('s')) { b.vx -= Math.cos(b.angle) * b.accel * 0.6; b.vy -= Math.sin(b.angle) * b.accel * 0.6; }
  }

  private driveAI(b: Bot, target: Bot): void {
    const desired = Math.atan2(target.y - b.y, target.x - b.x);
    let diff = desired - b.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    b.angle += Math.max(-b.turn, Math.min(b.turn, diff));
    // thrust toward target; ease off if nearly aligned & very close (to line up hits)
    if (Math.abs(diff) < 0.8) { b.vx += Math.cos(b.angle) * b.accel; b.vy += Math.sin(b.angle) * b.accel; }
  }

  private collide(): void {
    const dx = this.o.x - this.p.x, dy = this.o.y - this.p.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const minD = this.p.radius + this.o.radius;
    if (dist >= minD) return;

    const nx = dx / dist, ny = dy / dist;
    // separate
    const overlap = minD - dist;
    this.p.x -= nx * overlap / 2; this.p.y -= ny * overlap / 2;
    this.o.x += nx * overlap / 2; this.o.y += ny * overlap / 2;

    // impact from closing speed
    const relvx = this.p.vx - this.o.vx, relvy = this.p.vy - this.o.vy;
    const closing = Math.abs(relvx * nx + relvy * ny);
    const impact = 1 + Math.min(2, closing * 0.35);

    // knockback
    const kb = 1.5 + closing * 0.4;
    this.p.vx -= nx * kb; this.p.vy -= ny * kb;
    this.o.vx += nx * kb; this.o.vy += ny * kb;

    if (this.p.hitCd <= 0 && this.o.hitCd <= 0) {
      // whoever faces the other more (weapon-on) lands the bigger hit
      const pFacing = this.facing(this.p, nx, ny);
      const oFacing = this.facing(this.o, -nx, -ny);
      this.o.hp -= this.p.power * impact * (0.6 + pFacing * 0.7);
      this.p.hp -= this.o.power * impact * (0.6 + oFacing * 0.7);
      this.p.hitCd = 16; this.o.hitCd = 16;
    }
  }

  /** 0..1 how well bot's weapon (its facing) points along (nx,ny). */
  private facing(b: Bot, nx: number, ny: number): number {
    const dot = Math.cos(b.angle) * nx + Math.sin(b.angle) * ny;
    return Math.max(0, dot);
  }

  // ---------------- rendering ----------------
  private draw(): void {
    const g = this.ctx;
    g.clearRect(0, 0, this.Wd, this.Ht);
    // floor
    g.fillStyle = '#12161b'; g.fillRect(0, 0, this.Wd, this.Ht);
    g.strokeStyle = '#20262e'; g.lineWidth = 1;
    for (let x = 0; x < this.Wd; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, this.Ht); g.stroke(); }
    for (let y = 0; y < this.Ht; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(this.Wd, y); g.stroke(); }
    g.strokeStyle = '#ff5c33'; g.lineWidth = 3; g.strokeRect(4, 4, this.Wd - 8, this.Ht - 8);

    if (this.p) this.drawBot(this.p);
    if (this.o) this.drawBot(this.o);

    // HP bars
    if (this.p && this.o) { this.hpBar(this.p, 16, 16, false); this.hpBar(this.o, this.Wd - 216, 16, true); }

    if (this.countdown > 0) this.center(String(this.countdown), 64, '#ffffff');
    else if (this.winner) this.center(this.winner === 'Draw' ? 'Draw!' : `${this.winner} wins! 🏆`, 40, '#2ecc71');
  }

  private drawBot(b: Bot): void {
    const g = this.ctx;
    // weapon arc (spinning)
    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.spin);
    g.strokeStyle = b.color; g.globalAlpha = 0.5; g.lineWidth = 5;
    g.beginPath(); g.arc(0, 0, b.radius + 8, 0, Math.PI * 1.2); g.stroke();
    g.globalAlpha = 1;
    g.restore();
    // body
    g.beginPath(); g.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    g.fillStyle = b.color; g.fill();
    g.strokeStyle = '#0b0d10'; g.lineWidth = 2; g.stroke();
    // facing indicator (weapon front)
    g.beginPath();
    g.moveTo(b.x, b.y);
    g.lineTo(b.x + Math.cos(b.angle) * (b.radius + 6), b.y + Math.sin(b.angle) * (b.radius + 6));
    g.strokeStyle = '#0b0d10'; g.lineWidth = 4; g.stroke();
    // name
    g.fillStyle = '#e8edf2'; g.font = "600 12px 'Segoe UI',Arial"; g.textAlign = 'center';
    g.fillText(b.name, b.x, b.y - b.radius - 10);
  }

  private hpBar(b: Bot, x: number, y: number, right: boolean): void {
    const g = this.ctx, w = 200, h = 16;
    g.fillStyle = '#1b2027'; g.fillRect(x, y, w, h);
    const pct = Math.max(0, b.hp / b.maxHp);
    g.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f1c40f' : '#ff4d4d';
    const fw = w * pct;
    g.fillRect(right ? x + (w - fw) : x, y, fw, h);
    g.strokeStyle = b.color; g.lineWidth = 2; g.strokeRect(x, y, w, h);
    g.fillStyle = '#e8edf2'; g.font = "700 12px 'Segoe UI',Arial";
    g.textAlign = right ? 'right' : 'left';
    g.fillText(`${b.name}  ${Math.max(0, Math.round(b.hp))}`, right ? x + w : x, y + h + 14);
  }

  private center(t: string, size: number, color: string): void {
    const g = this.ctx;
    g.fillStyle = color; g.font = `800 ${size}px 'Segoe UI',Arial`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(t, this.Wd / 2, this.Ht / 2);
    g.textBaseline = 'alphabetic';
  }
}
