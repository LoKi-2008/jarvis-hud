import { HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import { appState } from "../state.js";

const HAND = HandLandmarker.HAND_CONNECTIONS;
const POSE = PoseLandmarker.POSE_CONNECTIONS;

export class DebugOverlay {
  constructor() {
    this.canvas = document.getElementById("debug");
    this.ctx = this.canvas.getContext("2d");
  }

  resize(w, h) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  draw(frame, extra) {
    const ctx = this.ctx;
    const { width: w, height: h } = this.canvas;
    ctx.clearRect(0, 0, w, h);
    if (!appState.debug || !frame) return;

    ctx.save();
    for (const hand of frame.hands) {
      if (!hand.present || !hand.landmarks) continue;
      ctx.globalAlpha = 0.35 + 0.65 * hand.fade;
      strokeConnections(ctx, hand.landmarks, HAND, w, h, "#00E5FF");
      dots(ctx, hand.landmarks, w, h, "#00E5FF", 3);
      ctx.fillStyle = "#00E5FF";
      ctx.font = "11px Orbitron, sans-serif";
      const wri = hand.landmarks[0];
      ctx.fillText(`${hand.handedness} ${(hand.score * 100).toFixed(0)}%`, wri.x * w + 8, wri.y * h - 8);
    }

    if (frame.primaryFace?.landmarks) {
      ctx.globalAlpha = 0.55 * (frame.primaryFace.fade ?? 1);
      dots(ctx, frame.primaryFace.landmarks, w, h, "#7ef9ff", 0.7);
    }
    if (frame.faceCount > 1) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#FFB300";
      ctx.font = "12px Orbitron, sans-serif";
      ctx.fillText(`FACES ${frame.faceCount}`, 16, 72);
    }

    if (frame.pose?.landmarks) {
      ctx.globalAlpha = 0.5 * frame.pose.fade;
      strokeConnections(ctx, frame.pose.landmarks, POSE, w, h, "#FFB300");
      dots(ctx, frame.pose.landmarks, w, h, "#FFB300", 2.5);
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,10,20,0.55)";
    ctx.fillRect(12, 12, 280, 48);
    ctx.fillStyle = "#00E5FF";
    ctx.font = "12px ui-monospace, monospace";
    const fps = extra?.fps ?? 0;
    ctx.fillText(
      `FPS ${fps.toFixed(0)}   INFER ${frame.inferenceMs.toFixed(1)}ms   Q ${extra?.quality ?? "high"}`,
      20,
      32
    );
    const g = (frame.gestureEvents || frame.gestures)
      .map((x) => `${x.name}:${((x.score || 0) * 100).toFixed(0)}`)
      .join("  ");
    ctx.fillText(g || "gesture —", 20, 50);
    const pin = frame.hands
      .filter((h) => h._pinch?.active)
      .map((h) => `PINCH ${h.handedness}`)
      .join("  ");
    if (pin) ctx.fillText(pin, 20, 66);
    ctx.restore();
  }
}

function strokeConnections(ctx, lm, connections, w, h, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const c of connections) {
    const a = lm[c.start];
    const b = lm[c.end];
    if (!a || !b) continue;
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(b.x * w, b.y * h);
  }
  ctx.stroke();
}

function dots(ctx, lm, w, h, color, r) {
  ctx.fillStyle = color;
  for (let i = 0; i < lm.length; i++) {
    const p = lm[i];
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
