import { Camera } from "./vision/camera.js";
import { VisionEngine } from "./vision/engine.js";
import { DebugOverlay } from "./hud/debug.js";
import { HudOverlay } from "./hud/overlay.js";
import { FxPass } from "./hud/fxPass.js";
import { playBoot } from "./hud/boot.js";
import { QualityGovernor } from "./quality.js";
import { FpsMeter } from "./utils/fps.js";
import { bus } from "./utils/bus.js";
import { appState } from "./state.js";
import { CONFIG } from "./config.js";
import { sfx } from "./audio/sfx.js";
import { speak } from "./voice/speak.js";
import { gestures } from "./gestures/recognizer.js";
import { runCalibration } from "./gestures/calibration.js";
import { toast } from "./hud/toasts.js";

const camera = new Camera();
const vision = new VisionEngine();
const debug = new DebugOverlay();
const hud = new HudOverlay();
const fx = new FxPass();
const quality = new QualityGovernor();
const fps = new FpsMeter();

export const live = { frame: null };
let latestFrame = null;
let handsWereOn = false;

function fitCanvases() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  debug.resize(w, h);
  hud.resize(w, h);
  fx.resize(w, h);
}

function render(t) {
  requestAnimationFrame(render);
  const f = fps.tick(t);
  appState.fps = f;
  quality.update(f);
  vision.quality = quality;
  if (latestFrame) {
    appState.inferenceMs = latestFrame.inferenceMs;
    latestFrame.light = camera.sampleLight(t);
    latestFrame.quality = quality.label;
  }
  fx.draw(camera.video, t, quality.level);
  hud.draw(t, latestFrame);
  debug.draw(latestFrame, { fps: f, quality: quality.label });
}

async function bootVision() {
  const perm = document.getElementById("perm");
  try {
    perm.classList.add("hidden");
    await camera.start();
  } catch (err) {
    console.error(err);
    perm.classList.remove("hidden");
    throw err;
  }
  await vision.init((p, label) => {
    document.title = `J.A.R.V.I.S. ${Math.round(p * 100)}% ${label}`;
  });
  document.title = "J.A.R.V.I.S.";
  vision.onFrame = (frame) => {
    latestFrame = frame;
    live.frame = frame;
    gestures.update(frame);
    const handsOn = frame.hands.some((h) => h.present);
    if (handsWereOn && !handsOn) toast("Tracking lost", "warn");
    handsWereOn = handsOn;
    bus.emit("vision", frame);
  };
  vision.start(camera.video);
}

function bindKeys() {
  window.addEventListener("pointerdown", () => sfx.unlock(), { once: true });
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    sfx.unlock();
    if (e.key === "d" || e.key === "D") {
      appState.debug = !appState.debug;
      document.getElementById("opt-debug").checked = appState.debug;
    }
    if (e.key === "f" || e.key === "F") {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    }
    if (e.key === "m" || e.key === "M") appState.muted = !appState.muted;
  });
  document.getElementById("opt-debug").addEventListener("change", (e) => {
    appState.debug = e.target.checked;
  });
  document.getElementById("settings-btn").addEventListener("click", () => {
    document.getElementById("settings").classList.toggle("hidden");
    sfx.unlock();
  });
  document.getElementById("retry-cam").addEventListener("click", () => {
    bootVision().catch(() => {});
  });
}

async function main() {
  appState.debug = true;
  document.getElementById("opt-debug").checked = true;
  hud.bootT = 0;
  fitCanvases();
  window.addEventListener("resize", fitCanvases);
  bindKeys();
  requestAnimationFrame(render);
  try {
    await bootVision();
    sfx.unlock();
    await playBoot({ hud, speak });
    appState.booted = true;
    await runCalibration(() => live.frame);
    toast("Calibration complete");
  } catch {
    /* permission overlay already visible */
  }
}

main();

export { camera, vision, quality, hud, latestFrame, CONFIG };
