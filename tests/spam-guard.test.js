"use strict";
// Unit tests for the anti-spam guard (src/api/spamGuard.ts).
// Compiled to CommonJS by `npm run pretest` (tsc, no deps).
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { spamLevel, SPAM_THRESHOLDS } = require("../.test-tmp/spamGuard.js");

describe("spamLevel", () => {
  it("stays quiet below the first threshold", () => {
    assert.equal(spamLevel(0), 0);
    assert.equal(spamLevel(SPAM_THRESHOLDS[0] - 1), 0);
  });

  it("escalates 1 → 2 → 3 at the thresholds", () => {
    assert.equal(spamLevel(SPAM_THRESHOLDS[0]), 1);
    assert.equal(spamLevel(SPAM_THRESHOLDS[1]), 2);
    assert.equal(spamLevel(SPAM_THRESHOLDS[2]), 3);
    assert.equal(spamLevel(1000), 3);
  });
});
