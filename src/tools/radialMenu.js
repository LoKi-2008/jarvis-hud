import { CONFIG } from "../config.js";
import { sfx } from "../audio/sfx.js";
import { toast } from "../hud/toasts.js";
import { bus } from "../utils/bus.js";

const ITEMS = [
  { id: "objects", label: "3D ASSETS", icon: "❖" },
  { id: "explode", label: "EXPLODE", icon: "⎈" },
  { id: "draw", label: "AIR DRAW", icon: "✎" },
  { id: "measure", label: "MEASURE", icon: "📏" },
  { id: "panels", label: "PANELS", icon: "⊞" },
  { id: "capture", label: "SCREENSHOT", icon: "📷" },
];

export class RadialMenu {
  constructor() {
    this.open = false;
    this.x = 0;
    this.y = 0;
    this.handIndex = 0;
    this.selectedIdx = -1;
    this.radius = 110;
    this.innerRadius = 38;
    this.rot = 0;
  }

  show(x, y, handIndex) {
    this.open = true;
    this.x = x;
    this.y = y;
    this.handIndex = handIndex;
    this.selectedIdx = -1;
    sfx.unlock();
    sfx.modeChange();
  }

  hide() {
    this.open = false;
    this.selectedIdx = -1;
  }

  selectCurrent() {
    if (!this.open) return;
    if (this.selectedIdx >= 0 && this.selectedIdx < ITEMS.length) {
      const item = ITEMS[this.selectedIdx];
      sfx.toast();
      toast(`Selected: ${item.label}`);
      bus.emit("tool-select", item.id);
    }
    this.hide();
  }

  update(frame) {
    if (!frame) return;

    // Check held pinch trigger
    for (let i = 0; i < 2; i++) {
      const h = frame.hands[i];
      if (!h.present || !h.landmarks) continue;
      const p = h._pinch;

      if (!this.open && p && p.active && performance.now() - p.since > CONFIG.pinch.radialHoldMs) {
        const sx = p.x * window.innerWidth;
        const sy = p.y * window.innerHeight;
        this.show(sx, sy, i);
      }

      if (this.open && this.handIndex === i) {
        if (!p || !p.active) {
          // Released pinch -> commit selection
          this.selectCurrent();
          return;
        }

        // Calculate angle from menu center to current pinch
        const px = p.x * window.innerWidth;
        const py = p.y * window.innerHeight;
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > this.innerRadius) {
          let ang = Math.atan2(dy, dx); // -PI to PI
          if (ang < 0) ang += Math.PI * 2;
          const slice = (Math.PI * 2) / ITEMS.length;
          const idx = Math.floor(ang / slice);
          if (idx !== this.selectedIdx) {
            this.selectedIdx = idx;
            sfx.toast();
          }
        } else {
          this.selectedIdx = -1;
        }
      }
    }
  }

  draw(ctx) {
    if (!this.open) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    this.rot += 0.01;

    // Outer and inner decorative rings
    ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, this.innerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Center icon
    ctx.fillStyle = "#00e5ff";
    ctx.font = "14px 'Orbitron', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("JARVIS", 0, 0);

    const count = ITEMS.length;
    const slice = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const start = i * slice;
      const end = (i + 1) * slice;
      const isSel = this.selectedIdx === i;

      // Draw slice background
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, start, end);
      ctx.arc(0, 0, this.innerRadius, end, start, true);
      ctx.closePath();

      if (isSel) {
        ctx.fillStyle = "rgba(0, 229, 255, 0.35)";
        ctx.fill();
        ctx.strokeStyle = "#00e5ff";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(3, 16, 32, 0.65)";
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 229, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Slice label and icon
      const midAng = (start + end) * 0.5;
      const tx = Math.cos(midAng) * (this.innerRadius + this.radius) * 0.5;
      const ty = Math.sin(midAng) * (this.innerRadius + this.radius) * 0.5;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.fillStyle = isSel ? "#ffffff" : "#7ef9ff";
      ctx.font = isSel ? "bold 11px 'Orbitron', sans-serif" : "10px 'Share Tech Mono', monospace";
      ctx.fillText(ITEMS[i].label, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }
}
