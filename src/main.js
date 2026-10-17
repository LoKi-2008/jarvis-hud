import { Camera } from "./vision/camera.js";
import { VisionEngine } from "./vision/engine.js";
import { DebugOverlay } from "./hud/debug.js";
import { QualityGovernor } from "./quality.js";
import { FpsMeter } from "./utils/fps.js";
import { bus } from "./utils/bus.js";
import { appState } from "./state.js";
import { CONFIG } from "./config.js";

const camera = new Camera();
const vision = new VisionEngine();
const debug = new DebugOverlay();
const quality = new QualityGovernor();
const fps = new FpsMeter();

let latestFrame = null;
let renderRaf = 0;

function fitCanvases() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  debug.resize(w, h);
  const hud = document.getElementById("hud");
  const fx = document.getElementById("fx");
  for (const c of [hud, fx]) {
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
  }
}

function render(t) {
  renderRaf = requestAnimationFrame(render);
  const f = fps.tick(t);
  appState.fps = f;
  quality.update(f);
  vision.quality = quality;
  if (latestFrame) {
    appState.inferenceMs = latestFrame.inferenceMs;
    latestFrame.light = camera.sampleLight(t);
    latestFrame.quality = quality.label;
  }
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
    bus.emit("vision", frame);
  };
  vision.start(camera.video);
}

function bindKeys() {
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === "d" || e.key === "D") {
      appState.debug = !appState.debug;
      document.getElementById("opt-debug").checked = appState.debug;
    }
    if (e.key === "f" || e.key === "F") {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    }
  });
  document.getElementById("opt-debug").addEventListener("change", (e) => {
    appState.debug = e.target.checked;
  });
  document.getElementById("settings-btn").addEventListener("click", () => {
    document.getElementById("settings").classList.toggle("hidden");
  });
  document.getElementById("retry-cam").addEventListener("click", () => {
    bootVision().catch(() => {});
  });
}

async function main() {
  appState.debug = true;
  document.getElementById("opt-debug").checked = true;
  fitCanvases();
  window.addEventListener("resize", fitCanvases);
  bindKeys();
  render(performance.now());
  try {
    await bootVision();
  } catch {
    /* permission overlay already visible */
  }
}

main();

export { camera, vision, quality, CONFIG };
