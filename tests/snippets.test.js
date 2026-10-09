"use strict";
// Contract test for snippets/faster.json (PRD §5). Runs with zero deps:
//   npm test  →  node --test tests/*.test.js (after pretest compiles TS)
// Booster rule (per user feedback + GitHub pattern "concise → fewer tokens
// → faster"): every snippet must stay SHORT — a trigger the model acts on,
// not a detailed instruction manual.
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const MAX_TEXT_LENGTH = 64;

const EXPECTED = [
  {
    id: "fast",
    title: "fast",
    text: "Be terse. Shortest correct answer. No preamble, no summary.",
  },
  {
    id: "fast-fix",
    title: "fast-fix",
    text: "Fix it. Code only, no explanation.",
  },
  {
    id: "fast-view",
    title: "fast-view",
    text: "Review: blocking issues only. One line each.",
  },
  {
    id: "fast-ship",
    title: "fast-ship",
    text: "Ship it: minimal diff that works. Skip edge cases unless asked.",
  },
];

function loadSnippets() {
  const raw = readFileSync(join(__dirname, "..", "snippets", "faster.json"), "utf8");
  return JSON.parse(raw);
}

describe("snippets/faster.json (PRD §5 contract)", () => {
  it("loads exactly 4 non-empty snippets", () => {
    const data = loadSnippets();
    assert.ok(Array.isArray(data));
    assert.equal(data.length, 4);
    for (const item of data) {
      assert.equal(typeof item.id, "string");
      assert.ok(item.id.length > 0);
      assert.equal(typeof item.title, "string");
      assert.ok(item.title.length > 0);
      assert.equal(typeof item.text, "string");
      assert.ok(item.text.length > 0);
    }
  });

  it("stays short: every booster text fits the trigger-style limit", () => {
    for (const item of loadSnippets()) {
      assert.ok(
        item.text.length <= MAX_TEXT_LENGTH,
        `${item.id} is ${item.text.length} chars (max ${MAX_TEXT_LENGTH})`,
      );
    }
  });

  it("matches the approved booster texts byte-exact", () => {
    assert.deepEqual(loadSnippets(), EXPECTED);
  });
});
