import * as THREE from "three";
import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { toWorld } from "./coords.js";

const TES = FaceLandmarker.FACE_LANDMARKS_TESSELATION;
const TMP = new THREE.Vector3();

export class HoloFace {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    const segs = TES.length * 2;
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(segs * 3), 3));
    this.lines = new THREE.LineSegments(
      this.geo,
      new THREE.LineBasicMaterial({ color: 0x7ef9ff, transparent: true, opacity: 0.35 })
    );
    this.group.add(this.lines);

    this.scan = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.012),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.7 })
    );
    this.group.add(this.scan);
    this.scanY = 0;

    this.axes = new THREE.AxesHelper(0.28);
    this.group.add(this.axes);
  }

  update(frame) {
    const face = frame?.primaryFace;
    if (!face?.landmarks) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    const lm = face.landmarks;
    const arr = this.geo.attributes.position.array;
    let i = 0;
    for (const c of TES) {
      toWorld(lm[c.start], TMP);
      arr[i++] = TMP.x;
      arr[i++] = TMP.y;
      arr[i++] = TMP.z;
      toWorld(lm[c.end], TMP);
      arr[i++] = TMP.x;
      arr[i++] = TMP.y;
      arr[i++] = TMP.z;
    }
    this.geo.attributes.position.needsUpdate = true;

    toWorld(lm[1], TMP);
    this.scanY += 0.012;
    if (this.scanY > 0.28) this.scanY = -0.28;
    this.scan.position.set(TMP.x, TMP.y + this.scanY, TMP.z + 0.05);

    if (face.matrix?.data) {
      const m = face.matrix.data;
      const mat = new THREE.Matrix4().fromArray(m);
      mat.decompose(this.axes.position, this.axes.quaternion, new THREE.Vector3());
      this.axes.position.copy(TMP);
      this.axes.scale.setScalar(0.35);
    } else {
      this.axes.position.copy(TMP);
    }
  }
}
