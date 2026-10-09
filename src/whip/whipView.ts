import { VerletRope, SnapDetector } from "./whipPhysics";
import { ensureWhoosh, setWhooshLevel } from "../api/sound";

// Canvas verlet-rope whip view with a parking rack.
// - Handle anchor eases toward the pointer (cursor-follow).
// - Grab any part of the lash with the mouse, drag and release to throw it.
// - Tap empty space to lash the tip toward that point.
// - Rack (top-right): drag the whip onto it and release to PARK it — the
//   whip hangs at rest; tap the parked whip to pick it back up.
// - A completed fast swing (peak speed then sharp drop = snap) cracks once:
//   3D-ish impact FX (core glow, expanding rings, spark streaks, tiny shake)
//   + counter + onCrack. Mid-swing only produces a soft whoosh.
// - Black leather rendering: dark base + braid tones + rim-light highlight,
//   soft drop shadow, motion trail, wrapped handle with gold pommel.

export interface WhipView {
  element: HTMLElement;
  crackNow: () => void;
  destroy: () => void;
  setLabels: (labels: WhipLabels) => void;
}

export interface WhipViewOptions {
  isSoundOn?: () => boolean;
  onPark?: () => void;
  onUnpark?: () => void;
}

export interface WhipLabels {
  rackMain: string;
  rackSub: string;
  crackWord: string;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const POINT_COUNT = 18;
const SEG_LEN = 14;
const GRAB_RADIUS = 24;
const RACK_GRAB_RADIUS = 30;
const FLASH_MS = 260;
const SPARK_MS = 300;
const SHAKE_MS = 130;
const MIN_W = 280;
const MIN_H = 320;
const WHOOSH_FULL_SPEED = 2600;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function createWhipView(
  onCrack: (x: number, y: number) => void,
  options: WhipViewOptions = {},
): WhipView {
  const isSoundOn = options.isSoundOn ?? (() => true);

  const stage = document.createElement("div");
  stage.className = "whip-stage";

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-label", "Physics whip — drag it, flick to crack, park it on the rack");
  const counter = document.createElement("div");
  counter.className = "crack-counter";
  stage.append(canvas, counter);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let logicalW = 640;
  let logicalH = 480;

  const ctxOrNull = canvas.getContext("2d");
  if (ctxOrNull === null) {
    throw new Error("canvas 2d unavailable");
  }
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  let rackMain = "";
  let rackSub = "";
  let crackWord = "cracks";

  function rackAnchor(): { x: number; y: number } {
    return { x: logicalW - 90, y: 70 };
  }

  function fitCanvas(): void {
    logicalW = Math.max(MIN_W, Math.floor(stage.clientWidth) || MIN_W);
    logicalH = Math.max(MIN_H, Math.floor(stage.clientHeight) || MIN_H);
    canvas.width = Math.floor(logicalW * dpr);
    canvas.height = Math.floor(logicalH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    anchorTargetX = clamp(anchorTargetX, 24, logicalW - 24);
    anchorTargetY = clamp(anchorTargetY, 20, logicalH - 40);
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rope = new VerletRope(POINT_COUNT, 120, 70, SEG_LEN);
  rope.pin(0);
  const snap = new SnapDetector();

  let anchorX = 120;
  let anchorY = 70;
  let anchorTargetX = 120;
  let anchorTargetY = 70;
  let parked = false;
  let grabbed = -1;
  let grabX = 0;
  let grabY = 0;
  let draggedThisPress = false;
  let crackCount = 0;
  let flashAt = -FLASH_MS;
  let flashX = 0;
  let flashY = 0;
  let suppressUntil = 0;
  let sparks: Spark[] = [];
  let raf = 0;
  let lastT = performance.now();
  let destroyed = false;
  const trail: Array<{ x: number; y: number }> = [];

  const resizeObserver = new ResizeObserver(() => {
    fitCanvas();
  });
  resizeObserver.observe(stage);
  fitCanvas();

  function setLabels(labels: WhipLabels): void {
    rackMain = labels.rackMain;
    rackSub = labels.rackSub;
    crackWord = labels.crackWord;
    counter.textContent = `${crackWord}: ${crackCount}`;
  }

  function toLogical(event: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * logicalW,
      y: ((event.clientY - rect.top) / rect.height) * logicalH,
    };
  }

  function nearestPoint(x: number, y: number): number {
    let best = -1;
    let bestDist = GRAB_RADIUS;
    rope.points.forEach((p, i) => {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  function nearRack(x: number, y: number, radius: number): boolean {
    const hook = rackAnchor();
    return Math.hypot(hook.x - x, hook.y - y) < radius + 26;
  }

  function park(): void {
    if (parked) {
      return;
    }
    parked = true;
    grabbed = -1;
    snap.reset();
    setWhooshLevel(0);
    options.onPark?.();
  }

  function unpark(): void {
    if (!parked) {
      return;
    }
    parked = false;
    snap.reset();
    options.onUnpark?.();
  }

  function bumpCounter(): void {
    counter.textContent = `${crackWord}: ${crackCount}`;
    counter.classList.remove("bump");
    void counter.offsetWidth;
    counter.classList.add("bump");
  }

  function fireCrack(tipX: number, tipY: number): void {
    const now = performance.now();
    suppressUntil = now + 450;    flashAt = reducedMotion ? -FLASH_MS : now;
    flashX = tipX;
    flashY = tipY;
    sparks = [];
    if (!reducedMotion) {
      for (let k = 0; k < 12; k += 1) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 120 + Math.random() * 260;
        sparks.push({
          x: tipX,
          y: tipY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
        });
      }
    }
    crackCount += 1;
    bumpCounter();
    // Shout layer works in CSS pixels: map impact point to stage box.
    const box = canvas.getBoundingClientRect();
    onCrack((tipX / logicalW) * box.width, (tipY / logicalH) * box.height);
  }

  // Button / hotkey crack: guaranteed snap — jerk the handle and sling the tip.
  function crackNow(): void {
    if (parked) {
      unpark();
    }
    const power = reducedMotion ? 900 : 3200;
    anchorTargetX = clamp(anchorX - 90, 30, logicalW - 30);
    const n = rope.points.length;
    rope.impulse(n - 1, power, -power * 0.45);
    rope.impulse(n - 2, power * 0.7, -power * 0.3);
    const tip = rope.points[n - 1];
    snap.reset();
    fireCrack(tip.x, tip.y);
  }

  canvas.addEventListener("pointerdown", (event) => {
    ensureWhoosh();
    const { x, y } = toLogical(event);
    draggedThisPress = false;
    if (parked) {
      // Tap the sleeping whip (or its rack) to pick it back up.
      unpark();
    }
    const hit = nearestPoint(x, y);
    if (hit >= 0) {
      grabbed = hit;
      grabX = x;
      grabY = y;
    } else if (!parked && nearRack(x, y, RACK_GRAB_RADIUS)) {
      park();
    } else if (!parked) {
      // Beat toward the tapped point: sling the tip at it.
      const tip = rope.points[rope.points.length - 1];
      const power = reducedMotion ? 500 : 2300;
      const dx = x - tip.x;
      const dy = y - tip.y;
      const len = Math.hypot(dx, dy) || 1;
      rope.impulse(rope.points.length - 1, (dx / len) * power, (dy / len) * power);
    }
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    const { x, y } = toLogical(event);
    if (grabbed >= 0) {
      if (Math.hypot(x - grabX, y - grabY) > 4) {
        draggedThisPress = true;
      }
      grabX = x;
      grabY = y;
    } else if (!parked && (event.pointerType === "mouse" || event.buttons === 0)) {
      anchorTargetX = clamp(x, 24, logicalW - 24);
      anchorTargetY = clamp(y, 20, logicalH - 40);
    }
  });

  function release(event: PointerEvent): void {
    if (!parked && draggedThisPress) {
      const { x, y } = toLogical(event);
      if (nearRack(x, y, RACK_GRAB_RADIUS)) {
        park();
      }
    }
    grabbed = -1;
    draggedThisPress = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  function strokePath(
    offsetX: number,
    offsetY: number,
    style: string,
    widthFn: (t: number) => number,
  ): void {
    const pts = rope.points;
    ctx.strokeStyle = style;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < pts.length - 1; i += 1) {
      const t = i / (pts.length - 2);
      ctx.lineWidth = widthFn(t);
      ctx.beginPath();
      ctx.moveTo(pts[i].x + offsetX, pts[i].y + offsetY);
      ctx.lineTo(pts[i + 1].x + offsetX, pts[i + 1].y + offsetY);
      ctx.stroke();
    }
  }

  function drawRack(): void {
    const hook = rackAnchor();
    const plateX = logicalW - 34;
    // Wall plate + peg the whip hangs from.
    ctx.fillStyle = "#3a2c1c";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(plateX, 34, 22, 52, 6);
      ctx.fill();
    } else {
      ctx.fillRect(plateX, 34, 22, 52);
    }
    ctx.strokeStyle = "#c9973f";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(plateX + 4, 60);
    ctx.lineTo(hook.x, hook.y - 6);
    ctx.stroke();
    ctx.fillStyle = "#e3b341";
    ctx.beginPath();
    ctx.arc(hook.x, hook.y - 6, 4, 0, Math.PI * 2);
    ctx.fill();
    // Bilingual label under the rack.
    ctx.fillStyle = parked ? "#e3b341" : "rgba(168,168,181,0.9)";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(rackMain, logicalW - 12, 104);
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "rgba(168,168,181,0.75)";
    ctx.fillText(rackSub, logicalW - 12, 119);
    ctx.textAlign = "left";
  }

  function render(now: number): void {
    const dt = (now - lastT) / 1000;
    lastT = now;

    if (parked) {
      const hook = rackAnchor();
      anchorTargetX = hook.x;
      anchorTargetY = hook.y + 14;
    }
    // Ease the handle toward its target; dragged lash point sticks to cursor.
    anchorX = lerp(anchorX, anchorTargetX, parked ? 0.18 : 0.35);
    anchorY = lerp(anchorY, anchorTargetY, parked ? 0.18 : 0.35);
    rope.movePinned(0, anchorX, anchorY);
    if (grabbed > 0) {
      const p = rope.points[grabbed];
      p.x = grabX;
      p.y = grabY;
    }
    rope.step(dt);

    const tip = rope.points[rope.points.length - 1];
    const speed = parked ? 0 : rope.tipSpeed(dt);

    // Swing whoosh follows tip speed; crack fires once per completed swing.
    setWhooshLevel(isSoundOn() && !reducedMotion && !parked ? speed / WHOOSH_FULL_SPEED : 0);
    if (!parked && now >= suppressUntil && snap.update(speed, now)) {
      fireCrack(tip.x, tip.y);
    }

    if (!reducedMotion) {
      trail.push({ x: tip.x, y: tip.y });
      if (trail.length > 10) {
        trail.shift();
      }
    }

    ctx.clearRect(0, 0, logicalW, logicalH);
    ctx.save();
    // Impact shake: tiny wobble right after a crack.
    if (!reducedMotion && now - flashAt < SHAKE_MS) {
      const amp = (1 - (now - flashAt) / SHAKE_MS) * 3;
      ctx.translate(Math.sin(now * 0.09) * amp, Math.cos(now * 0.11) * amp);
    }

    drawRack();

    const pts = rope.points;
    const widthAt = (t: number): number => lerp(9, 2.2, t);

    // Soft drop shadow for depth.
    strokePath(0, 8, "rgba(0,0,0,0.30)", (t) => widthAt(t) + 3);

    // Black leather body: dark base, braid tones, rim-light highlight.
    strokePath(0, 0, "#050506", (t) => widthAt(t) + 2.5);
    for (let i = 0; i < pts.length - 1; i += 1) {
      const t = i / (pts.length - 2);
      ctx.strokeStyle = i % 2 === 0 ? "#101014" : "#1d1d24";
      ctx.lineWidth = widthAt(t);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
      ctx.stroke();
    }
    ctx.save();
    ctx.globalAlpha = 0.5;
    strokePath(-1.2, -1.2, "#ababbe", (t) => Math.max(1, widthAt(t) * 0.26));
    ctx.restore();

    // Motion trail at the tip.
    if (!reducedMotion && trail.length > 2) {
      for (let i = 1; i < trail.length; i += 1) {
        const a = (i / trail.length) * 0.35;
        ctx.strokeStyle = `rgba(255,214,10,${a.toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
    }

    // Frayed cracker strands at the tip.
    const tipDirX = tip.x - pts[pts.length - 2].x;
    const tipDirY = tip.y - pts[pts.length - 2].y;
    const tipLen = Math.hypot(tipDirX, tipDirY) || 1;
    const nx = tipDirX / tipLen;
    const ny = tipDirY / tipLen;
    ctx.strokeStyle = "#e5484d";
    ctx.lineWidth = 1.8;
    for (const spread of [-0.4, 0, 0.4]) {
      const dx = nx + -ny * spread;
      const dy = ny + nx * spread;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(tip.x + dx * 15, tip.y + dy * 15);
      ctx.stroke();
    }

    // Black wrapped handle, gold bands, glowing pommel.
    const h0 = pts[0];
    const h1 = pts[1];
    const hx = h1.x - h0.x;
    const hy = h1.y - h0.y;
    const hlen = Math.hypot(hx, hy) || 1;
    const bx = h0.x - (hx / hlen) * 52;
    const by = h0.y - (hy / hlen) * 52;
    ctx.strokeStyle = "#171114";
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(h0.x, h0.y);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.strokeStyle = "#c9973f";
    ctx.lineWidth = 2.4;
    for (const t of [0.22, 0.42, 0.62, 0.82]) {
      const wx = lerp(h0.x, bx, t);
      const wy = lerp(h0.y, by, t);
      ctx.beginPath();
      ctx.moveTo(wx - (hy / hlen) * 8, wy + (hx / hlen) * 8);
      ctx.lineTo(wx + (hy / hlen) * 8, wy - (hx / hlen) * 8);
      ctx.stroke();
    }
    ctx.fillStyle = "#e3b341";
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.arc(bx - 2, by - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Impact FX: hot core glow + star burst + expanding rings + sparks.
    if (!reducedMotion && now - flashAt < FLASH_MS) {
      const age = (now - flashAt) / FLASH_MS;
      const glow = ctx.createRadialGradient(flashX, flashY, 1, flashX, flashY, 34);
      glow.addColorStop(0, `rgba(255,255,240,${(0.9 * (1 - age)).toFixed(3)})`);
      glow.addColorStop(0.4, `rgba(255,214,10,${(0.5 * (1 - age)).toFixed(3)})`);
      glow.addColorStop(1, "rgba(255,214,10,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(flashX, flashY, 34, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = 1 - age;
      ctx.strokeStyle = "#ffd60a";
      ctx.lineWidth = 3;
      for (let k = 0; k < 10; k += 1) {
        const ang = (k / 10) * Math.PI * 2 + 0.3;
        ctx.beginPath();
        ctx.moveTo(flashX + Math.cos(ang) * 5, flashY + Math.sin(ang) * 5);
        ctx.lineTo(flashX + Math.cos(ang) * 26, flashY + Math.sin(ang) * 26);
        ctx.stroke();
      }
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(flashX, flashY, 8 + age * 52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(flashX, flashY, 4 + age * 30, 0, Math.PI * 2);
      ctx.stroke();

      // Spark streaks fly outward and fade.
      const sparkAge = (now - flashAt) / SPARK_MS;
      if (sparkAge < 1) {
        for (const s of sparks) {
          const sx = s.x + s.vx * sparkAge * 0.28;
          const sy = s.y + s.vy * sparkAge * 0.28;
          ctx.strokeStyle = `rgba(255,240,180,${((1 - sparkAge) * 0.9).toFixed(3)})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - s.vx * 0.03, sy - s.vy * 0.03);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    ctx.restore();

    if (!destroyed) {
      raf = requestAnimationFrame(render);
    }
  }

  raf = requestAnimationFrame(render);

  return {
    element: stage,
    crackNow,
    setLabels,
    destroy: () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      setWhooshLevel(0);
    },
  };
}
