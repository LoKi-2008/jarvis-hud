import * as THREE from "three";
import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { BODY_OFF, toWorld } from "./coords.js";
import { CONFIG } from "../config.js";

const CONN = PoseLandmarker.POSE_CONNECTIONS;
const TMP = new THREE.Vector3();

export class HoloBody {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    const lineCount = CONN.length * 2;
    this.skelGeo = new THREE.BufferGeometry();
    this.skelGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lineCount * 3), 3));
    this.skel = new THREE.LineSegments(
      this.skelGeo,
      new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.85 })
    );
    this.group.add(this.skel);

    this.joints = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.018, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9 }),
      33
    );
    this.joints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.joints);

    const n = CONFIG.hologram.particleCount;
    this.pGeo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(n * 3);
    this.pGeo.setAttribute("position", new THREE.BufferAttribute(this.pPos, 3));
    this.pts = new THREE.Points(
      this.pGeo,
      new THREE.PointsMaterial({ color: 0x66f7ff, size: 0.012, transparent: true, opacity: 0.45 })
    );
    this.group.add(this.pts);

    this.wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.55, 1),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.12 })
    );
    this.group.add(this.wire);

    this._m = new THREE.Matrix4();
    this._s = new THREE.Vector3(1, 1, 1);
    this._q = new THREE.Quaternion();
    this.visible = false;
    this.pCount = n;
  }

  update(frame, quality) {
    const pose = frame?.pose;
    const fade = pose?.fade ?? 0;
    this.group.visible = fade > 0.02;
    if (!pose?.landmarks) return;
    this.group.traverse((o) => {
      if (o.material) o.material.opacity = fade * (o === this.pts ? 0.4 : o === this.wire ? 0.12 : 0.85);
    });

    const lm = pose.landmarks;
    const pos = this.skelGeo.attributes.position.array;
    let i = 0;
    for (const c of CONN) {
      toWorld(lm[c.start], TMP, BODY_OFF.x, BODY_OFF.y);
      pos[i++] = TMP.x;
      pos[i++] = TMP.y;
      pos[i++] = TMP.z;
      toWorld(lm[c.end], TMP, BODY_OFF.x, BODY_OFF.y);
      pos[i++] = TMP.x;
      pos[i++] = TMP.y;
      pos[i++] = TMP.z;
    }
    this.skelGeo.attributes.position.needsUpdate = true;

    for (let j = 0; j < 33; j++) {
      toWorld(lm[j], TMP, BODY_OFF.x, BODY_OFF.y);
      this._s.setScalar(j % 4 === 0 ? 1.3 : 1);
      this._m.compose(TMP, this._q, this._s);
      this.joints.setMatrixAt(j, this._m);
    }
    this.joints.instanceMatrix.needsUpdate = true;

    toWorld(lm[0], TMP, BODY_OFF.x, BODY_OFF.y);
    this.wire.position.copy(TMP);
    this.wire.rotation.y += 0.01;

    this.dust(pose, quality);
  }

  dust(pose, quality) {
    const n = Math.floor(this.pCount * (quality?.particleScale ?? 1));
    const mask = pose.mask;
    if (mask && mask.width) {
      const data = mask.getAsUint8Array?.() || mask.getAsFloat32Array?.();
      if (data) {
        const w = mask.width;
        const h = mask.height;
        let k = 0;
        const step = Math.max(1, Math.floor((w * h) / (n * 6)));
        for (let p = 0; p < w * h && k < n; p += step) {
          const v = data[p];
          if (v < 0.4 && v < 80) continue;
          const x = p % w;
          const y = (p / w) | 0;
          const nx = 1 - x / w;
          const ny = y / h;
          this.pPos[k * 3] = (nx - 0.5 + BODY_OFF.x) * 2 + (Math.random() - 0.5) * 0.02;
          this.pPos[k * 3 + 1] = (0.5 - ny + BODY_OFF.y) * 2;
          this.pPos[k * 3 + 2] = -0.2 + Math.random() * 0.15;
          k++;
        }
        this.pGeo.setDrawRange(0, k);
        this.pGeo.attributes.position.needsUpdate = true;
        return;
      }
    }
    // Fallback: jitter around joints.
    const lm = pose.landmarks;
    for (let k = 0; k < n; k++) {
      const j = k % 33;
      toWorld(lm[j], TMP, BODY_OFF.x, BODY_OFF.y);
      this.pPos[k * 3] = TMP.x + (Math.random() - 0.5) * 0.12;
      this.pPos[k * 3 + 1] = TMP.y + (Math.random() - 0.5) * 0.16;
      this.pPos[k * 3 + 2] = TMP.z + (Math.random() - 0.5) * 0.1;
    }
    this.pGeo.setDrawRange(0, n);
    this.pGeo.attributes.position.needsUpdate = true;
  }
}
