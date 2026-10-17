import * as THREE from "three";
import { CONFIG } from "../config.js";
import { HoloFace } from "./face.js";
import { HoloHands } from "./hands.js";
import { Repulsor } from "./repulsor.js";
import { appState } from "../state.js";

export class HoloScene {
  constructor() {
    this.host = document.getElementById("three");
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.host.appendChild(this.renderer.domElement);
    Object.assign(this.renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 20);
    this.camera.position.set(0, 0, 3.2);

    this.face = new HoloFace(this.scene);
    this.hands = new HoloHands(this.scene);
    this.repulsor = new Repulsor(this.scene);
    this.tools = null;

    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  setTools(tools) {
    this.tools = tools;
  }

  render(frame, quality, t) {
    const stealth = appState.mode === "STEALTH";
    this.renderer.domElement.style.opacity = stealth ? "0.15" : "1";
    this.face.update(frame);
    this.hands.update(frame);
    this.repulsor.update(frame, t);
    this.tools?.update(frame, t);
    this.renderer.render(this.scene, this.camera);
  }
}
