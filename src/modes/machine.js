import { MODES, MODE_META } from "../config.js";
import { appState, setMode } from "../state.js";
import { bus } from "../utils/bus.js";
import { sfx } from "../audio/sfx.js";
import { toast } from "../hud/toasts.js";

const ORDER = [
  MODES.STANDBY,
  MODES.ACTIVE,
  MODES.COMBAT,
  MODES.SCAN,
  MODES.WORKSHOP,
  MODES.STEALTH,
  MODES.PARTY,
];

export function goMode(name) {
  if (!MODES[name]) return;
  if (!setMode(name)) return;
  sfx.modeChange();
  bus.emit("mode", name);
  toast(`${MODE_META[name].label} MODE`);
}

export function modeFromKey(key) {
  const n = Number(key);
  if (n >= 1 && n <= 7) goMode(ORDER[n - 1]);
}

export { ORDER, MODES };
