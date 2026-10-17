import { MODE_META } from "../config.js";
import { appState } from "../state.js";
import { clamp } from "../utils/math.js";

const READOUTS = [
  "OPTICAL ARRAY NOMINAL",
  "INERTIAL STABILIZERS 100%",
  "REPULSOR CHARGE IDLE",
  "BIOMETRIC LOCK ENGAGED",
  "UPLINK LATENCY 12ms",
  "ARC REACTOR 98.7%",
  "THREAT INDEX 0.02",
  "AIR DENSITY 1.225",
];

export class HudOverlay {
  constructor() {
    this.canvas = document.getElementById("hud");
    this.ctx = this.canvas.getContext("2d");
    this.bootT = 1;
    this.glitch = 0;
    this.readI = 0;
    this.readSwap = 0;
    this.radar = 0;
    this.ring = 0;
    this.hex = 0;
    this.alpha = 1;
  }

  resize(w, h) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  draw(t, frame) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    const meta = MODE_META[appState.mode] || MODE_META.ACTIVE;
    const accent = meta.accent;
    const stealth = appState.mode === "STEALTH";
    this.alpha = stealth ? 0.16 : appState.mode === "STANDBY" ? 0.45 : 1;
    ctx.globalAlpha = this.alpha * this.bootT;

    this.hex += 0.35;
    this.ring += 0.008;
    this.radar += 0.018;
    if (t > this.readSwap) {
      this.readSwap = t + 900 + Math.random() * 700;
      this.readI = (this.readI + 1) % READOUTS.length;
      if (Math.random() < 0.08) this.glitch = 6;
    }
    if (this.glitch > 0) this.glitch--;

    this.hexGrid(ctx, w, h, accent);
    this.brackets(ctx, w, h, accent);
    this.statusBar(ctx, w, accent, frame, meta);
    this.dials(ctx, w, h, accent, t);
    this.rings(ctx, w, h, accent, frame);
    this.radarSweep(ctx, w, h, accent);
    this.readouts(ctx, w, h, accent);
    if (frame?.light < 0.18) this.lowLight(ctx, w, h);
    ctx.globalAlpha = 1;
  }

  hexGrid(ctx, w, h, accent) {
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.07 * this.alpha * this.bootT;
    ctx.lineWidth = 1;
    const s = 28;
    const hgt = s * Math.sqrt(3);
    const ox = (this.hex % (s * 2)) - s;
    for (let y = -hgt; y < h + hgt; y += hgt * 0.5) {
      const row = Math.round(y / (hgt * 0.5));
      const shift = row % 2 ? s : 0;
      for (let x = -s + shift + ox; x < w; x += s * 2) {
        hex(ctx, x, y, s * 0.52);
      }
    }
    ctx.restore();
  }

  brackets(ctx, w, h, accent) {
    const m = 28;
    const len = 48;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    // TL
    ctx.moveTo(m, m + len);
    ctx.lineTo(m, m);
    ctx.lineTo(m + len, m);
    // TR
    ctx.moveTo(w - m - len, m);
    ctx.lineTo(w - m, m);
    ctx.lineTo(w - m, m + len);
    // BL
    ctx.moveTo(m, h - m - len);
    ctx.lineTo(m, h - m);
    ctx.lineTo(m + len, h - m);
    // BR
    ctx.moveTo(w - m - len, h - m);
    ctx.lineTo(w - m, h - m);
    ctx.lineTo(w - m, h - m - len);
    ctx.stroke();
  }

  statusBar(ctx, w, accent, frame, meta) {
    ctx.font = "12px Orbitron, sans-serif";
    ctx.fillStyle = accent;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.85 * this.alpha * this.bootT;
    ctx.strokeRect(70, 18, w - 140, 28);
    const d = new Date();
    const clock = d.toTimeString().slice(0, 8);
    const hands = frame ? frame.hands.filter((h) => h.present).length : 0;
    const faces = frame?.faceCount ?? 0;
    const jitter = this.glitch ? "  " + glitchWord("J.A.R.V.I.S.") : "J.A.R.V.I.S.";
    ctx.fillText(jitter, 84, 38);
    ctx.fillText(`MODE ${meta.label}`, w * 0.38, 38);
    ctx.fillText(clock, w * 0.58, 38);
    ctx.fillText(`HND ${hands}  FACE ${faces}  FPS ${appState.fps.toFixed(0)}`, w - 320, 38);
  }

  dials(ctx, w, h, accent, t) {
    this.tickDial(ctx, 70, h * 0.5, 52, t * 0.001, accent);
    this.tickDial(ctx, w - 70, h * 0.5, 52, -t * 0.0012, accent);
  }

  tickDial(ctx, cx, cy, r, rot, accent) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.55 * this.alpha * this.bootT;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const inner = i % 6 === 0 ? r - 10 : r - 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.restore();
  }

  rings(ctx, w, h, accent, frame) {
    const cx = w * 0.5;
    const cy = h * 0.52;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.35 * this.alpha * this.bootT;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.rotate(this.ring * (i % 2 ? 1 : -1));
      ctx.arc(0, 0, 70 + i * 26, this.ring, this.ring + Math.PI * 1.4);
      ctx.stroke();
    }
    ctx.restore();

    // Palm targeting rings follow the dominant present hand.
    if (frame) {
      for (const hand of frame.hands) {
        if (!hand.present || !hand.landmarks) continue;
        const p = hand.landmarks[9];
        ctx.globalAlpha = 0.55 * hand.fade * this.alpha * this.bootT;
        ctx.strokeStyle = accent;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 34, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  radarSweep(ctx, w, h, accent) {
    const x = w - 110;
    const y = h - 110;
    const r = 48;
    ctx.save();
    ctx.globalAlpha = 0.7 * this.alpha * this.bootT;
    ctx.strokeStyle = accent;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, this.radar, this.radar + 0.7);
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.18 * this.alpha * this.bootT;
    ctx.fill();
    ctx.restore();
  }

  readouts(ctx, w, h, accent) {
    ctx.font = "11px Share Tech Mono, monospace";
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.75 * this.alpha * this.bootT;
    const y0 = h - 120;
    for (let i = 0; i < 4; i++) {
      const s = READOUTS[(this.readI + i) % READOUTS.length];
      const txt = this.glitch && i === 0 ? glitchWord(s) : s;
      ctx.fillText(txt, 48, y0 + i * 16);
    }
    ctx.fillText(`INFER ${appState.inferenceMs.toFixed(1)} ms`, 48, y0 + 72);
  }

  lowLight(ctx, w, h) {
    ctx.fillStyle = "rgba(255,179,0,0.75)";
    ctx.font = "12px Orbitron, sans-serif";
    ctx.fillText("LOW LIGHT  ·  TRACKING DEGRADED", w * 0.5 - 140, h - 36);
  }
}

function hex(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function glitchWord(s) {
  const chars = "!@#$%█▓░<>/\\|";
  let o = "";
  for (let i = 0; i < s.length; i++) {
    o += Math.random() < 0.22 ? chars[(Math.random() * chars.length) | 0] : s[i];
  }
  return o;
}

export { clamp };
