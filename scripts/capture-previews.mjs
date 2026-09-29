/**
 * Renders the README preview GIF from the real Storybook build.
 *
 * The scene is WebGL driven by requestAnimationFrame, so it cannot be pinned to
 * an instant the way a CSS animation can. Instead the page's clock is replaced
 * before anything loads: `performance.now` and `requestAnimationFrame` answer
 * to a virtual time that only moves when this script says so. Each frame is
 * stepped forward exactly one frame's worth, rendered, and screenshotted — so
 * a slow software renderer changes how long the capture takes, never what it
 * shows.
 *
 * The loop is a whole number of grid cells at the configured speed, read from
 * the config, so the track wraps seamlessly. The mountains are not periodic and
 * shift back a few rows at the wrap.
 *
 * Usage: `pnpm previews` (builds Storybook first). Needs Chrome; set
 * `CHROME_PATH` if it is not in the default macOS location.
 */
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// gifenc is CJS, so the named exports come off the default import.
import gifenc from "gifenc";
import { PNG } from "pngjs";

import { DEFAULT_CONFIG } from "../src/utils/config.ts";

const { GIFEncoder, applyPalette, quantize } = gifenc;

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const ROOT = new URL("..", import.meta.url).pathname;
const STATIC = join(ROOT, "storybook-static");
const OUT = join(ROOT, "previews");

const PREVIEWS = [
  { name: "composed", story: "scenes-linearvaporwave--composed" },
];

const WIDTH = 640;
const HEIGHT = 360;
const FPS = 20;
/** Roughly how long the loop should be; rounded to whole grid cells. */
const TARGET_SECONDS = 4;
/** Frames rendered before capture starts, so shaders are compiled and warm. */
const WARMUP_FRAMES = 20;

/** Seconds for the grid to scroll exactly one cell. */
const { cell, speed } = DEFAULT_CONFIG.scene.track;
const CELL_SECONDS = cell / Math.abs(speed);
const LOOP_SECONDS =
  Math.max(1, Math.round(TARGET_SECONDS / CELL_SECONDS)) * CELL_SECONDS;
const FRAME_COUNT = Math.round(LOOP_SECONDS * FPS);
const FRAME_MS = (LOOP_SECONDS * 1000) / FRAME_COUNT;

/**
 * Injected before any page script runs. Real timers are left alone so loading
 * still works; only the clock the scene animates by is virtual.
 */
const VIRTUAL_CLOCK = `(() => {
  let now = 0;
  let nextId = 1;
  const queue = new Map();

  performance.now = () => now;
  window.requestAnimationFrame = (callback) => {
    const id = nextId++;
    queue.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = (id) => queue.delete(id);

  /** Moves time forward and runs everything waiting on a frame. */
  window.__advance = (ms) => {
    now += ms;
    const callbacks = [...queue.values()];
    queue.clear();
    for (const callback of callbacks) callback(now);
    return callbacks.length;
  };
  window.__pendingFrames = () => queue.size;

  // The leva panel is a dev tool, not part of the scene.
  addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = "#leva__root { display: none !important; }";
    document.head.append(style);
  });
})();`;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

/** Serves the Storybook build; file:// would block its module scripts. */
function serve(dir) {
  const server = createServer((req, res) => {
    const path = normalize(
      decodeURIComponent(new URL(req.url, "http://x").pathname),
    );
    const file = join(dir, path.endsWith("/") ? `${path}index.html` : path);
    if (!file.startsWith(dir) || !existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
    });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server)),
  );
}

/** Starts headless Chrome and resolves with its DevTools port. */
async function launchChrome(profile) {
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      // Software WebGL, so the capture needs no GPU and matches across machines.
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--hide-scrollbars",
      "--mute-audio",
      `--window-size=${WIDTH},${HEIGHT}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  const portFile = join(profile, "DevToolsActivePort");
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  if (!existsSync(portFile)) throw new Error("Chrome did not start");

  const port = readFileSync(portFile, "utf8").split("\n")[0];
  return { chrome, port };
}

/** Minimal Chrome DevTools Protocol client over the built-in WebSocket. */
async function connect(port) {
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json();
  const page = targets.find((target) => target.type === "page");
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  let lastId = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++lastId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.text);
    return result.value;
  };

  return { send, evaluate, close: () => socket.close() };
}

async function capture(page, url) {
  await page.send("Page.enable");
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.send("Page.addScriptToEvaluateOnNewDocument", {
    source: VIRTUAL_CLOCK,
  });
  await page.send("Page.navigate", { url });

  // Ready once the canvas exists and R3F's loop is waiting on a frame.
  for (let i = 0; ; i++) {
    const ready = await page
      .evaluate(
        "!!document.querySelector('canvas') && window.__pendingFrames?.() > 0",
      )
      .catch(() => false);
    if (ready) break;
    if (i > 300) throw new Error(`Story never started rendering: ${url}`);
    await sleep(100);
  }

  for (let i = 0; i < WARMUP_FRAMES; i++) {
    await page.evaluate(`window.__advance(${FRAME_MS})`);
    await sleep(20);
  }

  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    await page.evaluate(`window.__advance(${FRAME_MS})`);
    const { data } = await page.send("Page.captureScreenshot", {
      format: "png",
    });
    frames.push(PNG.sync.read(Buffer.from(data, "base64")));
  }
  return frames;
}

/**
 * One palette for the whole loop, built from a sample of frames, so colours
 * don't flicker between frames and the file carries a single colour table.
 */
function encode(frames, outPath) {
  const step = Math.max(1, Math.floor(frames.length / 8));
  const sample = Buffer.concat(
    frames.filter((_, i) => i % step === 0).map((frame) => frame.data),
  );
  const palette = quantize(sample, 256);

  const gif = GIFEncoder();
  let written = 0;

  for (const [i, { data, width, height }] of frames.entries()) {
    // GIF delays are centiseconds, so each frame is rounded against the
    // elapsed total and the error never accumulates across the loop.
    const target = Math.round(((i + 1) * FRAME_MS) / 10) * 10;
    const delay = target - written;
    written += delay;

    gif.writeFrame(applyPalette(data, palette), width, height, {
      palette: i === 0 ? palette : undefined,
      delay,
      repeat: 0,
    });
  }

  gif.finish();
  writeFileSync(outPath, Buffer.from(gif.bytes()));
}

if (!existsSync(join(STATIC, "iframe.html"))) {
  throw new Error(
    "No Storybook build found — run `pnpm build-storybook` first",
  );
}

console.log(
  `Loop: ${LOOP_SECONDS.toFixed(2)}s (${Math.round(LOOP_SECONDS / CELL_SECONDS)} grid cells), ${FRAME_COUNT} frames at ${FPS}fps`,
);

mkdirSync(OUT, { recursive: true });
const server = await serve(STATIC);
const profile = mkdtempSync(join(tmpdir(), "vaporwave-previews-"));
const { chrome, port } = await launchChrome(profile);

try {
  const page = await connect(port);
  const base = `http://127.0.0.1:${server.address().port}`;

  for (const { name, story } of PREVIEWS) {
    const frames = await capture(
      page,
      `${base}/iframe.html?id=${story}&viewMode=story`,
    );
    const outPath = join(OUT, `${name}.gif`);
    encode(frames, outPath);
    const kb = Math.round(readFileSync(outPath).length / 1024);
    console.log(
      `${name}: ${frames.length} frames -> previews/${name}.gif (${kb} kB)`,
    );
  }

  page.close();
} finally {
  // Chrome keeps writing to its profile while it shuts down.
  const exited = new Promise((resolve) => chrome.once("exit", resolve));
  chrome.kill();
  await exited;
  server.close();
  rmSync(profile, { recursive: true, force: true });
}
