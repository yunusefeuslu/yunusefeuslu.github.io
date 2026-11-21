import { createFrame, clearFrame, createFx, composite, backdrop, hex } from "./pixelfx/core/index.js";

const VIOLET = ["#120b2a", "#26164f", "#41208a", "#6a34c0", "#9c62e8", "#d2b4ff", "#f6eeff"];
const ROSE = ["#1e0a1e", "#3a1238", "#6a1f5e", "#a0348a", "#d062b0", "#f0a8dc", "#fff0fa"];
const GOLD = ["#1a1206", "#3a2a08", "#6a4c0c", "#a87a12", "#e8b424", "#ffe27a", "#fff8dc"];
const AZURE = ["#06122a", "#0b2550", "#11408a", "#1d64c4", "#4a95f0", "#9cc8ff", "#eaf4ff"];

// aurora looks, one per chapter: lower curtain in the chapter's color, upper rays in a companion hue
export const LOOKS = [
  { palette: AZURE, upper: VIOLET },
  { palette: GOLD, upper: ROSE },
  { palette: ["#1e0808", "#420e10", "#781818", "#b82a26", "#ee5a48", "#ffa898", "#fff0ec"], upper: GOLD },
  { palette: ["#081a1e", "#0d3a36", "#13664e", "#1fa06a", "#3fd88e", "#9af7bf", "#e6fff0"], upper: VIOLET },
  { palette: ["#1e0818", "#42102e", "#781a52", "#b82a7e", "#ee5aa8", "#ffa8d4", "#fff0f8"], upper: AZURE },
];

export const SKIES = [
  { id: "balonlar", name: "Balonlar", swatch: ["#f0609e", "#f5b700", "#6fa8f5"], load: () => import("./pixelfx/fx/weather/balloons.js"), opts: { seed: 6 }, tall: { tall: 320 } },
  { id: "kuzey-isiklari", name: "Kuzey ışıkları", swatch: ["#4a95f0", "#9c62e8", "#3fd88e"], load: () => import("./pixelfx/fx/weather/aurora.js"), opts: { seed: 5, ...LOOKS[0] }, tinted: true, portraitY: 210 },
  { id: "ay-isigi", name: "Ay ışığı", swatch: ["#e2e6ff", "#8f97d8", "#454a8c"], load: () => import("./pixelfx/fx/weather/clouds.js"), opts: {} },
  { id: "cicekler", name: "Çiçek yağmuru", swatch: ["#ffd2e2", "#f2a2c0", "#d26a94"], load: () => import("./pixelfx/fx/weather/cherry-blossoms.js"), opts: {} },
  { id: "atesbocekleri", name: "Ateş böcekleri", swatch: ["#f4ff9a", "#c8e050", "#4a7a3a"], load: () => import("./pixelfx/fx/weather/fireflies.js"), opts: {} },
];

const toRgb = (h) => {
  const v = hex(h);
  return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255];
};
const toHex = ([r, g, b]) => "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
const RGB = LOOKS.map((l) => ({ palette: l.palette.map(toRgb), upper: l.upper.map(toRgb) }));
const mixRamp = (a, b, k) => a.map((c, i) => toHex(c.map((v, j) => v + (b[i][j] - v) * k)));

export function startAmbient(canvas, { reducedMotion = false, fps = 24, sky = SKIES[0].id } = {}) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, portrait = false, frame, img, bg, mod = null;
  let fx = null, def = null, look = 0, start = RGB[0], k = 1, running = false, raf = 0, last = 0, loading = 0;
  const minStep = 1000 / fps - 2;

  function applyLook() {
    if (!def?.tinted) return;
    const e = k * k * (3 - 2 * k);
    fx.options.palette = mixRamp(start.palette, RGB[look].palette, e);
    fx.options.upper = mixRamp(start.upper, RGB[look].upper, e);
  }

  function draw() {
    clearFrame(frame);
    fx?.draw(frame);
    composite(frame, img.data, bg);
    if (portrait && def && !def.tall) seamFade();
    ctx.putImageData(img, 0, 0);
  }

  // in portrait the effect's own sky stops short of the top; fade its top edge into the plain night above
  function seamFade() {
    const top = (def.portraitY ?? 320) - 180, F = 60, d = img.data;
    for (let y = Math.max(0, top); y < Math.min(H, top + F); y++) {
      const kk = (y - top) / F, e = kk * kk * (3 - 2 * kk);
      for (let x = 0; x < W; x++) {
        const i = y * W + x, j = i * 4, b = bg[i];
        d[j] = (b & 255) + (d[j] - (b & 255)) * e;
        d[j + 1] = ((b >>> 8) & 255) + (d[j + 1] - ((b >>> 8) & 255)) * e;
        d[j + 2] = ((b >>> 16) & 255) + (d[j + 2] - ((b >>> 16) & 255)) * e;
      }
    }
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
    fx?.update(dt);
    draw();
  }

  // landscape screens get the effect's own 320x180 sky; portrait ones a 180x320 slice of it, so phones
  // see the effect at a sensible pixel size instead of a narrow blown-up strip
  function layout() {
    portrait = canvas.clientHeight > canvas.clientWidth;
    [W, H] = portrait ? [180, 320] : [320, 180];
    canvas.width = W;
    canvas.height = H;
    frame = createFrame(W, H);
    img = ctx.createImageData(W, H);
    bg = backdrop("sky", W, H);
  }

  function place(elapsed) {
    const opts = portrait ? { x: 90, y: def.portraitY ?? 320, ...def.opts, ...(def.tall ?? {}) } : { x: 160, y: 180, ...def.opts };
    const keep = fx && def.tinted ? { palette: fx.options.palette, upper: fx.options.upper } : {};
    fx = createFx(mod, { ...opts, ...keep });
    fx.update(elapsed);
  }

  async function setSky(id) {
    const next = SKIES.find((s) => s.id === id) ?? SKIES[0];
    const ticket = ++loading;
    const m = await next.load();
    if (ticket !== loading) return;
    def = next;
    mod = m;
    fx = null;
    place(4);
    if (def.tinted) (start = RGB[look]), (k = 1), (fx.options.palette = LOOKS[look].palette), (fx.options.upper = LOOKS[look].upper);
    canvas.dataset.sky = def.id;
    draw();
  }

  layout();
  let resizeTimer;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const was = portrait;
      layout();
      if (def && was !== portrait) place(fx?.t ?? 4);
      draw();
    }, 150);
  }).observe(canvas);
  setSky(sky);
  return {
    setSky,
    get sky() {
      return def?.id ?? sky;
    },
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
      if (i === look) return;
      if (def?.tinted) start = { palette: fx.options.palette.map(toRgb), upper: fx.options.upper.map(toRgb) };
      look = i;
      k = 0;
      if (reducedMotion) (k = 1), applyLook(), draw();
    },
  };
}
