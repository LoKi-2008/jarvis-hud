import { appState } from "../state.js";

/**
 * Optional COCO-SSD object detection. Loaded lazily so the HUD still runs offline
 * if the user never enables it (weights come from TFJS CDN on first enable).
 */
export class CocoDetector {
  constructor() {
    this.model = null;
    this.loading = false;
    this.last = 0;
    this.items = [];
  }

  async ensure() {
    if (this.model || this.loading) return this.model;
    this.loading = true;
    try {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const coco = await import("@tensorflow-models/coco-ssd");
      this.model = await coco.load({ base: "lite_mobilenet_v2" });
    } catch (err) {
      console.warn("COCO-SSD unavailable", err);
    } finally {
      this.loading = false;
    }
    return this.model;
  }

  async tick(video, t) {
    if (!appState.cocoOn) {
      this.items = [];
      return this.items;
    }
    if (t - this.last < 160) return this.items;
    this.last = t;
    const model = await this.ensure();
    if (!model || video.readyState < 2) return this.items;
    const raw = await model.detect(video, 12);
    this.items = raw.map((d) => ({
      label: d.class,
      score: d.score,
      // Mirror X into HUD space. bbox is [x,y,w,h] in video pixels.
      x: 1 - (d.bbox[0] + d.bbox[2]) / video.videoWidth,
      y: d.bbox[1] / video.videoHeight,
      w: d.bbox[2] / video.videoWidth,
      h: d.bbox[3] / video.videoHeight,
    }));
    return this.items;
  }
}

export const coco = new CocoDetector();
