/**
 * Natural cubic spline interpolation over (time, value) control points.
 * Points are sorted by time; evaluation clamps to the endpoint range.
 */
export class CubicSplineInterpolator {
  constructor(points) {
    if (!Array.isArray(points) || points.length < 2) {
      throw new TypeError("Need at least 2 points for interpolation.");
    }

    const sorted = [...points].sort((a, b) => a.time - b.time);
    if (sorted.some((point) =>
      !Number.isFinite(point.time) || !Number.isFinite(point.value))) {
      throw new TypeError("Spline points must contain finite time and value numbers.");
    }

    this.xs = sorted.map((point) => point.time);
    this.ys = sorted.map((point) => point.value);
    if (this.xs.some((value, index) => index > 0 && value <= this.xs[index - 1])) {
      throw new RangeError("Spline point times must be strictly increasing.");
    }
    this.ks = this.#naturalSplineCoefficients();
  }

  at(time) {
    const t = Math.min(this.xs.at(-1), Math.max(this.xs[0], time));
    let i = 1;
    while (i < this.xs.length - 1 && this.xs[i] < t) i += 1;
    const segment = i - 1;
    const dx = this.xs[i] - this.xs[segment];
    const localT = (t - this.xs[segment]) / dx;
    const a = this.ks[segment] * dx - (this.ys[i] - this.ys[segment]);
    const b = -this.ks[i] * dx + (this.ys[i] - this.ys[segment]);

    return (1 - localT) * this.ys[segment] + localT * this.ys[i] +
      localT * (1 - localT) * (a * (1 - localT) + b * localT);
  }

  #naturalSplineCoefficients() {
    const n = this.xs.length;
    const xs = this.xs;
    const ys = this.ys;
    const k = Array(n).fill(0);
    if (n === 2) {
      const slope = (ys[1] - ys[0]) / (xs[1] - xs[0]);
      return [slope, slope];
    }

    const a = Array(n).fill(0);
    const b = Array(n).fill(0);
    const c = Array(n).fill(0);
    const d = Array(n).fill(0);

    let dx = xs[1] - xs[0];
    b[0] = 2 / dx;
    c[0] = 1 / dx;
    d[0] = 3 * (ys[1] - ys[0]) / (dx * dx);

    for (let i = 1; i < n - 1; i += 1) {
      const dx0 = xs[i] - xs[i - 1];
      const dx1 = xs[i + 1] - xs[i];
      a[i] = 1 / dx0;
      b[i] = 2 * (1 / dx0 + 1 / dx1);
      c[i] = 1 / dx1;
      d[i] = 3 * ((ys[i] - ys[i - 1]) / (dx0 * dx0) +
        (ys[i + 1] - ys[i]) / (dx1 * dx1));
    }

    const last = n - 1;
    dx = xs[last] - xs[last - 1];
    a[last] = 1 / dx;
    b[last] = 2 / dx;
    d[last] = 3 * (ys[last] - ys[last - 1]) / (dx * dx);

    for (let i = 1; i < n; i += 1) {
      const m = a[i] / b[i - 1];
      b[i] -= m * c[i - 1];
      d[i] -= m * d[i - 1];
    }

    k[last] = d[last] / b[last];
    for (let i = n - 2; i >= 0; i -= 1) {
      k[i] = (d[i] - c[i] * k[i + 1]) / b[i];
    }
    return k;
  }
}
