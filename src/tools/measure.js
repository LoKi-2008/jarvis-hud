import * as THREE from "three";
import { toWorld } from "../holograms/coords.js";
import { appState } from "../state.js";

const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();

export class PinchToMeasure {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.active = false;

    // Line connecting caliper points
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    this.line = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.9 })
    );
    this.group.add(this.line);

    // End points
    this.pA = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffb300 })
    );
    this.pB = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffb300 })
    );
    this.group.add(this.pA);
    this.group.add(this.pB);

    // Crosshair rings
    this.ringA = new THREE.Mesh(
      new THREE.RingGeometry(0.03, 0.04, 24),
      new THREE.MeshBasicMaterial({ color: 0xffb300, side: THREE.DoubleSide })
    );
    this.ringB = new THREE.Mesh(
      new THREE.RingGeometry(0.03, 0.04, 24),
      new THREE.MeshBasicMaterial({ color: 0xffb300, side: THREE.DoubleSide })
    );
    this.group.add(this.ringA);
    this.group.add(this.ringB);

    // HTML Readout floating tag
    this.tag = document.createElement("div");
    this.tag.id = "measure-tag";
    this.tag.style.cssText =
      "position:absolute;display:none;z-index:15;pointer-events:none;color:#ffb300;font:13px 'Orbitron',sans-serif;font-weight:bold;text-shadow:0 0 10px #ffb300;background:rgba(10,5,0,0.75);border:1px solid #ffb300;padding:4px 8px;transform:translate(-50%,-100%);";
    document.getElementById("stage").appendChild(this.tag);

    this.group.visible = false;
  }

  update(frame) {
    if (!this.active || !frame) {
      this.group.visible = false;
      this.tag.style.display = "none";
      return;
    }

    const h0 = frame.hands[0];
    const h1 = frame.hands[1];

    let ptA = null;
    let ptB = null;

    // Case 1: Two hands present — measure between Left hand pinch and Right hand pinch (or fingertips)
    if (h0?.present && h1?.present && h0.landmarks && h1.landmarks) {
      const p0 = h0._pinch?.active ? h0._pinch : h0.landmarks[8];
      const p1 = h1._pinch?.active ? h1._pinch : h1.landmarks[8];
      toWorld(p0, TMP_A);
      toWorld(p1, TMP_B);
      ptA = TMP_A;
      ptB = TMP_B;
    }
    // Case 2: One hand present — measure between thumb tip (4) and index tip (8)
    else if ((h0?.present && h0.landmarks) || (h1?.present && h1.landmarks)) {
      const h = h0.present ? h0 : h1;
      toWorld(h.landmarks[4], TMP_A);
      toWorld(h.landmarks[8], TMP_B);
      ptA = TMP_A;
      ptB = TMP_B;
    }

    if (ptA && ptB) {
      this.group.visible = true;
      this.pA.position.copy(ptA);
      this.pB.position.copy(ptB);
      this.ringA.position.copy(ptA);
      this.ringB.position.copy(ptB);

      const arr = this.line.geometry.attributes.position.array;
      arr[0] = ptA.x;
      arr[1] = ptA.y;
      arr[2] = ptA.z;
      arr[3] = ptB.x;
      arr[4] = ptB.y;
      arr[5] = ptB.z;
      this.line.geometry.attributes.position.needsUpdate = true;

      // Distance calculation calibrated to real world cm
      // Baseline: handSpan normalized in camera frame ~ 18-20 cm
      const worldDist = ptA.distanceTo(ptB);
      const spanNorm = appState.handSpan || 0.18;
      const cmDist = (worldDist / (spanNorm * 2.5)) * 18.0;
      const inDist = cmDist / 2.54;

      // Center in screen space
      const mid = new THREE.Vector3().addVectors(ptA, ptB).multiplyScalar(0.5);
      const sx = (mid.x / 2 + 0.5) * window.innerWidth;
      const sy = (0.5 - mid.y / 2) * window.innerHeight;

      this.tag.style.display = "block";
      this.tag.style.left = `${sx}px`;
      this.tag.style.top = `${sy - 16}px`;
      this.tag.textContent = `Δ ${cmDist.toFixed(1)} cm / ${inDist.toFixed(1)} in`;
    } else {
      this.group.visible = false;
      this.tag.style.display = "none";
    }
  }
}
