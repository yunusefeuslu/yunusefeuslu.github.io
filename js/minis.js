import { createFrame, clearFrame, createFx, composite } from "./pixelfx/core/index.js";

// one small looping pixel effect per chapter, shown in a bento tile
export const MINIS = [
  { load: () => import("./pixelfx/fx/pickups/heart-pickup.js"), text: "Kalbimizin yeni sahibi" },
  { load: () => import("./pixelfx/fx/critters/butterfly.js"), text: "Kelebek kadar hafif gülücükler", opts: { palette: ["#24081a", "#4f1638", "#8a1f5e", "#c83a8a", "#f070b4", "#ffb0d8", "#ffffff"] } },
  { load: () => import("./pixelfx/fx/ice/ice-crystal.js"), text: "İlk kar, ilk kristal" },
  { load: () => import("./pixelfx/fx/critters/bird.js"), text: "Kuş gibi özgür" },
  { load: () => import("./pixelfx/fx/pickups/power-star.js"), text: "Evimizin yıldızı" },
];

const live = new Set();
let raf = 0, last = 0;

function loop(now) {
  raf = live.size ? requestAnimationFrame(loop) : 0;
  if (now - last < 31) return;
  const dt = Math.min(0.06, (now - last) / 1000 || 0);
  last = now;
  for (const m of live) {
    m.boost = Math.max(0, m.boost - dt);
    m.fx.update(m.boost > 0 ? dt * 2.5 : dt);
    m.draw();
  }
}

export function mountMini(canvas, def, { reducedMotion = false } = {}) {
  const m = { fx: null, boost: 0, draw() {} };
  def.load().then((mod) => {
    const [W, H] = mod.meta.size, [OX, OY] = mod.meta.origin;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d"), frame = createFrame(W, H), img = ctx.createImageData(W, H);
    m.fx = createFx(mod, { x: OX, y: OY, ...(def.opts ?? {}) });
    m.fx.update(0.4);
    m.draw = () => {
      clearFrame(frame);
      m.fx.draw(frame);
      composite(frame, img.data, null);
      ctx.putImageData(img, 0, 0);
    };
    m.draw();
    if (reducedMotion) return;
    new IntersectionObserver(([e]) => {
      e.isIntersecting ? live.add(m) : live.delete(m);
      if (live.size && !raf) (last = performance.now()), (raf = requestAnimationFrame(loop));
    }).observe(canvas);
  });
  return m;
}
