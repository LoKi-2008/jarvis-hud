import * as THREE from "three";
import { toWorld, BODY_OFF } from "./coords.js";
import { dist2 } from "../utils/math.js";
import { appState } from "../state.js";

const TMP = new THREE.Vector3();

export class BodyScan {
  constructor(scene) {
    this.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.03),
      new THREE.MeshBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    this.plane.rotation.x = Math.PI / 2;
    scene.add(this.plane);
    this.y = 0.9;
    this.html = document.createElement("div");
    this.html.id = "scan-readout";
    this.html.style.cssText =
      "position:absolute;left:48px;top:80px;z-index:12;pointer-events:none;color:#FFB300;font:12px Share Tech Mono,monospace;text-shadow:0 0 8px #FFB300;white-space:pre;";
    document.getElementById("stage").appendChild(this.html);
  }

  update(frame) {
    const on = appState.mode === "SCAN";
    this.plane.visible = on;
    this.html.style.display = on ? "block" : "none";
    if (!on) return;
    this.y -= 0.012;
    if (this.y < -0.9) this.y = 0.9;
    const pose = frame?.pose?.landmarks;
    if (pose) {
      toWorld(pose[0], TMP, BODY_OFF.x, BODY_OFF.y);
      this.plane.position.set(TMP.x, this.y, TMP.z);
      const shoulder = dist2(pose[11], pose[12]);
      const hip = dist2(pose[23], pose[24]);
      const height = Math.abs(pose[0].y - ((pose[27].y + pose[28].y) * 0.5));
      const lean = pose[0].x - (pose[23].x + pose[24].x) * 0.5;
      this.html.textContent = [
        "BODY SCAN  ·  SIMULATED",
        `STATURE INDEX   ${(height * 100).toFixed(1)}  (SIMULATED)`,
        `SHOULDER SPAN   ${(shoulder * 100).toFixed(1)}  (SIMULATED)`,
        `HIP WIDTH       ${(hip * 100).toFixed(1)}  (SIMULATED)`,
        `POSTURE LEAN    ${lean >= 0 ? "R" : "L"} ${Math.abs(lean * 100).toFixed(1)}°  (SIMULATED)`,
        `TELEMETRY HR    ${Math.round(62 + Math.sin(performance.now() / 400) * 4)} bpm  (SIMULATED)`,
      ].join("\n");
    } else {
      this.html.textContent = "BODY SCAN  ·  SIMULATED\nAwaiting pose lock…";
    }
  }
}
