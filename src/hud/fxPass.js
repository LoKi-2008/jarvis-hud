/**
 * Color-graded mirrored webcam: scanlines, chromatic aberration, vignette, grain.
 * Reuses one ImageData buffer for grain — no per-frame allocations.
 */
export class FxPass {
  constructor() {
    this.canvas = document.getElementById("fx");
    this.ctx = this.canvas.getContext("2d", { alpha: true });
    this.grain = document.createElement("canvas");
    this.grain.width = 160;
    this.grain.height = 90;
    this.gctx = this.grain.getContext("2d");
    this.grainData = this.gctx.createImageData(160, 90);
    this.tick = 0;
    this.low = false;
  }

  resize(w, h) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  draw(video, t, qualityLevel) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!w || !h || !video.videoWidth) {
      ctx.clearRect(0, 0, w, h);
      return;
    }
    this.tick++;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.filter = "saturate(0.4) contrast(1.2) brightness(0.62) hue-rotate(168deg)";
    ctx.drawImage(video, 0, 0, w, h);

    if (qualityLevel > 0) {
      ctx.globalCompositeOperation = "screen";
      ctx.filter = "saturate(0) contrast(2) brightness(0.25)";
      ctx.globalAlpha = 0.22;
      ctx.drawImage(video, 1.6, 0, w, h);
      ctx.globalAlpha = 0.16;
      ctx.drawImage(video, -1.6, 0, w, h);
    }
    ctx.restore();

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#00e5ff";
    const step = qualityLevel === 0 ? 5 : 3;
    const off = (t * 0.04) % step;
    for (let y = -off; y < h; y += step) {
      ctx.fillRect(0, y, w, 1);
    }

    const g = this.ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.2, w * 0.5, h * 0.5, h * 0.78);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    if (qualityLevel > 0 && this.tick % 2 === 0) {
      const d = this.grainData.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 28;
      }
      this.gctx.putImageData(this.grainData, 0, 0);
      ctx.globalAlpha = 0.18;
      ctx.drawImage(this.grain, 0, 0, w, h);
    }
    ctx.globalAlpha = 1;
  }
}
