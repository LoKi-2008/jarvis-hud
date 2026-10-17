import { appState } from "../state.js";

export function runCalibration() {
  const overlay = document.getElementById("calibrate");
  overlay.classList.add("hidden");
  appState.handSpan = 0.18;
  appState.interactionZ = 0.08;
  appState.calibrated = true;
  return Promise.resolve();
}
