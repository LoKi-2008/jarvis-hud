import { voiceWaveform } from "../voice/waveform.js";
import { recorder } from "../tools/recorder.js";
import { TouchDock } from "./touchDock.js";
import { MODE_META } from "../config.js";
import { appState } from "../state.js";

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17],            // Palm base
];

const READOUTS = [
  "OPTICAL MATRIX NOMINAL",
  "HAND KINEMATICS ACTIVE",
  "FACIAL TESSELLATION LOCKED",
  "NEURAL BANDWIDTH 12ms",
  "QUANTUM CORE OPTIMAL",
  "DEFENSIVE PROTOCOLS ONLINE",
  "SPATIAL TELEMETRY 60 FPS",
];

export class HudOverlay {
  constructor() {
    this.canvas = document.getElementById("hud");
    this.ctx = this.canvas.getContext("2d");
    this.bootT = 1;
    this.readI = 0;
    this.readSwap = 0;
    this.radar = 0;
    this.ring = 0;
    this.alpha = 1;
    this.trans = 0;
    this.pulse = 0;
    this.tools = null;
    this.touchDock = new TouchDock(null);
  }

  setTools(tools) {
    this.tools = tools;
    this.touchDock.setTools(tools);
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
    if (!w || !h) return;

    const meta = MODE_META[appState.mode] || MODE_META.ACTIVE;
    const accent = meta.accent;
    const stealth = appState.mode === "STEALTH";
    this.alpha = stealth ? 0.16 : appState.mode === "STANDBY" ? 0.45 : 1;
    ctx.globalAlpha = this.alpha * this.bootT;

    this.ring += 0.008;
    this.radar += 0.018;
    if (t > this.readSwap) {
      this.readSwap = t + 1200 + Math.random() * 800;
      this.readI = (this.readI + 1) % READOUTS.length;
    }

    // 1. Tactical HUD Chrome
    this.brackets(ctx, w, h, accent);
    this.statusBar(ctx, w, accent, frame, meta);
    this.radarSweep(ctx, w, h, accent);
    this.readouts(ctx, w, h, accent);

    // 2. Crystal Clear Hand & Face Detection
    if (frame) {
      this.drawClearFace(ctx, w, h, frame.primaryFace, accent);
      this.drawClearHands(ctx, w, h, frame.hands, accent);
    }

    // 3. Air-Touch & Touchscreen Dock
    const airCursor = this.touchDock.updateAirTouch(frame);
    this.touchDock.draw(ctx, w, h, accent);
    if (airCursor) {
      this.drawAirCursor(ctx, airCursor);
    }

    // 4. Tools & Voice
    voiceWaveform.update();
    voiceWaveform.draw(ctx, w * 0.5, 32, 20, accent);
    this.tools?.drawRadial(ctx);
    if (recorder.isRecording) this.recordingBadge(ctx, w);

    if (this.trans > 0) {
      ctx.globalAlpha = this.trans * 0.3;
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, w, h);
      this.trans *= 0.88;
    }
    ctx.globalAlpha = 1;
  }

  flash() {
    this.trans = 1;
  }

  drawClearHands(ctx, w, h, hands, accent) {
    if (!hands) return;
    for (const hand of hands) {
      if (!hand.present || !hand.landmarks) continue;
      const lm = hand.landmarks;
      const alpha = 0.9 * (hand.fade || 1);

      ctx.save();
      ctx.globalAlpha = alpha;

      // Draw glowing bone connections
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 2.5;
      for (const [s, e] of HAND_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(lm[s].x * w, lm[s].y * h);
        ctx.lineTo(lm[e].x * w, lm[e].y * h);
        ctx.stroke();
      }

      // Draw circular joint nodes
      for (let i = 0; i < 21; i++) {
        const p = lm[i];
        const isTip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
        ctx.fillStyle = isTip ? "#ffb300" : "#ffffff";
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, isTip ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();

        if (isTip) {
          ctx.strokeStyle = "#ffb300";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, 9, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Pinch indicator
      if (hand._pinch?.active) {
        const px = hand._pinch.x * w;
        const py = hand._pinch.y * h;
        ctx.strokeStyle = "#ff1744";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 16, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#ff1744";
        ctx.font = "bold 10px 'Orbitron', sans-serif";
        ctx.fillText("PINCH LOCKED", px + 20, py - 4);
      }

      // Hand label at wrist
      const wrist = lm[0];
      const wx = wrist.x * w;
      const wy = wrist.y * h;
      ctx.fillStyle = "#00e5ff";
      ctx.font = "bold 11px 'Orbitron', sans-serif";
      ctx.fillText(`${hand.handedness.toUpperCase()} HAND`, wx + 12, wy + 16);

      ctx.restore();
    }
  }

  drawClearFace(ctx, w, h, face, accent) {
    if (!face?.landmarks) return;
    const lm = face.landmarks;
    const alpha = 0.85 * (face.fade || 1);

    ctx.save();
    ctx.globalAlpha = alpha;

    // 1. Calculate Face Bounding Box
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (let i = 0; i < lm.length; i += 4) {
      const p = lm[i];
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const bx = minX * w - 10;
    const by = minY * h - 14;
    const bw = (maxX - minX) * w + 20;
    const bh = (maxY - minY) * h + 24;

    // Tactical corner brackets
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    const blen = Math.min(22, bw * 0.2);

    // TL
    ctx.beginPath();
    ctx.moveTo(bx, by + blen); ctx.lineTo(bx, by); ctx.lineTo(bx + blen, by);
    // TR
    ctx.moveTo(bx + bw - blen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + blen);
    // BL
    ctx.moveTo(bx, by + bh - blen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + blen, by + bh);
    // BR
    ctx.moveTo(bx + bw - blen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - blen);
    ctx.stroke();

    // 2. Eye & Nose Crosshairs
    const leftEye = lm[33];
    const rightEye = lm[263];
    const nose = lm[1];

    ctx.fillStyle = "#ffb300";
    ctx.beginPath();
    ctx.arc(leftEye.x * w, leftEye.y * h, 3, 0, Math.PI * 2);
    ctx.arc(rightEye.x * w, rightEye.y * h, 3, 0, Math.PI * 2);
    ctx.arc(nose.x * w, nose.y * h, 3, 0, Math.PI * 2);
    ctx.fill();

    // 3. Biometric Identity Tag
    ctx.fillStyle = "#00e5ff";
    ctx.font = "bold 11px 'Orbitron', sans-serif";
    const name = face.enrolledName ? `BIOMETRIC LOCK: ${face.enrolledName.toUpperCase()}` : "FACE TRACKING 100%";
    ctx.fillText(name, bx, by - 8);

    ctx.restore();
  }

  drawAirCursor(ctx, cursor) {
    ctx.save();
    ctx.translate(cursor.x, cursor.y);

    ctx.strokeStyle = cursor.pinch ? "#ff1744" : "#00e5ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, cursor.pinch ? 10 : 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = cursor.pinch ? "#ff1744" : "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#00e5ff";
    ctx.font = "9px 'Orbitron', sans-serif";
    ctx.fillText("AIR TOUCH", 16, 4);

    ctx.restore();
  }

  brackets(ctx, w, h, accent) {
    const m = 24;
    const len = 44;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(m, m + len); ctx.lineTo(m, m); ctx.lineTo(m + len, m);
    ctx.moveTo(w - m - len, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + len);
    ctx.moveTo(m, h - m - len - 60); ctx.lineTo(m, h - m - 60); ctx.lineTo(m + len, h - m - 60);
    ctx.moveTo(w - m - len, h - m - 60); ctx.lineTo(w - m, h - m - 60); ctx.lineTo(w - m, h - m - len - 60);
    ctx.stroke();
  }

  statusBar(ctx, w, accent, frame, meta) {
    ctx.font = "12px 'Orbitron', sans-serif";
    ctx.fillStyle = accent;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.85 * this.alpha * this.bootT;
    ctx.strokeRect(60, 16, w - 120, 28);
    const d = new Date();
    const clock = d.toTimeString().slice(0, 8);
    const hands = frame ? frame.hands.filter((h) => h.present).length : 0;
    const faces = frame?.faceCount ?? 0;
    ctx.fillText("J.A.R.V.I.S.", 76, 35);
    ctx.fillText(`MODE ${meta.label}`, w * 0.36, 35);
    ctx.fillText(clock, w * 0.58, 35);
    ctx.fillText(`HANDS ${hands}  FACE ${faces}  FPS ${appState.fps.toFixed(0)}`, w - 300, 35);
  }

  radarSweep(ctx, w, h, accent) {
    const x = w - 90;
    const y = h - 130;
    const r = 40;
    ctx.save();
    ctx.globalAlpha = 0.6 * this.alpha * this.bootT;
    ctx.strokeStyle = accent;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, this.radar, this.radar + 0.6);
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.15 * this.alpha * this.bootT;
    ctx.fill();
    ctx.restore();
  }

  readouts(ctx, w, h, accent) {
    ctx.font = "11px 'Share Tech Mono', monospace";
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.7 * this.alpha * this.bootT;
    const y0 = h - 150;
    for (let i = 0; i < 3; i++) {
      const s = READOUTS[(this.readI + i) % READOUTS.length];
      ctx.fillText(s, 44, y0 + i * 16);
    }
  }

  recordingBadge(ctx, w) {
    ctx.save();
    ctx.fillStyle = "#ff1744";
    ctx.beginPath();
    ctx.arc(w - 380, 30, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "11px 'Orbitron', sans-serif";
    ctx.fillText("REC", w - 370, 34);
    ctx.restore();
  }
}
