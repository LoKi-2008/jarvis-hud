/**
 * Downloads MediaPipe .task models into public/models for offline inference.
 */
import { mkdir, copyFile, access } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destDir = resolve(root, "public/models");
const wasmSrc = resolve(root, "node_modules/@mediapipe/tasks-vision/wasm");
const wasmDest = resolve(root, "public/wasm");

const MODELS = [
  {
    name: "hand_landmarker.task",
    url: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  },
  {
    name: "face_landmarker.task",
    url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  },
  {
    name: "pose_landmarker_lite.task",
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  },
  {
    name: "gesture_recognizer.task",
    url: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
  },
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  if (await exists(dest)) {
    console.log("skip", dest);
    return;
  }
  console.log("fetch", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function copyDir(src, dest) {
  const { cp } = await import("node:fs/promises");
  await cp(src, dest, { recursive: true });
}

await mkdir(destDir, { recursive: true });
for (const m of MODELS) {
  await download(m.url, resolve(destDir, m.name));
}

if (await exists(wasmSrc)) {
  await mkdir(dirname(wasmDest), { recursive: true });
  await copyDir(wasmSrc, wasmDest);
  console.log("copied wasm -> public/wasm");
} else {
  console.warn("MediaPipe wasm not found. Run npm install first.");
}

console.log("models ready");
