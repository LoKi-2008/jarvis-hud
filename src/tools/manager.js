import { HolographicObjects } from "./objects.js";
import { AirDrawing } from "./drawing.js";
import { PinchToMeasure } from "./measure.js";
import { FloatingPanels } from "./panels.js";
import { RadialMenu } from "./radialMenu.js";
import { faceBio } from "./faceEnroll.js";
import { recorder } from "./recorder.js";
import { bus } from "../utils/bus.js";
import { toast } from "../hud/toasts.js";
import { sfx } from "../audio/sfx.js";
import { appState } from "../state.js";

const OBJECT_TYPES = ["arc_reactor", "engine", "earth", "cube", "sphere"];

export class ToolsManager {
  constructor(scene) {
    this.scene = scene;
    this.objects = new HolographicObjects(scene);
    this.drawing = new AirDrawing(scene);
    this.measure = new PinchToMeasure(scene);
    this.panels = new FloatingPanels();
    this.radial = new RadialMenu();
    this.faceBio = faceBio;
    this.recorder = recorder;

    this.objTypeIdx = 0;

    this.bindEvents();
    this.bindUI();
  }

  bindEvents() {
    bus.on("tool-select", (id) => this.handleToolSelect(id));
  }

  cycleObject() {
    this.objTypeIdx = (this.objTypeIdx + 1) % OBJECT_TYPES.length;
    const type = OBJECT_TYPES[this.objTypeIdx];
    this.objects.select(type);
  }

  handleToolSelect(id) {
    switch (id) {
      case "objects":
        this.cycleObject();
        break;
      case "explode":
        this.objects.toggleExplode();
        break;
      case "draw":
        this.drawing.active = !this.drawing.active;
        sfx.toast();
        toast(this.drawing.active ? "3D AIR DRAW ENGAGED (Pinch to draw)" : "Air Draw Stored");
        break;
      case "measure":
        this.measure.active = !this.measure.active;
        sfx.toast();
        toast(this.measure.active ? "MEASUREMENT CALIPERS ACTIVE" : "Calipers Stored");
        break;
      case "panels":
        this.panels.toggleAll();
        break;
      case "capture":
        this.recorder.takeScreenshot();
        break;
    }
  }

  bindUI() {
    // GLB file upload
    const glbInput = document.getElementById("glb-file");
    glbInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      this.objects.loadGLB(url);
    });

    // Face enrollment in settings
    const enrollBtn = document.getElementById("enroll-face");
    const nameInput = document.getElementById("enroll-name");
    enrollBtn?.addEventListener("click", () => {
      const name = nameInput?.value?.trim() || "Tony Stark";
      const frame = window.__latestFrame;
      if (!frame?.primaryFace?.landmarks) {
        toast("No face detected for enrollment", "alert");
        return;
      }
      this.faceBio.enroll(name, frame.primaryFace.landmarks);
    });
  }

  update(frame, t) {
    window.__latestFrame = frame;
    this.objects.update(frame, t);
    this.drawing.update(frame);
    this.measure.update(frame);
    this.panels.update(frame, t);
    this.radial.update(frame);
    this.faceBio.update(frame, t);
    this.recorder.updateFrame();
  }

  drawRadial(ctx) {
    this.radial.draw(ctx);
  }
}
