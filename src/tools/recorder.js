import { sfx } from "../audio/sfx.js";
import { toast } from "../hud/toasts.js";

export class HudRecorder {
  constructor() {
    this.isRecording = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.startTime = 0;
    this.compCanvas = document.createElement("canvas");
    this.compCtx = this.compCanvas.getContext("2d");
  }

  takeScreenshot() {
    sfx.unlock();
    sfx.systemOnline();

    const fx = document.getElementById("fx");
    const three = document.querySelector("#three canvas");
    const hud = document.getElementById("hud");
    const debug = document.getElementById("debug");

    const w = window.innerWidth;
    const h = window.innerHeight;
    this.compCanvas.width = w;
    this.compCanvas.height = h;
    const ctx = this.compCtx;

    ctx.clearRect(0, 0, w, h);
    if (fx) ctx.drawImage(fx, 0, 0, w, h);
    if (three) ctx.drawImage(three, 0, 0, w, h);
    if (hud) ctx.drawImage(hud, 0, 0, w, h);
    if (debug && debug.style.display !== "none") ctx.drawImage(debug, 0, 0, w, h);

    // Trigger download
    const url = this.compCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `jarvis-telemetry-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast("HUD Snapshot exported", "info");
    return true;
  }

  startRecording() {
    if (this.isRecording) return;
    try {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.compCanvas.width = w;
      this.compCanvas.height = h;

      const stream = this.compCanvas.captureStream(30);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      this.mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `jarvis-hud-record-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast("HUD Telemetry recording saved", "info");
      };

      this.mediaRecorder.start(100);
      this.isRecording = true;
      this.startTime = performance.now();
      sfx.modeChange();
      toast("HUD Recording initialized", "alert");
    } catch (err) {
      console.error("Failed to start HUD recording", err);
      toast("Recording unavailable in this browser", "warn");
    }
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.mediaRecorder.stop();
    this.isRecording = false;
    sfx.alert();
  }

  toggleRecording() {
    if (this.isRecording) this.stopRecording();
    else this.startRecording();
  }

  updateFrame() {
    if (!this.isRecording) return;
    const fx = document.getElementById("fx");
    const three = document.querySelector("#three canvas");
    const hud = document.getElementById("hud");
    const w = this.compCanvas.width;
    const h = this.compCanvas.height;
    const ctx = this.compCtx;

    ctx.clearRect(0, 0, w, h);
    if (fx) ctx.drawImage(fx, 0, 0, w, h);
    if (three) ctx.drawImage(three, 0, 0, w, h);
    if (hud) ctx.drawImage(hud, 0, 0, w, h);

    // Draw REC banner on top right
    const durSec = Math.floor((performance.now() - this.startTime) / 1000);
    const mm = String(Math.floor(durSec / 60)).padStart(2, "0");
    const ss = String(durSec % 60).padStart(2, "0");
    ctx.save();
    ctx.fillStyle = "#ff1744";
    ctx.beginPath();
    ctx.arc(w - 110, 40, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "bold 13px 'Orbitron', sans-serif";
    ctx.fillText(`REC ${mm}:${ss}`, w - 96, 45);
    ctx.restore();
  }
}

export const recorder = new HudRecorder();
