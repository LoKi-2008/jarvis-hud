import { appState } from "../state.js";

/**
 * Procedural HUD sound — no sample files, works offline.
 */
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ready = false;
  }

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.ready = true;
  }

  get muted() {
    return appState.muted || appState.mode === "STEALTH";
  }

  tone(freq, dur, type = "sine", gain = 0.12, at = 0) {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, gain = 0.08, at = 0) {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime + at;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }

  bootIgnite() {
    this.tone(110, 0.8, "sine", 0.16);
    this.tone(220, 0.6, "triangle", 0.08, 0.1);
    this.noise(0.35, 0.05);
  }

  systemOnline() {
    this.tone(660, 0.09, "square", 0.05);
    this.tone(880, 0.12, "square", 0.04, 0.08);
  }

  modeChange() {
    this.tone(392, 0.1, "triangle", 0.08);
    this.tone(523, 0.14, "triangle", 0.07, 0.08);
  }

  toast() {
    this.tone(980, 0.07, "square", 0.04);
  }

  alert() {
    this.tone(240, 0.18, "sawtooth", 0.1);
    this.tone(180, 0.22, "sawtooth", 0.08, 0.12);
  }

  fire() {
    this.noise(0.22, 0.14);
    this.tone(90, 0.28, "sawtooth", 0.12);
    this.tone(1400, 0.08, "square", 0.05);
  }

  charge() {
    if (!this.ready || this.muted) return;
    this.tone(180, 0.35, "sine", 0.06);
  }

  swipe() {
    this.tone(420, 0.12, "triangle", 0.05);
  }

  click() {
    this.tone(1200, 0.04, "square", 0.03);
  }
}

export const sfx = new Sfx();
