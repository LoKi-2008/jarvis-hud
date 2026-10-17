import * as THREE from "three";
import { CONFIG } from "../config.js";

/** Convert mirrored normalized landmark to Three.js world (orthographic-friendly). */
export function toWorld(lm, target, ox = 0, oy = 0) {
  target.x = (lm.x - 0.5 + ox) * 2;
  target.y = (0.5 - lm.y + oy) * 2;
  target.z = -(lm.z ?? 0) * 2.4;
  return target;
}

export const BODY_OFF = {
  x: CONFIG.hologram.bodyOffsetX,
  y: CONFIG.hologram.bodyOffsetY,
};

export function setLinePositions(geo, points) {
  const arr = geo.attributes.position.array;
  let i = 0;
  for (const p of points) {
    arr[i++] = p.x;
    arr[i++] = p.y;
    arr[i++] = p.z;
  }
  geo.attributes.position.needsUpdate = true;
  geo.setDrawRange(0, points.length);
}
