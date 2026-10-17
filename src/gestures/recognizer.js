import { CONFIG } from "../config.js";
import { dist2 } from "../utils/math.js";
import { bus } from "../utils/bus.js";
import { appState } from "../state.js";
import { updatePinch } from "./pinch.js";

const TIPS = [8, 12, 16, 20];
const PIPS = [6, 10, 14, 18];
const MCPS = [5, 9, 13, 17];

function fingerOpen(lm, i) {
  const tip = lm[TIPS[i]];
  const mcp = lm[MCPS[i]];
  const pip = lm[PIPS[i]];
  return dist2(tip, mcp) / Math.max(dist2(pip, mcp) + dist2(tip, pip), 1e-5);
}

function avgCurl(lm) {
  let s = 0;
  for (let i = 0; i < 4; i++) s += fingerOpen(lm, i);
  return s / 4;
}

function palm(lm) {
  return lm[9];
}

export class GestureEngine {
  constructor() {
    this.last = [{ x: 0, y: 0, t: 0 }, { x: 0, y: 0, t: 0 }];
    this.lastNamed = new Map();
    this.twoDist = 0;
    this.twoAng = 0;
    this.twoReady = false;
    this.events = [];
    this.pinchHold = [0, 0];
  }

  update(frame) {
    this.events.length = 0;
    const span = appState.handSpan || 0.18;
    const nowt = frame.t;
    const conf = CONFIG.gestures;

    for (let i = 0; i < 2; i++) {
      const hand = frame.hands[i];
      const pinch = updatePinch(hand, span);
      if (!hand.present || !hand.landmarks) {
        this.twoReady = false;
        continue;
      }
      const lm = hand.landmarks;
      const p = palm(lm);
      const prev = this.last[i];
      const dt = Math.max((nowt - prev.t) * 0.001, 1e-3);
      const vx = (p.x - prev.x) / dt;
      const vy = (p.y - prev.y) / dt;
      prev.x = p.x;
      prev.y = p.y;
      prev.t = nowt;

      const open = avgCurl(lm);
      const idx = fingerOpen(lm, 0);
      const mid = fingerOpen(lm, 1);
      const rng = fingerOpen(lm, 2);
      const pnk = fingerOpen(lm, 3);

      if (pinch.active) this.emit("pinch", hand.handedness, 1, nowt);
      if (open < conf.grabCurl) this.emit("grab", hand.handedness, 1 - open, nowt);
      if (open > conf.openPalmCurl && !pinch.active) this.emit("open_palm", hand.handedness, open, nowt);
      if (idx > 0.82 && mid < conf.pointCurl && rng < conf.pointCurl) {
        this.emit("point", hand.handedness, idx, nowt);
      }
      if (idx > 0.8 && mid > 0.8 && rng < 0.55 && pnk < 0.55) {
        this.emit("peace", hand.handedness, 0.8, nowt);
      }

      const speed = Math.hypot(vx, vy);
      if (speed > conf.swipeMinSpeed && Math.hypot(p.x - 0.5, p.y - 0.5) > 0.02) {
        if (Math.abs(vx) > Math.abs(vy) && Math.abs(p.x - 0.5) > conf.swipeMinTravel * 0.3) {
          this.emit(vx > 0 ? "swipe_right" : "swipe_left", hand.handedness, speed, nowt, 480);
        } else if (Math.abs(vy) > Math.abs(vx)) {
          this.emit(vy > 0 ? "swipe_down" : "swipe_up", hand.handedness, speed, nowt, 480);
        }
      }

      if (pinch.active && nowt - pinch.since > CONFIG.pinch.radialHoldMs) {
        this.emit("pinch_hold", hand.handedness, 1, nowt, 700);
      }
    }

    for (const g of frame.gestures) {
      if (g.score < conf.minScore) continue;
      const map = {
        Closed_Fist: "grab",
        Open_Palm: "open_palm",
        Pointing_Up: "point",
        Thumb_Up: "thumbs_up",
        Victory: "peace",
      };
      const name = map[g.name];
      if (name) this.emit(name, g.handedness, g.score, nowt);
    }

    this.twoHand(frame, nowt);
    frame.gestureEvents = this.events;
    return this.events;
  }

  twoHand(frame, nowt) {
    const a = frame.hands[0];
    const b = frame.hands[1];
    if (!a.present || !b.present || !a.landmarks || !b.landmarks) {
      this.twoReady = false;
      return;
    }
    const pa = palm(a.landmarks);
    const pb = palm(b.landmarks);
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const dist = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    if (dist < CONFIG.gestures.twoHandMinSep) return;
    if (!this.twoReady) {
      this.twoDist = dist;
      this.twoAng = ang;
      this.twoReady = true;
      return;
    }
    const scale = dist / Math.max(this.twoDist, 1e-4);
    let rot = ang - this.twoAng;
    if (rot > Math.PI) rot -= Math.PI * 2;
    if (rot < -Math.PI) rot += Math.PI * 2;
    if (Math.abs(scale - 1) > CONFIG.gestures.scaleDeadzone) {
      this.emit("scale", "both", scale, nowt, 40);
      bus.emit("twohand-scale", scale);
    }
    if (Math.abs(rot) > CONFIG.gestures.rotateDeadzone) {
      this.emit("rotate", "both", rot, nowt, 40);
      bus.emit("twohand-rotate", rot);
    }
    this.twoDist = dist;
    this.twoAng = ang;
  }

  emit(name, hand, score, t, debounce) {
    const key = name + hand;
    const wait = debounce ?? CONFIG.gestures.debounceMs;
    const last = this.lastNamed.get(key) || 0;
    if (t - last < wait) return;
    if (score < CONFIG.gestures.minScore && name !== "pinch" && name !== "scale" && name !== "rotate") return;
    this.lastNamed.set(key, t);
    const ev = { name, hand, score, t };
    this.events.push(ev);
    bus.emit("gesture", ev);
  }
}

export const gestures = new GestureEngine();
