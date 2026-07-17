#!/usr/bin/env node
// Headless-browser driver for cairn — dependency-free (Node >= 22).
// Launches the system Edge/Chrome headless and speaks raw Chrome DevTools
// Protocol over Node's built-in WebSocket. Commands come from stdin, one
// per line, so it can be piped:
//
//   printf 'goto /\ntext h1\nss home.png\nquit\n' | node .claude/skills/run-cairn/driver.mjs
//
// Commands:
//   goto <url|path>        navigate (paths resolve against $CAIRN_URL, default http://localhost:3000)
//   ss [file.png]          screenshot viewport -> file (default screenshot.png, relative to cwd)
//   eval <js>              evaluate in page, print JSON result (promises awaited)
//   text <selector>        print innerText of first match (null if none)
//   click <selector>       click first match
//   type <selector> | <t>  set input/textarea value (React-safe) and fire input event
//   wait <selector>        poll up to 15s for selector to exist
//   wheel <dy> [x y]       dispatch a real mouse-wheel event (positive dy = scroll down)
//   viewport <w> <h>       resize viewport (e.g. `viewport 390 844` for phone)
//   media <feature> <val>  emulate a media feature (e.g. `media prefers-reduced-motion reduce`)
//   logs                   dump console messages + uncaught exceptions seen so far, then clear
//   sleep <ms>             pause
//   quit                   close browser and exit
//
// Env: CAIRN_URL (base url), DRIVER_BROWSER (explicit browser exe path).

import { spawn } from "node:child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import readline from "node:readline";

const BASE = process.env.CAIRN_URL || "http://localhost:3000";

const browserPath = [
  process.env.DRIVER_BROWSER,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean).find((p) => existsSync(p));

if (!browserPath) {
  console.error("ERR no Edge/Chrome found; set DRIVER_BROWSER=<path to exe>");
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), "cairn-cdp-"));
const child = spawn(
  browserPath,
  [
    "--headless=new",
    "--disable-gpu",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--hide-scrollbars",
    "--window-size=1280,800",
    "about:blank",
  ],
  { stdio: "ignore" },
);

// Port 0 = browser picks a free port and writes it to DevToolsActivePort.
const portFile = join(profile, "DevToolsActivePort");
let port = 0;
for (let i = 0; i < 150 && !port; i++) {
  if (existsSync(portFile)) {
    port = Number(readFileSync(portFile, "utf8").split(/\r?\n/)[0].trim()) || 0;
  }
  if (!port) await new Promise((r) => setTimeout(r, 100));
}
if (!port) {
  console.error("ERR browser never wrote DevToolsActivePort");
  child.kill();
  process.exit(1);
}

const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = () => rej(new Error("websocket connect failed"));
});

let nextId = 1;
const pending = new Map();
const eventWaiters = [];
const consoleBuf = [];

function remoteValue(arg) {
  if (arg.value !== undefined) return String(arg.value);
  return arg.description ?? arg.type;
}

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  } else if (msg.method) {
    if (msg.method === "Runtime.consoleAPICalled") {
      const { type, args } = msg.params;
      consoleBuf.push(`console.${type}: ${args.map(remoteValue).join(" ").slice(0, 500)}`);
    } else if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      consoleBuf.push(
        `exception: ${(d.exception?.description ?? d.text ?? "").slice(0, 500)}`,
      );
    }
    for (let i = eventWaiters.length - 1; i >= 0; i--) {
      const w = eventWaiters[i];
      if (w.method === msg.method) {
        eventWaiters.splice(i, 1);
        w.resolve(msg.params);
      }
    }
  }
};

function send(method, params = {}, sessionId) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
  });
}

function waitEvent(method, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const w = { method, resolve };
    eventWaiters.push(w);
    setTimeout(() => {
      const i = eventWaiters.indexOf(w);
      if (i >= 0) {
        eventWaiters.splice(i, 1);
        reject(new Error(`timeout waiting for ${method}`));
      }
    }, timeoutMs);
  });
}

const { targetInfos } = await send("Target.getTargets");
let pageTarget = targetInfos.find((t) => t.type === "page");
if (!pageTarget) {
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  pageTarget = { targetId };
}
const { sessionId } = await send("Target.attachToTarget", {
  targetId: pageTarget.targetId,
  flatten: true,
});
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);

async function evalJs(expression) {
  const { result, exceptionDetails } = await send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    sessionId,
  );
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  }
  return result.value;
}

async function shutdown(code) {
  try {
    await Promise.race([send("Browser.close"), new Promise((r) => setTimeout(r, 1500))]);
  } catch {}
  try {
    child.kill();
  } catch {}
  setTimeout(() => {
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {}
    process.exit(code);
  }, 300);
}

async function run(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const cmd = trimmed.split(/\s+/)[0];
  const rest = trimmed.slice(cmd.length).trim();

  switch (cmd) {
    case "goto": {
      const url = /^https?:/.test(rest) ? rest : BASE + (rest || "/");
      const loaded = waitEvent("Page.loadEventFired");
      await send("Page.navigate", { url }, sessionId);
      await loaded;
      console.log("OK goto", url);
      break;
    }
    case "ss": {
      const file = rest || "screenshot.png";
      const { data } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
      writeFileSync(file, Buffer.from(data, "base64"));
      console.log("OK ss", file);
      break;
    }
    case "eval":
      console.log(JSON.stringify(await evalJs(rest)));
      break;
    case "text":
      console.log(
        JSON.stringify(
          await evalJs(`document.querySelector(${JSON.stringify(rest)})?.innerText ?? null`),
        ),
      );
      break;
    case "click": {
      const hit = await evalJs(
        `(() => { const el = document.querySelector(${JSON.stringify(rest)}); if (!el) return false; el.click(); return true; })()`,
      );
      console.log(hit ? `OK click ${rest}` : `ERR no match: ${rest}`);
      break;
    }
    case "type": {
      const sep = rest.indexOf("|");
      if (sep < 0) {
        console.log("ERR usage: type <selector> | <text>");
        break;
      }
      const sel = rest.slice(0, sep).trim();
      const text = rest.slice(sep + 1).trim();
      const hit = await evalJs(`(() => {
        const el = document.querySelector(${JSON.stringify(sel)});
        if (!el) return false;
        const proto = el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(text)});
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      console.log(hit ? `OK type ${sel}` : `ERR no match: ${sel}`);
      break;
    }
    case "wait": {
      const deadline = Date.now() + 15000;
      let found = false;
      while (Date.now() < deadline && !found) {
        found = await evalJs(`!!document.querySelector(${JSON.stringify(rest)})`);
        if (!found) await new Promise((r) => setTimeout(r, 200));
      }
      console.log(found ? `OK wait ${rest}` : `ERR timeout waiting for: ${rest}`);
      break;
    }
    case "wheel": {
      const [dy = "500", x = "640", y = "400"] = rest.split(/\s+/);
      await send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseWheel",
          x: Number(x),
          y: Number(y),
          deltaX: 0,
          deltaY: Number(dy),
        },
        sessionId,
      );
      console.log("OK wheel", dy);
      break;
    }
    case "viewport": {
      const [w, h] = rest.split(/\s+/).map(Number);
      if (!w || !h) {
        console.log("ERR usage: viewport <width> <height>");
        break;
      }
      await send(
        "Emulation.setDeviceMetricsOverride",
        { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 },
        sessionId,
      );
      console.log("OK viewport", w, h);
      break;
    }
    case "media": {
      const [name, value = ""] = rest.split(/\s+/);
      if (!name) {
        console.log("ERR usage: media <feature> <value>");
        break;
      }
      await send(
        "Emulation.setEmulatedMedia",
        { features: [{ name, value }] },
        sessionId,
      );
      console.log("OK media", name, value);
      break;
    }
    case "logs": {
      if (consoleBuf.length === 0) console.log("(no console output captured)");
      for (const line of consoleBuf) console.log(line);
      consoleBuf.length = 0;
      break;
    }
    case "sleep":
      await new Promise((r) => setTimeout(r, Number(rest) || 500));
      console.log("OK sleep", rest || 500);
      break;
    case "quit":
      await shutdown(0);
      break;
    default:
      console.log("ERR unknown command:", cmd);
  }
}

console.log("READY base=" + BASE);
const rl = readline.createInterface({ input: process.stdin });
for await (const line of rl) {
  try {
    await run(line);
  } catch (err) {
    console.log("ERR", err.message);
  }
}
await shutdown(0);
