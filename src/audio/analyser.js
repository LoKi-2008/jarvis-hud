import { sfx } from "./sfx.js";
import { appState } from "../state.js";

/** Beat envelope for PARTY mode — analyses SFX graph plus an optional music node. */
export class BeatAnalyser {
  constructor() {
    this.level = 0;
    this.bass = 0;
    this.data = new Uint8Array(64);
    this.node = null;
    this.beatClock = 0;
    this.pulse = 0;
  }

  ensure() {
    sfx.unlock();
    if (!sfx.ctx || this.node) return;
    this.node = sfx.ctx.createAnalyser();
    this.node.fftSize = 128;
    sfx.master.connect(this.node);
  }

  attachMusic(el) {
    this.ensure();
    if (!sfx.ctx || !el) return;
    if (!el._jarvisSrc) {
      el._jarvisSrc = sfx.ctx.createMediaElementSource(el);
      el._jarvisSrc.connect(sfx.master);
    }
  }

  update(t) {
    if (appState.mode !== "PARTY") {
      this.pulse *= 0.9;
      this.level *= 0.9;
      return this.pulse;
    }
    this.ensure();
    if (this.node) {
      this.node.getByteFrequencyData(this.data);
      let bass = 0;
      for (let i = 0; i < 6; i++) bass += this.data[i];
      this.bass = bass / (6 * 255);
      let all = 0;
      for (let i = 0; i < this.data.length; i++) all += this.data[i];
      this.level = all / (this.data.length * 255);
    }
    // Internal kick so the mode still breathes without a track.
    const beat = Math.sin(t / 180) > 0.92;
    if (beat) this.pulse = 1;
    this.pulse *= 0.92;
    this.pulse = Math.max(this.pulse, this.bass);
    return this.pulse;
  }
}

export const beats = new BeatAnalyser();
