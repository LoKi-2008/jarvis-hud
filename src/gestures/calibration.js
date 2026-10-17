import { CONFIG } from "../config.js";
import { dist2 } from "../utils/math.js";
import { appState } from "../state.js";

/**
 * 5-second startup calibration: average hand span and interaction depth.
 */
export function runCalibration(getFrame) {
  const overlay = document.getElementById("calibrate");
  const bar = document.querySelector("#cal-bar span");
  const stats = document.getElementById("cal-stats");
  overlay.classList.remove("hidden");
  const start = performance.now();
  const dur = CONFIG.calibration.durationMs;
  const spans = [];
  const depths = [];

  return new Promise((resolve) => {
    function tick() {
      const t = performance.now();
      const k = Math.min(1, (t - start) / dur);
      bar.style.width = `${k * 100}%`;
      const frame = getFrame();
      if (frame) {
        for (const h of frame.hands) {
          if (!h.present || !h.landmarks) continue;
          spans.push(dist2(h.landmarks[0], h.landmarks[12]));
          if (h.world) depths.push(Math.abs(h.world[9].z));
        }
      }
      stats.textContent =
        spans.length > 4
          ? `SPAN ${avg(spans).toFixed(3)}   DEPTH ${avg(depths).toFixed(3) || "—"}`
          : "Searching for hands…";
      if (k < 1) {
        requestAnimationFrame(tick);
      } else {
        if (spans.length) appState.handSpan = avg(spans);
        if (depths.length) appState.interactionZ = avg(depths);
        appState.calibrated = true;
        overlay.classList.add("hidden");
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

function avg(a) {
  if (!a.length) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s / a.length;
}
