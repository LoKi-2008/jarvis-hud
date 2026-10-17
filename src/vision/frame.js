/** Pooled vision frame so the inference loop does not allocate every tick. */

function emptyHand() {
  return {
    id: 0,
    handedness: "Right",
    score: 0,
    present: false,
    fade: 0,
    landmarks: null,
    world: null,
    lostAt: 0,
  };
}

export function createVisionFrame() {
  return {
    t: 0,
    inferenceMs: 0,
    light: 1,
    videoW: 0,
    videoH: 0,
    hands: [emptyHand(), emptyHand()],
    faceCount: 0,
    faces: [],
    primaryFace: null,
    pose: null,
    poseFade: 0,
    gestures: [],
    objects: [],
    cocoEnabled: false,
    quality: "high",
  };
}

export function resetTransient(frame) {
  frame.gestures.length = 0;
  frame.objects.length = 0;
}
