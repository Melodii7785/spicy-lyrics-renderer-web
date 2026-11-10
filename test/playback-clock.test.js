import test from "node:test";
import assert from "node:assert/strict";
import { PlaybackClock } from "../src/playback-clock.js";

test("paused playback returns the measured position without latency lead", () => {
  const clock = new PlaybackClock();
  assert.equal(clock.positionMs(1200, false, 1, 100, 5000), 1200);
});

test("playing playback extrapolates and applies the latency lead", () => {
  const clock = new PlaybackClock();
  assert.equal(clock.positionMs(1000, true, 1, 100, 10000), 1100);
  assert.equal(clock.positionMs(1000, true, 1, 200, 10000), 1200);
});

test("large timing discontinuities resynchronise", () => {
  const clock = new PlaybackClock();
  clock.positionMs(1000, true, 1, 100, 10000);
  const position = clock.positionMs(3000, true, 1, 200, 10000);
  assert.equal(position, 3100);
});

test("playback position is clamped to duration", () => {
  const clock = new PlaybackClock();
  assert.equal(clock.positionMs(9950, true, 1, 100, 10000), 10000);
});
