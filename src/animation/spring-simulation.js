const EPS = 1e-5;
const TAU = 2 * Math.PI;

/**
 * Closed-form damped spring simulation.
 * frequency is in Hz; step() accepts seconds.
 * Retargeting preserves velocity unless replacePosition is true.
 */
export class SpringSimulation {
  constructor(startPosition, frequency, damping) {
    this.frequency = frequency;
    this.damping = damping;
    this.g = startPosition;
    this.p = startPosition;
    this.v = 0;
  }

  setGoal(target, replacePosition = false) {
    this.g = target;
    if (replacePosition) {
      this.p = target;
      this.v = 0;
    }
  }

  resetTo(currentValue) {
    this.p = currentValue;
    this.v = 0;
  }

  step(dt) {
    const d = this.damping;
    const f = this.frequency * TAU;
    const g = this.g;
    let p = this.p;
    let v = this.v;

    if (d === 1) {
      const q = Math.exp(-f * dt);
      const w = dt * q;
      const c0 = q + w * f;
      const c2 = q - w * f;
      const c3 = w * f * f;
      const o = p - g;
      p = o * c0 + v * w + g;
      v = v * c2 - o * c3;
    } else if (d < 1) {
      const c = Math.sqrt(1 - d * d);
      const i = Math.cos(dt * f * c);
      const j = Math.sin(dt * f * c);
      const z = c > EPS
        ? j / c
        : (() => {
            const a = dt * f;
            return a + ((a * a * c ** 4 / 20) - c * c) * a ** 3 / 6;
          })();
      const y = f * c > EPS
        ? j / (f * c)
        : (() => {
            const b = f * c;
            return dt + ((dt * dt * b ** 4 / 20) - b * b) * dt ** 3 / 6;
          })();
      const q = Math.exp(-d * f * dt);
      const o = p - g;
      p = (o * (i + z * d) + v * y) * q + g;
      v = (v * (i - z * d) - o * (z * f)) * q;
    } else {
      const c = Math.sqrt(d * d - 1);
      const r1 = -f * (d + c);
      const r2 = -f * (d - c);
      const ec1 = Math.exp(r1 * dt);
      const ec2 = Math.exp(r2 * dt);
      const o = p - g;
      const co2 = (v - o * r1) / (2 * f * c);
      const co1 = ec1 * (o - co2);
      p = co1 + co2 * ec2 + g;
      v = co1 * r1 + co2 * ec2 * r2;
    }

    this.p = p;
    this.v = v;
    return p;
  }

  get current() {
    return this.p;
  }

  get goal() {
    return this.g;
  }

  get velocity() {
    return this.v;
  }
}
