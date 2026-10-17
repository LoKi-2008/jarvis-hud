/** One Euro Filter — keeps landmarks stable without lag on fast motion. */

function alpha(dt, cutoff) {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuroFilter {
  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xPrev = 0;
    this.dxPrev = 0;
    this.tPrev = -1;
    this.initialized = false;
  }

  reset() {
    this.initialized = false;
    this.dxPrev = 0;
  }

  filter(x, tMs) {
    if (!this.initialized) {
      this.initialized = true;
      this.xPrev = x;
      this.tPrev = tMs;
      return x;
    }
    const dt = Math.max((tMs - this.tPrev) * 0.001, 1e-4);
    const dx = (x - this.xPrev) / dt;
    const aD = alpha(dt, this.dCutoff);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = alpha(dt, cutoff);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat;
    this.dxPrev = dxHat;
    this.tPrev = tMs;
    return xHat;
  }
}

/** XYZ smoother with pooled filters, no per-frame allocation of filter objects. */
export class LandmarkSmoother {
  constructor(count, cfg) {
    this.count = count;
    this.fx = new Array(count);
    this.fy = new Array(count);
    this.fz = new Array(count);
    for (let i = 0; i < count; i++) {
      this.fx[i] = new OneEuroFilter(cfg.minCutoff, cfg.beta, cfg.dCutoff);
      this.fy[i] = new OneEuroFilter(cfg.minCutoff, cfg.beta, cfg.dCutoff);
      this.fz[i] = new OneEuroFilter(cfg.minCutoff, cfg.zBeta ?? cfg.beta * 0.5, cfg.dCutoff);
    }
    this.out = new Array(count);
    for (let i = 0; i < count; i++) {
      this.out[i] = { x: 0, y: 0, z: 0, visibility: 0 };
    }
  }

  reset() {
    for (let i = 0; i < this.count; i++) {
      this.fx[i].reset();
      this.fy[i].reset();
      this.fz[i].reset();
    }
  }

  apply(landmarks, tMs, mirrorX) {
    const n = Math.min(landmarks.length, this.count);
    for (let i = 0; i < n; i++) {
      const src = landmarks[i];
      const x = mirrorX ? 1 - src.x : src.x;
      const dst = this.out[i];
      dst.x = this.fx[i].filter(x, tMs);
      dst.y = this.fy[i].filter(src.y, tMs);
      dst.z = this.fz[i].filter(src.z ?? 0, tMs);
      dst.visibility = src.visibility ?? 1;
    }
    return this.out;
  }
}
