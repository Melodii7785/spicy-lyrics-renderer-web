import test from "node:test";
import assert from "node:assert/strict";
import { segmentGraphemes, isRtlText } from "../src/graphemes.js";

test("grapheme segmentation keeps emoji sequences together", () => {
  assert.deepEqual(segmentGraphemes("A👩‍🚀éB"), ["A", "👩‍🚀", "é", "B"]);
});

test("grapheme segmentation supports CJK text", () => {
  assert.deepEqual(segmentGraphemes("日本語"), ["日", "本", "語"]);
});

test("RTL detection recognises Arabic and Hebrew", () => {
  assert.equal(isRtlText("مرحبا"), true);
  assert.equal(isRtlText("שלום"), true);
  assert.equal(isRtlText("hello"), false);
});
