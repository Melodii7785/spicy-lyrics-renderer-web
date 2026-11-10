/**
 * Timing helpers for word-synchronised lyrics.
 * All timestamps and positions are milliseconds.
 */

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Returns the fill amount (0..1) for a timed word at a playback position.
 * Words before their start are unfilled; words after their end are fully filled.
 */
export function getWordProgress(positionMs, startMs, endMs) {
  if (![positionMs, startMs, endMs].every(Number.isFinite)) {
    throw new TypeError("Word timing values must be finite numbers.");
  }

  if (endMs <= startMs) {
    return positionMs >= endMs ? 1 : 0;
  }

  return clamp((positionMs - startMs) / (endMs - startMs), 0, 1);
}

/**
 * Finds the line that should be displayed at a playback position.
 * Before the first line and after the last line, the nearest line is returned.
 */
export function findLineIndex(lines, positionMs) {
  if (!Array.isArray(lines) || lines.length === 0) return -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const next = lines[i + 1];

    if (positionMs < (next?.startMs ?? Number.POSITIVE_INFINITY)) {
      return i;
    }
  }

  return lines.length - 1;
}
