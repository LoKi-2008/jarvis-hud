import { spawn } from "node:child_process";
import fs from "node:fs";

async function run() {
  const chrome = spawn("/usr/bin/chromium", [
    "--headless=new",
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--window-size=1280,720",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--remote-debugging-port=9222",
    "--autoplay-policy=no-user-gesture-required",
    "about:blank",
  ]);

  let closed = false;
  chrome.on("exit", () => { closed = true; });

  let targets = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const res = await fetch("http://127.0.0.1:9222/json");
      targets = await res.json();
      if (targets && targets.length) break;
    } catch {}
  }

  if (!targets || !targets.length) {
    console.error("Failed to connect to chromium CDP");
    chrome.kill();
    process.exit(1);
  }

  const pageTarget = targets.find((t) => t.type === "page") || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let id = 1;
  const callbacks = new Map();

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await new Promise((resolve) => { ws.onopen = resolve; });

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      callbacks.get(data.id)(data.result);
      callbacks.delete(data.id);
    }
    if (data.method === "Runtime.consoleAPICalled") {
      const text = data.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
      console.log(`[BROWSER ${data.params.type}] ${text}`);
    }
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: "http://localhost:5173/" });

  console.log("Waiting 3 seconds for instant boot...");
  await new Promise((r) => setTimeout(r, 3000));

  const res = await send("Runtime.evaluate", {
    expression: `({
      title: document.title,
      bootHidden: document.getElementById('boot').classList.contains('hidden'),
      panelsCount: document.querySelectorAll('.hud-panel').length,
      clockText: document.getElementById('chrono-local')?.innerText
    })`,
    returnByValue: true
  });
  console.log("App Status:", res?.result?.value);

  const shot = await send("Page.captureScreenshot", { format: "png" });
  if (shot?.data) {
    fs.writeFileSync("test-screenshot-fast.png", Buffer.from(shot.data, "base64"));
    console.log("Screenshot written to test-screenshot-fast.png, size:", fs.statSync("test-screenshot-fast.png").size);
  }

  ws.close();
  chrome.kill();
}

run().catch(console.error);
