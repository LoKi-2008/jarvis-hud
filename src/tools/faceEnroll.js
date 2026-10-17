import { bus } from "../utils/bus.js";
import { toast } from "../hud/toasts.js";
import { sfx } from "../audio/sfx.js";
import { speak } from "../voice/speak.js";

const DB_NAME = "jarvis_biometrics";
const STORE_NAME = "faces";
const DB_VERSION = 1;

// Key feature landmarks on face mesh: eye corners, nose, lips, jaw, eyebrows
const FEATURE_LANDMARKS = [
  1, 2, 4, 5, 6, 10, 33, 61, 64, 67, 98, 107, 109, 133, 145, 152, 159, 168,
  175, 197, 263, 291, 294, 297, 327, 336, 338, 362, 374, 386, 398, 415,
];

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Extract normalized, invariant facial descriptor vector */
export function extractFaceDescriptor(landmarks) {
  if (!landmarks || landmarks.length < 468) return null;

  // Reference points: left eye outer (33) and right eye outer (263)
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const eyeDist = Math.hypot(dx, dy);
  if (eyeDist < 1e-4) return null;

  const midX = (leftEye.x + rightEye.x) * 0.5;
  const midY = (leftEye.y + rightEye.y) * 0.5;

  const desc = [];
  for (const idx of FEATURE_LANDMARKS) {
    const pt = landmarks[idx];
    desc.push((pt.x - midX) / eyeDist);
    desc.push((pt.y - midY) / eyeDist);
    desc.push(((pt.z ?? 0) - (landmarks[1].z ?? 0)) / eyeDist);
  }
  return desc;
}

export function compareDescriptors(d1, d2) {
  if (!d1 || !d2 || d1.length !== d2.length) return 999;
  let sum = 0;
  for (let i = 0; i < d1.length; i++) {
    const diff = d1[i] - d2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum / d1.length);
}

export class FaceEnrollment {
  constructor() {
    this.enrolled = [];
    this.lastGreeting = 0;
    this.recognizedName = null;
    this.matchConfidence = 0;
    this.loadEnrolled();
  }

  async loadEnrolled() {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        this.enrolled = req.result || [];
        console.log(`Loaded ${this.enrolled.length} enrolled faces.`);
      };
    } catch (err) {
      console.warn("Could not load enrolled faces from IndexedDB", err);
    }
  }

  async enroll(name, landmarks) {
    if (!name || !landmarks) {
      toast("Name and face required for enrollment", "warn");
      return false;
    }
    const desc = extractFaceDescriptor(landmarks);
    if (!desc) {
      toast("Facial lock too weak. Look directly at camera.", "warn");
      return false;
    }

    const record = {
      name: name.trim(),
      descriptor: desc,
      enrolledAt: new Date().toISOString(),
    };

    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.add(record);
      await new Promise((res, rej) => {
        tx.oncomplete = res;
        tx.onerror = rej;
      });
      await this.loadEnrolled();
      sfx.systemOnline();
      toast(`Face biometric saved: ${record.name}`);
      speak(`Facial telemetry stored. Welcome to the system, ${record.name}.`);
      bus.emit("face-enrolled", record);
      return true;
    } catch (err) {
      console.error("Failed to save face enrollment", err);
      toast("Failed to save face enrollment", "alert");
      return false;
    }
  }

  update(frame, t) {
    if (!frame?.primaryFace?.landmarks || !this.enrolled.length) {
      this.recognizedName = null;
      this.matchConfidence = 0;
      return;
    }

    const desc = extractFaceDescriptor(frame.primaryFace.landmarks);
    if (!desc) return;

    let bestDist = Infinity;
    let bestMatch = null;

    for (const item of this.enrolled) {
      const dist = compareDescriptors(desc, item.descriptor);
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = item;
      }
    }

    // Threshold for normalized distance match
    if (bestDist < 0.15 && bestMatch) {
      this.recognizedName = bestMatch.name;
      this.matchConfidence = Math.max(0, 1 - bestDist / 0.15);
      frame.primaryFace.enrolledName = bestMatch.name;

      if (t - this.lastGreeting > 60000) {
        this.lastGreeting = t;
        sfx.systemOnline();
        toast(`Biometrics confirmed: ${bestMatch.name}`);
        speak(`Welcome back, ${bestMatch.name}. All systems operational.`);
        bus.emit("face-recognized", bestMatch);
      }
    } else {
      this.recognizedName = null;
      this.matchConfidence = 0;
      if (frame.primaryFace) frame.primaryFace.enrolledName = null;
    }
  }
}

export const faceBio = new FaceEnrollment();
