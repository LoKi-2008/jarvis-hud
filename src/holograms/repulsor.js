import * as THREE from "three";
import { toWorld } from "./coords.js";
import { sfx } from "../audio/sfx.js";
import { appState } from "../state.js";
import { bus } from "../utils/bus.js";

const TMP = new THREE.Vector3();
const DIR = new THREE.Vector3();

export class Repulsor {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.04, 0.09, 32),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    this.group.add(this.ring);
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.028, 2.2, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x7ef9ff, transparent: true, opacity: 0.0 })
    );
    this.beam.rotation.x = Math.PI / 2;
    this.group.add(this.beam);
    this.burstGeo = new THREE.BufferGeometry();
    this.burstPos = new Float32Array(240 * 3);
    this.burstGeo.setAttribute("position", new THREE.BufferAttribute(this.burstPos, 3));
    this.burst = new THREE.Points(
      this.burstGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0 })
    );
    this.group.add(this.burst);
    this.charge = [0, 0];
    this.wasGrab = [false, false];
    this.fireT = 0;
    this.origin = new THREE.Vector3();
  }

  update(frame, t) {
    const enabled = appState.mode === "COMBAT" || appState.mode === "ACTIVE" || appState.mode === "PARTY";
    this.group.visible = enabled;
    if (!enabled || !frame) return;

    let shown = false;
    for (let i = 0; i < 2; i++) {
      const h = frame.hands[i];
      if (!h.present || !h.landmarks) {
        this.charge[i] = Math.max(0, this.charge[i] - 0.04);
        continue;
      }
      const open = palmOpen(h.landmarks) > 0.78 && !h._pinch?.active;
      const grab = palmOpen(h.landmarks) < 0.45;
      if (open) {
        this.charge[i] = Math.min(1, this.charge[i] + 0.045);
        if (this.charge[i] > 0.2 && this.charge[i] < 0.25) sfx.charge();
        if (this.wasGrab[i] && this.charge[i] > 0.35) this.fire(h, t);
      } else if (!grab) {
        this.charge[i] = Math.max(0, this.charge[i] - 0.02);
      }
      this.wasGrab[i] = grab;
      if (this.charge[i] > 0.05) {
        toWorld(h.landmarks[9], TMP);
        this.ring.position.copy(TMP);
        const s = 0.6 + this.charge[i] * 1.8;
        this.ring.scale.setScalar(s);
        this.ring.lookAt(0, 0, 1);
        this.ring.material.opacity = 0.4 + this.charge[i] * 0.6;
        shown = true;
        this.origin.copy(TMP);
      }
    }
    this.ring.visible = shown;

    if (this.fireT && t - this.fireT < 420) {
      const k = 1 - (t - this.fireT) / 420;
      this.beam.material.opacity = k * 0.7;
      this.burst.material.opacity = k;
      this.beam.position.copy(this.origin);
      this.beam.lookAt(this.origin.x, this.origin.y, this.origin.z - 2);
      for (let p = 0; p < 240; p++) {
        this.burstPos[p * 3] = this.origin.x + (Math.random() - 0.5) * (1 - k);
        this.burstPos[p * 3 + 1] = this.origin.y + (Math.random() - 0.5) * (1 - k);
        this.burstPos[p * 3 + 2] = this.origin.z - Math.random() * 1.6;
      }
      this.burstGeo.attributes.position.needsUpdate = true;
    } else {
      this.beam.material.opacity = 0;
      this.burst.material.opacity = 0;
    }
  }

  fire(hand, t) {
    this.fireT = t;
    this.charge[hand.id] = 0;
    sfx.fire();
    bus.emit("repulsor-fire", { hand: hand.handedness });
  }
}

function palmOpen(lm) {
  const tips = [8, 12, 16, 20];
  const mcps = [5, 9, 13, 17];
  let s = 0;
  for (let i = 0; i < 4; i++) {
    const dx = lm[tips[i]].x - lm[mcps[i]].x;
    const dy = lm[tips[i]].y - lm[mcps[i]].y;
    s += Math.hypot(dx, dy);
  }
  return s / 4 / 0.18;
}
