import { CONFIG } from "../config.js";

/**
 * Live webcam with mirrored presentation. Analysis always uses the raw video
 * element; HUD/hologram coordinates are converted into mirrored normalized space.
 */
export class Camera {
  constructor() {
    this.video = document.getElementById("cam");
    this.stream = null;
    this.light = 1;
    this._sample = document.createElement("canvas");
    this._sample.width = 32;
    this._sample.height = 18;
    this._ctx = this._sample.getContext("2d", { willReadFrequently: true });
    this._lastLightT = 0;
  }

  async start() {
    const { width, height, fps, facingMode } = CONFIG.camera;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode,
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: fps },
      },
    });
    this.video.srcObject = this.stream;
    this.video.playsInline = true;
    this.video.muted = true;
    await this.video.play();
    await waitForFrame(this.video);
    return this.video;
  }

  stop() {
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
  }

  get size() {
    return {
      w: this.video.videoWidth || CONFIG.camera.width,
      h: this.video.videoHeight || CONFIG.camera.height,
    };
  }

  /** Cheap luma probe — used to fade tracking in low light instead of snapping. */
  sampleLight(t) {
    return 1.0;
  }
}

function waitForFrame(video) {
  return new Promise((resolve) => {
    if (video.readyState >= 2 && video.videoWidth) {
      resolve();
      return;
    }
    video.addEventListener("loadeddata", () => resolve(), { once: true });
  });
}
