import { createFrame, clearFrame, createFx, composite, backdrop, PAL } from "./pixelfx/core/index.js";
import * as shootingStars from "./pixelfx/fx/weather/shooting-stars.js";
import * as fireworkBurst from "./pixelfx/fx/explosions/firework-burst.js";

const SKY = ["#0f1030", "#22245a", "#454a8c", "#8f97d8", "#e2e6ff"];
const BURSTS = [
  { palette: PAL.candy, core: PAL.gold },
  { palette: PAL.ice, core: ["#2a2c08", "#6a5c0c", "#b49412", "#f0d424", "#fff066", "#fffac4", "#ffffff"] },
  { palette: PAL.gold, core: PAL.gold },
  { palette: PAL.leaf, core: PAL.gold },
  { palette: ["#3d0a1a", "#701530", "#b02250", "#f53c7a", "#ff86aa", "#ffd2e0", "#ffffff"], core: PAL.gold },
];

export function startSky(canvas, { reducedMotion = false, auto = 0, fps = 60, seedBase = 4 } = {}) {
  const ctx = canvas.getContext("2d");
  let frame, img, bg, stars = [], bursts = [], seed = 11 + seedBase, running = false, raf = 0, last = 0, burstIdx = seedBase, nextAuto = 0.8;
  const minStep = 1000 / fps - 2;

  function build() {
    const portrait = canvas.clientHeight > canvas.clientWidth * 1.1;
    const W = 320, H = portrait ? 360 : 180;
    canvas.width = W;
    canvas.height = H;
    frame = createFrame(W, H);
    img = ctx.createImageData(W, H);
    bg = backdrop("sky", W, H);
    const t0 = stars[0]?.t ?? 2;
    stars = [];
    for (let y = 180, s = seedBase; y <= H; y += 180, s += 5) {
      const fx = createFx(shootingStars, { x: 160, y, seed: s, sky: SKY });
      fx.update(t0 + s);
      stars.push(fx);
    }
  }

  function draw() {
    clearFrame(frame);
    for (const s of stars) s.draw(frame);
    for (const b of bursts) b.draw(frame);
    composite(frame, img.data, bg);
    ctx.putImageData(img, 0, 0);
  }

  function tick(now) {
    if (now - last < minStep) {
      raf = requestAnimationFrame(tick);
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (auto && (nextAuto -= dt) <= 0) {
      nextAuto = auto * (0.6 + Math.random() * 0.8);
      burstsFire(canvas.width * (0.15 + Math.random() * 0.7), canvas.height * (0.18 + Math.random() * 0.5));
    }
    for (const s of stars) s.update(dt);
    for (const b of bursts) b.update(dt);
    bursts = bursts.filter((b) => !b.done());
    draw();
    if (running) raf = requestAnimationFrame(tick);
  }

  function play() {
    if (running || reducedMotion) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function burstAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const scale = Math.max(r.width / canvas.width, r.height / canvas.height);
    const offX = (r.width - canvas.width * scale) / 2, offY = (r.height - canvas.height * scale) / 2;
    const x = (clientX - r.left - offX) / scale, y = (clientY - r.top - offY) / scale;
    burstsFire(x, y);
  }

  function burstsFire(x, y) {
    const look = BURSTS[burstIdx++ % BURSTS.length];
    const fx = createFx(fireworkBurst, { x, y, seed: seed++, ...look });
    fx.update(0.3);
    bursts.push(fx);
    if (bursts.length > 4) bursts.shift();
    if (reducedMotion) {
      fx.update(0.5);
      draw();
    }
  }

  build();
  draw();
  let resizeTimer;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => (build(), draw()), 120);
  }).observe(canvas);

  return { play, pause, burstAt, fireCenter: (fx = 0.5, fy = 0.35) => burstsFire(canvas.width * fx, canvas.height * fy) };
}
