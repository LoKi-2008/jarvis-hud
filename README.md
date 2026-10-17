# J.A.R.V.I.S. HUD — Iron Man Augmented Reality Interface

A real-time, browser-based, gesture-and-voice-controlled holographic assistant inspired by Tony Stark's Iron Man Mark L helmet HUD. Built with **Vite**, **Vanilla JavaScript**, **MediaPipe Tasks Vision** (Hand, Face, Pose, Gesture), **Three.js r170**, **COCO-SSD**, and **Web Speech API**.

---

## Features

- **Mirrored Video & CRT Grading**: Cinematic optical pipeline with scanlines, chromatic aberration, vignette, and film grain.
- **Biometric Landmark Tracking**: Real-time 21-point hand tracking, 468-point 3D face mesh with head-pose gizmo, 33-point body skeleton, and particle silhouette.
- **One Euro Filter Smoothing**: Jitter-free, low-latency landmark filtering across all models.
- **7 Tactical Modes**: Standby, Active, Combat, Scan, Workshop, Stealth, and Party — each with custom accent palettes, acoustic cues, and post-processing.
- **Holographic Repulsor**: Open palm charges the arc-repulsor ring; flicking into a fist discharges a focused beam and particle burst.
- **3D Interactive Tools**:
  - **Pinch-Grab 3D Objects**: Manipulate holographic models in 3D space (Arc Reactor MK-L, Turbofan Engine MK-IV, Terra Telemetry Earth, Tesseract Cube, Orbital Sphere, or custom `.glb`/`.gltf` CAD models).
  - **Exploded View**: Deconstruct assemblies outwards along radial vectors on command.
  - **3D Air Drawing**: Sketch glowing holographic neon ribbons in 3D world space using pinch or index finger.
  - **Pinch-to-Measure**: Calibrated holographic caliper measuring real-world centimeters and inches between hands or fingertips.
  - **Held-Pinch Radial Menu**: Hold pinch for >520ms to summon a 6-option tactical selector wheel.
  - **Floating HUD Panels**: World Clock, Atmospheric Weather (Open-Meteo), Auto-persisting Notes, Protocols Checklist, Synthesizer with Equalizer, and Diagnostics.
  - **Local Face Biometric Enrollment**: Store facial descriptors in IndexedDB and receive personalized voice greetings upon recognition.
  - **Screenshot & HUD Recording**: Composite recording engine capturing video, Three.js holograms, and 2D tactical overlays into PNG and WebM.
- **Voice Engine**:
  - Continuous listening for wake word **"Jarvis"**.
  - Dynamic audio waveform ring pulsing with speech.
  - Dry British-butler non-repeating response engine.
  - Text command bar fallback accessible via `/` key.

---

## Controls Cheat Sheet

### 1. Gesture Controls

| Gesture | Action | Notes |
|---|---|---|
| **Pinch** (Thumb + Index) | Grab / Manipulate / Draw | Dual-threshold hysteresis (0.045 engage / 0.068 release) prevents chatter |
| **Held Pinch** (> 520ms) | Summon Radial Menu | Move hand into slice and release to select |
| **Two-Hand Spread / Pinch** | Scale 3D Hologram | Expands or contracts 3D models |
| **Two-Hand Twist** | Rotate 3D Hologram | Rotates model along Y/Z axes |
| **Open Palm** | Charge Repulsor / Defend | Charges cyan energy ring in palm center |
| **Flick Fist** (after Charge) | Fire Repulsor Beam | Releases high-energy plasma blast & particle shockwave |
| **Thumbs Up** | Cycle 3D Model | Tesseract → Sphere → Earth → Engine → Arc Reactor |
| **Peace Sign** (Victory) | Toggle Exploded View | Separates / reassembles multi-part assemblies |
| **Swipe Left** | Next Mode | Standby → Active → Combat → Scan → Workshop → Stealth → Party |
| **Swipe Right** | Previous Mode | Cycles reverse through modes |
| **Swipe Down** | Toggle Floating Panels | Opens or closes all holographic telemetry panels |
| **Swipe Up** | HUD Snapshot | Takes and downloads high-res composited PNG screenshot |

---

### 2. Voice Commands

Speak **"Jarvis"** followed by your directive, or say **"Jarvis"** and wait for *"Yes, sir?"*.

| Voice Command | Action |
|---|---|
| *"Jarvis, combat mode"* / *"red alert"* | Activates Combat mode with tactical targeting reticles |
| *"Jarvis, stealth mode"* / *"lights off"* | Attenuates luminescence to 12% for silent observation |
| *"Jarvis, workshop mode"* | Engages engineering workbench |
| *"Jarvis, scan me"* / *"biometrics"* | Deploys laser body-scanner with telemetry readout |
| *"Jarvis, party mode"* / *"house party"* | Enables acoustic spectrum beat visualizer and strobe |
| *"Jarvis, standby"* / *"active"* | Toggles between low-power standby and active HUD |
| *"Jarvis, what time is it?"* / *"clock"* | Spoken time readout & opens Chrono panel |
| *"Jarvis, what's the weather?"* | Spoken temperature & weather telemetry |
| *"Jarvis, set a timer for [X] seconds / minutes"* | Starts countdown timer with voice alarm |
| *"Jarvis, what is that?"* / *"identify target"* | Identifies objects detected by COCO-SSD / face recognizer |
| *"Jarvis, status"* / *"diagnostics"* | Full systems and telemetry readiness report |
| *"Jarvis, tell me a joke"* | Dry British-butler humor from Stark Industries archives |
| *"Jarvis, open notes"* / *"todo"* / *"music"* | Opens respective floating telemetry window |
| *"Jarvis, close panels"* | Closes all floating panels |
| *"Jarvis, explode model"* / *"reassemble"* | Deconstructs or reassembles the active 3D assembly |
| *"Jarvis, show engine / arc reactor / earth"* | Switches active 3D holographic projection |
| *"Jarvis, take a screenshot"* / *"record video"* | Captures high-res PNG snapshot or starts WebM video capture |

---

### 3. Keyboard Shortcuts

| Key | Function |
|---|---|
| `1` – `7` | Direct Mode Switching (`1` Standby, `2` Active, `3` Combat, `4` Scan, `5` Workshop, `6` Stealth, `7` Party) |
| `D` | Toggle Debug Overlay (FPS, inference ms, raw landmarks, confidence) |
| `F` | Toggle Fullscreen mode |
| `M` | Mute / Unmute audio SFX |
| `/` | Open Text Command Bar (type commands when mic is muted or unavailable) |
| `Esc` | Close open dialogs or command bar |

---

## Tuning Tips & Configuration

All operational parameters and physics thresholds are centralized in `src/config.js`:

- **Pinch Sensitivity**: Adjust `CONFIG.pinch.engage` and `CONFIG.pinch.release` to tune pinch responsiveness.
- **Gesture Speeds**: Adjust `CONFIG.gestures.swipeMinSpeed` (default `0.95`) for faster or slower swipe gestures.
- **Hologram Bloom**: Tune `CONFIG.hologram.bloomStrength` (default `0.85`) and `CONFIG.hologram.particleCount` (default `1400`).
- **Weather Location**: Set your exact latitude/longitude in `CONFIG.weather.lat` and `CONFIG.weather.lon`.

---

## Known Limitations

1. **Web Speech API**: Voice recognition relies on the browser's built-in `webkitSpeechRecognition` (best supported in Google Chrome, Chromium, and Microsoft Edge). On unsupported browsers, the `/` command bar provides complete command parity.
2. **Camera Access**: Requires standard HTTPS or `localhost` context to access webcam streams.
3. **Lighting Conditions**: Low ambient lighting may degrade MediaPipe confidence; the HUD automatically displays a `LOW LIGHT · TRACKING DEGRADED` notification and throttles sensitivity gracefully.

---

## Running Locally

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build production bundle
npm run build
```
