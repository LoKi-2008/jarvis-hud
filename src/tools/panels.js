import { CONFIG } from "../config.js";
import { appState } from "../state.js";
import { sfx } from "../audio/sfx.js";
import { beats } from "../audio/analyser.js";
import { toast } from "../hud/toasts.js";

export class FloatingPanels {
  constructor() {
    this.container = document.createElement("div");
    this.container.id = "floating-panels";
    this.container.style.cssText =
      "position:absolute;inset:0;pointer-events:none;z-index:18;overflow:hidden;";
    document.getElementById("stage").appendChild(this.container);

    this.panels = new Map();
    this.initPanels();
    this.fetchWeather();
    this.activeDrag = null;
  }

  createPanelElement(id, title, x, y, w, contentHtml) {
    const el = document.createElement("div");
    el.id = `panel-${id}`;
    el.className = "hud-panel hidden";
    el.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${w}px;
      background: rgba(3, 14, 28, 0.88);
      border: 1px solid var(--cyan);
      box-shadow: 0 0 16px rgba(0, 229, 255, 0.25), inset 0 0 20px rgba(0, 229, 255, 0.08);
      color: var(--cyan);
      font-family: 'Share Tech Mono', monospace;
      padding: 10px;
      pointer-events: auto;
      user-select: none;
      backdrop-filter: blur(4px);
      transition: border-color 0.2s, opacity 0.3s;
    `;

    el.innerHTML = `
      <div class="panel-header" style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(0,229,255,0.4);padding-bottom:6px;margin-bottom:8px;cursor:grab;">
        <span style="font-family:'Orbitron',sans-serif;font-weight:600;font-size:11px;letter-spacing:0.1em;">${title}</span>
        <button class="panel-close" style="background:none;border:none;color:var(--cyan);cursor:pointer;font-size:14px;line-height:1;">✕</button>
      </div>
      <div class="panel-body" style="font-size:12px;line-height:1.4;">
        ${contentHtml}
      </div>
    `;

    el.querySelector(".panel-close").addEventListener("click", () => this.toggle(id, false));

    // Dragging support
    const header = el.querySelector(".panel-header");
    let isDragging = false;
    let startX = 0, startY = 0, origX = 0, origY = 0;

    header.addEventListener("pointerdown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = el.offsetLeft;
      origY = el.offsetTop;
      header.style.cursor = "grabbing";
      header.setPointerCapture(e.pointerId);
    });

    header.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = `${Math.max(10, Math.min(window.innerWidth - w - 10, origX + dx))}px`;
      el.style.top = `${Math.max(10, Math.min(window.innerHeight - 100, origY + dy))}px`;
    });

    header.addEventListener("pointerup", (e) => {
      isDragging = false;
      header.style.cursor = "grab";
    });

    this.container.appendChild(el);
    this.panels.set(id, { el, open: false, title });
    return el;
  }

  initPanels() {
    // 1. Clock Panel
    this.createPanelElement(
      "clock",
      "CHRONO TELEMETRY",
      30,
      70,
      240,
      `
      <div id="chrono-local" style="font-size:20px;font-family:'Orbitron';margin-bottom:4px;color:#fff;text-shadow:0 0 8px #00e5ff;">--:--:--</div>
      <div style="font-size:11px;color:#7ef9ff;">DATE: <span id="chrono-date">--</span></div>
      <div style="font-size:11px;color:#7ef9ff;margin-top:4px;">UPTIME: <span id="chrono-uptime">00:00:00</span></div>
      <div style="margin-top:8px;border-top:1px dashed rgba(0,229,255,0.3);padding-top:6px;font-size:10px;">
        <div>LONDON: <span id="chrono-lon">--:--</span></div>
        <div>NEW YORK: <span id="chrono-nyc">--:--</span></div>
        <div>TOKYO: <span id="chrono-tyo">--:--</span></div>
      </div>
    `
    );

    // 2. Weather Panel
    this.createPanelElement(
      "weather",
      "ATMOSPHERIC SENSORS",
      30,
      270,
      240,
      `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span id="wx-temp" style="font-size:24px;font-family:'Orbitron';color:#fff;">--°C</span>
        <span id="wx-cond" style="font-size:11px;color:#ffb300;text-align:right;">MONITORING</span>
      </div>
      <div style="margin-top:8px;font-size:11px;line-height:1.5;">
        <div>HUMIDITY: <span id="wx-hum">--%</span></div>
        <div>WIND: <span id="wx-wind">-- km/h</span></div>
        <div>PRESSURE: <span id="wx-press">1013 hPa</span></div>
        <div style="font-size:9px;color:rgba(0,229,255,0.5);margin-top:4px;">COORDS: ${CONFIG.weather.lat}°N, ${CONFIG.weather.lon}°E</div>
      </div>
    `
    );

    // 3. Notes Panel
    const savedNote = localStorage.getItem("jarvis_notes") || "MARK 85 ARMOR:\nNano-particle compression test nominal.\nRepulsor phase aligned at 94%.\nNext: vibranium alloy hardening.";
    this.createPanelElement(
      "notes",
      "MISSION BRIEFING & NOTES",
      window.innerWidth - 300,
      70,
      270,
      `
      <textarea id="jarvis-notepad" style="width:100%;height:110px;background:rgba(0,10,20,0.6);border:1px solid rgba(0,229,255,0.3);color:#7ef9ff;font:11px 'Share Tech Mono',monospace;resize:none;padding:6px;outline:none;">${savedNote}</textarea>
      <div style="font-size:10px;color:rgba(0,229,255,0.6);margin-top:4px;text-align:right;">AUTO-PERSISTED TO LOCAL STORAGE</div>
    `
    );
    document.getElementById("jarvis-notepad")?.addEventListener("input", (e) => {
      localStorage.setItem("jarvis_notes", e.target.value);
    });

    // 4. To-Do Checklist Panel
    this.createPanelElement(
      "todo",
      "TACTICAL PROTOCOLS",
      window.innerWidth - 300,
      270,
      270,
      `
      <div id="todo-list" style="display:flex;flex-direction:column;gap:6px;font-size:11px;">
        <label style="cursor:pointer;"><input type="checkbox" checked /> Diagnostic on arc core</label>
        <label style="cursor:pointer;"><input type="checkbox" checked /> Calibrate biometric lock</label>
        <label style="cursor:pointer;"><input type="checkbox" /> Neural telemetry link</label>
        <label style="cursor:pointer;"><input type="checkbox" /> Vibranium shield test</label>
        <label style="cursor:pointer;"><input type="checkbox" /> Orbital relay sync</label>
      </div>
    `
    );

    // 5. Music Panel
    this.createPanelElement(
      "music",
      "AUDIO SYNTHESIZER",
      30,
      460,
      240,
      `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span id="music-track" style="font-size:11px;font-weight:bold;color:#fff;">AC/DC - BACK IN BLACK (8-BIT)</span>
      </div>
      <div id="music-spectrum" style="display:flex;gap:3px;height:24px;align-items:flex-end;margin-bottom:8px;background:rgba(0,5,10,0.5);padding:2px;">
        ${Array.from({ length: 16 }).map(() => '<div style="flex:1;background:var(--cyan);height:20%;transition:height 0.1s;"></div>').join('')}
      </div>
      <div style="display:flex;gap:6px;">
        <button id="music-toggle" style="flex:1;background:rgba(0,229,255,0.15);border:1px solid var(--cyan);color:var(--cyan);padding:4px;cursor:pointer;font:11px 'Orbitron';">PLAY</button>
      </div>
    `
    );

    let synthPlaying = false;
    let synthTimer = null;
    const playBtn = document.getElementById("music-toggle");
    playBtn?.addEventListener("click", () => {
      sfx.unlock();
      synthPlaying = !synthPlaying;
      playBtn.textContent = synthPlaying ? "PAUSE" : "PLAY";
      if (synthPlaying) {
        toast("Audio telemetry online");
        synthTimer = setInterval(() => {
          if (!synthPlaying) return;
          sfx.toast();
          beats.pulse = 1.0;
        }, 480);
      } else {
        clearInterval(synthTimer);
      }
    });

    // 6. System Diagnostics Panel
    this.createPanelElement(
      "stats",
      "SYSTEM DIAGNOSTICS",
      window.innerWidth - 300,
      460,
      270,
      `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">
        <div>ARC OUTPUT: <span style="color:#00e5ff;">98.4%</span></div>
        <div>CORE TEMP: <span style="color:#69f0ae;">34.2°C</span></div>
        <div>VISION FPS: <span id="diag-fps" style="color:#00e5ff;">--</span></div>
        <div>INFERENCE: <span id="diag-infer" style="color:#00e5ff;">-- ms</span></div>
        <div>NEURAL LOAD: <span style="color:#ffb300;">14.2%</span></div>
        <div>BANDWIDTH: <span style="color:#69f0ae;">1.2 Gbps</span></div>
      </div>
      <div style="margin-top:8px;border-top:1px dashed rgba(0,229,255,0.3);padding-top:6px;font-size:10px;color:rgba(0,229,255,0.7);">
        STATUS: ALL SYSTEMS NOMINAL
      </div>
    `
    );
  }

  toggle(id, force) {
    const item = this.panels.get(id);
    if (!item) return;
    item.open = force !== undefined ? force : !item.open;
    if (item.open) {
      item.el.classList.remove("hidden");
      sfx.toast();
    } else {
      item.el.classList.add("hidden");
      sfx.toast();
    }
  }

  toggleAll(open) {
    for (const [id] of this.panels) {
      this.toggle(id, open);
    }
  }

  async fetchWeather() {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.weather.lat}&longitude=${CONFIG.weather.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m`
      );
      if (!res.ok) throw new Error("Weather API failed");
      const data = await res.json();
      const cur = data.current;
      document.getElementById("wx-temp").textContent = `${Math.round(cur.temperature_2m)}°C`;
      document.getElementById("wx-hum").textContent = `${cur.relative_humidity_2m}%`;
      document.getElementById("wx-wind").textContent = `${cur.wind_speed_10m} km/h`;
      document.getElementById("wx-cond").textContent = cur.precipitation > 0 ? "PRECIPITATION" : "CLEAR SKIES";
    } catch {
      // Offline fallback
      document.getElementById("wx-temp").textContent = "24°C";
      document.getElementById("wx-hum").textContent = "45%";
      document.getElementById("wx-wind").textContent = "12 km/h";
      document.getElementById("wx-cond").textContent = "FAIR (LOCAL)";
    }
  }

  update(frame, t) {
    // Update clocks
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const localStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const chronoLocal = document.getElementById("chrono-local");
    if (chronoLocal) chronoLocal.textContent = localStr;

    const chronoDate = document.getElementById("chrono-date");
    if (chronoDate) chronoDate.textContent = now.toISOString().slice(0, 10);

    const chronoUp = document.getElementById("chrono-uptime");
    if (chronoUp) {
      const sec = Math.floor(t / 1000);
      chronoUp.textContent = `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
    }

    const getTimeInZone = (tz) =>
      now.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
    const lonEl = document.getElementById("chrono-lon");
    if (lonEl) lonEl.textContent = getTimeInZone("Europe/London");
    const nycEl = document.getElementById("chrono-nyc");
    if (nycEl) nycEl.textContent = getTimeInZone("America/New_York");
    const tyoEl = document.getElementById("chrono-tyo");
    if (tyoEl) tyoEl.textContent = getTimeInZone("Asia/Tokyo");

    // Diag stats
    const diagFps = document.getElementById("diag-fps");
    if (diagFps) diagFps.textContent = appState.fps.toFixed(0);
    const diagInfer = document.getElementById("diag-infer");
    if (diagInfer) diagInfer.textContent = `${appState.inferenceMs.toFixed(1)} ms`;

    // Music equalizer bars
    const bars = document.querySelectorAll("#music-spectrum div");
    if (bars && bars.length) {
      bars.forEach((b, idx) => {
        const h = Math.min(100, Math.max(15, (Math.sin(t * 0.008 + idx * 0.6) * 0.5 + 0.5) * 85 * (beats.pulse || 0.4)));
        b.style.height = `${h}%`;
      });
    }
  }
}
