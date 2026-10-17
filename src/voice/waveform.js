import { appState } from "../state.js";

export class VoiceWaveform {
  constructor() {
    this.phase = 0;
    this.audioLevel = 0;
  }

  update(level) {
    this.audioLevel = level ?? (appState.listening ? 0.7 : 0.15);
    this.phase += 0.05;
  }

  draw(ctx, cx, cy, radius, accent) {
    ctx.save();
    ctx.translate(cx, cy);

    const isListening = appState.listening;
    const count = 36;
    const baseR = radius;

    // Glowing base ring
    ctx.strokeStyle = isListening ? "#00e5ff" : accent;
    ctx.lineWidth = isListening ? 2 : 1;
    ctx.globalAlpha = isListening ? 0.8 : 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, baseR, 0, Math.PI * 2);
    ctx.stroke();

    // Radiating audio bars
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const wave = Math.sin(this.phase * 3 + i * 0.4) * 0.5 + 0.5;
      const len = isListening ? 6 + wave * 18 * this.audioLevel : 3 + wave * 4;

      const r1 = baseR - 4;
      const r2 = baseR + len;

      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }

    if (isListening) {
      ctx.fillStyle = "#00e5ff";
      ctx.font = "10px 'Orbitron', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VOICE LINK", 0, baseR + 26);
    }

    ctx.restore();
  }
}

export const voiceWaveform = new VoiceWaveform();
