import { CONFIG } from "../config.js";
import { sfx } from "../audio/sfx.js";
import { easeOutCubic } from "../utils/math.js";

const SYSTEMS = [
  "ARC REACTOR IGNITION",
  "OPTICAL ARRAY",
  "HAND KINEMATICS",
  "FACIAL TESSELLATION",
  "POSE / BIOMETRICS",
  "AUDIO I/O",
  "TACTICAL HUD",
  "ALL SYSTEMS ONLINE",
];

export function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  return `Good ${part}, sir. All systems are online.`;
}

export async function playBoot({ hud, speak }) {
  const el = document.getElementById("boot");
  const log = document.getElementById("boot-log");
  el.classList.remove("hidden");
  log.textContent = "";
  sfx.unlock();
  sfx.bootIgnite();
  const start = performance.now();
  const dur = CONFIG.boot.durationMs;

  for (let i = 0; i < SYSTEMS.length; i++) {
    const t = (dur / SYSTEMS.length) * (i + 0.2);
    await waitUntil(start + t);
    log.textContent += `> ${SYSTEMS[i]}\n`;
    sfx.systemOnline();
    hud.bootT = easeOutCubic(Math.min(1, (performance.now() - start) / dur));
  }

  const remain = dur - (performance.now() - start);
  if (remain > 0) await sleep(remain);
  hud.bootT = 1;
  speak(greeting());
  el.classList.add("hidden");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitUntil(tAbs) {
  const dt = tAbs - performance.now();
  return dt > 0 ? sleep(dt) : Promise.resolve();
}
