import { fit, rand, wrap, mix, TAU, WHITE, hex } from "../../core/index.js";
import { clip, rows, trips, bayer } from "./_lib.js";

export const meta = {
  name: "Balloons",
  desc: "Party balloons rise through a twilight sky in three depths, swaying on their strings, lit from the top left and glowing softly against the dusk over dark hills.",
  tags: ["weather", "balloons", "party", "birthday", "celebration", "dusk", "twilight", "ambient", "loop"],
  size: [320, 180],
  origin: [160, 180],
  duration: 12,
  loop: true,
  fps: 30,
  bg: "sky",
  options: {
    palette: ["#0d0b22", "#1b163e", "#2e1d52", "#4c2660", "#7a3562", "#b8585a"],
    seed: 6,
  },
};

const D = 12;
const HUES = [
  ["#14285a", "#2c64b8", "#6fa8f5", "#b4d4ff", "#f2f8ff"],
  ["#6a4000", "#c48a00", "#f5b700", "#ffd866", "#fff8dc"],
  ["#5a1210", "#b52c24", "#e8473e", "#ff8f82", "#fff0ec"],
  ["#0c4038", "#1d7865", "#2fb394", "#86e2ca", "#eefffa"],
  ["#5e1032", "#b8306c", "#f0609e", "#ffaccf", "#fff2f8"],
].map((r) => r.map(hex));

// o.tall stretches the sky upwards for portrait screens, keeping the hills at the bottom
const geo = (o) => (o.tall ? { ...meta, size: [320, o.tall], origin: [160, o.tall] } : meta);

export function drawBack(p, t, o) {
  const G = geo(o), H = G.size[1], q = clip(p, G), S = o.seed, K = fit(o.palette, 6);
  // dusk: deep indigo overhead warming to a rose and amber glow at the horizon, in hard steps
  rows(p, G, -H, -1, (y, R) => {
    const k = (y + 180) / 180, f = k <= 0 ? 0 : k * k * k * 5;
    for (let i = 0; i < 320; i++) {
      const s = Math.min(5, Math.floor(f + bayer(i, y) - 0.5));
      R.c[i] = K[Math.max(0, s)];
    }
    R.b.fill(1);
    R.a.fill(1);
  });
  // a few stars where the sky is still dark
  for (let i = 0; i < 70 * (H / 180); i++) {
    const x = -160 + rand(S, i, 1) * 320, y = -H + rand(S, i, 2) * (H - 100), tw = 0.5 + 0.5 * Math.sin((TAU * (1 + (i % 3)) * t) / D + i);
    q.dot(x, y, hex("#dcd8ff"), (0.25 + 0.5 * tw) * Math.min(1, (-80 - y) / 90));
  }
  // the low sun's glow sitting on the hills
  q.glow(40, -12, 110, hex("#f2a86e"), 0.14);
  balloons(q, t, S, 0, H);
}

export function draw(p, t, o) {
  const G = geo(o), H = G.size[1], q = clip(p, G), S = o.seed, K = fit(o.palette, 6);
  hills(q, S, K);
  balloons(q, t, S, 1, H);
  balloons(q, t, S, 2, H);
}

// three depths: far ones small and dim, near ones big, bright and faster
const DEPTH = [
  { n: 12, r: 4, m: 1, dim: 0.5, sway: 3 },
  { n: 8, r: 7, m: 1, dim: 0.82, sway: 5 },
  { n: 5, r: 11, m: 2, dim: 1, sway: 8 },
];

function balloons(q, t, S, d, H) {
  const L = DEPTH[d], sd = S * 13 + d * 101, n = Math.round(L.n * (H / 180));
  trips(t, D, n, sd, L.m, L.m, (u, k, m, i) => {
    const R = (c) => rand(sd, i, wrap(k, m), c), r = L.r * (0.85 + R(1) * 0.3);
    const y = 20 + r * 3 - u * (H + 20 + r * 6), x0 = -150 + ((i + R(2) * 0.8) / n) * 300;
    const ph = R(3) * TAU, x = x0 + L.sway * Math.sin(u * TAU * 2 + ph) + 6 * Math.sin(u * TAU + ph * 0.5);
    const tilt = 0.18 * Math.cos(u * TAU * 2 + ph);
    const hue = HUES[Math.floor(R(4) * HUES.length)];
    balloon(q, x, y, r, tilt, hue, L.dim, u * TAU * 2 + ph);
  });
}

function balloon(q, x, y, r, tilt, H, dim, ph) {
  const rx = r * 0.86, ry = r, c = Math.cos(tilt), s = Math.sin(tilt);
  const fade = (col) => (dim < 1 ? mix(hex("#2a1e4a"), col, dim) : col);
  // the string: hangs from the knot and trails the sway
  const kx = x - s * ry, ky = y + c * ry;
  const len = r * 2.6;
  const pts = [];
  for (let j = 0; j <= 8; j++) {
    const v = j / 8;
    pts.push([kx + Math.sin(ph + v * 3) * v * r * 0.35, ky + 2 + v * len]);
  }
  q.polyline(pts, mix(hex("#2a1e4a"), hex("#b9a6cc"), 0.75 * dim), 1);
  // the knot
  q.px(kx, ky + 1, fade(H[1]));
  if (r > 4) (q.px(kx - 1, ky + 1, fade(H[1])), q.px(kx + 1, ky + 1, fade(H[1])));
  // the body: lit from the top left, a deep rim bottom right, a white glint
  q.shade(x - r - 1, y - r - 1, x + r + 1, y + r + 1, (px, py, out) => {
    const dx = px - x, dy = py - y, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
    const vv = v < 0 ? v : v * (1 + 0.25 * v);
    const dd = u * u + vv * vv;
    if (dd > 1) return;
    const lit = -u * 0.55 - v * 0.75 + 0.15;
    const edge = dd > 0.78;
    const step = edge && lit < 0.2 ? 0 : lit > 0.75 ? 3 : lit > 0.25 ? 2 : lit > -0.25 ? 1 : 0;
    out.c = fade(H[step + (edge ? 0 : 0)]);
    if (r >= 5 && u > -0.62 && u < -0.32 && v > -0.66 && v < -0.36) out.c = fade(H[4]);
    out.a = 1;
  });
  if (r >= 5) q.px(x - rx * 0.48, y - ry * 0.52, WHITE);
  q.glow(x, y, r * 2.6, H[2], 0.12 * dim);
}

// a dark ridge of hills along the bottom, a lighter far ridge behind it
const HILLS = new Map();
function hills(q, S, K) {
  let h = HILLS.get(S);
  if (!h) {
    h = [];
    for (let i = 0; i < 320; i++) {
      const x = i - 160, a = 9 + 5 * Math.sin(x * 0.031 + S) + 3 * Math.sin(x * 0.083 + S * 2) + 1.5 * Math.sin(x * 0.21);
      const b = 4 + 3 * Math.sin(x * 0.047 + S * 3) + 1.2 * Math.sin(x * 0.17 + 1);
      h.push([Math.round(a), Math.round(b)]);
    }
    HILLS.set(S, h);
  }
  const far = mix(K[1], K[3], 0.25), near = mix(K[0], hex("#05040e"), 0.4);
  for (let i = 0; i < 320; i++) {
    const x = i - 160 + 0.5, [a, b] = h[i];
    for (let y = -a; y < 0; y++) q.px(x, y + 0.5, y < -b ? far : near);
    q.px(x, -a + 0.5, mix(far, K[4], 0.35));
  }
}
