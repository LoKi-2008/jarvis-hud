import * as THREE from "three";
import { HandLandmarker } from "@mediapipe/tasks-vision";
import { toWorld } from "./coords.js";
import { CONFIG } from "../config.js";

const CONN = HandLandmarker.HAND_CONNECTIONS;
const TIPS = [4, 8, 12, 16, 20];
const TMP = new THREE.Vector3();

function makeHand() {
  const lineCount = CONN.length * 2;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lineCount * 3), 3));
  const lines = new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.95 })
  );
  const joints = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.014, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xb3ffff }),
    21
  );
  joints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const trails = TIPS.map(() => {
    const len = CONFIG.hologram.trailLength;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(len * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.55 }));
    const hist = Array.from({ length: len }, () => new THREE.Vector3());
    return { g, l, hist, i: 0 };
  });
  return { geo, lines, joints, trails };
}

export class HoloHands {
  constructor(scene) {
    this.left = makeHand();
    this.right = makeHand();
    this.group = new THREE.Group();
    for (const h of [this.left, this.right]) {
      this.group.add(h.lines);
      this.group.add(h.joints);
      for (const t of h.trails) this.group.add(t.l);
    }
    scene.add(this.group);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3(1, 1, 1);
  }

  update(frame) {
    this.draw(this.left, frame?.hands[0]);
    this.draw(this.right, frame?.hands[1]);
  }

  draw(holo, hand) {
    const on = hand?.present && hand.landmarks;
    holo.lines.visible = !!on;
    holo.joints.visible = !!on;
    for (const t of holo.trails) t.l.visible = !!on;
    if (!on) return;
    const lm = hand.landmarks;
    const fade = hand.fade;
    holo.lines.material.opacity = 0.95 * fade;
    const arr = holo.geo.attributes.position.array;
    let i = 0;
    for (const c of CONN) {
      toWorld(lm[c.start], TMP);
      arr[i++] = TMP.x;
      arr[i++] = TMP.y;
      arr[i++] = TMP.z;
      toWorld(lm[c.end], TMP);
      arr[i++] = TMP.x;
      arr[i++] = TMP.y;
      arr[i++] = TMP.z;
    }
    holo.geo.attributes.position.needsUpdate = true;
    for (let j = 0; j < 21; j++) {
      toWorld(lm[j], TMP);
      this._m.compose(TMP, this._q, this._s);
      holo.joints.setMatrixAt(j, this._m);
    }
    holo.joints.instanceMatrix.needsUpdate = true;

    TIPS.forEach((idx, ti) => {
      const tr = holo.trails[ti];
      toWorld(lm[idx], TMP);
      tr.hist[tr.i % tr.hist.length].copy(TMP);
      tr.i++;
      const pos = tr.g.attributes.position.array;
      const len = tr.hist.length;
      for (let k = 0; k < len; k++) {
        const p = tr.hist[(tr.i + k) % len];
        pos[k * 3] = p.x;
        pos[k * 3 + 1] = p.y;
        pos[k * 3 + 2] = p.z;
      }
      tr.g.attributes.position.needsUpdate = true;
    });
  }
}
