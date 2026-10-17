/**
 * Single source of truth for every tunable threshold.
 * Keep numbers here — never scatter magic values through the loops.
 */
export const CONFIG = {
  palette: {
    bg: "#02040a",
    navy: "#03111f",
    cyan: "#00E5FF",
    amber: "#FFB300",
    red: "#FF1744",
    dim: "rgba(0, 229, 255, 0.18)",
  },

  camera: {
    width: 1280,
    height: 720,
    fps: 30,
    facingMode: "user",
  },

  inference: {
    targetHz: 30,
    cocoHz: 6,
    gestureHz: 15,
    poseHz: 20,
    minLight: 0.12,
  },

  smoothing: {
    minCutoff: 1.15,
    beta: 0.0075,
    dCutoff: 1.0,
    zBeta: 0.004,
  },

  pinch: {
    engage: 0.045,
    release: 0.068,
    minHoldMs: 90,
    radialHoldMs: 520,
  },

  gestures: {
    minScore: 0.62,
    debounceMs: 220,
    swipeMinSpeed: 0.95,
    swipeMinTravel: 0.11,
    grabCurl: 0.42,
    openPalmCurl: 0.78,
    pointCurl: 0.35,
    twoHandMinSep: 0.08,
    scaleDeadzone: 0.012,
    rotateDeadzone: 0.04,
  },

  tracking: {
    lostFadeMs: 420,
    appearFadeMs: 220,
    minPresence: 0.45,
    primaryFaceMinScore: 0.4,
  },

  hologram: {
    bodyOffsetX: 0.16,
    bodyOffsetY: -0.02,
    particleCount: 1400,
    trailLength: 18,
    bloomStrength: 0.85,
    bloomRadius: 0.42,
    bloomThreshold: 0.18,
  },

  quality: {
    lowFps: 30,
    recoverFps: 48,
    samples: 45,
  },

  calibration: {
    durationMs: 5000,
  },

  boot: {
    durationMs: 6200,
  },

  voice: {
    wake: "jarvis",
    listenTimeoutMs: 8000,
    minConfidence: 0.45,
  },

  weather: {
    lat: 28.6139,
    lon: 77.209,
    cacheMs: 20 * 60 * 1000,
  },
};

export const MODES = {
  STANDBY: "STANDBY",
  ACTIVE: "ACTIVE",
  COMBAT: "COMBAT",
  SCAN: "SCAN",
  WORKSHOP: "WORKSHOP",
  STEALTH: "STEALTH",
  PARTY: "PARTY",
};

export const MODE_META = {
  STANDBY: { id: 1, accent: "#5ee7ff", label: "STANDBY" },
  ACTIVE: { id: 2, accent: "#00E5FF", label: "ACTIVE" },
  COMBAT: { id: 3, accent: "#FF1744", label: "COMBAT" },
  SCAN: { id: 4, accent: "#FFB300", label: "SCAN" },
  WORKSHOP: { id: 5, accent: "#69f0ae", label: "WORKSHOP" },
  STEALTH: { id: 6, accent: "#546e7a", label: "STEALTH" },
  PARTY: { id: 7, accent: "#e040fb", label: "PARTY" },
};
