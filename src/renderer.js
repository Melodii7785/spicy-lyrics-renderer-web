import { findLineIndex, getWordProgress } from "./timing.js";
import { RefreshedMotion } from "./animation/refreshed-motion.js";
import { isRtlText, segmentGraphemes } from "./graphemes.js";

const DEFAULTS = {
  activeColor: "#ffffff",
  inactiveColor: "rgba(255, 255, 255, 0.42)",
  className: "spicy-lyrics",
  animation: true,
  letterEffects: true,
  letterDurationThresholdMs: 1000,
  letterMaxLength: 7
};

function canUseLetterEffects(word, options) {
  if (!options.animation || !options.letterEffects) return false;
  const duration = word.endMs - word.startMs;
  if (duration < options.letterDurationThresholdMs || isRtlText(word.text)) return false;
  const count = segmentGraphemes(word.text).length;
  return count >= 2 && count <= options.letterMaxLength;
}

/**
 * Browser-native renderer for word-timed lyrics.
 *
 * Input:
 * {
 *   lines: [{
 *     startMs: 0,
 *     words: [{ text: "Hello", startMs: 0, endMs: 420 }]
 *   }]
 * }
 *
 * Call setPosition() with the current playback position in milliseconds.
 */
export class SpicyLyrics {
  constructor(element, options = {}) {
    if (!element || typeof element.replaceChildren !== "function") {
      throw new TypeError("SpicyLyrics requires a DOM element as its first argument.");
    }

    this.element = element;
    this.options = { ...DEFAULTS, ...options };
    this.lines = [];
    this.positionMs = 0;
    this.currentLineIndex = -1;
    this.wordElements = [];

    this.element.classList.add(this.options.className);
    this.element.setAttribute("role", "text");
    this.element.setAttribute("aria-live", "off");
    this.element.style.setProperty("--slr-active-color", this.options.activeColor);
    this.element.style.setProperty("--slr-inactive-color", this.options.inactiveColor);
  }

  load(data) {
    const lines = Array.isArray(data) ? data : data?.lines;

    if (!Array.isArray(lines)) {
      throw new TypeError("load() expects an array of lines or an object with a lines array.");
    }

    for (const [lineIndex, line] of lines.entries()) {
      if (!Array.isArray(line.words)) {
        throw new TypeError(`Line ${lineIndex} must contain a words array.`);
      }

      for (const [wordIndex, word] of line.words.entries()) {
        if (typeof word.text !== "string" ||
            !Number.isFinite(word.startMs) ||
            !Number.isFinite(word.endMs) ||
            word.endMs < word.startMs) {
          throw new TypeError(`Word ${wordIndex} in line ${lineIndex} needs valid text, startMs and endMs.`);
        }
      }
    }

    this.lines = [...lines].sort((a, b) =>
      (a.startMs ?? a.words[0]?.startMs ?? 0) -
      (b.startMs ?? b.words[0]?.startMs ?? 0)
    );
    this.currentLineIndex = -1;
    this.setPosition(this.positionMs);
  }

  setPosition(positionMs) {
    if (!Number.isFinite(positionMs)) {
      throw new TypeError("Playback position must be a finite number of milliseconds.");
    }

    this.positionMs = Math.max(0, positionMs);
    const lineIndex = findLineIndex(this.lines, this.positionMs);

    if (lineIndex !== this.currentLineIndex) {
      this.currentLineIndex = lineIndex;
      this.#renderLine();
    }

    this.#updateWords();
  }

  #renderLine() {
    this.wordElements = [];

    if (this.currentLineIndex < 0) {
      this.element.replaceChildren();
      return;
    }

    const line = this.lines[this.currentLineIndex];
    const fragment = document.createDocumentFragment();

    line.words.forEach((word, index) => {
      const separator = word.separatorBefore ?? (index > 0 ? " " : "");
      if (separator) fragment.append(document.createTextNode(separator));

      const letterGroup = canUseLetterEffects(word, this.options);
      const span = document.createElement("span");
      span.className = letterGroup
        ? "spicy-lyrics__word is-letter-group"
        : "spicy-lyrics__word";
      span.dataset.startMs = String(word.startMs);
      span.dataset.endMs = String(word.endMs);

      const letters = [];
      if (letterGroup) {
        const graphemes = segmentGraphemes(word.text);
        const strength = RefreshedMotion.waveStrength(
          word.endMs - word.startMs,
          index === line.words.length - 1
        );

        graphemes.forEach((grapheme, letterIndex) => {
          const letter = document.createElement("span");
          letter.className = "spicy-lyrics__letter";
          letter.textContent = grapheme;
          span.append(letter);
          letters.push({ element: letter, index: letterIndex, count: graphemes.length, strength });
        });
      } else {
        span.textContent = word.text;
      }

      fragment.append(span);
      this.wordElements.push({ element: span, word, letters });
    });

    this.element.replaceChildren(fragment);
  }

  #updateWords() {
    for (const { element, word, letters } of this.wordElements) {
      const progress = getWordProgress(this.positionMs, word.startMs, word.endMs);
      element.classList.toggle("is-active", progress > 0 && progress < 1);
      element.classList.toggle("is-sung", progress >= 1);

      if (letters.length === 0) {
        element.style.setProperty("--slr-progress", String(progress * 100));
        continue;
      }

      const lit = progress;
      for (const letter of letters) {
        const pose = RefreshedMotion.letter(
          this.positionMs,
          word.startMs,
          letter.index,
          letter.count,
          letter.strength,
          false,
          lit
        );

        letter.element.style.setProperty("--slr-progress", String(progress * 100));
        letter.element.style.setProperty("--slr-x", String(pose.x));
        letter.element.style.setProperty("--slr-y", String(pose.y));
        letter.element.style.setProperty("--slr-scale", String(pose.scale));
        letter.element.style.setProperty("--slr-glow", String(pose.glow));
        letter.element.style.setProperty("--slr-glow-radius", String(pose.radius));
      }
    }
  }

  destroy() {
    this.element.replaceChildren();
    this.element.classList.remove(this.options.className);
    this.element.removeAttribute("role");
    this.element.removeAttribute("aria-live");
    this.element.style.removeProperty("--slr-active-color");
    this.element.style.removeProperty("--slr-inactive-color");
    this.wordElements = [];
    this.lines = [];
    this.currentLineIndex = -1;
  }
}
