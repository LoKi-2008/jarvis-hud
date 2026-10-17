import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { toWorld } from "../holograms/coords.js";
import { sfx } from "../audio/sfx.js";
import { toast } from "../hud/toasts.js";
import { bus } from "../utils/bus.js";

const TMP_PINCH = new THREE.Vector3();
const loader = new GLTFLoader();

export class HolographicObjects {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.group.position.set(0, 0, 0);

    this.currentType = "arc_reactor";
    this.currentModel = null;
    this.models = new Map();

    this.grabbed = false;
    this.grabHand = null;
    this.grabOffset = new THREE.Vector3();

    this.exploded = false;
    this.explodeFactor = 0; // 0 = assembled, 1 = exploded
    this.explodeParts = [];

    this.scale = 1.0;
    this.targetScale = 1.0;
    this.rotationVel = new THREE.Vector3(0, 0.005, 0);

    this.initBuiltins();
    this.select("arc_reactor");

    bus.on("twohand-scale", (factor) => {
      if (this.currentModel) {
        this.targetScale = Math.min(3.0, Math.max(0.3, this.targetScale * (1 + (factor - 1) * 0.5)));
      }
    });

    bus.on("twohand-rotate", (rot) => {
      if (this.currentModel) {
        this.group.rotation.y += rot * 0.8;
      }
    });
  }

  initBuiltins() {
    this.models.set("cube", this.createCube());
    this.models.set("sphere", this.createSphere());
    this.models.set("earth", this.createEarth());
    this.models.set("engine", this.createEngine());
    this.models.set("arc_reactor", this.createArcReactor());
  }

  createCube() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.85 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35, 3, 3, 3), mat);
    group.add(box);

    const innerMat = new THREE.MeshBasicMaterial({ color: 0x7ef9ff, wireframe: true, transparent: true, opacity: 0.45 });
    const inner = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 1), innerMat);
    group.add(inner);

    const parts = [
      { mesh: box, origin: new THREE.Vector3(), dir: new THREE.Vector3(0, 0.25, 0) },
      { mesh: inner, origin: new THREE.Vector3(), dir: new THREE.Vector3(0, -0.25, 0) },
    ];
    return { group, parts, name: "TESSERACT CUBE" };
  }

  createSphere() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.75 });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), mat);
    group.add(sphere);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.32, 32),
      new THREE.MeshBasicMaterial({ color: 0x7ef9ff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const parts = [
      { mesh: sphere, origin: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, 0.2) },
      { mesh: ring, origin: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, -0.2) },
    ];
    return { group, parts, name: "ORBITAL SPHERE" };
  }

  createEarth() {
    const group = new THREE.Group();
    const globeMat = new THREE.MeshBasicMaterial({ color: 0x00a8ff, wireframe: true, transparent: true, opacity: 0.5 });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 24), globeMat);
    group.add(globe);

    // Glowing coordinate rings and latitude bands
    const latGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      const rad = (lat * Math.PI) / 180;
      const y = Math.sin(rad) * 0.265;
      const r = Math.cos(rad) * 0.265;
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
    }
    latGeo.setFromPoints(pts);
    const latLines = new THREE.Line(latGeo, new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.8 }));
    group.add(latLines);

    // Orbital satellite ring
    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.006, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.7 })
    );
    orbit.rotation.x = Math.PI / 3;
    group.add(orbit);

    const parts = [
      { mesh: globe, origin: new THREE.Vector3(), dir: new THREE.Vector3(0, 0.15, 0) },
      { mesh: latLines, origin: new THREE.Vector3(), dir: new THREE.Vector3(0, -0.15, 0) },
      { mesh: orbit, origin: new THREE.Vector3(), dir: new THREE.Vector3(0.2, 0.2, 0) },
    ];
    return { group, parts, name: "TERRA TELEMETRY" };
  }

  createEngine() {
    const group = new THREE.Group();
    const matCyan = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.7 });
    const matAmber = new THREE.MeshBasicMaterial({ color: 0xffb300, wireframe: true, transparent: true, opacity: 0.8 });

    // 1. Outer Turbine Casing
    const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.5, 24, 4, true), matCyan);
    casing.rotation.x = Math.PI / 2;
    group.add(casing);

    // 2. Front Intake Fan & Cone
    const fanGroup = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 16), matAmber);
    cone.rotation.x = Math.PI / 2;
    cone.position.z = 0.25;
    fanGroup.add(cone);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.005), matCyan);
      blade.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.22);
      blade.rotation.z = a + 0.4;
      fanGroup.add(blade);
    }
    group.add(fanGroup);

    // 3. Compressor Stages
    const compGroup = new THREE.Group();
    for (let c = 0; c < 3; c++) {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - c * 0.02, 0.16 - c * 0.02, 0.02, 16), matCyan);
      disc.rotation.x = Math.PI / 2;
      disc.position.z = 0.08 - c * 0.08;
      compGroup.add(disc);
    }
    group.add(compGroup);

    // 4. Combustion Chamber & Exhaust Nozzle
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.22, 20, 2, true), matAmber);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.z = -0.25;
    group.add(exhaust);

    const parts = [
      { mesh: casing, origin: new THREE.Vector3(0, 0, 0), dir: new THREE.Vector3(0, 0.35, 0) },
      { mesh: fanGroup, origin: new THREE.Vector3(0, 0, 0), dir: new THREE.Vector3(0, 0, 0.45) },
      { mesh: compGroup, origin: new THREE.Vector3(0, 0, 0), dir: new THREE.Vector3(0, -0.25, 0) },
      { mesh: exhaust, origin: new THREE.Vector3(0, 0, 0), dir: new THREE.Vector3(0, 0, -0.45) },
    ];
    return { group, parts, name: "TURBOFAN ENGINE MK-IV" };
  }

  createArcReactor() {
    const group = new THREE.Group();
    const glowCyan = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9 });
    const copperMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.85 });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x7ef9ff, wireframe: true, transparent: true, opacity: 0.6 });

    // 1. Outer Palladium Casing Ring
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 16, 48), glowCyan);
    group.add(outerRing);

    // 2. 10 Induction Coils
    const coilsGroup = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const coil = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), copperMat);
      coil.position.set(Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0);
      coil.rotation.z = a;
      coilsGroup.add(coil);
    }
    group.add(coilsGroup);

    // 3. Middle Focus Ring
    const midRing = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.18, 32), wireMat);
    midRing.position.z = 0.02;
    group.add(midRing);

    // 4. Central Repulsor Core
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.05, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
    );
    core.rotation.x = Math.PI / 2;
    group.add(core);

    const parts = [
      { mesh: outerRing, origin: new THREE.Vector3(0, 0, 0), dir: new THREE.Vector3(0, 0, -0.2) },
      { mesh: coilsGroup, origin: new THREE.Vector3(0, 0, 0), dir: new THREE.Vector3(0, 0.25, 0.1) },
      { mesh: midRing, origin: new THREE.Vector3(0, 0, 0.02), dir: new THREE.Vector3(0, 0, 0.25) },
      { mesh: core, origin: new THREE.Vector3(0, 0, 0), dir: new THREE.Vector3(0, 0, 0.4) },
    ];
    return { group, parts, name: "ARC REACTOR MK-L" };
  }

  loadGLB(urlOrBuffer) {
    sfx.alert();
    toast("Loading external hologram…");
    loader.load(
      urlOrBuffer,
      (gltf) => {
        const custom = gltf.scene;
        // Auto-center and normalize scale
        const box = new THREE.Box3().setFromObject(custom);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = 0.55 / Math.max(maxDim, 1e-4);
        custom.scale.setScalar(targetScale);

        const center = new THREE.Vector3();
        box.getCenter(center);
        custom.position.sub(center.multiplyScalar(targetScale));

        // Apply holographic wireframe/additive styling
        custom.traverse((node) => {
          if (node.isMesh) {
            node.material = new THREE.MeshBasicMaterial({
              color: 0x00e5ff,
              wireframe: true,
              transparent: true,
              opacity: 0.85,
            });
          }
        });

        const customItem = {
          group: custom,
          parts: [{ mesh: custom, origin: new THREE.Vector3(), dir: new THREE.Vector3(0, 0.3, 0) }],
          name: "CUSTOM CAD ASSET",
        };
        this.models.set("custom", customItem);
        this.select("custom");
        sfx.systemOnline();
        toast("CAD model online");
      },
      undefined,
      (err) => {
        console.error("Failed to load GLB", err);
        toast("CAD load failed", "alert");
      }
    );
  }

  select(type) {
    if (!this.models.has(type)) return;
    if (this.currentModel) {
      this.group.remove(this.currentModel.group);
    }
    this.currentType = type;
    this.currentModel = this.models.get(type);
    this.explodeParts = this.currentModel.parts || [];
    this.group.add(this.currentModel.group);
    this.exploded = false;
    this.explodeFactor = 0;
    this.targetScale = 1.0;
    this.group.position.set(0, 0.05, 0.2);
    sfx.toast();
    toast(`Hologram: ${this.currentModel.name}`);
  }

  toggleExplode() {
    this.exploded = !this.exploded;
    sfx.modeChange();
    toast(this.exploded ? "EXPLODED VIEW ENGAGED" : "REASSEMBLED");
  }

  update(frame, t) {
    if (!this.currentModel) return;

    // Smooth scale lerp
    this.scale += (this.targetScale - this.scale) * 0.15;
    this.group.scale.setScalar(this.scale);

    // Auto idle spin if not grabbed
    if (!this.grabbed) {
      this.group.rotation.y += this.rotationVel.y;
    }

    // Explode lerp
    const targetFactor = this.exploded ? 1 : 0;
    this.explodeFactor += (targetFactor - this.explodeFactor) * 0.1;
    for (const p of this.explodeParts) {
      p.mesh.position.copy(p.origin).addScaledVector(p.dir, this.explodeFactor);
    }

    // Pinch-grab tracking
    if (!frame) return;
    let anyPinch = false;
    for (let i = 0; i < 2; i++) {
      const h = frame.hands[i];
      if (!h.present || !h.landmarks) continue;
      const p = h._pinch;
      if (p && p.active) {
        toWorld({ x: p.x, y: p.y, z: p.z }, TMP_PINCH);
        const dist = TMP_PINCH.distanceTo(this.group.position);

        if (!this.grabbed && dist < 0.35) {
          this.grabbed = true;
          this.grabHand = i;
          this.grabOffset.copy(this.group.position).sub(TMP_PINCH);
          sfx.toast();
        }

        if (this.grabbed && this.grabHand === i) {
          anyPinch = true;
          this.group.position.copy(TMP_PINCH).add(this.grabOffset);
        }
      }
    }

    if (this.grabbed && !anyPinch) {
      this.grabbed = false;
      this.grabHand = null;
    }
  }
}
