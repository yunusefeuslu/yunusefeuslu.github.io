import { createFrame, clearFrame, createFx, composite, backdrop, hex } from "./pixelfx/core/index.js";
import * as aurora from "./pixelfx/fx/weather/aurora.js";

const VIOLET = ["#120b2a", "#26164f", "#41208a", "#6a34c0", "#9c62e8", "#d2b4ff", "#f6eeff"];
const ROSE = ["#1e0a1e", "#3a1238", "#6a1f5e", "#a0348a", "#d062b0", "#f0a8dc", "#fff0fa"];
const GOLD = ["#1a1206", "#3a2a08", "#6a4c0c", "#a87a12", "#e8b424", "#ffe27a", "#fff8dc"];
const AZURE = ["#06122a", "#0b2550", "#11408a", "#1d64c4", "#4a95f0", "#9cc8ff", "#eaf4ff"];

// one look per chapter: lower curtain in the chapter's color, upper rays in a companion hue
export const LOOKS = [
  { palette: AZURE, upper: VIOLET },
  { palette: GOLD, upper: ROSE },
  { palette: ["#1e0808", "#420e10", "#781818", "#b82a26", "#ee5a48", "#ffa898", "#fff0ec"], upper: GOLD },
  { palette: ["#081a1e", "#0d3a36", "#13664e", "#1fa06a", "#3fd88e", "#9af7bf", "#e6fff0"], upper: VIOLET },
  { palette: ["#1e0818", "#42102e", "#781a52", "#b82a7e", "#ee5aa8", "#ffa8d4", "#fff0f8"], upper: AZURE },
];

const toRgb = (h) => {
  const v = hex(h);
  return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255];
};
const toHex = ([r, g, b]) => "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
const RGB = LOOKS.map((l) => ({ palette: l.palette.map(toRgb), upper: l.upper.map(toRgb) }));
const mixRamp = (a, b, k) => a.map((c, i) => toHex(c.map((v, j) => v + (b[i][j] - v) * k)));

export function startAurora(canvas, { reducedMotion = false, fps = 24 } = {}) {
  const ctx = canvas.getContext("2d");
  const W = 320, H = 180;
  canvas.width = W;
  canvas.height = H;
  const frame = createFrame(W, H), img = ctx.createImageData(W, H), bg = backdrop("sky", W, H);
  const fx = createFx(aurora, { x: 160, y: 180, seed: 5, ...LOOKS[0] });
  fx.update(3);
  let start = RGB[0], to = 0, k = 1, running = false, raf = 0, last = 0;
  const minStep = 1000 / fps - 2;

  function applyLook() {
    const e = k * k * (3 - 2 * k);
    fx.options.palette = mixRamp(start.palette, RGB[to].palette, e);
    fx.options.upper = mixRamp(start.upper, RGB[to].upper, e);
  }

  function draw() {
    clearFrame(frame);
    fx.draw(frame);
    composite(frame, img.data, bg);
    ctx.putImageData(img, 0, 0);
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (now - last < minStep) return;
    const dt = Math.min(0.06, (now - last) / 1000 || 0);
    last = now;
    if (k < 1) {
      k = Math.min(1, k + dt / 1.4);
      applyLook();
    }
    fx.update(dt);
    draw();
  }

  draw();
  return {
    play() {
      if (running || reducedMotion) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    },
    pause() {
      running = false;
      cancelAnimationFrame(raf);
    },
    setLook(i) {
      if (i === to) return;
      // start the new blend from wherever the current one has got to
      start = { palette: fx.options.palette.map(toRgb), upper: fx.options.upper.map(toRgb) };
      to = i;
      k = 0;
      if (reducedMotion) (k = 1), applyLook(), draw();
    },
  };
}
