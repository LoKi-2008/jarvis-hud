import { CONFIG } from "./config.js";

/**
 * Auto-reduce vision/hologram quality when render FPS drops below 30.
 * Never pauses the render loop — only skips optional inference work.
 */
export class QualityGovernor {
  constructor() {
    this.level = 2; // 2 high, 1 med, 0 low
    this.below = 0;
    this.above = 0;
    this.labels = ["low", "medium", "high"];
  }

  update(fps) {
    if (fps < CONFIG.quality.lowFps) {
      this.below++;
      this.above = 0;
      if (this.below > CONFIG.quality.samples && this.level > 0) {
        this.level--;
        this.below = 0;
      }
    } else if (fps > CONFIG.quality.recoverFps) {
      this.above++;
      this.below = 0;
      if (this.above > CONFIG.quality.samples && this.level < 2) {
        this.level++;
        this.above = 0;
      }
    } else {
      this.below = 0;
      this.above = 0;
    }
    return this.level;
  }

  get label() {
    return this.labels[this.level];
  }

  get runCoco() {
    return this.level >= 2;
  }

  get runPoseMask() {
    return this.level >= 1;
  }

  get particleScale() {
    return [0.35, 0.65, 1][this.level];
  }

  get bloom() {
    return this.level >= 1;
  }
}
