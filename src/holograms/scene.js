import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { CONFIG } from "../config.js";
import { HoloBody } from "./body.js";
import { HoloFace } from "./face.js";
import { HoloHands } from "./hands.js";
import { Repulsor } from "./repulsor.js";
import { BodyScan } from "./bodyScan.js";
import { appState } from "../state.js";

export class HoloScene {
  constructor() {
    this.host = document.getElementById("three");
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      CONFIG.hologram.bloomStrength,
      CONFIG.hologram.bloomRadius,
      CONFIG.hologram.bloomThreshold
    );
    this.composer.addPass(this.bloom);

    this.body = new HoloBody(this.scene);
    this.face = new HoloFace(this.scene);
    this.hands = new HoloHands(this.scene);
    this.repulsor = new Repulsor(this.scene);
    this.scan = new BodyScan(this.scene);
    this.tools = null;

    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  setTools(tools) {
    this.tools = tools;
  }

  render(frame, quality, t) {
    const stealth = appState.mode === "STEALTH";
    this.renderer.domElement.style.opacity = stealth ? "0.12" : "1";
    this.bloom.enabled = quality.bloom && !stealth;
    this.body.update(frame, quality);
    this.face.update(frame);
    this.hands.update(frame);
    this.repulsor.update(frame, t);
    this.scan.update(frame);
    this.tools?.update(frame, t);
    if (quality.bloom && !stealth) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
