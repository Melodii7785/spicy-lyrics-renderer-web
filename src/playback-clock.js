/**
 * Two-stage playback clock:
 * 1. Extrapolate the latest player measurement using monotonic wall time.
 * 2. Low-pass filter small measurement jitter, snapping on large discontinuities.
 *
 * All positions and timestamps are milliseconds. nowMs should be monotonic
 * (for example performance.now()), not Date.now().
 */
export class PlaybackClock {
  static PROGRESS_POSITION_OFFSET_MS = 100;
  static JITTER_RESYNC_THRESHOLD_MS = 500;
  static JITTER_TIME_CONSTANT_MS = 300;

  constructor() {
    this.reset();
    this.anchorMs = 0;
    this.anchorAtMs = 0;
    this.lastMeasuredMs = null;
    this.lastPlaybackSpeed = null;
    this.predictedMs = 0;
    this.updatedAtMs = 0;
  }

  reset() {
    this.initialized = false;
    this.lastMeasuredMs = null;
    this.lastPlaybackSpeed = null;
    this.anchorMs = 0;
    this.anchorAtMs = 0;
    this.predictedMs = 0;
    this.updatedAtMs = 0;
  }

  positionMs(measuredMs, isPlaying, playbackSpeed, nowMs, durationMs = 0) {
    for (const [name, value] of Object.entries({
      measuredMs, playbackSpeed, nowMs, durationMs
    })) {
      if (!Number.isFinite(value)) {
        throw new TypeError(`${name} must be a finite number.`);
      }
    }

    const speed = Math.max(0, playbackSpeed);
    const clampPosition = (position) => durationMs > 0
      ? Math.min(durationMs, Math.max(0, position))
      : Math.max(0, position);

    if (!isPlaying) {
      this.reset();
      return clampPosition(measuredMs);
    }

    if (this.lastPlaybackSpeed === null || playbackSpeed !== this.lastPlaybackSpeed) {
      this.initialized = false;
      this.anchorMs = measuredMs;
      this.anchorAtMs = nowMs;
      this.lastMeasuredMs = measuredMs;
      this.lastPlaybackSpeed = playbackSpeed;
    } else if (this.lastMeasuredMs === null || measuredMs !== this.lastMeasuredMs) {
      this.anchorMs = measuredMs;
      this.anchorAtMs = nowMs;
      this.lastMeasuredMs = measuredMs;
    }

    const extrapolated = this.anchorMs +
      Math.max(0, nowMs - this.anchorAtMs) * speed;

    if (!this.initialized) {
      this.predictedMs = extrapolated;
      this.updatedAtMs = nowMs;
      this.initialized = true;
      return clampPosition(
        Math.trunc(this.predictedMs) + PlaybackClock.PROGRESS_POSITION_OFFSET_MS
      );
    }

    const elapsed = Math.max(0, nowMs - this.updatedAtMs);
    let predicted = this.predictedMs + elapsed * speed;
    const error = extrapolated - predicted;

    if (Math.abs(error) > PlaybackClock.JITTER_RESYNC_THRESHOLD_MS) {
      predicted = extrapolated;
    } else {
      const alpha = 1 - Math.exp(-elapsed / PlaybackClock.JITTER_TIME_CONSTANT_MS);
      predicted += error * alpha;
    }

    this.predictedMs = Math.max(0, predicted);
    this.updatedAtMs = nowMs;
    return clampPosition(
      Math.trunc(this.predictedMs) + PlaybackClock.PROGRESS_POSITION_OFFSET_MS
    );
  }
}
