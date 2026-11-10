import { findLineIndex, getWordProgress } from "./timing.js";

const DEFAULTS = {
  activeColor: "#ffffff",
  inactiveColor: "rgba(255, 255, 255, 0.42)",
  className: "spicy-lyrics"
};

/**
 * Minimal browser-native renderer for word-timed lyrics.
 *
 * Input shape:
 * {
 *   lines: [{
 *     startMs: 0,
 *     words: [{ text: "Hello", startMs: 0, endMs: 420 }]
 *   }]
 * }
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
            !Number.isFinite(word.endMs)) {
          throw new TypeError(`Word ${wordIndex} in line ${lineIndex} needs text, startMs and endMs.`);
        }
      }
    }

    this.lines = [...lines].sort((a, b) => (a.startMs ?? a.words[0]?.startMs ?? 0) -
      (b.startMs ?? b.words[0]?.startMs ?? 0));
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
      if (index > 0) fragment.append(document.createTextNode(" "));

      const span = document.createElement("span");
      span.className = "spicy-lyrics__word";
      span.textContent = word.text;
      span.dataset.startMs = String(word.startMs);
      span.dataset.endMs = String(word.endMs);
      fragment.append(span);
      this.wordElements.push({ element: span, word });
    });

    this.element.replaceChildren(fragment);
  }

  #updateWords() {
    for (const { element, word } of this.wordElements) {
      const progress = getWordProgress(this.positionMs, word.startMs, word.endMs);
      element.style.setProperty("--slr-progress", String(progress * 100));
      element.classList.toggle("is-active", progress > 0 && progress < 1);
      element.classList.toggle("is-sung", progress >= 1);
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
