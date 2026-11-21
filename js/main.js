import { startSky } from "./sky.js";

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
const pageSky = startSky($(".page-sky"), { reducedMotion, auto: 3.2, fps: 30, seedBase: 9 });
if (reducedMotion) pageSky.fireCenter(0.25, 0.3), pageSky.fireCenter(0.75, 0.45);
const hero = $(".hero");
let heroVisible = true;
const syncSkies = () => {
  const hidden = document.hidden;
  heroVisible && !hidden ? sky.play() : sky.pause();
  !heroVisible && !hidden ? pageSky.play() : pageSky.pause();
};
new IntersectionObserver(([e]) => ((heroVisible = e.isIntersecting), syncSkies())).observe(hero);
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
        b.append(img(it));
        b.addEventListener("click", () => openLightbox(it.i));
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
    <div class="chapter__head">
      <div class="chapter__fan" aria-hidden="true"></div>
      <div class="chapter__copy">
        <p class="chapter__num">${c + 1}<span>/ ${CHAPTERS.length}</span></p>
        <h2 class="chapter__title">${ch.title}</h2>
        <p class="chapter__era"><span>${ch.era}</span><span>${list.length} fotoğraf</span></p>
        <p class="chapter__text">${ch.text}</p>
      </div>
    </div>
    <div class="gallery"></div>`;
  const fan = sec.querySelector(".chapter__fan");
  fan.append(img(list[1]), img(list[2]), clip(`bolum-${c + 1}`));
  const g = sec.querySelector(".gallery");
  list.forEach((p) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tile";
    b.append(img(p));
    b.addEventListener("click", () => openLightbox(p.i));
    g.append(b);
  });
  main.append(sec);
});

// timeline: highlight the chapter in view and fill the progress bar
const frames = [...strip.children];
const sections = [...main.children];
let active = -1;
function onScroll() {
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
addEventListener("scroll", onScroll, { passive: true });
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
function openLightbox(i) {
  show(i);
  box.showModal();
}
$(".lightbox__close").addEventListener("click", () => box.close());
$(".lightbox__prev").addEventListener("click", () => show(cur - 1));
$(".lightbox__next").addEventListener("click", () => show(cur + 1));
box.addEventListener("click", (e) => e.target.classList.contains("lightbox__stage") && box.close());
box.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") show(cur + 1);
  if (e.key === "ArrowLeft") show(cur - 1);
});
let sx = null, sy = 0;
box.addEventListener("pointerdown", (e) => ((sx = e.clientX), (sy = e.clientY)));
box.addEventListener("pointerup", (e) => {
  if (sx === null) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  sx = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1));
});
