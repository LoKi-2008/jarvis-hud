import { CONFIG } from "../config.js";
import { dist2 } from "../utils/math.js";

/**
 * Pinch with hysteresis: engage/release are different distances so it does not chatter.
 * Distances are normalized by calibrated (or live) hand span.
 */
export function updatePinch(hand, span) {
  if (!hand._pinch) {
    hand._pinch = { active: false, since: 0, x: 0, y: 0, z: 0, strength: 0 };
  }
  const p = hand._pinch;
  if (!hand.present || !hand.landmarks) {
    p.active = false;
    p.strength = 0;
    return p;
  }
  const lm = hand.landmarks;
  const d = dist2(lm[4], lm[8]) / Math.max(span, 0.05);
  p.x = (lm[4].x + lm[8].x) * 0.5;
  p.y = (lm[4].y + lm[8].y) * 0.5;
  p.z = ((lm[4].z ?? 0) + (lm[8].z ?? 0)) * 0.5;
  p.strength = Math.max(0, 1 - d / CONFIG.pinch.release);
  if (!p.active && d < CONFIG.pinch.engage) {
    p.active = true;
    p.since = performance.now();
  } else if (p.active && d > CONFIG.pinch.release) {
    p.active = false;
  }
  return p;
}
