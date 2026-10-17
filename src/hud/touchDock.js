import { MODES, MODE_META } from "../config.js";
import { goMode } from "../modes/machine.js";
import { appState } from "../state.js";
import { sfx } from "../audio/sfx.js";
import { toast } from "../hud/toasts.js";

export class TouchDock {
  constructor(tools) {
    this.tools = tools;
    this.hovered = null;
    this.lastTriggerT = 0;
    this.buttons = [];
    this.initButtons();
    this.bindDOMEvents();
  }

  setTools(tools) {
    this.tools = tools;
  }

  initButtons() {
    this.buttons = [
      { id: "mode_standby", label: "STANDBY", category: "mode", mode: MODES.STANDBY },
      { id: "mode_active", label: "ACTIVE", category: "mode", mode: MODES.ACTIVE },
      { id: "mode_combat", label: "COMBAT", category: "mode", mode: MODES.COMBAT },
      { id: "mode_scan", label: "SCAN", category: "mode", mode: MODES.SCAN },
      { id: "mode_workshop", label: "WORKSHOP", category: "mode", mode: MODES.WORKSHOP },
      { id: "mode_stealth", label: "STEALTH", category: "mode", mode: MODES.STEALTH },
      { id: "mode_party", label: "PARTY", category: "mode", mode: MODES.PARTY },
      { id: "tool_model", label: "3D MODEL", category: "tool", action: "objects" },
      { id: "tool_explode", label: "EXPLODE", category: "tool", action: "explode" },
      { id: "tool_draw", label: "AIR DRAW", category: "tool", action: "draw" },
      { id: "tool_measure", label: "CALIPER", category: "tool", action: "measure" },
      { id: "tool_panels", label: "PANELS", category: "tool", action: "panels" },
      { id: "tool_snap", label: "CAPTURE", category: "tool", action: "capture" },
    ];
  }

  bindDOMEvents() {
    // Touchscreen & pointer tap support directly on screen
    window.addEventListener("pointerdown", (e) => {
      sfx.unlock();
      this.checkHit(e.clientX, e.clientY, true);
    });
  }

  computeLayout(w, h) {
    const pad = 6;
    const btnW = Math.max(72, Math.min(108, (w - 40) / this.buttons.length - pad));
    const btnH = 34;
    const totalW = this.buttons.length * (btnW + pad) - pad;
    const startX = Math.max(12, (w - totalW) / 2);
    const startY = h - 52;

    this.buttons.forEach((btn, i) => {
      btn.x = startX + i * (btnW + pad);
      btn.y = startY;
      btn.w = btnW;
      btn.h = btnH;
    });
  }

  checkHit(px, py, trigger = false) {
    const now = performance.now();
    let hit = null;
    for (const btn of this.buttons) {
      if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
        hit = btn;
        break;
      }
    }

    if (hit) {
      this.hovered = hit.id;
      if (trigger && now - this.lastTriggerT > 320) {
        this.lastTriggerT = now;
        this.execute(hit);
      }
    } else {
      this.hovered = null;
    }
    return hit;
  }

  execute(btn) {
    sfx.unlock();
    sfx.toast();
    if (btn.category === "mode") {
      goMode(btn.mode);
    } else if (btn.category === "tool") {
      this.tools?.handleToolSelect(btn.action);
    }
  }

  updateAirTouch(frame) {
    if (!frame) return null;
    let airCursor = null;

    for (const hand of frame.hands) {
      if (!hand.present || !hand.landmarks) continue;
      // Index fingertip (landmark 8)
      const tip = hand.landmarks[8];
      const sx = tip.x * window.innerWidth;
      const sy = tip.y * window.innerHeight;
      const isPinch = hand._pinch?.active;

      airCursor = { x: sx, y: sy, pinch: isPinch, hand: hand.handedness };

      // Check hover or mid-air pinch tap
      const hit = this.checkHit(sx, sy, isPinch);
      if (hit && isPinch) break;
    }
    return airCursor;
  }

  draw(ctx, w, h, accent) {
    this.computeLayout(w, h);

    ctx.save();
    // Dock background bar
    ctx.fillStyle = "rgba(1, 10, 22, 0.85)";
    ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(10, h - 58, w - 20, 48, 8);
    ctx.fill();
    ctx.stroke();

    for (const btn of this.buttons) {
      const isHovered = this.hovered === btn.id;
      const isModeActive = btn.category === "mode" && appState.mode === btn.mode;

      // Button background
      if (isModeActive) {
        ctx.fillStyle = accent;
        ctx.strokeStyle = "#fff";
      } else if (isHovered) {
        ctx.fillStyle = "rgba(0, 229, 255, 0.35)";
        ctx.strokeStyle = "#00e5ff";
      } else {
        ctx.fillStyle = "rgba(3, 20, 36, 0.7)";
        ctx.strokeStyle = "rgba(0, 229, 255, 0.25)";
      }

      ctx.lineWidth = isModeActive || isHovered ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 4);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = isModeActive ? "#000" : isHovered ? "#fff" : "#7ef9ff";
      ctx.font = isHovered || isModeActive ? "bold 10px 'Orbitron', sans-serif" : "9px 'Orbitron', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    }

    ctx.restore();
  }
}
