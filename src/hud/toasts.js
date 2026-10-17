import { sfx } from "../audio/sfx.js";

const root = () => document.getElementById("toasts");

export function toast(msg, kind = "info") {
  const n = document.createElement("div");
  n.className = `toast ${kind === "alert" ? "alert" : kind === "warn" ? "warn" : ""}`;
  n.textContent = msg;
  root().appendChild(n);
  if (kind === "alert") sfx.alert();
  else sfx.toast();
  setTimeout(() => n.remove(), 3200);
}
