"use strict";
// FA/EN parity tests for UI strings (src/i18n/strings.ts).
// Compiled to CommonJS by `npm run pretest` (tsc, no deps).
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { STRINGS, SHOUTS, SPAM_MESSAGES } = require("../.test-tmp/strings.js");

describe("i18n parity", () => {
  it("fa and en expose the same non-empty keys", () => {
    const faKeys = Object.keys(STRINGS.fa).sort();
    const enKeys = Object.keys(STRINGS.en).sort();
    assert.deepEqual(faKeys, enKeys);
    for (const key of faKeys) {
      assert.equal(typeof STRINGS.fa[key], "string", `fa.${key}`);
      assert.ok(STRINGS.fa[key].length > 0, `fa.${key} empty`);
      assert.equal(typeof STRINGS.en[key], "string", `en.${key}`);
      assert.ok(STRINGS.en[key].length > 0, `en.${key} empty`);
    }
  });

  it("shout words are bilingual pairs", () => {
    assert.ok(SHOUTS.length >= 4);
    for (const pair of SHOUTS) {
      assert.ok(pair.fa.length > 0);
      assert.ok(pair.en.length > 0);
    }
  });

  it("has one boss message per spam level", () => {
    assert.equal(SPAM_MESSAGES.length, 3);
    for (const msg of SPAM_MESSAGES) {
      assert.ok(msg.fa.length > 0);
      assert.ok(msg.en.length > 0);
    }
  });
});
