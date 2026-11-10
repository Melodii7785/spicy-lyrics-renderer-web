import test from "node:test";
import assert from "node:assert/strict";
import { findLineIndex, getWordProgress } from "../src/timing.js";

test("word progress moves from zero to one across its timing", () => {
  assert.equal(getWordProgress(900, 1000, 2000), 0);
  assert.equal(getWordProgress(1500, 1000, 2000), 0.5);
  assert.equal(getWordProgress(2100, 1000, 2000), 1);
});

test("zero-length words switch on at their end timestamp", () => {
  assert.equal(getWordProgress(99, 100, 100), 0);
  assert.equal(getWordProgress(100, 100, 100), 1);
});

test("line lookup selects the line whose next line has not started", () => {
  const lines = [{ startMs: 0 }, { startMs: 1500 }, { startMs: 3000 }];
  assert.equal(findLineIndex(lines, 0), 0);
  assert.equal(findLineIndex(lines, 1499), 0);
  assert.equal(findLineIndex(lines, 1500), 1);
  assert.equal(findLineIndex(lines, 5000), 2);
  assert.equal(findLineIndex([], 5000), -1);
});
