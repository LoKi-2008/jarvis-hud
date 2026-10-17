import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
  PoseLandmarker,
  GestureRecognizer,
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
  pose: `${cleanBase}models/pose_landmarker_lite.task`,
  gesture: `${cleanBase}models/gesture_recognizer.task`,
};

export class VisionEngine {
  constructor() {
    this.ready = false;
    this.hand = null;
    this.face = null;
    this.pose = null;
    this.gesture = null;
    this.frame = createVisionFrame();
    this.lastInfer = 0;
    this.lastGesture = 0;
    this.lastPose = 0;
    this._handSm = [new LandmarkSmoother(21, CONFIG.smoothing), new LandmarkSmoother(21, CONFIG.smoothing)];
    this._worldSm = [new LandmarkSmoother(21, CONFIG.smoothing), new LandmarkSmoother(21, CONFIG.smoothing)];
    this._faceSm = new LandmarkSmoother(478, CONFIG.smoothing);
    this._poseSm = new LandmarkSmoother(33, CONFIG.smoothing);
    this._poseWorldSm = new LandmarkSmoother(33, CONFIG.smoothing);
    this._facePool = [];
    this.running = false;
    this.video = null;
    this.quality = { runCoco: false, runPoseMask: true, level: 2 };
    this.onFrame = null;
    this._busy = false;
    this._timer = 0;
  }

  async init(onProgress) {
    onProgress?.(0.05, "Loading vision runtime");
    const fileset = await FilesetResolver.forVisionTasks(WASM);
    onProgress?.(0.25, "Hand landmarker");
    this.hand = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODELS.hand, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    onProgress?.(0.5, "Face landmarker");
    this.face = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODELS.face, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 2,
      minFaceDetectionConfidence: 0.45,
      minFacePresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
    onProgress?.(0.72, "Pose landmarker");
    this.pose = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODELS.pose, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: true,
    });
    onProgress?.(0.9, "Gesture recognizer");
    this.gesture = await GestureRecognizer.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODELS.gesture, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 2,
    });
    onProgress?.(1, "Vision online");
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
    const minDt =
      appState.mode === "STANDBY"
        ? 110
        : this.quality.level === 0
          ? 66
          : 1000 / CONFIG.inference.targetHz;
    if (t - this.lastInfer < minDt || this._busy) return;
    if (!this.video || this.video.readyState < 2) return;
    this._busy = true;
    const started = performance.now();
    try {
      this.detect(t);
    } catch (err) {
      console.warn("vision", err);
    }
    this.frame.inferenceMs = performance.now() - started;
    this.lastInfer = t;
    this._busy = false;
    this.onFrame?.(this.frame);
  };

  detect(t) {
    const video = this.video;
    const ts = Math.max(t, this.lastInfer + 1);
    const f = this.frame;
    f.t = t;
    f.videoW = video.videoWidth;
    f.videoH = video.videoHeight;

    const hands = this.hand.detectForVideo(video, ts);
    this.ingestHands(f, hands, t);

    const faces = this.face.detectForVideo(video, ts);
    this.ingestFaces(f, faces, t);

    if (t - this.lastPose >= 1000 / CONFIG.inference.poseHz) {
      const pose = this.pose.detectForVideo(video, ts);
      this.ingestPose(f, pose, t);
      this.lastPose = t;
    } else {
      this.decayPose(f, t);
    }

    if (t - this.lastGesture >= 1000 / CONFIG.inference.gestureHz) {
      const g = this.gesture.recognizeForVideo(video, ts);
      this.ingestGestures(f, g);
      this.lastGesture = t;
    }

    this.fadeHands(f, t);
  }

  ingestHands(f, res, t) {
    const seen = [false, false];
    const n = res.landmarks?.length ?? 0;
    for (let i = 0; i < n && i < 2; i++) {
      const cat = res.handednesses?.[i]?.[0];
      // Image is mirrored on screen; swap labels so "Right" matches the user's right hand.
      let label = cat?.categoryName ?? "Right";
      if (label === "Left") label = "Right";
      else if (label === "Right") label = "Left";
      const slot = label === "Left" ? 0 : 1;
      seen[slot] = true;
      const h = f.hands[slot];
      h.id = slot;
      h.handedness = label;
      h.score = cat?.score ?? 0;
      h.present = true;
      h.landmarks = this._handSm[slot].apply(res.landmarks[i], t, true);
      if (res.worldLandmarks?.[i]) {
        h.world = this._worldSm[slot].apply(res.worldLandmarks[i], t, false);
      }
      h.lostAt = 0;
      h.fade = clamp(h.fade + (1 / (CONFIG.tracking.appearFadeMs / 16)), 0, 1);
    }
    for (let s = 0; s < 2; s++) {
      if (!seen[s] && f.hands[s].present) {
        f.hands[s].lostAt = f.hands[s].lostAt || t;
      }
    }
  }

  fadeHands(f, t) {
    for (const h of f.hands) {
      if (h.present && h.lostAt) {
        const k = (t - h.lostAt) / CONFIG.tracking.lostFadeMs;
        h.fade = clamp(1 - k, 0, 1);
        if (k >= 1) {
          h.present = false;
          h.fade = 0;
          h.lostAt = 0;
          this._handSm[h.id].reset();
          this._worldSm[h.id].reset();
        }
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
    let best = 0;
    let bestArea = -1;
    for (let i = 0; i < n; i++) {
      const lm = res.faceLandmarks[i];
      const slot = f.faces[i];
      slot.landmarks = i === 0 ? this._faceSm.apply(lm, t, true) : mirrorCopy(lm, slot.landmarks);
      slot.matrix = res.facialTransformationMatrixes?.[i];
      slot.blendshapes = res.faceBlendshapes?.[i];
      slot.score = 1;
      slot.fade = 1;
      const area = faceArea(slot.landmarks);
      if (area > bestArea) {
        bestArea = area;
        best = i;
      }
    }
    f.primaryFace = n ? f.faces[best] : null;
    if (!n) {
      // Keep last face fading via pose-like decay on primary reference.
      if (f.primaryFace) f.primaryFace.fade *= 0.86;
    }
  }

  ingestPose(f, res, t) {
    if (!res.landmarks?.length) {
      this.decayPose(f, t);
      return;
    }
    const lm = this._poseSm.apply(res.landmarks[0], t, true);
    const world = res.worldLandmarks?.[0]
      ? this._poseWorldSm.apply(res.worldLandmarks[0], t, false)
      : null;
    f.pose = {
      landmarks: lm,
      world,
      mask: this.quality.runPoseMask ? res.segmentationMasks?.[0] : null,
      fade: 1,
    };
    f.poseFade = 1;
  }

  decayPose(f) {
    if (!f.pose) return;
    f.poseFade = clamp(f.poseFade - 0.045, 0, 1);
    f.pose.fade = f.poseFade;
    if (f.poseFade <= 0.02) {
      f.pose = null;
      this._poseSm.reset();
    }
  }

  ingestGestures(f, res) {
    f.gestures.length = 0;
    const n = res.gestures?.length ?? 0;
    for (let i = 0; i < n; i++) {
      const g = res.gestures[i][0];
      if (!g || g.categoryName === "None") continue;
      let hand = res.handednesses?.[i]?.[0]?.categoryName ?? "Right";
      if (hand === "Left") hand = "Right";
      else if (hand === "Right") hand = "Left";
      f.gestures.push({
        name: g.categoryName,
        score: g.score,
        handedness: hand,
      });
    }
  }
}

function faceArea(lm) {
  if (!lm || !lm.length) return 0;
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (let i = 0; i < lm.length; i += 8) {
    const p = lm[i];
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return (maxX - minX) * (maxY - minY);
}

function mirrorCopy(src, dest) {
  if (!dest || dest.length !== src.length) {
    dest = src.map((p) => ({ x: 1 - p.x, y: p.y, z: p.z, visibility: p.visibility ?? 1 }));
    return dest;
  }
  for (let i = 0; i < src.length; i++) {
    dest[i].x = 1 - src[i].x;
    dest[i].y = src[i].y;
    dest[i].z = src[i].z;
  }
  return dest;
}
