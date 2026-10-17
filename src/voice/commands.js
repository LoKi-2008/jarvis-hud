import { MODES } from "../config.js";
import { goMode } from "../modes/machine.js";
import { speak } from "./speak.js";
import { getButlerReply } from "./responses.js";
import { toast } from "../hud/toasts.js";
import { sfx } from "../audio/sfx.js";
import { bus } from "../utils/bus.js";

let activeTimer = null;

export function executeCommand(rawText, toolsRef) {
  if (!rawText) return false;
  const text = rawText.toLowerCase().trim();

  // 1. MODES
  if (text.includes("combat") || text.includes("red alert") || text.includes("shields up")) {
    goMode(MODES.COMBAT);
    speak(getButlerReply("modes", "COMBAT"));
    return true;
  }
  if (text.includes("stealth") || text.includes("lights off") || text.includes("go dark")) {
    goMode(MODES.STEALTH);
    speak(getButlerReply("modes", "STEALTH"));
    return true;
  }
  if (text.includes("workshop") || text.includes("cad") || text.includes("workbench")) {
    goMode(MODES.WORKSHOP);
    speak(getButlerReply("modes", "WORKSHOP"));
    return true;
  }
  if (text.includes("scan me") || text.includes("scan mode") || text.includes("biometric scan")) {
    goMode(MODES.SCAN);
    speak(getButlerReply("modes", "SCAN"));
    return true;
  }
  if (text.includes("party mode") || text.includes("house party") || text.includes("disco")) {
    goMode(MODES.PARTY);
    speak(getButlerReply("modes", "PARTY"));
    return true;
  }
  if (text.includes("standby") || text.includes("sleep")) {
    goMode(MODES.STANDBY);
    speak(getButlerReply("modes", "STANDBY"));
    return true;
  }
  if (text.includes("active") || text.includes("online") || text.includes("systems on")) {
    goMode(MODES.ACTIVE);
    speak(getButlerReply("modes", "ACTIVE"));
    return true;
  }

  // 2. TIME & CLOCK
  if (text.includes("time") || text.includes("clock")) {
    toolsRef?.panels?.toggle("clock", true);
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const part = h < 12 ? "AM" : "PM";
    const hour12 = h % 12 || 12;
    speak(`The current time is ${hour12}:${String(m).padStart(2, "0")} ${part}, sir.`);
    return true;
  }

  // 3. WEATHER
  if (text.includes("weather") || text.includes("temperature") || text.includes("climate")) {
    toolsRef?.panels?.toggle("weather", true);
    const temp = document.getElementById("wx-temp")?.textContent || "24°C";
    const cond = document.getElementById("wx-cond")?.textContent || "clear";
    speak(`Atmospheric telemetry reports ${temp} with ${cond.toLowerCase()}, sir.`);
    return true;
  }

  // 4. PANELS
  if (text.includes("notes") || text.includes("notepad")) {
    toolsRef?.panels?.toggle("notes", true);
    speak(getButlerReply("acknowledge"));
    return true;
  }
  if (text.includes("todo") || text.includes("checklist") || text.includes("protocols")) {
    toolsRef?.panels?.toggle("todo", true);
    speak(getButlerReply("acknowledge"));
    return true;
  }
  if (text.includes("music") || text.includes("play song")) {
    toolsRef?.panels?.toggle("music", true);
    document.getElementById("music-toggle")?.click();
    speak(getButlerReply("acknowledge"));
    return true;
  }
  if (text.includes("status") || text.includes("diagnostics") || text.includes("systems check")) {
    toolsRef?.panels?.toggle("stats", true);
    speak(getButlerReply("status"));
    return true;
  }
  if (text.includes("close panels") || text.includes("clear panels") || text.includes("hide panels")) {
    toolsRef?.panels?.toggleAll(false);
    speak(getButlerReply("acknowledge"));
    return true;
  }

  // 5. TIMER
  const timerMatch = text.match(/timer (?:for )?(\d+)\s*(second|sec|minute|min)?/i);
  if (timerMatch) {
    const val = parseInt(timerMatch[1], 10);
    const unit = timerMatch[2]?.toLowerCase() || "second";
    const isMin = unit.startsWith("min");
    const ms = val * (isMin ? 60000 : 1000);

    if (activeTimer) clearTimeout(activeTimer);
    toast(`Timer set: ${val} ${unit}s`, "info");
    speak(`Timer set for ${val} ${unit}s, sir.`);

    activeTimer = setTimeout(() => {
      sfx.alert();
      toast("TIMER COMPLETE, SIR", "alert");
      speak(`Sir, your ${val} ${unit} timer has elapsed.`);
      activeTimer = null;
    }, ms);
    return true;
  }

  // 6. SCREENSHOT & RECORDING
  if (text.includes("screenshot") || text.includes("capture screen") || text.includes("take a picture")) {
    toolsRef?.recorder?.takeScreenshot();
    speak(getButlerReply("screenshot"));
    return true;
  }
  if (text.includes("start recording") || text.includes("record video")) {
    toolsRef?.recorder?.startRecording();
    speak("Recording visual telemetry.");
    return true;
  }
  if (text.includes("stop recording")) {
    toolsRef?.recorder?.stopRecording();
    speak("Recording terminated and archived, sir.");
    return true;
  }

  // 7. WHAT IS THAT / OBJECT RECOGNITION
  if (text.includes("what is that") || text.includes("identify object") || text.includes("scan target")) {
    const frame = window.__latestFrame;
    if (frame?.objects && frame.objects.length > 0) {
      const top = frame.objects[0];
      const conf = Math.round(top.score * 100);
      speak(`Optical scan identifies a ${top.label} with ${conf} percent certainty, sir.`);
      toast(`IDENTIFIED: ${top.label.toUpperCase()} (${conf}%)`);
    } else if (frame?.primaryFace) {
      const name = frame.primaryFace.enrolledName || "human subject";
      speak(`Visual sensors are tracking a ${name}, sir.`);
    } else {
      speak("Optical sensors detect no anomalous targets at this moment, sir.");
    }
    return true;
  }

  // 8. JOKES
  if (text.includes("joke") || text.includes("humor") || text.includes("make me laugh")) {
    speak(getButlerReply("jokes"));
    return true;
  }

  // 9. 3D OBJECTS & CAD
  if (text.includes("explode") || text.includes("exploded view")) {
    toolsRef?.objects?.toggleExplode();
    speak("Deconstructing component assembly.");
    return true;
  }
  if (text.includes("reassemble") || text.includes("assemble")) {
    if (toolsRef?.objects?.exploded) toolsRef.objects.toggleExplode();
    speak("Assembly restored, sir.");
    return true;
  }
  if (text.includes("arc reactor")) {
    toolsRef?.objects?.select("arc_reactor");
    speak("Arc reactor schematic loaded.");
    return true;
  }
  if (text.includes("engine") || text.includes("turbine")) {
    toolsRef?.objects?.select("engine");
    speak("Turbofan engine schematic projected.");
    return true;
  }
  if (text.includes("earth") || text.includes("globe")) {
    toolsRef?.objects?.select("earth");
    speak("Planetary telemetry online.");
    return true;
  }
  if (text.includes("cube") || text.includes("tesseract")) {
    toolsRef?.objects?.select("cube");
    speak("Tesseract geometry loaded.");
    return true;
  }
  if (text.includes("draw") || text.includes("sketch")) {
    toolsRef?.handleToolSelect("draw");
    speak("3D spatial sketchpad active.");
    return true;
  }
  if (text.includes("measure") || text.includes("caliper")) {
    toolsRef?.handleToolSelect("measure");
    speak("Holographic calipers engaged.");
    return true;
  }

  // Unknown fallback
  speak(getButlerReply("unknown"));
  return false;
}
