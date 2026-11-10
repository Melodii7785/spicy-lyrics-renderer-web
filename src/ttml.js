const TIME_RE = /^(?:(\d+):)?(\d{2}):(\d{2})(?:\.(\d+))?$/;

function parseTime(value, frameRate = 30) {
  if (typeof value !== "string") return null;
  const input = value.trim();
  const offset = input.match(/^([\d.]+)(h|m|s|ms|f|t)$/i);
  if (offset) {
    const amount = Number(offset[1]);
    const unit = offset[2].toLowerCase();
    const factors = { h: 3600000, m: 60000, s: 1000, ms: 1, f: 1000 / frameRate, t: 1 };
    return amount * factors[unit];
  }

  const clock = input.match(TIME_RE);
  if (clock) {
    const hours = Number(clock[1] ?? 0);
    const minutes = Number(clock[2]);
    const seconds = Number(clock[3]);
    const fraction = clock[4] ? Number(`0.${clock[4]}`) : 0;
    return ((hours * 60 + minutes) * 60 + seconds + fraction) * 1000;
  }

  const frames = input.match(/^(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
  if (frames) {
    const [, h, m, s, f] = frames.map(Number);
    return ((h * 3600 + m * 60 + s) + f / frameRate) * 1000;
  }
  return null;
}

function getTiming(element, inherited, frameRate) {
  const begin = parseTime(element.getAttribute("begin"), frameRate);
  const end = parseTime(element.getAttribute("end"), frameRate);
  const dur = parseTime(element.getAttribute("dur"), frameRate);
  const startMs = begin == null ? inherited?.startMs ?? null : (inherited?.startMs ?? 0) + begin;
  let endMs = end == null
    ? (dur == null ? inherited?.endMs ?? null : (startMs ?? 0) + dur)
    : (inherited?.startMs ?? 0) + end;
  if (startMs != null && endMs != null && endMs < startMs) endMs = startMs;
  return { startMs, endMs };
}

function appendTextWords(text, timing, state, output) {
  const tokens = text.trim().split(/\s+/u).filter(Boolean);
  if (!tokens.length || timing.startMs == null || timing.endMs == null) {
    if (/\s/u.test(text)) state.pendingSpace = true;
    return;
  }

  const duration = timing.endMs - timing.startMs;
  tokens.forEach((token, index) => {
    const separatorBefore = output.length === 0
      ? ""
      : (index > 0 || state.pendingSpace ? " " : "");
    output.push({
      text: token,
      separatorBefore,
      startMs: timing.startMs + duration * index / tokens.length,
      endMs: timing.startMs + duration * (index + 1) / tokens.length
    });
    state.pendingSpace = false;
  });
  if (/\s$/u.test(text)) state.pendingSpace = true;
}

function collectTimedWords(node, inherited, frameRate, output, state) {
  if (node.nodeType === Node.TEXT_NODE) {
    appendTextWords(node.nodeValue ?? "", inherited, state, output);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  if (node.localName?.toLowerCase() === "br") {
    state.pendingSpace = true;
    return;
  }

  const timing = getTiming(node, inherited, frameRate);
  const hasTimedChildren = [...node.children].some(child =>
    child.hasAttribute("begin") || child.hasAttribute("end") || child.hasAttribute("dur")
  );

  if (node.localName?.toLowerCase() === "span" && !hasTimedChildren) {
    appendTextWords(node.textContent ?? "", timing, state, output);
    return;
  }

  for (const child of node.childNodes) {
    collectTimedWords(child, timing, frameRate, output, state);
  }
}

/**
 * Parse a TTML/DFXP document into line and timed-word objects.
 * Supports clock and offset timestamps, timed/nested spans, and syllable spans.
 * Adjacent timed spans remain adjacent unless the XML contains whitespace between them.
 */
export function parseTtml(source) {
  if (typeof source !== "string" || !source.trim()) {
    throw new TypeError("parseTtml() expects a non-empty TTML string.");
  }
  if (typeof DOMParser === "undefined") {
    throw new Error("TTML parsing requires a browser with DOMParser support.");
  }

  const xml = new DOMParser().parseFromString(source, "application/xml");
  if (xml.querySelector("parsererror")) {
    throw new SyntaxError("The selected file is not valid XML/TTML.");
  }

  const frameRate = Number(xml.documentElement.getAttribute("frameRate")) || 30;
  const paragraphs = [...xml.getElementsByTagNameNS("*", "p")];
  if (!paragraphs.length) {
    throw new Error("No <p> lyric lines were found in this TTML file.");
  }

  const lines = [];
  for (const paragraph of paragraphs) {
    const timing = getTiming(paragraph, { startMs: 0, endMs: null }, frameRate);
    const words = [];
    collectTimedWords(paragraph, timing, frameRate, words, { pendingSpace: false });
    const validWords = words.filter(word =>
      word.text && Number.isFinite(word.startMs) && Number.isFinite(word.endMs)
    );
    if (!validWords.length) continue;
    validWords.sort((a, b) => a.startMs - b.startMs);
    const lineStartMs = paragraph.hasAttribute("begin") ? timing.startMs : validWords[0].startMs;
    lines.push({ startMs: lineStartMs, words: validWords });
  }

  if (!lines.length) {
    throw new Error("No timed lyric text could be read. Check that your TTML has begin/end timestamps.");
  }
  lines.sort((a, b) => a.startMs - b.startMs);
  return lines;
}
