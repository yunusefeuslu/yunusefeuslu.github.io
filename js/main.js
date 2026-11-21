import { startSky } from "./sky.js?v=7";
import { startAmbient, SKIES } from "./aurora-sky.js?v=7";
import { MINIS, mountMini } from "./minis.js?v=7";

const CHAPTERS = [
  { id: "dunyaya-merhaba", title: "Merhaba dünya", era: "İlk günler", text: "Minicik eller, uykulu gözler ve bitmeyen battaniye sarmalları. Evimize en güzel misafir geldi." },
  { id: "ilk-gulucukler", title: "İlk gülücükler", era: "İlk aylar", text: "Bize ilk kez gülümsediği an evin ışığı değişti. Her uyanışı küçük bir bayram oldu." },
  { id: "ilk-adimlar", title: "İlk adımlar", era: "İlk yaş", text: "Emeklemeler, düşüp kalkmalar, ilk adımlar ve hayatının ilk karı. Dünyayı tutunarak keşfetti." },
  { id: "kocaman-oldu", title: "Kocaman oldu", era: "Çocukluk", text: "Sokaklar, kır çiçekleri, nehir kenarları ve balkon kahkahaları. Artık her yere kendi koşuyor." },
  { id: "bugun", title: "Bugün", era: "Şimdi", text: "Oyun parkları, kırmızı montu ve hiç bitmeyen enerjisi. Hikâye her gün yeniden yazılıyor." },
];

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, el = document) => el.querySelector(s);

const sky = startSky($(".hero__sky"), { reducedMotion });
const storedSky = (() => {
  try {
    return localStorage.getItem("gokyuzu");
  } catch {
    return null;
  }
})();
const askedSky = new URLSearchParams(location.search).get("gok");
const pageSky = startAmbient($(".page-sky"), { reducedMotion, sky: askedSky ?? storedSky ?? SKIES[0].id });

// sky picker: lets each visitor choose the background they like
const picker = $("[data-sky-picker]"), skyToggle = picker.querySelector("button"), skyMenu = picker.querySelector("ul");
for (const s of SKIES) {
  const li = document.createElement("li");
  li.innerHTML = `<button type="button" data-sky="${s.id}"><span class="sky-picker__sw">${s.swatch.map((c) => `<i style="background:${c}"></i>`).join("")}</span>${s.name}</button>`;
  skyMenu.append(li);
}
const markSky = (id) => skyMenu.querySelectorAll("[data-sky]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sky === id)));
markSky(askedSky ?? storedSky ?? SKIES[0].id);
const openPicker = (open) => {
  skyMenu.hidden = !open;
  skyToggle.setAttribute("aria-expanded", String(open));
};
skyToggle.addEventListener("click", () => openPicker(skyMenu.hidden));
skyMenu.addEventListener("click", (e) => {
  const b = e.target.closest("[data-sky]");
  if (!b) return;
  pageSky.setSky(b.dataset.sky);
  markSky(b.dataset.sky);
  try {
    localStorage.setItem("gokyuzu", b.dataset.sky);
  } catch {}
  openPicker(false);
});
document.addEventListener("click", (e) => !picker.contains(e.target) && openPicker(false));
document.addEventListener("keydown", (e) => e.key === "Escape" && !skyMenu.hidden && (openPicker(false), skyToggle.focus()));
const hero = $(".hero");
let heroVisible = true;
const syncSkies = () => {
  const hidden = document.hidden;
  heroVisible && !hidden ? sky.play() : sky.pause();
  !heroVisible && !hidden ? pageSky.play() : pageSky.pause();
};
new IntersectionObserver(([e]) => {
  heroVisible = e.isIntersecting;
  syncSkies();
}).observe(hero);
document.addEventListener("visibilitychange", syncSkies);
$(".hero__sky").addEventListener("pointerdown", (e) => sky.burstAt(e.clientX, e.clientY));
$("[data-burst]").addEventListener("click", () => sky.fireCenter(0.3 + Math.random() * 0.4, 0.3));
$("[data-burst-top]").addEventListener("click", () => setTimeout(() => sky.fireCenter(0.5, 0.35), reducedMotion ? 0 : 700));
if (!reducedMotion) setTimeout(() => sky.fireCenter(0.72, 0.3), 900);

const photos = await fetch("media/manifest.json").then((r) => r.json());
photos.forEach((p, i) => (p.i = i));
const byChapter = CHAPTERS.map((_, c) => photos.filter((p) => p.c === c + 1));

function img(p, cls = "", sizes = "thumb") {
  const el = document.createElement("img");
  el.src = `media/${sizes}/${p.f}.webp`;
  el.width = p.w;
  el.height = p.h;
  el.alt = `${CHAPTERS[p.c - 1].title}: fotoğraf ${byChapter[p.c - 1].indexOf(p) + 1}`;
  el.loading = "lazy";
  el.decoding = "async";
  if (cls) el.className = cls;
  return el;
}

// muted looping clips play only while on screen
const clipObserver = new IntersectionObserver(
  (entries) => entries.forEach((e) => (e.isIntersecting && !reducedMotion ? e.target.play().catch(() => {}) : e.target.pause())),
  { rootMargin: "80px" },
);
function clip(name) {
  const v = document.createElement("video");
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.setAttribute("muted", "");
  v.setAttribute("playsinline", "");
  v.preload = "none";
  v.poster = `media/clips/${name}.webp`;
  v.src = `media/clips/${name}.mp4`;
  v.setAttribute("aria-hidden", "true");
  clipObserver.observe(v);
  return v;
}

// two endless film strips crossing each other: photos with chapter clips spliced in
const REEL_CLIPS = [
  [{ name: "bolum-1", c: 1 }, { name: "bolum-3", c: 3 }, { name: "bolum-5", c: 5 }],
  [{ name: "bolum-2", c: 2 }, { name: "bolum-4", c: 4 }, { name: "lunapark", c: 5, label: "Lunapark", href: "#an" }],
];
document.querySelectorAll("[data-reel]").forEach((track) => {
  const half = +track.dataset.reel;
  const set = photos.filter((_, i) => i % 2 === half);
  if (half) set.reverse();
  const items = [];
  const every = Math.floor(set.length / REEL_CLIPS[half].length);
  set.forEach((p, i) => {
    if (i % every === 2 && REEL_CLIPS[half][(i - 2) / every]) items.push(REEL_CLIPS[half][(i - 2) / every]);
    items.push(p);
  });
  for (let copy = 0; copy < 2; copy++)
    for (const it of items) {
      const isClip = "name" in it;
      const b = document.createElement(isClip ? "a" : "button");
      b.className = "reel__frame" + (isClip ? " reel__frame--clip" : "");
      b.style.setProperty("--c", `var(--c${it.c})`);
      if (copy) b.setAttribute("aria-hidden", "true"), (b.tabIndex = -1);
      if (isClip) {
        const title = it.label ?? CHAPTERS[it.c - 1].title;
        b.href = it.href ?? `#${CHAPTERS[it.c - 1].id}`;
        b.setAttribute("aria-label", `${title} bölümüne git`);
        b.append(clip(it.name));
        const tag = document.createElement("span");
        tag.className = "reel__tag";
        tag.textContent = title;
        b.append(tag);
      } else {
        b.type = "button";
        const im = img(it);
        b.append(im);
        b.addEventListener("click", () => openLightbox(it.i, im));
      }
      track.append(b);
    }
});

// the sticky timeline ribbon
const strip = $("[data-timeline]");
CHAPTERS.forEach((ch, c) => {
  const li = document.createElement("li");
  li.style.setProperty("--c", `var(--c${c + 1})`);
  const cover = byChapter[c][0];
  li.innerHTML = `<a href="#${ch.id}" class="tl-frame"><span class="tl-frame__pic"></span><span class="tl-frame__num">${c + 1}</span><span class="tl-frame__txt"><b>${ch.title}</b><small>${ch.era}</small></span></a>`;
  li.querySelector(".tl-frame__pic").append(img(cover));
  strip.append(li);
});

// photos develop like a polaroid the first time they come into view
const developer = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("is-dev"), developer.unobserve(e.target))),
  { threshold: 0.2 },
);

// chapters
const main = $("[data-chapters]");
CHAPTERS.forEach((ch, c) => {
  const list = byChapter[c];
  const sec = document.createElement("section");
  sec.className = "chapter";
  sec.id = ch.id;
  sec.style.setProperty("--c", `var(--c${c + 1})`);
  sec.style.setProperty("--ci", `var(--c${c + 1}-ink)`);
  sec.innerHTML = `
    <div class="leader" aria-hidden="true"><div class="leader__strip"></div></div>
    <div class="chapter__head">
      <div class="chapter__stage" aria-hidden="true">
        <div class="chapter__peek chapter__peek--l"></div>
        <div class="chapter__peek chapter__peek--r"></div>
        <div class="cell"></div>
      </div>
      <div class="chapter__copy">
        <span class="chapter__ghost" aria-hidden="true">${c + 1}</span>
        <h2 class="chapter__title"><span class="sr">Bölüm ${c + 1}: </span>${ch.title}</h2>
        <p class="chapter__era"><span>${ch.era}</span><span>${list.length} fotoğraf</span></p>
        <p class="chapter__text">${ch.text}</p>
      </div>
    </div>
    <div class="bento"></div>`;
  sec.querySelector(".chapter__peek--l").append(img(list[1]));
  sec.querySelector(".chapter__peek--r").append(img(list[2]));
  sec.querySelector(".cell").append(clip(`bolum-${c + 1}`));
  // the leader: a countdown frame carried on a strip of this chapter's photos
  const leaderStrip = sec.querySelector(".leader__strip");
  for (let k = 0; k < 9; k++) {
    const fr = document.createElement("div");
    if (k === 4) {
      fr.className = "leader__frame leader__frame--count";
      fr.innerHTML = `<span class="leader__sweep"></span><span class="leader__ring"></span><span class="leader__num">${c + 1}</span>`;
    } else {
      fr.className = "leader__frame";
      fr.append(img(list[(k + 5) % list.length]));
    }
    leaderStrip.append(fr);
  }
  // smart bento: tile shapes follow each photo's orientation, with a pixel-art tile and a next-chapter card mixed in
  const bento = sec.querySelector(".bento");
  let tall = 0;
  list.forEach((p, k) => {
    const b = document.createElement("button");
    b.type = "button";
    const r = p.h / p.w;
    const shape = k === 0 ? "big" : r < 0.85 ? "wide" : r > 1.25 && tall++ % 3 === 1 ? "tall" : "";
    b.className = `tile${shape ? ` tile--${shape}` : ""}`;
    const im = img(p, "", shape === "big" || shape === "wide" ? "full" : "thumb");
    b.append(im);
    b.addEventListener("click", () => openLightbox(p.i, im));
    developer.observe(b);
    bento.append(b);
    if (k === 2) {
      const m = document.createElement("figure");
      m.className = "tile tile--pixel";
      m.innerHTML = `<canvas aria-hidden="true"></canvas><figcaption>${MINIS[c].text}</figcaption>`;
      mountMini(m.querySelector("canvas"), MINIS[c], { reducedMotion });
      bento.append(m);
    }
  });
  const next = CHAPTERS[c + 1];
  const card = document.createElement("a");
  card.className = "tile tile--wide tile--next";
  if (next) {
    card.href = `#${next.id}`;
    card.style.setProperty("--c", `var(--c${c + 2})`);
    card.innerHTML = `<span class="tile--next__txt"><small>Sıradaki bölüm</small><b>${next.title}</b></span><span class="tile--next__arrow" aria-hidden="true"></span>`;
    card.prepend(Object.assign(img(byChapter[c + 1][0], "tile--next__bg", "thumb"), { alt: "" }));
  } else {
    card.href = "#an";
    card.innerHTML = `<span class="tile--next__txt"><small>Bir de video var</small><b>Lunaparkta bir an</b></span><span class="tile--next__arrow" aria-hidden="true"></span>`;
    card.prepend(Object.assign(document.createElement("img"), { src: "media/clips/lunapark.webp", alt: "", className: "tile--next__bg", loading: "lazy" }));
  }
  bento.append(card);
  main.append(sec);
});

// "at a glance" bento
document.querySelector("[data-chips]").append(
  ...CHAPTERS.map((ch, c) => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="#${ch.id}" style="--c: var(--c${c + 1})"><i>${c + 1}</i>${ch.title}</a>`;
    return li;
  }),
);
const compare = $("[data-compare]");
const setCompare = (v) => compare.style.setProperty("--pos", `${v}%`);
compare.querySelector("input").addEventListener("input", (e) => setCompare(e.target.value));
setCompare(50);
const heart = mountMini($("[data-glance-mini]"), MINIS[0], { reducedMotion });
$(".g-card--pixel").addEventListener("pointerdown", () => (heart.boost = 2));
clipObserver.observe($("[data-glance-clip]"));
const latest = byChapter[4].find((p) => p.f === "bugun-01") ?? byChapter[4][0];
const latestImg = img(latest, "", "full");
$("[data-glance-photo]").prepend(latestImg);
$("[data-glance-photo]").setAttribute("aria-label", "Bugünden bir fotoğrafı büyüt");
$("[data-glance-photo]").addEventListener("click", () => openLightbox(latest.i, latestImg));
const gstrip = $("[data-glance-strip]");
for (const p of byChapter.map((l) => l[Math.min(3, l.length - 1)])) {
  const f = document.createElement("span");
  f.style.setProperty("--c", `var(--c${p.c})`);
  f.append(Object.assign(img(p), { alt: "" }));
  gstrip.append(f);
}

// timeline: highlight the chapter in view and fill the progress bar
const frames = [...strip.children];
const sections = [...main.children];
let active = -1;
const leaders = [...document.querySelectorAll(".leader")];
let scrollQueued = false;
function queueScroll() {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => ((scrollQueued = false), onScroll()));
}
function onScroll() {
  picker.classList.toggle("is-shown", scrollY > hero.offsetHeight * 0.6);
  if (!picker.classList.contains("is-shown")) openPicker(false);
  // each leader strip advances through the "projector" as it crosses the screen
  for (const l of leaders) {
    const r = l.getBoundingClientRect();
    if (r.bottom < -50 || r.top > innerHeight + 50) continue;
    l.style.setProperty("--p", Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height))).toFixed(4));
  }
  const mid = innerHeight * 0.4;
  let idx = 0;
  sections.forEach((s, i) => s.getBoundingClientRect().top < mid && (idx = i));
  const first = sections[0].getBoundingClientRect(), lastR = sections.at(-1).getBoundingClientRect();
  const total = lastR.bottom - first.top - innerHeight * 0.6;
  const prog = Math.min(1, Math.max(0, (mid - first.top) / Math.max(1, total)));
  $("[data-progress]").style.transform = `scaleX(${prog})`;
  $("[data-progress]").style.background = `var(--c${idx + 1})`;
  if (idx !== active) {
    active = idx;
    pageSky.setLook(idx);
    frames.forEach((f, i) => {
      f.classList.toggle("is-active", i === idx);
      f.classList.toggle("is-past", i < idx);
      const a = f.querySelector("a");
      i === idx ? a.setAttribute("aria-current", "step") : a.removeAttribute("aria-current");
    });
    const f = frames[idx];
    strip.scrollTo({ left: f.offsetLeft - (strip.clientWidth - f.clientWidth) / 2, behavior: reducedMotion ? "auto" : "smooth" });
  }
}
// polaroids fan out once, the first time each chapter opens on screen
const revealer = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("is-in"), revealer.unobserve(e.target))),
  { threshold: 0.35 },
);
sections.forEach((s) => revealer.observe(s.querySelector(".chapter__head")));
addEventListener("scroll", queueScroll, { passive: true });
addEventListener("resize", queueScroll, { passive: true });
onScroll();

// lightbox
const box = $(".lightbox"), boxImg = $(".lightbox__img");
let cur = 0;
function show(i) {
  cur = (i + photos.length) % photos.length;
  const p = photos[cur], ch = CHAPTERS[p.c - 1];
  boxImg.src = `media/full/${p.f}.webp`;
  boxImg.alt = `${ch.title}: fotoğraf ${byChapter[p.c - 1].indexOf(p) + 1}`;
  box.style.setProperty("--c", `var(--c${p.c})`);
  $(".lightbox__chapter").textContent = ch.title;
  $(".lightbox__count").textContent = `${cur + 1} / ${photos.length}`;
  for (const d of [1, -1]) new Image().src = `media/full/${photos[(cur + d + photos.length) % photos.length].f}.webp`;
}
// the thumbnail grows into the viewer and shrinks back on close (View Transitions where supported)
const canMorph = !!document.startViewTransition && !reducedMotion;
let origin = null;
const morph = (update) => {
  if (!canMorph) return void update();
  return document.startViewTransition(update).finished.finally(() => {
    boxImg.style.viewTransitionName = "";
    if (origin) origin.style.viewTransitionName = "";
  });
};
async function openLightbox(i, from) {
  origin = from ?? null;
  if (!canMorph || !origin) return void (show(i), box.showModal());
  origin.style.viewTransitionName = "photo";
  show(i);
  await boxImg.decode().catch(() => {});
  morph(() => {
    origin.style.viewTransitionName = "";
    boxImg.style.viewTransitionName = "photo";
    box.showModal();
  });
}
function closeLightbox() {
  const back = origin && origin.isConnected && photos[cur].f === origin.src.split("/").pop().replace(".webp", "") ? origin : null;
  const r = back?.getBoundingClientRect();
  if (!canMorph || !back || r.bottom < 0 || r.top > innerHeight) return void box.close();
  boxImg.style.viewTransitionName = "photo";
  morph(() => {
    boxImg.style.viewTransitionName = "";
    back.style.viewTransitionName = "photo";
    box.close();
  });
}
function step(d) {
  if (!canMorph) return void show(cur + d);
  document.documentElement.dataset.dir = d > 0 ? "next" : "prev";
  boxImg.style.viewTransitionName = "photo";
  const next = new Image();
  next.src = `media/full/${photos[(cur + d + photos.length) % photos.length].f}.webp`;
  next.decode().catch(() => {}).then(() => morph(() => show(cur + d)));
}
$(".lightbox__close").addEventListener("click", closeLightbox);
$(".lightbox__prev").addEventListener("click", () => step(-1));
$(".lightbox__next").addEventListener("click", () => step(1));
box.addEventListener("click", (e) => e.target.classList.contains("lightbox__stage") && closeLightbox());
box.addEventListener("cancel", (e) => (e.preventDefault(), closeLightbox()));
box.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") step(1);
  if (e.key === "ArrowLeft") step(-1);
});
let sx = null, sy = 0;
box.addEventListener("pointerdown", (e) => ((sx = e.clientX), (sy = e.clientY)));
box.addEventListener("pointerup", (e) => {
  if (sx === null) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  sx = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
});
