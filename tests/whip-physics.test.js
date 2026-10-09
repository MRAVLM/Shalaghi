"use strict";
// Unit tests for the verlet-rope physics core (src/whip/whipPhysics.ts).
// The TS module is compiled to CommonJS by `npm run pretest` (tsc, no deps).
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  VerletRope,
  SnapDetector,
  REFERENCE_DT,
} = require("../.test-tmp/whipPhysics.js");

describe("VerletRope", () => {
  it("hangs straight down at rest with preserved segment lengths", () => {
    const rope = new VerletRope(6, 0, 0, 10);
    rope.pin(0);
    for (let i = 0; i < 120; i += 1) {
      rope.step(REFERENCE_DT);
    }
    assert.ok(Math.abs(rope.totalLength() - 50) < 0.5);
    const tip = rope.points[5];
    assert.ok(Math.abs(tip.x - 0) < 1);
    assert.ok(tip.y > 40);
  });

  it("keeps the pinned handle fixed under gravity", () => {
    const rope = new VerletRope(6, 30, 40, 10);
    rope.pin(0);
    for (let i = 0; i < 120; i += 1) {
      rope.step(REFERENCE_DT);
    }
    assert.deepEqual(
      [rope.points[0].x, rope.points[0].y],
      [30, 40],
    );
  });

  it("impulse throws the tip and constraints stop the stretch", () => {
    const rope = new VerletRope(6, 0, 0, 10);
    rope.pin(0);
    const before = rope.points[5].x;
    rope.impulse(5, 3000, 0);
    let maxX = before;
    for (let i = 0; i < 30; i += 1) {
      rope.step(REFERENCE_DT);
      maxX = Math.max(maxX, rope.points[5].x);
    }
    assert.ok(maxX > before + 20, `tip swung out to ${maxX}`);
    assert.ok(Math.abs(rope.totalLength() - 50) < 1.5);
  });

  it("ignores impulse on pinned points", () => {
    const rope = new VerletRope(4, 7, 7, 10);
    rope.pin(0);
    rope.impulse(0, 9999, 9999);
    rope.step(REFERENCE_DT);
    assert.deepEqual([rope.points[0].x, rope.points[0].y], [7, 7]);
  });
});

describe("SnapDetector (swing-completion gate)", () => {
  it("fires once when a fast swing ends, not while swinging", () => {
    const snap = new SnapDetector({ threshold: 2000, dropRatio: 0.5, windowMs: 350, cooldownMs: 400 });
    assert.equal(snap.update(500, 0), false); // idle swing
    assert.equal(snap.update(3000, 16), false); // rising: no crack mid-swing
    assert.equal(snap.update(3200, 32), false); // peak: still no crack
    assert.equal(snap.update(1200, 60), true); // snap completed: fires once
    assert.equal(snap.update(3000, 80), false); // cooldown suppresses echo
  });

  it("never fires for slow swings", () => {
    const snap = new SnapDetector({ threshold: 2000, dropRatio: 0.5, windowMs: 350, cooldownMs: 400 });
    for (let t = 0; t < 500; t += 16) {
      assert.equal(snap.update(800, t), false);
    }
  });

  it("disarms stale peaks (constant fast circling does not crack forever)", () => {
    const snap = new SnapDetector({ threshold: 2000, dropRatio: 0.5, windowMs: 350, cooldownMs: 0 });
    assert.equal(snap.update(3000, 0), false);
    assert.equal(snap.update(3000, 500), false); // peak went stale
    assert.equal(snap.update(3000, 1000), false);
  });
});
