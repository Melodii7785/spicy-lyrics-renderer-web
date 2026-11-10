/**
 * Split text into user-perceived characters (grapheme clusters).
 * Intl.Segmenter keeps emoji sequences, combining marks and joined scripts intact.
 */
let segmenter;

export function segmentGraphemes(text) {
  if (typeof text !== "string") {
    throw new TypeError("segmentGraphemes expects a string.");
  }

  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }

  // Code-point fallback. This preserves surrogate pairs, though not every
  // combining/ZWJ cluster on engines without Intl.Segmenter.
  return Array.from(text);
}

const RTL_PATTERN = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}]/u;

export function isRtlText(text) {
  return RTL_PATTERN.test(text);
}
