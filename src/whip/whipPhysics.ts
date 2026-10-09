// Verlet-rope physics core for the Shalaghi whip (DOM-free, unit-tested).
// Technique: position-based dynamics — each point stores current + previous
// position (implicit velocity), gravity integrates motion, then distance
// constraints are solved iteratively to preserve segment lengths.
// Original implementation; the technique itself is the standard approach used
// by rope/cloth demos (e.g. MIT-licensed canvas rope sims) and by the
// Python `digital-whip` overlay (verlet chain, mouse-locked head segment,
// tip-velocity crack detection).

export interface RopePoint {
  x: number;
  y: number;
  px: number;
  py: number;
  pinned: boolean;
}

export interface RopeOptions {
  gravity: number; // px/s^2 pulling down
  damping: number; // 0..1 velocity retention per step (air friction)
  iterations: number; // constraint solver passes per step (stiffness)
}

export const DEFAULT_ROPE_OPTIONS: RopeOptions = {
  gravity: 2600,
  damping: 0.985,
  iterations: 24,
};

// Fixed reference step so impulses and tests behave identically everywhere.
export const REFERENCE_DT = 1 / 60;

export class VerletRope {
  readonly points: RopePoint[] = [];
  readonly segmentLength: number;
  readonly options: RopeOptions;

  constructor(
    count: number,
    startX: number,
    startY: number,
    segmentLength: number,
    options: Partial<RopeOptions> = {},
  ) {
    if (count < 2) {
      throw new Error("rope needs at least 2 points");
    }
    this.segmentLength = segmentLength;
    this.options = { ...DEFAULT_ROPE_OPTIONS, ...options };
    for (let i = 0; i < count; i += 1) {
      const x = startX;
      const y = startY + i * segmentLength;
      this.points.push({ x, y, px: x, py: y, pinned: false });
    }
  }

  pin(index: number): void {
    this.points[index].pinned = true;
  }

  movePinned(index: number, x: number, y: number): void {
    const p = this.points[index];
    p.x = x;
    p.y = y;
    p.px = x;
    p.py = y;
  }

  // Add velocity (px/s) to a point by rewinding its previous position.
  impulse(index: number, vx: number, vy: number): void {
    const p = this.points[index];
    if (p.pinned) {
      return;
    }
    p.px -= vx * REFERENCE_DT;
    p.py -= vy * REFERENCE_DT;
  }

  step(dtSeconds: number): void {
    const dt = Math.min(Math.max(dtSeconds, 0.0005), 1 / 20);
    const { gravity, damping, iterations } = this.options;
    for (const p of this.points) {
      if (p.pinned) {
        continue;
      }
      const vx = (p.x - p.px) * damping;
      const vy = (p.y - p.py) * damping;
      p.px = p.x;
      p.py = p.y;
      p.x += vx + 0 * dt;
      p.y += vy + gravity * dt * dt;
    }
    for (let k = 0; k < iterations; k += 1) {
      this.solveConstraints();
    }
  }

  private solveConstraints(): void {
    const pts = this.points;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i];
      const b = pts[i + 1];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const diff = (dist - this.segmentLength) / dist;
      dx *= diff;
      dy *= diff;
      if (a.pinned && b.pinned) {
        continue;
      }
      if (a.pinned) {
        b.x -= dx;
        b.y -= dy;
      } else if (b.pinned) {
        a.x += dx;
        a.y += dy;
      } else {
        a.x += dx * 0.5;
        a.y += dy * 0.5;
        b.x -= dx * 0.5;
        b.y -= dy * 0.5;
      }
    }
  }

  tipSpeed(dtSeconds: number): number {
    const tip = this.points[this.points.length - 1];
    const dt = Math.max(dtSeconds, 0.0005);
    return Math.hypot(tip.x - tip.px, tip.y - tip.py) / dt;
  }

  totalLength(): number {
    let sum = 0;
    for (let i = 0; i < this.points.length - 1; i += 1) {
      sum += Math.hypot(
        this.points[i + 1].x - this.points[i].x,
        this.points[i + 1].y - this.points[i].y,
      );
    }
    return sum;
  }
}

export const DEFAULT_CRACK_SPEED = 2400; // px/s at the tip
export const DEFAULT_CRACK_COOLDOWN_MS = 400;

export interface SnapOptions {
  threshold: number; // peak tip speed that arms a snap
  dropRatio: number; // fire when speed falls below peak * dropRatio
  windowMs: number; // peak must be this fresh to count
  cooldownMs: number; // minimum gap between snaps
}

export const DEFAULT_SNAP_OPTIONS: SnapOptions = {
  threshold: DEFAULT_CRACK_SPEED,
  dropRatio: 0.55,
  windowMs: 350,
  cooldownMs: DEFAULT_CRACK_COOLDOWN_MS,
};

// Swing-completion (snap) detector: a real crack happens when a fast swing
// ENDS — speed peaks above threshold, then drops sharply as the tip snaps.
// This fires once per completed swing instead of re-firing while swinging.
export class SnapDetector {
  private peak = 0;
  private peakAt = 0;
  private lastSnapAt: number;
  private readonly options: SnapOptions;

  constructor(options: Partial<SnapOptions> = {}) {
    this.options = { ...DEFAULT_SNAP_OPTIONS, ...options };
    this.lastSnapAt = -this.options.cooldownMs;
  }

  update(speedPxPerSec: number, nowMs: number): boolean {
    const { threshold, dropRatio, windowMs, cooldownMs } = this.options;
    if (speedPxPerSec > this.peak) {
      this.peak = speedPxPerSec;
      this.peakAt = nowMs;
    }
    if (this.peak < threshold) {
      return false;
    }
    if (nowMs - this.peakAt > windowMs) {
      // Stale swing (e.g. constant fast circling): disarm, keep tracking.
      this.peak = speedPxPerSec;
      this.peakAt = nowMs;
      return false;
    }
    if (
      speedPxPerSec < this.peak * dropRatio &&
      nowMs - this.lastSnapAt >= cooldownMs
    ) {
      this.lastSnapAt = nowMs;
      this.peak = 0;
      return true;
    }
    return false;
  }

  reset(): void {
    this.peak = 0;
    this.lastSnapAt = -this.options.cooldownMs;
  }
}
