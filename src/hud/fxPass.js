export class FxPass {
  constructor() {
    this.canvas = document.getElementById("fx");
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.canvas.style.filter = "saturate(0.9) contrast(1.15) brightness(0.88)";
  }

  resize(w, h) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  draw(video, t) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!w || !h || !video.videoWidth) return;

    ctx.save();
    // Hardware accelerated mirrored video draw
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    // Subtle Iron Man tactical scanlines
    ctx.fillStyle = "rgba(0, 229, 255, 0.04)";
    const step = 4;
    const off = (t * 0.03) % step;
    for (let y = -off; y < h; y += step * 2) {
      ctx.fillRect(0, y, w, step);
    }
  }
}
