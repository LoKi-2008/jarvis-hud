import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
} from "@mediapipe/tasks-vision";
import { CONFIG } from "../config.js";
import { appState } from "../state.js";
import { LandmarkSmoother } from "../utils/oneEuro.js";
import { clamp } from "../utils/math.js";
import { createVisionFrame } from "./frame.js";

const BASE = import.meta.env.BASE_URL || "/";
const cleanBase = BASE.endsWith("/") ? BASE : `${BASE}/`;
const WASM = `${cleanBase}wasm`;
const MODELS = {
  hand: `${cleanBase}models/hand_landmarker.task`,
  face: `${cleanBase}models/face_landmarker.task`,
};

export class VisionEngine {
  constructor() {
    this.ready = false;
    this.hand = null;
    this.face = null;
    this.frame = createVisionFrame();
    this.lastInfer = 0;
    this._handSm = [new LandmarkSmoother(21, CONFIG.smoothing), new LandmarkSmoother(21, CONFIG.smoothing)];
    this._worldSm = [new LandmarkSmoother(21, CONFIG.smoothing), new LandmarkSmoother(21, CONFIG.smoothing)];
    this._faceSm = new LandmarkSmoother(478, CONFIG.smoothing);
    this._facePool = [];
    this.running = false;
    this.video = null;
    this.quality = { runCoco: false, runPoseMask: false, level: 2 };
    this.onFrame = null;
    this._busy = false;
    this._timer = 0;
  }

  async init(onProgress) {
    onProgress?.(0.15, "Loading WebGL Vision Runtime");
    const fileset = await FilesetResolver.forVisionTasks(WASM);

    onProgress?.(0.5, "Hand Landmarker (GPU)");
    this.hand = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODELS.hand, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    onProgress?.(0.85, "Face Landmarker (GPU)");
    this.face = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODELS.face, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
      minFaceDetectionConfidence: 0.45,
      minFacePresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });

    onProgress?.(1.0, "Sensors Synchronized");
    this.ready = true;
  }

  start(video) {
    this.video = video;
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
    if (this._timer) cancelAnimationFrame(this._timer);
  }

  loop = () => {
    if (!this.running) return;
    this._timer = requestAnimationFrame(this.loop);
    const t = performance.now();
    const minDt = appState.mode === "STANDBY" ? 80 : 1000 / CONFIG.inference.targetHz;
    if (t - this.lastInfer < minDt || this._busy) return;
    if (!this.video || this.video.readyState < 2) return;
    this._busy = true;
    const started = performance.now();
    try {
      this.detect(t);
    } catch (err) {
      console.warn("vision error", err);
    } finally {
      this.lastInfer = t;
      this._busy = false;
      this.frame.inferenceMs = performance.now() - started;
      this.onFrame?.(this.frame);
    }
  };

  detect(t) {
    const video = this.video;
    const ts = Math.round(t);
    const f = this.frame;
    f.t = t;
    f.videoW = video.videoWidth;
    f.videoH = video.videoHeight;

    // Fast synchronous GPU hand detection
    const hands = this.hand.detectForVideo(video, ts);
    this.ingestHands(f, hands, t);

    // Fast synchronous GPU face detection
    const faces = this.face.detectForVideo(video, ts);
    this.ingestFaces(f, faces, t);

    this.fadeHands(f, t);
  }

  ingestHands(f, res, t) {
    const seen = [false, false];
    const n = res.landmarks?.length ?? 0;
    for (let i = 0; i < n && i < 2; i++) {
      const cat = res.handednesses?.[i]?.[0];
      let label = cat?.categoryName ?? "Right";
      if (label === "Left") label = "Right";
      else if (label === "Right") label = "Left";
      const slot = label === "Left" ? 0 : 1;
      seen[slot] = true;
      const h = f.hands[slot];
      h.id = slot;
      h.handedness = label;
      h.score = cat?.score ?? 0.8;
      h.present = true;
      h.fade = clamp(h.fade + 0.25, 0, 1);
      h.landmarks = this._handSm[slot].apply(res.landmarks[i], t, true);
      h.world = res.worldLandmarks?.[i]
        ? this._worldSm[slot].apply(res.worldLandmarks[i], t, false)
        : null;
    }
    for (let i = 0; i < 2; i++) {
      if (!seen[i]) {
        const h = f.hands[i];
        if (h.present) {
          h.fade = clamp(h.fade - 0.12, 0, 1);
          if (h.fade <= 0.05) {
            h.present = false;
            h.landmarks = null;
            h.world = null;
            this._handSm[i].reset();
            this._worldSm[i].reset();
          }
        }
      }
    }
  }

  fadeHands(f, t) {
    for (let i = 0; i < 2; i++) {
      const h = f.hands[i];
      if (!h.present && h.fade > 0) {
        h.fade = Math.max(0, h.fade - 0.08);
      }
    }
  }

  ingestFaces(f, res, t) {
    const n = res.faceLandmarks?.length ?? 0;
    f.faceCount = n;
    while (this._facePool.length < n) {
      this._facePool.push({
        landmarks: null,
        score: 0,
        matrix: null,
        blendshapes: null,
        fade: 0,
      });
    }
    f.faces = this._facePool.slice(0, n);
    if (n > 0) {
      const lm = res.faceLandmarks[0];
      const slot = f.faces[0];
      slot.landmarks = this._faceSm.apply(lm, t, true);
      slot.matrix = res.facialTransformationMatrixes?.[0];
      slot.blendshapes = res.faceBlendshapes?.[0];
      slot.score = 1;
      slot.fade = clamp((slot.fade || 0) + 0.25, 0, 1);
      f.primaryFace = slot;
    } else {
      if (f.primaryFace) {
        f.primaryFace.fade = Math.max(0, f.primaryFace.fade - 0.1);
        if (f.primaryFace.fade <= 0.05) {
          f.primaryFace = null;
          this._faceSm.reset();
        }
      }
    }
  }
}
