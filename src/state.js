import { MODES } from "./config.js";

export const appState = {
  mode: MODES.STANDBY,
  prevMode: MODES.STANDBY,
  modeSince: 0,
  booted: false,
  calibrated: false,
  debug: false,
  muted: false,
  listening: false,
  settingsOpen: false,
  cocoOn: false,
  fps: 0,
  inferenceMs: 0,
  handSpan: 0.18,
  interactionZ: 0.08,
  llmKey: "",
  llmEndpoint: "",
};

export function setMode(mode, t = performance.now()) {
  if (appState.mode === mode) return false;
  appState.prevMode = appState.mode;
  appState.mode = mode;
  appState.modeSince = t;
  return true;
}
