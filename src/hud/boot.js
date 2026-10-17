import { sfx } from "../audio/sfx.js";

const SYSTEMS = [
  "OPTICAL MATRIX ONLINE",
  "HAND KINEMATICS LOCKED",
  "FACIAL MESH ENGAGED",
  "ALL SYSTEMS READY",
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
  sfx.systemOnline();

  for (let i = 0; i < SYSTEMS.length; i++) {
    log.textContent += `> ${SYSTEMS[i]}\n`;
    await new Promise((r) => setTimeout(r, 120));
  }

  hud.bootT = 1;
  speak(greeting());
  el.classList.add("hidden");
}
