export class FpsMeter {
  constructor(windowSize = 60) {
    this.times = new Float64Array(windowSize);
    this.i = 0;
    this.filled = 0;
    this.last = 0;
    this.ms = 16.6;
    this.fps = 60;
  }

  tick(t) {
    if (this.last) {
      this.ms = t - this.last;
      this.times[this.i] = this.ms;
      this.i = (this.i + 1) % this.times.length;
      if (this.filled < this.times.length) this.filled++;
      let sum = 0;
      for (let k = 0; k < this.filled; k++) sum += this.times[k];
      const avg = sum / this.filled;
      this.fps = avg > 0 ? 1000 / avg : 0;
    }
    this.last = t;
    return this.fps;
  }
}
