const PI = Math.PI;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoothstep = (x) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const easeCosine = (x) => 0.5 - 0.5 * Math.cos(PI * clamp01(x));

function cubicBezier(x1, y1, x2, y2, x) {
  const target = clamp01(x);
  const sample = (a, b, t) => {
    const inv = 1 - t;
    return 3 * inv * inv * t * a + 3 * inv * t * t * b + t * t * t;
  };

  let low = 0;
  let high = 1;
  let t = target;

  // Bisection is stable even where the curve has a very flat derivative.
  for (let i = 0; i < 20; i += 1) {
    const current = sample(x1, x2, t);
    if (Math.abs(current - target) < 1e-7) break;
    if (current < target) low = t;
    else high = t;
    t = (low + high) / 2;
  }

  return sample(y1, y2, t);
}

const emphasisIn = (x) => cubicBezier(0.2, 0.4, 0.58, 1, x);
const emphasisOut = (x) => cubicBezier(0.3, 0, 0.58, 1, x);

export const RefreshedMotion = Object.freeze({
  ALPHA: 1,
  GAP_EM: 0.62,
  EDGE_EM: 0.55,
  WORD_EDGE_EM: 0.55,
  LETTER_EDGE_EM: 0.55,
  DEFAULT_GAP_EM: 0.19,

  smoothstep,

  waveStrength(durationMs, lastWord = false) {
    const grow = (x) => x > 1 ? Math.sqrt(x) : x ** 3;
    let ms = Math.max(1000, Number(durationMs));
    let amount = grow(ms / 2000) * 0.6;
    let blur = grow(ms / 3000) * 0.5;

    if (lastWord) {
      amount *= 1.6;
      blur *= 1.5;
      ms *= 1.2;
    }

    return {
      amount: Math.min(1.2, amount),
      blur: Math.min(0.8, blur),
      duration: ms
    };
  },

  emphasis(x) {
    if (x <= 0 || x >= 1) return 0;
    return x < 0.5
      ? emphasisIn(x / 0.5)
      : 1 - emphasisOut((x - 0.5) / 0.5);
  },

  letter(t, wordStart, index, count, strength, background = false, lit = 0) {
    const safeCount = Math.max(1, count);
    const at = t - wordStart -
      strength.duration * (1 / 2.5) / safeCount * index;
    const swell = this.emphasis(at / strength.duration);
    const floatAt = (at + 400) / (strength.duration * 1.4);
    const float = floatAt > 0 && floatAt < 1
      ? Math.sin(floatAt * PI) * 0.05 * (background ? 2 : 1)
      : 0;
    const x = -swell * 0.03 * strength.amount * (safeCount / 2 - index);
    const y = -swell * 0.025 * strength.amount - float;
    const glow = swell * strength.blur * (0.4 + 0.6 * lit);

    return {
      x,
      y,
      scale: 1 + swell * 0.1 * strength.amount,
      glow,
      radius: Math.min(0.3, strength.blur * 0.3)
    };
  },

  wordFloat(t, start, end) {
    const x = clamp01((t - start) / Math.max(1000, end - start));
    return 1 - (1 - x) ** 2;
  },

  wordOffset(float) {
    return 0.01 - 0.043 * float;
  },

  sweepEdges(x, widths, starts, ends, fade, t) {
    const n = x.length;
    const edges = Array(n).fill(Number.NEGATIVE_INFINITY);
    let first = -1;
    let last = -1;

    for (let i = 0; i < n; i += 1) {
      if (widths[i] > 0) {
        if (first < 0) first = i;
        last = i;
      }
    }
    if (first < 0) return edges;

    const half = fade / 2;
    let reached = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < n; i += 1) {
      if (widths[i] <= 0) continue;
      const from = i === first ? x[i] - half : x[i];
      const to = x[i] + widths[i] + (i === last ? half : 0);
      const at = t >= ends[i]
        ? to
        : t > starts[i]
          ? from + (to - from) * (t - starts[i]) / (ends[i] - starts[i])
          : Number.NEGATIVE_INFINITY;
      edges[i] = at;
      if (at > reached) reached = at;
    }

    let before = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < n; i += 1) {
      if (widths[i] <= 0) continue;
      const at = edges[i];
      if (t >= ends[i]) edges[i] = reached;
      else if (t <= starts[i]) edges[i] = before;
      if (at > before) before = at;
    }
    return edges;
  },

  sweepPosition(edge, x, width, fade) {
    if (edge === Number.NEGATIVE_INFINITY) return -50;
    const rest = (width + fade / 2 - (edge - x)) / (width + fade);
    return Math.min(100, Math.max(-50, 100 - 150 * rest));
  },

  dotAlpha(elapsed, duration, index) {
    const span = Math.max(duration - 550, 90) / 3;
    const fill = easeCosine((elapsed - index * span) / span);
    const enter = smoothstep((elapsed - index * 120) / 650);
    return (0.22 + (0.92 - 0.22) * fill) * enter;
  },

  dotBreath(elapsed, duration) {
    const room = duration - 500;
    if (room < 2600) return 1;
    const cycles = Math.max(1, Math.floor(room / 4200 + 0.5));
    const phase = Math.min(cycles, Math.max(0, elapsed / (room / cycles)));
    return 1 + 0.16 * (0.5 - 0.5 * Math.cos(2 * PI * phase));
  }
});
