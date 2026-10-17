import * as THREE from "three";
import { toWorld } from "../holograms/coords.js";
import { sfx } from "../audio/sfx.js";
import { toast } from "../hud/toasts.js";

const TMP = new THREE.Vector3();
const COLORS = [0x00e5ff, 0xffb300, 0xff1744, 0x69f0ae, 0xe040fb];

export class AirDrawing {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.active = false;
    this.drawing = false;
    this.colorIdx = 0;
    this.strokes = [];
    this.currentPoints = [];
    this.currentLine = null;

    this.lastPt = new THREE.Vector3(999, 999, 999);
  }

  get color() {
    return COLORS[this.colorIdx];
  }

  nextColor() {
    this.colorIdx = (this.colorIdx + 1) % COLORS.length;
    sfx.toast();
    toast(`Draw color cycled`);
  }

  clear() {
    for (const s of this.strokes) {
      this.group.remove(s.line);
      s.line.geometry.dispose();
      s.line.material.dispose();
    }
    this.strokes = [];
    if (this.currentLine) {
      this.group.remove(this.currentLine);
      this.currentLine = null;
    }
    this.currentPoints = [];
    this.drawing = false;
    sfx.alert();
    toast("Canvas cleared");
  }

  undo() {
    if (!this.strokes.length) return;
    const last = this.strokes.pop();
    this.group.remove(last.line);
    last.line.geometry.dispose();
    last.line.material.dispose();
    sfx.toast();
    toast("Last stroke undone");
  }

  startStroke(pos) {
    this.drawing = true;
    this.currentPoints = [pos.clone()];
    this.lastPt.copy(pos);

    const geo = new THREE.BufferGeometry().setFromPoints(this.currentPoints);
    const mat = new THREE.LineBasicMaterial({
      color: this.color,
      linewidth: 3,
      transparent: true,
      opacity: 0.95,
    });
    this.currentLine = new THREE.Line(geo, mat);
    this.group.add(this.currentLine);
    sfx.toast();
  }

  addPoint(pos) {
    if (pos.distanceTo(this.lastPt) < 0.012) return;
    this.currentPoints.push(pos.clone());
    this.lastPt.copy(pos);

    // Update geometry buffer
    const pts = this.currentPoints;
    const arr = new Float32Array(pts.length * 3);
    for (let i = 0; i < pts.length; i++) {
      arr[i * 3] = pts[i].x;
      arr[i * 3 + 1] = pts[i].y;
      arr[i * 3 + 2] = pts[i].z;
    }
    this.currentLine.geometry.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    this.currentLine.geometry.attributes.position.needsUpdate = true;
  }

  endStroke() {
    if (!this.drawing) return;
    this.drawing = false;
    if (this.currentPoints.length > 1 && this.currentLine) {
      this.strokes.push({
        points: this.currentPoints,
        line: this.currentLine,
        color: this.color,
      });
    } else if (this.currentLine) {
      this.group.remove(this.currentLine);
    }
    this.currentPoints = [];
    this.currentLine = null;
  }

  update(frame) {
    if (!this.active || !frame) return;

    let penActive = false;
    let penPos = null;

    // Use dominant hand index finger tip (landmark 8) or pinch
    for (let i = 0; i < 2; i++) {
      const h = frame.hands[i];
      if (!h.present || !h.landmarks) continue;
      const pinch = h._pinch;

      // Draw while pinching in drawing tool mode
      if (pinch && pinch.active) {
        toWorld({ x: pinch.x, y: pinch.y, z: pinch.z }, TMP);
        penActive = true;
        penPos = TMP;
        break;
      }
    }

    if (penActive && penPos) {
      if (!this.drawing) {
        this.startStroke(penPos);
      } else {
        this.addPoint(penPos);
      }
    } else if (this.drawing) {
      this.endStroke();
    }
  }
}
