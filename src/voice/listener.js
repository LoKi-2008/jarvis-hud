import { appState } from "../state.js";
import { CONFIG } from "../config.js";
import { sfx } from "../audio/sfx.js";
import { toast } from "../hud/toasts.js";
import { speak } from "./speak.js";
import { getButlerReply } from "./responses.js";
import { executeCommand } from "./commands.js";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export class VoiceListener {
  constructor(tools) {
    this.tools = tools;
    this.recognition = null;
    this.supported = Boolean(SpeechRecognition);
    this.wakeTimeout = null;
    this.active = false;

    this.initRecognition();
    this.initCommandBar();
  }

  initRecognition() {
    if (!this.supported) {
      console.warn("Web Speech API not supported in this browser. Use text command bar ('/').");
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        this.active = true;
      };

      this.recognition.onresult = (event) => {
        const last = event.results[event.results.length - 1];
        if (!last || !last[0]) return;
        const transcript = last[0].transcript.trim();
        const conf = last[0].confidence;
        console.log(`[SPEECH] "${transcript}" (confidence: ${(conf * 100).toFixed(0)}%)`);
        this.handleTranscript(transcript);
      };

      this.recognition.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          toast("Microphone denied. Voice fallen back to text bar ('/')", "warn");
        } else if (e.error !== "no-speech") {
          console.warn("Speech error:", e.error);
        }
      };

      this.recognition.onend = () => {
        // Continuous listening auto-restart
        if (this.active) {
          try {
            this.recognition.start();
          } catch {}
        }
      };

      // Start listening
      this.recognition.start();
    } catch (err) {
      console.warn("Speech recognition initialization deferred:", err);
    }
  }

  handleTranscript(text) {
    const lower = text.toLowerCase();
    const wake = CONFIG.voice.wake; // "jarvis"

    if (lower.includes(wake)) {
      sfx.systemOnline();
      appState.listening = true;

      // Extract command after wake word
      const wakeIdx = lower.indexOf(wake);
      const afterWake = text.slice(wakeIdx + wake.length).trim();

      if (afterWake.length > 2) {
        // Direct command in same sentence: "Jarvis, combat mode"
        toast(`CMD: ${afterWake}`);
        executeCommand(afterWake, this.tools);
        this.resetListeningTimeout(2000);
      } else {
        // Standalone wake word: "Jarvis" -> reply "Yes, sir?"
        toast("JARVIS ONLINE");
        speak(getButlerReply("wake"));
        this.resetListeningTimeout(CONFIG.voice.listenTimeoutMs);
      }
    } else if (appState.listening) {
      // We are in listening mode awaiting follow-up command
      toast(`CMD: ${text}`);
      executeCommand(text, this.tools);
      this.resetListeningTimeout(2000);
    }
  }

  resetListeningTimeout(ms) {
    if (this.wakeTimeout) clearTimeout(this.wakeTimeout);
    this.wakeTimeout = setTimeout(() => {
      appState.listening = false;
      this.wakeTimeout = null;
    }, ms);
  }

  initCommandBar() {
    const form = document.getElementById("cmd-form");
    const input = document.getElementById("cmd-input");

    // Toggle on '/' key
    window.addEventListener("keydown", (e) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        form.classList.toggle("hidden");
        if (!form.classList.contains("hidden")) {
          input.focus();
          sfx.toast();
        }
      }
      if (e.key === "Escape" && !form.classList.contains("hidden")) {
        form.classList.add("hidden");
        input.blur();
      }
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      sfx.toast();
      toast(`CMD: ${val}`);

      // Strip optional "jarvis" prefix if typed
      const clean = val.replace(/^jarvis[, ]*/i, "");
      executeCommand(clean, this.tools);

      input.value = "";
      form.classList.add("hidden");
      input.blur();
    });
  }
}
