/**
 * sketch.js — hand-drawn stick-figure layer for the "sketch" theme of the ReState page.
 * ---------------------------------------------------------------------------
 * Loaded only for index.html?theme=sketch (THEME LOADER in index.html), after vendor/rough.js.
 * main.js > initThemeHooks() calls Sketch.init() once all page content has been rendered.
 * Styling (paper, fonts, colors) lives in theme-sketch.css.
 *
 * Sections (search for the "=====" banners):
 *   1. helpers                — colors are read from theme-sketch.css variables
 *   2. stick-figure engine    — skeleton, pose library (P), accessories (ACC), Actor class
 *   3. rough.js frames        — DECOR table: which selector gets which hand-drawn frame (KIND)
 *   4. scenes                 — hero whiteboard, TL;DR professor, demo walker, hero sticky-note
 *                               figures, domain figures, perched characters, paradigm relay
 *   5. background crowd       — fixed strip at the bottom of the window (8 characters + a dog)
 *   6. cursor stick figure    — replaces the mouse pointer on fine-pointer devices
 *   7. doodles, main loop, init
 *
 * Quick edits:
 *   - crowd characters / texts .......... makeCrowd()
 *   - which boxes get which frame ........ DECOR
 *   - hero whiteboard storyboard ........ SEQ inside heroScene()
 *   - per-domain figures ................ DOMAIN_FIG
 * Accessibility: prefers-reduced-motion -> everything drawn once, no animation, normal cursor.
 * Touch / coarse pointer -> no cursor figure, crowd reduced to 3 characters.
 */
(function () {
'use strict';

/* ============================== 1. helpers ============================== */
const NS = 'http://www.w3.org/2000/svg';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const svgEl = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const f1 = v => Math.round(v * 10) / 10;
const hash = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
let C = {};   // colors, filled in init()

/* ======================== 2. stick-figure engine ======================== */
/* Units: figure units (scaled by actor.k). Origin = ground point under the hip.
   Angles: radians measured from "straight down"; positive swings toward the facing direction.
   arm: a1 = shoulder angle, a2 = elbow bend (relative). leg: l1 = hip angle, l2 = knee bend (relative, <=0). */
const BONE = { torso: 18, neck: 3, head: 8, ua: 11, fa: 10.5, th: 12.5, sh: 12.5 };
const LEG = BONE.th + BONE.sh;
const dv = a => [Math.sin(a), Math.cos(a)];
const add = (p, v, l) => [p[0] + v[0] * l, p[1] + v[1] * l];
const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };

function skeleton(p, k) {
  let hipH;
  if (p.ground === false) hipH = LEG - (p.drop || 0);
  else {
    const legH = (l1, l2) => BONE.th * Math.cos(l1) + BONE.sh * Math.cos(l1 + l2);
    hipH = Math.max(legH(p.lL1, p.lL2), legH(p.lR1, p.lR2)) - (p.drop || 0);
  }
  const hip = [0, -hipH * k];
  const up = [Math.sin(p.lean || 0), -Math.cos(p.lean || 0)];
  const sh = add(hip, up, BONE.torso * k);
  const neck = add(sh, up, BONE.neck * k);
  const head = add(neck, up, BONE.head * k);
  const eL = add(sh, dv(p.aL1), BONE.ua * k), hL = add(eL, dv(p.aL1 + p.aL2), BONE.fa * k);
  const eR = add(sh, dv(p.aR1), BONE.ua * k), hR = add(eR, dv(p.aR1 + p.aR2), BONE.fa * k);
  const kL = add(hip, dv(p.lL1), BONE.th * k), fL = add(kL, dv(p.lL1 + p.lL2), BONE.sh * k);
  const kR = add(hip, dv(p.lR1), BONE.th * k), fR = add(kR, dv(p.lR1 + p.lR2), BONE.sh * k);
  return { hip, sh, neck, head, hr: BONE.head * k, eL, hL, eR, hR, kL, fL, kR, fR, k, up };
}

/* hand-drawn primitives: slightly bowed polyline + open-ended circle; "boil" = seed changes 8x/s */
function jline(pts, J, seed) {
  let d = `M${f1(pts[0][0] + hash(seed) * J)} ${f1(pts[0][1] + hash(seed + 1) * J)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const mx = (a[0] + b[0]) / 2 + hash(seed + i * 3) * J * 1.5, my = (a[1] + b[1]) / 2 + hash(seed + i * 3 + 1) * J * 1.5;
    d += ` Q${f1(mx)} ${f1(my)} ${f1(b[0] + hash(seed + i * 5) * J)} ${f1(b[1] + hash(seed + i * 5 + 2) * J)}`;
  }
  return d;
}
function jcircle(c, r, seed) {
  const a = hash(seed) * 3, r1 = r * (1 + hash(seed + 1) * 0.07), r2 = r * (1 + hash(seed + 2) * 0.07);
  const p = (ang, rr) => [c[0] + Math.cos(ang) * rr, c[1] + Math.sin(ang) * rr];
  const A = p(a, r1), B = p(a + Math.PI, r2), A2 = p(a + 0.3, r1 * 1.05);
  return `M${f1(A[0])} ${f1(A[1])} A${f1(r1)} ${f1(r2)} 0 1 1 ${f1(B[0])} ${f1(B[1])} A${f1(r2)} ${f1(r1)} 0 1 1 ${f1(A2[0])} ${f1(A2[1])}`;
}
const pt = p => `${f1(p[0])} ${f1(p[1])}`;
/* text that stays readable when the figure is mirrored */
const T = (x, y, s, size, flip, anchor = 'middle', fill) =>
  `<text text-anchor="${anchor}" font-size="${f1(size)}" ${fill ? `style="fill:${fill}"` : ''} transform="translate(${f1(x)} ${f1(y)}) scale(${flip < 0 ? -1 : 1} 1)">${s}</text>`;

/* ---------- pose library: functions (t, actor) -> joint angles ---------- */
const STAND = { lean: 0, drop: 0, aL1: -0.18, aL2: 0.15, aR1: 0.18, aR2: 0.15, lL1: -0.13, lL2: 0, lR1: 0.13, lR2: 0 };
const P = {
  stand: t => ({ ...STAND, drop: 0.3 + 0.3 * Math.sin(t * 2.2), aL2: 0.15 + 0.06 * Math.sin(t * 2.2) }),
  walk: (ph, amp = 1) => {
    const s = Math.sin(ph), c = Math.cos(ph);
    return { lean: 0.06, drop: 0, lR1: 0.48 * s * amp, lR2: -0.8 * Math.max(0, c) * amp, lL1: -0.48 * s * amp, lL2: -0.8 * Math.max(0, -c) * amp,
      aR1: -0.45 * s * amp, aR2: 0.3, aL1: 0.45 * s * amp, aL2: 0.3 };
  },
  run: ph => {
    const s = Math.sin(ph), c = Math.cos(ph);
    return { lean: 0.3, drop: 0, lR1: 0.85 * s + 0.15, lR2: -1.5 * Math.max(0, c) - 0.25, lL1: -0.85 * s + 0.15, lL2: -1.5 * Math.max(0, -c) - 0.25,
      aR1: -0.95 * s + 0.25, aR2: 1.6, aL1: 0.95 * s + 0.25, aL2: 1.6 };
  },
  wave: t => ({ ...STAND, aR1: 2.65, aR2: 0.45 * Math.sin(t * 10) }),
  point: t => ({ ...STAND, aR1: 1.45 + 0.05 * Math.sin(t * 3), aR2: 0.05 }),
  talk: t => ({ ...STAND, lean: -0.04, aR1: 1.85 + 0.22 * Math.sin(t * 4), aR2: 0.1, aL1: 0.5 + 0.12 * Math.sin(t * 4 + 1), aL2: 1.0 }),
  sit: t => ({ ground: false, lean: -0.05, drop: LEG, aL1: -0.35, aL2: 0.6, aR1: 0.35, aR2: 0.6,
    lL1: 1.5, lL2: -1.5 + 0.3 * Math.sin(t * 3), lR1: 1.42, lR2: -1.42 + 0.3 * Math.sin(t * 3 + 1.6) }),
  read: t => ({ ...P.sit(t * 0.4), aR1: 0.95, aR2: 0.95, aL1: 0.75, aL2: 1.15 }),
  think: t => ({ ...STAND, aR1: 0.45, aR2: 2.55, aL1: 0.3, aL2: 1.25 + 0.05 * Math.sin(t * 2) }),
  cheer: t => ({ ...STAND, aR1: 2.6 + 0.2 * Math.sin(t * 9), aR2: 0.3, aL1: -2.6 - 0.2 * Math.sin(t * 9), aL2: -0.3 }),
  carry: ph => ({ ...P.walk(ph, 0.8), aR1: 2.8, aR2: 0.25, aL1: -2.8, aL2: -0.25 }),
  push: ph => ({ ...P.walk(ph, 0.9), lean: 0.55, aR1: 1.35, aR2: 0.15, aL1: 1.15, aL2: 0.3 }),
  scratch: t => ({ ...STAND, lean: -0.03, aR1: 2.5, aR2: 1.85 + 0.35 * Math.sin(t * 14), aL1: -0.2, aL2: 0.25 }),
  draw: t => ({ ...STAND, aR1: 2.55 + 0.12 * Math.sin(t * 11), aR2: 0.25 + 0.1 * Math.sin(t * 7), aL1: -0.2, aL2: 0.4 }),
  erase: t => ({ ...STAND, aR1: 2.5 + 0.28 * Math.sin(t * 22), aR2: 0.25, aL1: -0.2, aL2: 0.4 }),
  hold: t => ({ ...STAND, aR1: 0.95, aR2: 0.85, aL1: 0.75, aL2: 1.1, drop: 0.3 * Math.sin(t * 2) }),
  crouch: () => ({ lean: 0.35, drop: 0, lL1: 0.95, lL2: -1.95, lR1: 1.05, lR2: -2.05, aR1: 0.7, aR2: 0.5, aL1: 0.5, aL2: 0.6 }),
  jump: () => ({ ...STAND, aR1: 2.5, aR2: 0.2, aL1: -2.5, aL2: -0.2, lL1: 0.5, lL2: -1.0, lR1: 0.25, lR2: -0.7 }),
  hang: t => ({ ground: false, drop: 0, lean: 0, aL1: -3.0, aL2: 0, aR1: 3.0, aR2: 0,
    lL1: 0.3 * Math.sin(t * 5), lL2: -0.4, lR1: -0.3 * Math.sin(t * 5), lR2: -0.4 }),
  rope: (t, a) => { const c = Math.cos(a.ropePh * Math.PI * 2);
    return { ...STAND, aR1: 0.8 + 0.25 * c, aR2: 0.3, aL1: -0.8 - 0.25 * c, aL2: -0.3, lL1: -0.1, lL2: -0.35, lR1: 0.12, lR2: -0.35 }; },
  lying: () => ({ ...STAND, aR1: 1.2, aR2: 0.3, aL1: -1.0, aL2: 0.2 }),
};
const KEYS = ['lean', 'drop', 'aL1', 'aL2', 'aR1', 'aR2', 'lL1', 'lL2', 'lR1', 'lR2'];
function blendInto(cur, tgt, a) {
  for (const k of KEYS) cur[k] = lerp(cur[k] ?? 0, tgt[k] ?? 0, a);
  cur.ground = tgt.ground;
}

/* ---------- accessories: (J, actor, now) -> SVG markup, drawn in figure space ---------- */
const ACC = {
  glasses: J => { const k = J.k, c = [J.head[0] + J.hr * 0.42, J.head[1] - J.hr * 0.08];
    return `<circle class="sk-thin" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(2.7 * k)}"/><path class="sk-thin" d="M${pt([c[0] - 2.7 * k, c[1]])} L${pt([J.head[0] - J.hr * 0.55, c[1] - k])}"/>`; },
  cap: J => { const h = J.head, r = J.hr;
    return `<path class="sk-fillink" d="M${pt([h[0] - r * 1.02, h[1] - r * 0.15])} Q${pt([h[0], h[1] - r * 1.55])} ${pt([h[0] + r * 1.02, h[1] - r * 0.15])} Z"/><path d="M${pt([h[0] + r * 0.5, h[1] - r * 0.3])} L${pt([h[0] + r * 1.8, h[1] - r * 0.12])}"/>`; },
  gradcap: J => { const h = J.head, r = J.hr, y = h[1] - r * 0.95;
    return `<path class="sk-fillink" d="M${pt([h[0] - r * 1.5, y])} L${pt([h[0], y - r * 0.55])} L${pt([h[0] + r * 1.5, y])} L${pt([h[0], y + r * 0.45])} Z"/><path class="sk-thin" d="M${pt([h[0], y])} L${pt([h[0] + r * 1.3, y + r * 0.2])} L${pt([h[0] + r * 1.3, y + r * 1.1])}"/>`; },
  stick: J => { const u = unit(J.eR, J.hR); return `<path class="sk-thin" style="stroke:#8a5a32;stroke-width:${f1(1.6 * J.k)}" d="M${pt(J.hR)} L${pt(add(J.hR, u, 22 * J.k))}"/>`; },
  marker: J => { const u = unit(J.eR, J.hR); return `<path style="stroke:${C.state};stroke-width:${f1(3 * J.k)}" d="M${pt(J.hR)} L${pt(add(J.hR, u, 4 * J.k))}"/>`; },
  chalk: J => { const u = unit(J.eR, J.hR); return `<path style="stroke:#f4f1e8;stroke-width:${f1(2.6 * J.k)}" d="M${pt(J.hR)} L${pt(add(J.hR, u, 4 * J.k))}"/>`; },
  eraser: J => `<rect x="${f1(J.hR[0] - 4 * J.k)}" y="${f1(J.hR[1] - 6 * J.k)}" width="${f1(9 * J.k)}" height="${f1(5 * J.k)}" style="fill:#f4a6b8"/>`,
  baton: J => { const u = unit(J.eR, J.hR); return `<path style="stroke:${C.state};stroke-width:${f1(3.2 * J.k)}" d="M${pt(add(J.hR, u, -3 * J.k))} L${pt(add(J.hR, u, 7 * J.k))}"/>`; },
  book: J => { const m = [(J.hL[0] + J.hR[0]) / 2, (J.hL[1] + J.hR[1]) / 2], k = J.k;
    return `<path style="fill:#fffdf6" d="M${pt([m[0] - 7 * k, m[1] - 6 * k])} L${pt([m[0], m[1] - 4 * k])} L${pt([m[0] + 7 * k, m[1] - 6 * k])} L${pt([m[0] + 7 * k, m[1] + 3 * k])} L${pt([m[0], m[1] + 5 * k])} L${pt([m[0] - 7 * k, m[1] + 3 * k])} Z M${pt([m[0], m[1] - 4 * k])} L${pt([m[0], m[1] + 5 * k])}"/>`; },
  sign: (J, a) => { const k = J.k, cx = (J.hL[0] + J.hR[0]) / 2, top = Math.min(J.hL[1], J.hR[1]) - 17 * k, w = 46 * k, h = 17 * k;
    return `<path class="sk-thin" d="M${pt(J.hL)} L${pt([cx - 10 * k, top + h])} M${pt(J.hR)} L${pt([cx + 10 * k, top + h])}"/>` +
      `<rect x="${f1(cx - w / 2)}" y="${f1(top)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(2 * k)}" style="stroke-width:${f1(1.6 * k)}"/>` +
      T(cx, top + h * 0.78, a.signText || '', 13 * k, a.flipSign); },
  papers: J => { const k = J.k, cx = (J.hL[0] + J.hR[0]) / 2, y = Math.min(J.hL[1], J.hR[1]);
    let s = ''; for (let i = 0; i < 4; i++) s += `<rect x="${f1(cx - 11 * k + (i % 2) * k)}" y="${f1(y - (i + 1) * 3.4 * k)}" width="${f1(22 * k)}" height="${f1(3.2 * k)}" style="stroke-width:${f1(1.1 * k)}"/>`;
    return s; },
  flask: (J, a, now) => { const k = J.k, h = J.hR, b = (now / 300) % 1;
    return `<path style="fill:${C.ok}55" d="M${pt([h[0] - 2 * k, h[1] - 9 * k])} L${pt([h[0] - 2 * k, h[1] - 4 * k])} L${pt([h[0] - 6 * k, h[1] + 4 * k])} L${pt([h[0] + 6 * k, h[1] + 4 * k])} L${pt([h[0] + 2 * k, h[1] - 4 * k])} L${pt([h[0] + 2 * k, h[1] - 9 * k])}"/>` +
      `<circle class="sk-thin" cx="${f1(h[0] + 1 * k)}" cy="${f1(h[1] - 11 * k - b * 8 * k)}" r="${f1(1.3 * k)}"/>`; },
  cup: (J, a, now) => { const k = J.k, h = J.hR, w = Math.sin(now / 300) * 1.5 * k;
    return `<rect x="${f1(h[0] - 3 * k)}" y="${f1(h[1] - 5 * k)}" width="${f1(6 * k)}" height="${f1(7 * k)}" style="stroke-width:${f1(1.3 * k)}"/>` +
      `<path class="sk-thin" d="M${pt([h[0] - 1 * k, h[1] - 7 * k])} q${f1(w)} ${f1(-3 * k)} 0 ${f1(-6 * k)} M${pt([h[0] + 2 * k, h[1] - 7 * k])} q${f1(-w)} ${f1(-3 * k)} 0 ${f1(-6 * k)}"/>`; },
  binoc: J => { const k = J.k, c = [J.head[0] + J.hr * 0.95, J.head[1]];
    return `<circle cx="${f1(c[0])}" cy="${f1(c[1] - 1.8 * k)}" r="${f1(2.2 * k)}" class="sk-fillink"/><circle cx="${f1(c[0])}" cy="${f1(c[1] + 2.2 * k)}" r="${f1(2.2 * k)}" class="sk-fillink"/>`; },
  steth: J => { const k = J.k, s = J.sh;
    return `<path class="sk-thin" style="stroke:${C.stage}" d="M${pt([s[0] - 3 * k, s[1] - 2 * k])} Q${pt([s[0] - 3 * k, s[1] + 9 * k])} ${pt([s[0] + 2 * k, s[1] + 8 * k])} L${pt(J.hR)}"/><circle cx="${f1(J.hR[0])}" cy="${f1(J.hR[1])}" r="${f1(2.2 * k)}" style="stroke:${C.stage}"/>`; },
  wheel: J => { const k = J.k, c = [J.sh[0] + 13 * k, J.sh[1] + 8 * k];
    return `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(7 * k)}" style="stroke-width:${f1(2 * k)}"/><path class="sk-thin" d="M${pt([c[0] - 7 * k, c[1]])} L${pt([c[0] + 7 * k, c[1]])} M${pt(c)} L${pt([c[0], c[1] + 7 * k])}"/>`; },
  ruler: J => { const k = J.k, h = J.hR;
    return `<path style="stroke:${C.stage};stroke-width:${f1(2.4 * k)}" d="M${pt([h[0] - 2 * k, h[1] + 2 * k])} L${pt([h[0] + 18 * k, h[1] - 8 * k])}"/>` +
      `<path class="sk-thin" d="M${pt(J.hL)} L${pt([J.hL[0] - 3 * k, J.hL[1] + 10 * k])} M${pt(J.hL)} L${pt([J.hL[0] + 4 * k, J.hL[1] + 10 * k])}"/>`; },
  bars: J => { const k = J.k, x = 16 * k; let s = '';
    [[0, 8], [5, 13], [10, 19]].forEach(([dx, h], i) => { s += `<rect x="${f1(x + dx * k)}" y="${f1(-h * k)}" width="${f1(4 * k)}" height="${f1(h * k)}" style="fill:${[C.stage, C.mind, C.state][i]};stroke-width:${f1(k)}"/>`; });
    return s; },
  magnifier: J => { const k = J.k, u = unit(J.eR, J.hR), c = add(J.hR, u, 7 * k);
    return `<path style="stroke-width:${f1(2 * k)}" d="M${pt(J.hR)} L${pt(add(J.hR, u, 3 * k))}"/><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(4.2 * k)}" style="fill:#d8ecf8aa"/>`; },
  wrench: J => { const k = J.k, u = unit(J.eR, J.hR), e = add(J.hR, u, 9 * k);
    return `<path style="stroke:#7a7a7a;stroke-width:${f1(2.2 * k)}" d="M${pt(J.hR)} L${pt(e)}"/><circle cx="${f1(e[0])}" cy="${f1(e[1])}" r="${f1(2.6 * k)}" style="stroke:#7a7a7a"/>`; },
};

/* ---------- reactions (wave / jump / fall) triggered by the cursor or by clicks ---------- */
const REACT = {
  wave: (a, e) => P.wave(a.t),
  jump: (a, e) => { a.jump = e < 560 ? Math.sin(Math.PI * e / 560) * 16 * a.k : 0; return P.jump(); },
  fall: (a, e) => {
    a.rot = e < 260 ? -90 * e / 260 : e < 1150 ? -90 : e < 1500 ? -90 * (1 - (e - 1150) / 350) : 0;
    return P.lying();
  },
  cheer: (a, e) => { a.jump = Math.abs(Math.sin(e / 160)) * 6 * a.k; return P.cheer(a.t); },
};

let ACTOR_N = 0;
class Actor {
  /* options: parent (element for own <svg>) or g (group inside an existing svg); k scale; x,y ground point;
     dir 1/-1; poseFn(t, actor); brain(dt, now); acc [names]; extra(J, actor, now); custom(now) for non-humans */
  constructor(o) {
    Object.assign(this, { k: 1, x: 0, y: 0, dir: 1, t: Math.random() * 10, rot: 0, jump: 0, vis: true, active: true,
      box: [-42, -104, 84, 114], acc: [], poseFn: P.stand, id: ++ACTOR_N, cooldown: 0 }, o);
    this.pose = { ...STAND };
    this.flipVis = this.dir;
    if (!this.g) {
      const [l, t, w, h] = this.box.map(v => v * this.k);
      this.svg = svgEl('svg', { class: 'sk-actor ' + (this.cls || ''), viewBox: `${f1(l)} ${f1(t)} ${f1(w)} ${f1(h)}`, width: f1(w), height: f1(h), 'aria-hidden': 'true' });
      if (this.z != null) this.svg.style.zIndex = this.z;
      if (this.hit) {
        const k = this.k, r = svgEl('rect', { class: 'sk-hit', x: -14 * k, y: -66 * k, width: 28 * k, height: 66 * k }, this.svg);
        r.addEventListener('click', e => { e.stopPropagation(); this.trigger(this._alt ? 'fall' : 'jump', performance.now(), this._alt ? 1550 : 600, this._alt ? 'oof!' : 'wheee!'); this._alt = !this._alt; });
      }
      this.g = svgEl('g', {}, this.svg);
      (this.parent || document.body).appendChild(this.svg);
    }
    this.gi = svgEl('g', {}, this.g);
  }
  trigger(type, now, ms, say) {
    this.react = { type, start: now, until: now + ms };
    if (say) this.say = { text: say, until: now + ms };
  }
  step(dt, now) {
    this.t += dt / 1000;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.brain) this.brain(dt, now);
    let tgt;
    const r = this.react;
    if (r && now < r.until) tgt = REACT[r.type](this, now - r.start);
    else {
      if (r) { this.react = null; this.rot = 0; this.jump = this.baseJump || 0; }
      tgt = this.poseFn(this.t, this);
    }
    blendInto(this.pose, tgt, this.snap ? 1 : 0.3);
    this.flipVis = lerp(this.flipVis, this.dir, 0.3);
  }
  place() {
    if (this.svg) this.svg.style.transform = `translate(${f1(this.x + this.box[0] * this.k)}px,${f1(this.y + this.box[1] * this.k)}px)`;
    else this.g.setAttribute('transform', `translate(${f1(this.x)} ${f1(this.y)})`);
  }
  render(now) {
    const J = this.custom ? null : skeleton(this.pose, this.k);
    if (this.anchor) this.anchor(J);
    this.place();
    const flip = Math.abs(this.flipVis) < 0.08 ? 0.08 * Math.sign(this.dir) : this.flipVis;
    const sw = clamp(2.1 * this.k, 1.3, 4.2);
    this.gi.setAttribute('transform', `translate(0 ${f1(-this.jump)}) rotate(${f1(this.rot)}) scale(${f1(flip)} 1)`);
    this.gi.setAttribute('stroke-width', f1(sw));
    let m;
    if (this.custom) m = this.custom(now);
    else {
      const seed = (Math.floor(now / 125) + this.id * 1013) % 100000, jt = 0.5 * Math.min(this.k, 1.6);
      const body = [jline([J.hip, J.sh], jt, seed), jline([J.sh, J.eL, J.hL], jt, seed + 11), jline([J.sh, J.eR, J.hR], jt, seed + 23),
        jline([J.hip, J.kL, J.fL], jt, seed + 37), jline([J.hip, J.kR, J.fR], jt, seed + 51)].join(' ');
      m = `<path d="${body}"/><path class="sk-head" d="${jcircle(J.head, J.hr, seed + 3)}"/>` +
        `<circle class="sk-eye" cx="${f1(J.head[0] + J.hr * 0.42)}" cy="${f1(J.head[1] - J.hr * 0.12)}" r="${f1(Math.max(0.9, 0.9 * this.k))}"/>`;
      if (this.mood === 'happy') m += `<path class="sk-thin" d="M${pt([J.head[0] + J.hr * 0.1, J.head[1] + J.hr * 0.3])} Q${pt([J.head[0] + J.hr * 0.45, J.head[1] + J.hr * 0.65])} ${pt([J.head[0] + J.hr * 0.75, J.head[1] + J.hr * 0.25])}"/>`;
      if (this.mood === 'sad') m += `<path class="sk-thin" d="M${pt([J.head[0] + J.hr * 0.15, J.head[1] + J.hr * 0.55])} Q${pt([J.head[0] + J.hr * 0.45, J.head[1] + J.hr * 0.3])} ${pt([J.head[0] + J.hr * 0.75, J.head[1] + J.hr * 0.55])}"/>`;
      for (const n of this.acc) m += ACC[n](J, this, now);
      if (this.extra) m += this.extra(J, this, now);
      if (this.say && now < this.say.until) {
        const up = this.sayAbove;   // sayAbove: centered over the head (used when the side is crowded)
        const tx = up ? J.head[0] : J.head[0] + J.hr * 1.2, ty = J.head[1] - J.hr * (up ? 1.9 : 1.5), txt = T(tx, ty, this.say.text, 14 * clamp(this.k, 0.8, 1.6), flip, up ? 'middle' : 'start');
        m += this.rot ? `<g transform="rotate(${f1(-this.rot * Math.sign(flip))} ${f1(tx)} ${f1(ty)})">${txt}</g>` : txt;   // keep speech upright
      }
    }
    this.gi.innerHTML = m;
  }
}

/* ========================== 3. rough.js frames ========================== */
const TAPE = ['rgba(255,214,102,.62)', 'rgba(140,200,240,.58)', 'rgba(244,160,180,.58)', 'rgba(160,220,170,.6)'];
const NOTE = [['#fff3a3', '#e9cf4f'], ['#ffd6e0', '#e79ab0'], ['#d4ebff', '#8fbde6'], ['#d9f5cf', '#93cf80']];
const DOMC = ['#e85d75', '#f4a261', '#8ab17d', '#2a9d8f', '#457b9d', '#9b5de5', '#e9c46a', '#6d6875'];
const PADS = { chalkboard: 44, bubble: 40, step: 34, think: 44, clip: 26, board: 18, strike: 10, ul: 12, select: 12, circ: 12 };
let R0;   // base rough options

function tape(s, x, y, deg, col, w = 62, h = 19) {
  let d = `M0 0 L${w} 0`;
  for (let j = 1; j <= 5; j++) d += ` L${w - (j % 2 ? 3 : 0)} ${f1(j * h / 5)}`;
  d += ` L0 ${h}`;
  for (let j = 4; j >= 0; j--) d += ` L${j % 2 ? 3 : 0} ${f1(j * h / 5)}`;
  svgEl('path', { d: d + 'Z', fill: col, class: 'sk-tape', transform: `translate(${f1(x)} ${f1(y)}) rotate(${deg})` }, s);
}
const roundRectPath = (x, y, w, h, r) =>
  `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y}Z`;

/* KIND[name](rc, svg, w, h, pad, index, element) draws one frame. (pad,pad) is the element's top-left. */
const KIND = {
  card(rc, s, w, h, p, i) {
    s.append(rc.rectangle(p, p, w, h, { ...R0, fill: C.card, fillStyle: 'solid', seed: 11 + i }));
    tape(s, p + 18 + (i % 3) * 14, p - 8, -7 + (i % 2) * 3, TAPE[i % 4]);
    if (w > 260) tape(s, p + w - 74, p - 6, 7, TAPE[(i + 1) % 4]);
  },
  frame(rc, s, w, h, p, i) { s.append(rc.rectangle(p, p, w, h, { ...R0, fill: C.card, fillStyle: 'solid', seed: 31 + i })); },
  clip(rc, s, w, h, p, i) {
    KIND.card(rc, s, w, h, p, i + 2);
    s.append(rc.path(`M${p + 34} ${p - 14} v34 a6 6 0 0 0 12 0 v-38 a9 9 0 0 0 -18 0 v42`, { stroke: '#8d8d8d', strokeWidth: 2.4, roughness: 0.4, seed: 5 }));
  },
  note(rc, s, w, h, p, i) {
    const [c1, c2] = NOTE[i % 4], F = 16;
    const pts = [[p, p], [p + w, p + 1], [p + w, p + h - F], [p + w - F, p + h], [p + 1, p + h]];
    svgEl('polygon', { points: pts.map(q => `${q[0] + 3},${q[1] + 4}`).join(' '), fill: 'rgba(0,0,0,.09)' }, s);
    svgEl('polygon', { points: pts.map(q => q.join(',')).join(' '), fill: c1 }, s);
    s.append(rc.polygon(pts, { fill: c2, fillStyle: 'hachure', hachureGap: 7, fillWeight: 0.5, hachureAngle: -41 + i * 9, stroke: 'none', roughness: 1.2, seed: 41 + i }));
    svgEl('rect', { x: p, y: p, width: w, height: 11, fill: c2, opacity: 0.35 }, s);
    svgEl('polygon', { points: `${p + w},${p + h - F} ${p + w - F},${p + h} ${p + w - F + 2},${p + h - F + 2}`, fill: c2 }, s);
    s.append(rc.polygon(pts, { stroke: 'rgba(43,43,43,.45)', strokeWidth: 1, roughness: 0.9, seed: 61 + i }));
  },
  bubble(rc, s, w, h, p, i) {
    const r = 18, ty = Math.min(46, h * 0.5);
    const d = `M${p + r} ${p} H${p + w - r} Q${p + w} ${p} ${p + w} ${p + r} V${p + h - r} Q${p + w} ${p + h} ${p + w - r} ${p + h} H${p + r} Q${p} ${p + h} ${p} ${p + h - r} V${p + ty + 12} L${p - 30} ${p + ty + 4} L${p} ${p + ty - 6} V${p + r} Q${p} ${p} ${p + r} ${p}Z`;
    s.append(rc.path(d, { ...R0, fill: C.card, fillStyle: 'solid', strokeWidth: 2, roughness: 1.1, seed: 71 }));
  },
  index(rc, s, w, h, p, i, el) {
    s.append(rc.rectangle(p, p, w, h, { ...R0, fill: '#fffef9', fillStyle: 'solid', seed: 81 + i }));
    const b = el.querySelector('b'), ly = p + (b ? b.offsetTop + b.offsetHeight + 4 : 36);
    s.append(rc.line(p + 4, ly, p + w - 4, ly, { stroke: 'rgba(209,52,44,.55)', strokeWidth: 1.4, roughness: 0.7, seed: 91 + i }));
    for (let y = ly + 22; y < p + h - 6; y += 22) s.append(rc.line(p + 4, y, p + w - 4, y, { stroke: 'rgba(70,120,190,.28)', strokeWidth: 1, roughness: 0.5, seed: 95 + y }));
    const cx = p + w / 2;
    svgEl('ellipse', { cx: cx + 2, cy: p + 4, rx: 8, ry: 5, fill: 'rgba(0,0,0,.15)' }, s);
    svgEl('circle', { cx, cy: p, r: 7.5, fill: C.err }, s);
    svgEl('circle', { cx: cx - 2.5, cy: p - 2.5, r: 2.2, fill: 'rgba(255,255,255,.7)' }, s);
  },
  step(rc, s, w, h, p, i, el) {
    s.append(rc.rectangle(p, p, w, h, { ...R0, fill: C.card, fillStyle: 'solid', seed: 101 + i }));
    const nx = el.nextElementSibling;
    if (!nx) return;
    const o = { stroke: C.state, strokeWidth: 2.2, roughness: 1, seed: 111 + i };
    if (nx.offsetTop > el.offsetTop + h / 2) {     // stacked (mobile): arrow down
      const x = p + w / 2, y1 = p + h + 3, y2 = p + h + 24;
      s.append(rc.curve([[x, y1], [x + 7, (y1 + y2) / 2], [x, y2]], o), rc.line(x, y2, x - 6, y2 - 7, o), rc.line(x, y2, x + 6, y2 - 7, o));
    } else {
      const y = p + h * 0.45, x1 = p + w + 3, x2 = p + w + 25;
      s.append(rc.curve([[x1, y], [(x1 + x2) / 2, y - 9], [x2, y + 2]], o), rc.line(x2, y + 2, x2 - 8, y - 4, o), rc.line(x2, y + 2, x2 - 7, y + 8, o));
    }
  },
  dom(rc, s, w, h, p, i) {
    s.append(rc.rectangle(p, p, w, h, { ...R0, fill: '#fffef9', fillStyle: 'solid', seed: 121 + i }));
    s.append(rc.rectangle(p + 5, p + 5, w - 10, 9, { fill: DOMC[i % 8], fillStyle: 'zigzag', hachureGap: 3.5, fillWeight: 1.2, stroke: 'none', roughness: 1, seed: 131 + i }));
  },
  polaroid(rc, s, w, h, p, i) {
    svgEl('rect', { x: p + 4, y: p + 5, width: w, height: h, fill: 'rgba(0,0,0,.10)' }, s);
    s.append(rc.rectangle(p, p, w, h, { fill: '#fffefb', fillStyle: 'solid', stroke: 'rgba(43,43,43,.45)', strokeWidth: 1.2, roughness: 0.8, seed: 141 + i }));
    tape(s, p + w / 2 - 34, p - 9, -3 + (i % 3) * 3, TAPE[(i + 2) % 4], 68, 20);
  },
  think(rc, s, w, h, p, i) {
    s.append(rc.path(roundRectPath(p, p, w, h, 22), { ...R0, fill: C.card, fillStyle: 'solid', strokeWidth: 1.9, seed: 151 }));
    [[38, -12, 16], [24, -27, 10], [14, -38, 6]].forEach(([dx, dy, d], j) =>
      s.append(rc.circle(p + dx, p + dy, d, { ...R0, fill: C.card, fillStyle: 'solid', strokeWidth: 1.6, seed: 155 + j })));
  },
  tag(rc, s, w, h, p, i) {
    s.append(rc.rectangle(p, p, w, h, { ...R0, fill: NOTE[(i + 1) % 4][0], fillStyle: 'solid', seed: 161 + i }));
    s.append(rc.circle(p + 13, p + h / 2, 8, { ...R0, fill: C.paper, fillStyle: 'solid', seed: 171 + i }));
    s.append(rc.curve([[p + 13, p + h / 2], [p - 6, p + h / 2 - 9], [p - 12, p + h / 2 + 4]], { stroke: '#8a5a32', strokeWidth: 1.4, roughness: 1, seed: 175 + i }));
  },
  board(rc, s, w, h, p) {
    s.append(rc.rectangle(p, p, w, h, { fill: '#2f4a3a', fillStyle: 'solid', stroke: '#8a5a32', strokeWidth: 7, roughness: 1.6, bowing: 1, seed: 181 }));
    s.append(rc.rectangle(p + w * 0.2, p + h + 3, w * 0.6, 7, { fill: '#a87443', fillStyle: 'solid', stroke: '#6e4523', strokeWidth: 1.4, roughness: 1, seed: 183 }));
    svgEl('rect', { x: p + w * 0.3, y: p + h, width: 14, height: 4, fill: '#f4f1e8', transform: `rotate(-6 ${p + w * 0.3} ${p + h})` }, s);
    svgEl('rect', { x: p + w * 0.36, y: p + h + 1, width: 10, height: 4, fill: '#f6c7d4' }, s);
  },
  btn(rc, s, w, h, p, i, el) {
    const onBoard = !!el.closest('.bib, .title-board'), on = el.classList.contains('on'), hot = el.classList.contains('primary') || el.classList.contains('play');
    const o = { ...R0, stroke: onBoard ? '#f4f1e8' : C.ink, strokeWidth: 1.7, roughness: 1.4, seed: 191 + i };
    if (on || hot) Object.assign(o, { fill: el.classList.contains('play') ? C.state : C.marker,
      fillStyle: onBoard ? 'solid' : 'hachure', hachureGap: 3.5, fillWeight: 1.4, hachureAngle: -50 });   // solid on the dark board so the label stays readable
    else if (el._skHover) Object.assign(o, { fill: onBoard ? 'rgba(244,241,232,.5)' : 'rgba(43,43,43,.35)', fillStyle: 'hachure', hachureGap: 5, fillWeight: 0.8 });
    s.append(rc.rectangle(p, p, w, h, o));
  },
  select(rc, s, w, h, p, i, el) {
    const on = el.querySelector('.on');
    if (!on) return;
    s.append(rc.ellipse(p + on.offsetLeft + on.offsetWidth / 2, p + on.offsetTop + on.offsetHeight / 2, on.offsetWidth + 14, on.offsetHeight + 8,
      { stroke: C.state, strokeWidth: 2.2, roughness: 1.6, seed: 201 + (el._skN = (el._skN || 0) + 1) }));
  },
  circ(rc, s, w, h, p, i) { s.append(rc.ellipse(p + w / 2, p + h / 2, w + 12, h + 10, { stroke: C.state, strokeWidth: 2, roughness: 1.5, seed: 211 + i })); },
  ul(rc, s, w, h, p, i, el) {
    const r = document.createRange(); r.setStartAfter(s); r.setEnd(el, el.childNodes.length);
    const rr = r.getBoundingClientRect(), er = el.getBoundingClientRect();
    const x0 = p + rr.left - er.left, tw = Math.min(rr.width, w), y = p + h - 2, pts = [];
    for (let j = 0; j <= 8; j++) pts.push([x0 + tw * j / 8, y + Math.sin(j * 1.7 + i) * 3]);
    s.append(rc.curve(pts, { stroke: C.state, strokeWidth: 3, roughness: 1.2, seed: 221 + i }));
  },
  strike(rc, s, w, h, p) {
    s.classList.add('sk-top');
    const o = { stroke: C.err, strokeWidth: 5, roughness: 2.2, bowing: 2, seed: 231 };
    s.append(rc.line(p - 6, p + h * 0.58, p + w + 6, p + h * 0.48, o), rc.line(p - 2, p + h * 0.66, p + w + 2, p + h * 0.6, { ...o, strokeWidth: 3, seed: 233 }));
  },
  /* title chalkboard: wood frame + dark green board + chalk dust + tray with chalk and eraser */
  chalkboard(rc, s, w, h, p, i, el) {
    const F = 13, wood = '#a5713f', dark = '#6e4523', grain = { stroke: 'rgba(110,69,35,.5)', strokeWidth: 1, roughness: 1.6, bowing: 2 };
    svgEl('rect', { x: p - F + 6, y: p - F + 8, width: w + 2 * F, height: h + 2 * F, fill: 'rgba(0,0,0,.16)' }, s);   // shadow
    s.append(rc.rectangle(p - F, p - F, w + 2 * F, h + 2 * F, { fill: wood, fillStyle: 'solid', stroke: dark, strokeWidth: 2, roughness: 1, seed: 271 }));
    [p - F + 4, p - F + 8, p + h + 4, p + h + 8].forEach((y, j) => s.append(rc.line(p - F + 6, y, p + w + F - 6, y + 1, { ...grain, seed: 272 + j })));
    [p - F + 5, p + w + 6].forEach((x, j) => s.append(rc.line(x, p - 4, x + 1, p + h + 4, { ...grain, seed: 277 + j })));
    s.append(rc.rectangle(p, p, w, h, { fill: '#2c4637', fillStyle: 'solid', stroke: '#1d3127', strokeWidth: 2.4, roughness: 0.7, seed: 281 }));
    // chalk dust left by the eraser
    [[.2, .76, .34, .2, 30], [.74, .28, .3, .3, 70], [.5, .9, .5, .1, 110]].forEach(([cx, cy, rw, rh, ang], j) =>
      s.append(rc.ellipse(p + w * cx, p + h * cy, w * rw, h * rh, { fill: 'rgba(244,241,232,.07)', fillStyle: 'hachure', hachureGap: 7, fillWeight: 2.2, hachureAngle: ang, stroke: 'none', roughness: 2, seed: 285 + j })));
    if (w > 560) {   // faint leftover notes in the corners
      const n1 = svgEl('text', { x: p + 22, y: p + h - 16, class: 'sk-chalk-note' }, s); n1.textContent = 'S₀ → S₁ ✗ → S₂ ✓';
      const n2 = svgEl('text', { x: p + w - 22, y: p + 30, 'text-anchor': 'end', class: 'sk-chalk-note' }, s); n2.textContent = '(Sₜ₊₁, Âₜ₊₁) = M(X, Sₜ)';
    }
    // tray with chalk sticks and an eraser
    const tx = p + w * 0.14, tw = w * 0.72, ty = p + h + F - 2;
    s.append(rc.rectangle(tx, ty, tw, 9, { fill: '#8a5a32', fillStyle: 'solid', stroke: dark, strokeWidth: 1.6, roughness: 1, seed: 291 }));
    [['#f4f1e8', .2, -4], ['#ffad6e', .27, 3], ['#b3d4fa', .33, -2]].forEach(([c, fx, deg]) =>
      svgEl('rect', { x: tx + tw * fx, y: ty - 5, width: 20, height: 5.5, rx: 2, fill: c, transform: `rotate(${deg} ${tx + tw * fx + 10} ${ty - 2})` }, s));
    svgEl('rect', { x: tx + tw * 0.7, y: ty - 10, width: 38, height: 11, rx: 2, fill: '#5b5f66' }, s);
    svgEl('rect', { x: tx + tw * 0.7, y: ty - 10, width: 38, height: 4.5, rx: 2, fill: '#c58a4f' }, s);
  },
};

/* selector -> frame kind. Order matters only for readability. */
const DECOR = [
  ['.title-board', 'chalkboard'],
  ['.card, .paradigm-wrap, .wide-fig', 'card'],
  ['.evidence', 'clip'],
  ['.hero .stat, .ds-stats > div', 'note'],
  ['.tldr p', 'bubble'],
  ['.fd', 'index'],
  ['.pipeline li', 'step'],
  ['.dom', 'dom'],
  ['.q-panel, .gcard', 'polaroid'],
  ['.r-card', 'think'],
  ['.props li', 'tag'],
  ['.timeline', 'frame'],
  ['.bib', 'board'],
  ['.btn, .mini, .copy, .case-tabs button, .ut', 'btn'],
  ['.seg, .toggle', 'select'],
  ['.sec-num', 'circ'],
  ['.sec-head h2', 'ul'],
];

const pending = new Set(); let rafDeco = 0;
const queue = el => { pending.add(el); if (!rafDeco) rafDeco = requestAnimationFrame(flushDeco); };
function flushDeco() { rafDeco = 0; const list = [...pending]; pending.clear(); list.forEach(drawDeco); }
const ro = new ResizeObserver(es => es.forEach(e => queue(e.target)));
function drawDeco(el) {
  const d = el._sk, w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return;
  const p = d.pad;
  d.svg.setAttribute('width', w + 2 * p); d.svg.setAttribute('height', h + 2 * p);
  d.svg.style.width = (w + 2 * p) + 'px'; d.svg.style.height = (h + 2 * p) + 'px';   // beats rules like ".btn svg {width:16px}"
  d.svg.innerHTML = '';
  KIND[d.kind](rough.svg(d.svg), d.svg, w, h, p, d.i, el);
}
function deco(el, kind, i) {
  if (el._sk) return;
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.classList.add('sk-box');
  const pad = PADS[kind] || 16;
  const svg = svgEl('svg', { class: 'sk-deco', 'aria-hidden': 'true' });
  svg.style.left = svg.style.top = -pad + 'px';
  el._sk = { kind, i, pad, svg };
  el.prepend(svg);
  // some boxes re-render their innerHTML (demo card, timeline) -> put the frame back
  new MutationObserver(() => { if (svg.parentNode !== el) el.prepend(svg); }).observe(el, { childList: true });
  if (kind === 'btn') {
    el.addEventListener('mouseenter', () => { el._skHover = true; queue(el); });
    el.addEventListener('mouseleave', () => { el._skHover = false; queue(el); });
    new MutationObserver(() => queue(el)).observe(el, { attributes: true, attributeFilter: ['class'] });
  }
  if (kind === 'select') new MutationObserver(() => queue(el)).observe(el, { attributes: true, subtree: true, attributeFilter: ['class'] });
  ro.observe(el);
  queue(el);
}
function initDecor() {
  DECOR.forEach(([sel, kind]) => $$(sel).forEach((el, i) => deco(el, kind, i)));
}

/* ============================== 4. scenes ============================== */
const actors = [];   // everything stepped by the main loop
const scenes = [];   // objects with step(dt, now) + vis
const add_ = a => { actors.push(a); return a; };
const io = new IntersectionObserver(es => es.forEach(e => { const o = e.target._skObj; if (o) o.vis = e.isIntersecting; }), { rootMargin: '120px' });
const watch = (el, obj) => { el._skObj = obj; obj.vis = false; io.observe(el); };
function own(o) {
  if (o.parent && getComputedStyle(o.parent).position === 'static') o.parent.style.position = 'relative';   // actors are positioned inside their host
  const a = add_(new Actor(o)); watch(a.svg, a); return a;
}
function perchHost(el) { if (el) el.classList.add('sk-perch-host'); }

/* ---- hero: stick figure fixing a reasoning chain on a whiteboard ---- */
function heroScene() {
  const host = $('.hero-visual'); if (!host) return;
  const svg = svgEl('svg', { class: 'sk-scene', viewBox: '0 0 420 320', 'aria-hidden': 'true' }, host);
  const rc = rough.svg(svg), ink = { stroke: C.ink, strokeWidth: 2.2, roughness: 1.3, bowing: 1 };
  svg.append(rc.line(14, 300, 410, 301, { ...ink, strokeWidth: 1.6, roughness: 2, bowing: 3, seed: 2 }),
    rc.line(96, 250, 84, 300, { ...ink, seed: 3 }), rc.line(344, 250, 356, 300, { ...ink, seed: 4 }),
    rc.rectangle(40, 70, 340, 180, { ...ink, fill: '#ffffff', fillStyle: 'solid', strokeWidth: 2.6, seed: 5 }),
    rc.line(58, 254, 362, 254, { ...ink, strokeWidth: 3.2, seed: 6 }));
  const t0 = svgEl('text', { x: 60, y: 100, 'font-size': 22 }, svg); t0.textContent = 'ReState — today’s plan';
  svg.append(rc.line(58, 106, 238, 104, { stroke: C.state, strokeWidth: 2, roughness: 1.5, seed: 7 }));
  ['#e0632e', '#2f6db5', '#2e8b57'].forEach((c, i) => svgEl('rect', { x: 236 + i * 20, y: 248, width: 15, height: 5, fill: c, rx: 2 }, svg));

  const Y = 150, X = { s0: 90, s1: 170, s2: 250, sT: 330 };
  const items = {};
  const box = (name, x, label, col, fillStyle, mark) => {
    const g = svgEl('g', {}, svg);
    g.append(rc.rectangle(x - 26, Y - 18, 52, 36, { stroke: col, strokeWidth: 2.3, roughness: 1.4, fill: fillStyle ? col : undefined, fillStyle, hachureGap: 5, fillWeight: 1, seed: x }));
    const tx = svgEl('text', { x, y: Y + 8, 'text-anchor': 'middle', 'font-size': 23, style: `fill:${fillStyle === 'solid' ? '#fff' : col}` }, g);
    tx.innerHTML = label;
    if (mark === 'x') g.append(rc.line(x + 18, Y - 30, x + 34, Y - 16, { stroke: C.err, strokeWidth: 3, seed: 9 }), rc.line(x + 34, Y - 30, x + 18, Y - 16, { stroke: C.err, strokeWidth: 3, seed: 10 }));
    if (mark === 'v') g.append(rc.linearPath([[x + 16, Y - 24], [x + 22, Y - 17], [x + 36, Y - 34]], { stroke: C.ok, strokeWidth: 3, seed: 11 }));
    items[name] = g;
  };
  const arrow = (name, x1, x2) => {
    const g = svgEl('g', {}, svg), o = { stroke: C.ink, strokeWidth: 2, roughness: 1, seed: x1 };
    g.append(rc.line(x1, Y, x2, Y, o), rc.line(x2, Y, x2 - 8, Y - 6, o), rc.line(x2, Y, x2 - 8, Y + 6, o));
    items[name] = g;
  };
  box('s0', X.s0, 'S<tspan font-size="15" dy="5">0</tspan><tspan dy="-5">=φ</tspan>', '#555', null);
  arrow('a1', 118, 142);
  box('s1bad', X.s1, 'S<tspan font-size="15" dy="5">1</tspan>', C.err, 'hachure', 'x');
  box('s1good', X.s1, 'S<tspan font-size="15" dy="5">1</tspan>', C.ok, 'hachure', 'v');
  arrow('a2', 198, 222);
  box('s2', X.s2, 'S<tspan font-size="15" dy="5">2</tspan>', C.ok, 'hachure', null);
  arrow('a3', 278, 302);
  box('sT', X.sT, 'S<tspan font-size="15" dy="5">T</tspan>', C.state, 'solid', null);
  // remember path lengths for the "being drawn" effect
  Object.values(items).forEach(g => {
    g._paths = [...g.querySelectorAll('path')].map(pth => { const L = pth.getTotalLength(); pth.style.strokeDasharray = L; pth.style.strokeDashoffset = L; return [pth, L]; });
    g._texts = [...g.querySelectorAll('text')];
  });
  const reveal = (g, q) => {
    g._paths.forEach(([pth, L]) => { pth.style.strokeDashoffset = f1(L * (1 - q)); if (pth.getAttribute('fill') && pth.getAttribute('fill') !== 'none') pth.style.fillOpacity = q; });
    g._texts.forEach(tx => tx.style.opacity = clamp(q * 2 - 1, 0, 1));
  };

  const fig = add_(new Actor({ g: svgEl('g', { class: 'sk-fig' }, svg), k: 2.0, x: X.s0 - 19, y: 300, acc: [] }));
  /* storyboard: [start, end, action, target] — loops every 16 s */
  const SEQ = [
    [0, 1.0, 'walk', 's0'], [1.0, 2.0, 'draw', 's0'], [2.0, 2.6, 'draw', 'a1'], [2.6, 3.2, 'walk', 's1'], [3.2, 4.2, 'draw', 's1bad'],
    [4.2, 5.6, 'scratch'], [5.6, 6.6, 'erase', 's1bad'], [6.6, 7.6, 'draw', 's1good'], [7.6, 8.2, 'draw', 'a2'],
    [8.2, 8.8, 'walk', 's2'], [8.8, 9.8, 'draw', 's2'], [9.8, 10.3, 'draw', 'a3'], [10.3, 10.9, 'walk', 'sT'], [10.9, 11.9, 'draw', 'sT'],
    [11.9, 14.0, 'cheer'], [14.0, 15.0, 'fade'], [15.0, 16.0, 'walk', 's0'],
  ];
  const posOf = n => (X[n] ?? X.s1) - 19;
  const scene = {
    vis: false, tt: REDUCED ? 12.5 : 0,
    step(dt) {
      this.tt = (this.tt + dt / 1000) % 16;
      const tt = this.tt;
      // board state
      const prog = name => { const e = SEQ.find(s => s[2] === 'draw' && s[3] === name); return clamp((tt - e[0]) / (e[1] - e[0]), 0, 1); };
      const fadeAll = tt >= 15 ? 0 : 1 - clamp(tt - 14, 0, 1);
      Object.entries(items).forEach(([n, g]) => {
        reveal(g, tt >= 15 ? 0 : prog(n));
        g.style.opacity = n === 's1bad' ? fadeAll * (1 - clamp(tt - 5.6, 0, 1)) : fadeAll;
      });
      // figure position
      let x = posOf('s0'), action = 'stand';
      for (const [a, b, act, tgt] of SEQ) {
        if (tt < a) break;
        if (act === 'walk') { const to = posOf(tgt); if (tt >= b) x = to; else { fig.dir = to < x ? -1 : 1; x = lerp(x, to, (tt - a) / (b - a)); } }
        if (tt < b) action = act;
      }
      if (action !== 'walk') fig.dir = 1;
      fig.x = x;
      fig.acc = action === 'erase' ? ['eraser'] : action === 'draw' ? ['marker'] : [];
      fig.mood = action === 'cheer' ? 'happy' : action === 'scratch' ? 'sad' : null;
      fig.say = action === 'scratch' ? { text: 'hmm… wrong?', until: 1e15 } : action === 'cheer' ? { text: 'fixed it!', until: 1e15 } : null;
      fig.poseFn = { walk: (t, a) => P.walk(a.t * 10), draw: P.draw, erase: P.erase, scratch: P.scratch, cheer: P.cheer }[action] || P.stand;
      fig.jump = action === 'cheer' ? Math.abs(Math.sin(tt * 5)) * 10 : 0;
    },
  };
  scenes.push(scene); watch(host, scene);
  fig._scene = scene;
}

/* ---- title chalkboard: a teacher figure stands at the right edge and points at the title ---- */
function boardTeacher() {
  const b = $('.title-board'); if (!b) return;
  const POSE = (t, a) => (Math.floor(t / 3.2) % 2 ? P.talk(t) : P.point(t));
  const a = own({ parent: b, k: 1.5, dir: -1, acc: ['stick'], poseFn: POSE, greet: true, sayAbove: true, cls: 'sk-wide-only sk-board-fig' });
  a.brain = () => { a.x = b.offsetWidth + 13 + 30 * a.k; a.y = b.offsetHeight + 24; };
  a.brain();
  document.addEventListener('intro:done', () => setTimeout(() => a.trigger('cheer', performance.now(), 1700, 'Ta-da!'), 300));
}

/* ---- TL;DR: a professor explaining the bubble ---- */
function professor() {
  const sec = $('.tldr'), p = sec && sec.querySelector('p'); if (!p) return;
  const a = own({ parent: sec, k: 1.3, acc: ['glasses', 'stick'], poseFn: P.talk, greet: true, mood: 'happy' });
  let n = 0;
  a.brain = () => { if (n++ % 20 === 0) { const narrow = innerWidth < 760; a.k = narrow ? 0.95 : 1.3; a.x = p.offsetLeft - (narrow ? 40 : 58); a.y = p.offsetTop + p.offsetHeight - 4; } };
}

/* ---- demo: a figure walks along the timeline to the current round ---- */
function demoWalker() {
  const panel = $('.r-panel'), tl = $('#timeline'); if (!panel || !tl) return;
  const a = own({ parent: panel, k: 1.1, poseFn: P.stand });
  let target = 40, mood = null, arrivedAt = 0;
  const update = () => {
    const cur = tl.querySelector('.tnode.cur'); if (!cur) return;
    const pr = panel.getBoundingClientRect(), cr = cur.getBoundingClientRect();
    target = cr.left + cr.width / 2 - pr.left; mood = cur.classList.contains('bad') ? 'bad' : 'ok'; arrivedAt = 0;
  };
  new MutationObserver(update).observe(tl, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  tl.addEventListener('scroll', update); addEventListener('resize', update);
  update(); a.x = target;
  a.brain = (dt, now) => {
    a.y = tl.offsetTop - 2;
    const dx = target - a.x;
    if (Math.abs(dx) > 3) {
      a.dir = Math.sign(dx); a.x += Math.sign(dx) * Math.min(Math.abs(dx), 0.16 * dt);
      a.ph = (a.ph || 0) + 0.16 * dt / 6; a.poseFn = (t, s) => P.walk(s.ph); a.mood = null; a.say = null; a.baseJump = 0; a.acc = [];
      return;
    }
    if (!arrivedAt) arrivedAt = now;
    if (mood === 'bad') { a.poseFn = P.scratch; a.mood = 'sad'; a.say = { text: '?', until: now + 200 }; a.jump = 0; }
    else { const e = now - arrivedAt; a.poseFn = e < 1200 ? P.cheer : P.stand; a.mood = 'happy'; a.say = e < 2200 ? { text: '✓ yes!', until: now + 200 } : null; a.jump = e < 1200 ? Math.abs(Math.sin(e / 140)) * 8 : 0; }
  };
}

/* ---- hero sticky notes: tiny figures on top of each note ---- */
function noteFigures() {
  const cfg = [
    { poseFn: P.cheer, mood: 'happy' },   // no speech here: this figure stands under the "ReState = ..." line
    { poseFn: (t) => ({ ...P.point(t), aR1: 2.1 }), dir: -1 },
    { poseFn: P.jump, jumpy: true, mood: 'happy' },
    { poseFn: P.wave, say: 'just me' },
  ];
  $$('.hero .stat').forEach((el, i) => {
    const c = cfg[i % 4];
    // greet: false — these figures stand right under the "ReState = ..." line, a "hi!" bubble would cover it
    const a = own({ parent: el, k: 0.95, dir: c.dir || 1, poseFn: c.poseFn, mood: c.mood });
    a.brain = (dt, now) => {
      a.x = el.offsetWidth - 22; a.y = 2;
      if (c.jumpy) a.jump = Math.abs(Math.sin(a.t * 3)) * 9;
      if (c.say) a.say = (a.t % 6) < 2.2 ? { text: c.say, until: now + 100 } : null;
    };
  });
}

/* ---- VersaCoT-10K domains: one specialist per card ---- */
const DOMAIN_FIG = [
  { acc: ['steth'], poseFn: t => ({ ...P.hold(t), aR1: 0.8, aR2: 0.9 }) },                                              // Medical
  { acc: ['wheel'], poseFn: t => ({ ...P.sit(t * 0.3), aR1: 1.25, aR2: 0.45, aL1: 1.05, aL2: 0.7 + 0.1 * Math.sin(t * 3) }), seat: true }, // Driving
  { acc: ['cup'], poseFn: t => ({ ...STAND, aR1: 0.8 + 0.7 * Math.max(0, Math.sin(t * 1.2)), aR2: 1.7, aL1: -0.2, aL2: 0.2 }) },   // Common
  { acc: ['flask'], poseFn: t => ({ ...STAND, aR1: 1.9 + 0.1 * Math.sin(t * 9), aR2: 0.6, aL1: 0.4, aL2: 1.2 }) },         // Science
  { acc: ['binoc'], poseFn: t => ({ ...STAND, aR1: 0.55, aR2: 2.35, aL1: 0.45, aL2: 2.45 }), look: true },              // Spatial
  { acc: ['ruler'], poseFn: t => ({ ...STAND, aR1: 1.3 + 0.1 * Math.sin(t * 2), aR2: 0.2, aL1: 0.9, aL2: 0.6 }) },      // Geometry
  { acc: ['stick', 'bars'], poseFn: t => ({ ...P.point(t), aR1: 1.25 + 0.15 * Math.sin(t * 2) }) },                     // Chart
  { acc: ['gradcap', 'book'], poseFn: t => ({ ...P.hold(t), aR1: 1.0, aR2: 1.0, aL1: 0.8, aL2: 1.2 }) },               // Expert
];
function domainFigures() {
  $$('.dom').forEach((el, i) => {
    const c = DOMAIN_FIG[i % DOMAIN_FIG.length];
    const a = own({ parent: el, k: 0.92, acc: c.acc, poseFn: c.poseFn, greet: true, dir: i === 6 ? 1 : -1 });
    a.extra = c.seat ? (J, s) => `<rect x="${f1(-12 * s.k)}" y="0" width="${f1(14 * s.k)}" height="${f1(12.5 * s.k)}" style="fill:#d9cdb0"/>` : null;
    a.brain = () => {
      a.x = el.offsetWidth - (i === 6 ? 60 : 32); a.y = el.offsetHeight - 10 - (c.seat ? 12.5 * a.k : 0);
      if (c.look) a.dir = (a.t % 5) < 2.5 ? -1 : 1;
    };
  });
}

/* ---- characters perched on boxes ---- */
function perched() {
  // results: someone sitting on the main chart card, reading the paper
  const mainCard = $('#main-chart') && $('#main-chart').closest('.card');
  if (mainCard) {
    perchHost(mainCard);
    const a = own({ parent: mainCard, k: 1.0, acc: ['book'], poseFn: P.read, greet: true });
    a.brain = () => { a.x = mainCard.offsetWidth * 0.5; a.y = 0; };
  }
  // iteration chart: a figure peeking over the edge (body hidden behind the card)
  const iterCard = $('#iter-chart') && $('#iter-chart').closest('.card');
  if (iterCard) {
    perchHost(iterCard.parentElement);
    const a = own({ parent: iterCard, k: 1.05, z: -2, poseFn: t => ({ ...STAND, aR1: 2.9, aR2: 0.2, aL1: -2.9, aL2: -0.2 }), greet: true, dir: 1 });
    a.brain = (dt, now) => {
      const peek = 0.5 + 0.5 * Math.sin(a.t * 0.9);
      a.x = iterCard.offsetWidth * 0.32; a.y = (BONE.torso + LEG) * a.k * 0.62 + (1 - peek) * 26;
      a.say = peek > 0.85 ? { text: 'round 1 already +2.65!', until: now + 100 } : null;
    };
  }
  // leaderboard: standing on top, holding a sign
  const board = $('#board-chart') && $('#board-chart').closest('.card');
  if (board) {
    const a = own({ parent: board, k: 1.0, acc: ['sign'], signText: '9B ≥ 122B', greet: true, dir: -1,
      poseFn: t => ({ ...STAND, aR1: 2.8, aR2: 0.25, aL1: -2.8, aL2: -0.25, drop: 0.8 * Math.abs(Math.sin(t * 3)) }) });
    a.flipSign = -1;
    a.brain = () => { a.x = board.offsetWidth * 0.72; a.y = 0; a.flipSign = a.flipVis; };
  }
  // method: URSM card, thinking ? then !
  const ursm = $('#method .card');
  if (ursm) {
    perchHost($('.method-grid'));
    const a = own({ parent: ursm, k: 1.0, greet: true, dir: -1 });
    a.brain = (dt, now) => {
      a.x = ursm.offsetWidth * 0.82; a.y = 0;
      const ph = a.t % 6;
      a.poseFn = ph < 3 ? P.think : P.cheer; a.mood = ph < 3 ? null : 'happy';
      a.say = { text: ph < 3 ? 'φ, R⁺ or R⁻ ?' : 'one model!', until: now + 100 };
    };
  }
  // dataset: a figure carrying papers back and forth on top of the pipeline
  const pipe = $('.pipeline');
  if (pipe) { perchHost(pipe); patrol(pipe, { acc: ['papers'], poseFn: (t, a) => P.carry(a.ph), speed: 0.045, k: 1.0 }); }
  // examples: an inspector with a magnifier on top of the gallery
  const gal = $('.gallery');
  if (gal) {
    perchHost(gal);
    patrol(gal, { acc: ['magnifier'], poseFn: (t, a) => a.stop ? ({ ...P.point(t), aR1: 0.9, aR2: 0.4 }) : P.walk(a.ph), speed: 0.05, k: 1.0, inspect: true });
  }
  // limitations: someone tripped over a cable
  const lim = $('.limits');
  if (lim) {
    const a = own({ parent: lim, k: 1.05, poseFn: P.lying, greet: true, dir: 1 });
    a.rot = -90; a.mood = 'sad';
    a.extra = (J, s) => `<path class="sk-thin" style="stroke:#555" d="M${pt(J.fR)} q${f1(10 * s.k)} ${f1(-14 * s.k)} ${f1(24 * s.k)} ${f1(-4 * s.k)} t${f1(30 * s.k)} 0"/>`;
    a.brain = (dt, now) => {
      a.x = lim.offsetWidth - 20; a.y = lim.offsetHeight - 6; a.rot = a.react ? a.rot : -90;
      a.say = { text: (a.t % 5) < 2.5 ? 'oops — cost of more rounds' : 'open-ended VQA next?', until: now + 100 };
    };
  }
  // BibTeX: writing on the chalkboard
  const bib = $('.bib');
  if (bib) {
    const a = own({ parent: bib, k: 1.15, cls: 'sk-wide-only', acc: ['chalk'], poseFn: P.draw, greet: true });
    a.brain = () => { a.x = -34; a.y = bib.offsetHeight + 4; };
  }
}
/* walk back and forth along the top edge of a box */
function patrol(host, o) {
  const a = own({ parent: host, k: o.k, acc: o.acc, poseFn: o.poseFn, greet: true });
  a.x = 40; a.ph = 0;
  a.brain = (dt, now) => {
    const W = host.offsetWidth; a.y = 0;
    if (a.stop > 0) { a.stop -= dt; if (a.stop <= 0) a.stop = 0; a.say = a.stop ? { text: 'hmm, MIND got this wrong…', until: now + 100 } : null; return; }
    a.x += a.dir * o.speed * dt; a.ph += o.speed * dt / 6;
    if (a.x > W - 30) { a.x = W - 30; a.dir = -1; }
    if (a.x < 30) { a.x = 30; a.dir = 1; }
    if (o.inspect && Math.random() < dt / 7000) a.stop = 2200;
  };
}

/* ---- paradigm: relay (stage-centric) vs one runner looping (state-centric) ---- */
function relay() {
  const wrap = $('.paradigm-wrap'); if (!wrap) return;
  perchHost(wrap);
  const mk = o => own({ parent: wrap, k: 1.0, cls: 'sk-wide-only', greet: true, ...o });
  const A = mk({ acc: ['baton'] }), B = mk({ dir: -1 }), Cc = mk({ acc: ['baton'] });
  let dropY = 0;
  B.extra = (J, s) => s.dropped ? `<path style="stroke:${C.state};stroke-width:${f1(3.2 * s.k)}" d="M${f1(10 * s.k)} ${f1(-2 - dropY)} L${f1(20 * s.k)} ${f1(-1 - dropY)}"/>` : '';
  const scene = {
    vis: true, tt: 0,
    step(dt, now) {
      const W = wrap.offsetWidth, state = !!wrap.querySelector('.pd-state.on');
      [A, B].forEach(a => a.svg.style.display = state ? 'none' : '');
      Cc.svg.style.display = state ? '' : 'none';
      [A, B, Cc].forEach(a => a.y = 0);
      if (state) {   // one model keeps updating its own state
        Cc.ph = (Cc.ph || 0) + dt * 0.05 / 6;
        Cc.x += (Cc.dir || 1) * 0.05 * dt;
        if (Cc.x > W * 0.94) Cc.dir = -1; if (Cc.x < W * 0.5) Cc.dir = 1;
        Cc.poseFn = (t, a) => ({ ...P.walk(a.ph), aR1: 2.4, aR2: 0.3 });
        Cc.say = { text: 'S<tspan font-size="70%" dy="3">t</tspan><tspan dy="-3"> → S</tspan><tspan font-size="70%" dy="3">t+1</tspan>', until: now + 100 };
        return;
      }
      const tt = (this.tt = (this.tt + dt / 1000) % 5);
      B.x = W * 0.78;
      if (tt < 1.6) { A.x = lerp(W * 0.5, W * 0.72, tt / 1.6); A.dir = 1; A.ph = (A.ph || 0) + dt / 60; A.poseFn = (t, a) => P.run(a.ph); A.acc = ['baton']; B.acc = []; B.dropped = false; B.poseFn = P.point; B.say = null; A.say = null; }
      else if (tt < 2.0) { A.poseFn = P.point; A.acc = []; B.acc = ['baton']; B.poseFn = P.hold; }
      else if (tt < 2.5) { B.acc = []; B.dropped = true; dropY = 0; B.poseFn = P.hold; B.say = { text: 'R̂ ≠ R<tspan font-size="70%" dy="-6">GT</tspan>', until: now + 100 }; }
      else if (tt < 4.4) { B.poseFn = P.scratch; B.mood = 'sad'; B.say = { text: 'not what I trained on!', until: now + 100 }; A.poseFn = P.stand; A.say = { text: 'stage 1 → 2', until: now + 100 }; }
      else { A.ph += dt / 60; A.dir = -1; A.poseFn = (t, a) => P.run(a.ph); A.x = lerp(W * 0.72, W * 0.5, (tt - 4.4) / 0.6); A.say = null; B.mood = null; B.say = null; }
    },
  };
  Cc.x = wrap.offsetWidth * 0.6;
  scenes.push(scene);
}

/* ============================ 5. background crowd ============================ */
let crowdWrap = null;
function makeCrowd() {
  const wrap = crowdWrap = document.createElement('div');
  wrap.className = 'sk-crowd'; wrap.setAttribute('aria-hidden', 'true');
  document.body.appendChild(wrap);
  const H = 112, G = 100;
  const gsvg = svgEl('svg', { class: 'sk-ground' }, wrap);
  let W = innerWidth;
  const drawGround = () => {
    W = innerWidth; gsvg.setAttribute('width', W); gsvg.setAttribute('height', H); gsvg.innerHTML = '';
    const rc = rough.svg(gsvg), o = { stroke: C.ink, strokeWidth: 1.5, roughness: 1.8, bowing: 3, seed: 7 };
    gsvg.append(rc.line(0, G + 1, W, G, o));
    for (let x = 60; x < W; x += 170) {
      gsvg.append(rc.linearPath([[x, G], [x + 3, G - 7], [x + 5, G], [x + 9, G - 9], [x + 11, G]], { ...o, strokeWidth: 1.1, seed: x }));
      gsvg.append(rc.ellipse(x + 80, G + 4, 8, 4, { ...o, strokeWidth: 1, seed: x + 1 }));
    }
  };
  drawGround(); addEventListener('resize', drawGround);
  const k = innerWidth < 760 ? 0.9 : 1.08;
  const list = [];
  const mk = o => { const a = add_(new Actor({ parent: wrap, k, y: G, greet: true, hit: true, ...o })); list.push(a); return a; };
  const wrapX = a => { if (a.dir > 0 && a.x > W + 60) a.x = -60; if (a.dir < 0 && a.x < -60) a.x = W + 60; };
  const walker = (a, speed, pose = (t, s) => P.walk(s.ph)) => (dt) => { a.x += a.dir * speed * dt; a.ph = (a.ph || 0) + speed * dt / 6.5; a.poseFn = pose; wrapX(a); };

  // 1. stroller with a cap (stops to say hi now and then)
  const stroller = mk({ x: W * 0.12, dir: 1, acc: ['cap'] });
  const move1 = walker(stroller, 0.045);
  stroller.brain = (dt, now) => {
    if (stroller.pause > 0) { stroller.pause -= dt; stroller.poseFn = P.stand; return; }
    move1(dt);
    if (Math.random() < dt / 11000) { stroller.pause = 1800; stroller.trigger('wave', now, 1500, 'hello!'); }
  };
  // 9. dog following the stroller
  const dog = mk({ x: W * 0.08, dir: 1, hit: true });
  dog.custom = now => {
    const kk = dog.k, ph = dog.ph || 0, moving = dog.moving, s = Math.sin(ph) * (moving ? 0.5 : 0), wag = Math.sin(now / 90) * 0.6;
    const hy = -13 * kk, x1 = -9 * kk, x2 = 8 * kk;
    const leg = (x, a) => `M${f1(x)} ${f1(hy)} L${f1(x + Math.sin(a) * 12 * kk)} ${f1(hy + Math.cos(a) * 12.5 * kk)}`;
    const seed = Math.floor(now / 125) + 7;
    return `<path d="${jline([[x1, hy], [x2, hy - kk]], 0.4, seed)} ${leg(x1, s)} ${leg(x1 + 2 * kk, -s)} ${leg(x2, -s)} ${leg(x2 - 2 * kk, s)} M${f1(x1)} ${f1(hy)} L${f1(x1 - 6 * kk)} ${f1(hy - 7 * kk + wag * 4)} M${f1(x2)} ${f1(hy - kk)} L${f1(x2 + 4 * kk)} ${f1(hy - 7 * kk)}"/>` +
      `<path class="sk-head" d="${jcircle([x2 + 7 * kk, hy - 9 * kk], 4.6 * kk, seed)}"/><circle class="sk-eye" cx="${f1(x2 + 9 * kk)}" cy="${f1(hy - 10 * kk)}" r="1"/>` +
      `<path d="M${f1(x2 + 4 * kk)} ${f1(hy - 13 * kk)} l${f1(-2 * kk)} ${f1(5 * kk)}"/>` + (dog.say && now < dog.say.until ? T(x2 + 10 * kk, hy - 18 * kk, dog.say.text, 13, dog.flipVis, 'start') : '');
  };
  dog.brain = (dt, now) => {
    const tx = stroller.x - 38 * stroller.dir, dx = tx - dog.x;
    if (Math.abs(dx) > 260) dog.x = tx;
    const mv = clamp(dx, -0.07 * dt, 0.07 * dt);
    dog.moving = Math.abs(dx) > 4; dog.x += dog.moving ? mv : 0;
    dog.dir = dog.moving ? Math.sign(dx) : stroller.dir;
    dog.ph = (dog.ph || 0) + Math.abs(mv) / 3;
    if (Math.random() < dt / 9000) dog.say = { text: 'woof', until: now + 900 };
  };
  // 3. sign carrier
  const sign = mk({ x: W * 0.55, dir: 1, acc: ['sign'], signText: '81.90 ★', box: [-42, -120, 84, 130] });
  sign.brain = walker(sign, 0.03, (t, s) => P.carry(s.ph));
  const signFlip = sign.brain; sign.brain = dt => { signFlip(dt); sign.flipSign = sign.flipVis; };
  if (innerWidth >= 760 && !COARSE) {
    // 2. chase: two runners
    const runA = mk({ x: W * 0.4, dir: -1, acc: ['cap'] }), runB = mk({ x: W * 0.4 + 70, dir: -1 });
    runA.brain = walker(runA, 0.11, (t, s) => P.run(s.ph * 0.8));
    const moveB = walker(runB, 0.11, (t, s) => P.run(s.ph * 0.8));
    runB.brain = (dt, now) => { moveB(dt); if (Math.random() < dt / 5000) runB.say = { text: 'wait for my state!', until: now + 1600 }; };
    // 4. pushing a boulder: R⁻ becomes R⁺ halfway
    const pusher = mk({ x: W * 0.2, dir: 1, box: [-42, -104, 110, 114] });
    pusher.extra = (J, s, now) => {
      const kk = s.k, r = 12.5 * kk, cx = 21 * kk, cy = -r, ang = s.x / r;
      const fixed = s.x > W * 0.62, col = fixed ? C.ok : C.err;
      const spoke = a => `M${f1(cx)} ${f1(cy)} L${f1(cx + Math.cos(a) * r * 0.75)} ${f1(cy + Math.sin(a) * r * 0.75)}`;
      return `<path class="sk-head" style="stroke:${col};fill:${fixed ? '#e2f3e6' : '#fde2df'}" d="${jcircle([cx, cy], r, Math.floor(now / 125))}"/><path class="sk-thin" style="stroke:${col}" d="${spoke(ang)} ${spoke(ang + 2.1)}"/>` +
        T(cx, cy + 5 * kk, fixed ? 'R⁺' : 'R⁻', 14 * kk, s.flipVis, 'middle', col);
    };
    const moveP = walker(pusher, 0.022, (t, s) => P.push(s.ph));
    pusher.brain = (dt, now) => {
      if (pusher.pause > 0) { pusher.pause -= dt; pusher.poseFn = P.cheer; return; }
      const before = pusher.x > W * 0.62; moveP(dt);
      if (!before && pusher.x > W * 0.62) { pusher.pause = 1500; pusher.trigger('cheer', now, 1500, 'corrected!'); }
    };
    // 5. kite flyer
    const kite = mk({ x: W * 0.78, dir: -1, box: [-95, -135, 150, 145] });
    kite.extra = (J, s, now) => {
      const kk = s.k, kx = -62 * kk, ky = -104 * kk + Math.sin(now / 700) * 5 * kk, h = J.hR;
      let tail = `M${f1(kx)} ${f1(ky + 13 * kk)}`;
      for (let j = 1; j <= 5; j++) tail += ` L${f1(kx + Math.sin(now / 200 + j) * 5 * kk)} ${f1(ky + 13 * kk + j * 7 * kk)}`;
      return `<path class="sk-thin" d="M${pt(h)} Q${f1((h[0] + kx) / 2)} ${f1((h[1] + ky) / 2 + 22 * kk)} ${f1(kx)} ${f1(ky + 13 * kk)}"/>` +
        `<path style="fill:#ffd6e0;stroke-width:${f1(1.6 * kk)}" d="M${f1(kx)} ${f1(ky - 15 * kk)} L${f1(kx + 11 * kk)} ${f1(ky)} L${f1(kx)} ${f1(ky + 13 * kk)} L${f1(kx - 11 * kk)} ${f1(ky)} Z M${f1(kx)} ${f1(ky - 15 * kk)} L${f1(kx)} ${f1(ky + 13 * kk)}"/>` +
        `<path class="sk-thin" d="${tail}"/>` + T(kx, ky - 19 * kk, 'ReState', 12 * kk, s.flipVis);
    };
    kite.brain = walker(kite, 0.016, (t, s) => ({ ...P.walk(s.ph, 0.6), aR1: 2.35, aR2: 0.2 }));
    // 6. reader on a crate
    const reader = mk({ x: W * 0.93, dir: -1, y: G - 12.5 * k, acc: ['book'] });
    reader.poseFn = t => ({ ...P.read(t), aR1: 0.95 + ((t % 5) > 4.4 ? 0.9 : 0) });
    reader.extra = (J, s) => `<rect x="${f1(-14 * s.k)}" y="0" width="${f1(17 * s.k)}" height="${f1(12.5 * s.k)}" style="fill:#d9b98a"/>` + T(-5 * s.k, 9 * s.k, '10K', 9 * s.k, s.flipVis);
    reader.brain = (dt, now) => { reader.x = W * 0.93; if (Math.random() < dt / 8000) reader.say = { text: 'p. 21: 1,250 per domain', until: now + 2200 }; };
    // 7. skipping rope
    const roper = mk({ x: W * 0.68, dir: 1, ropePh: 0, box: [-42, -112, 84, 122] });
    roper.poseFn = P.rope;
    roper.brain = dt => { roper.x = W * 0.68; roper.ropePh = (roper.ropePh + dt / 620) % 1; roper.baseJump = Math.max(0, Math.sin(roper.ropePh * Math.PI * 2 - Math.PI / 2)) * 8 * roper.k; if (!roper.react) roper.jump = roper.baseJump; };
    roper.extra = (J, s) => {
      const c = Math.cos(s.ropePh * Math.PI * 2), yTop = J.head[1] - 22 * s.k, yBot = 8 * s.k + s.jump;
      const cy = lerp(yBot, yTop, (c + 1) / 2) * 2 - (J.hL[1] + J.hR[1]) / 2;
      return `<path class="sk-thin" style="stroke:${C.state}" d="M${pt(J.hL)} Q0 ${f1(cy)} ${pt(J.hR)}"/>`;
    };
    // 8. a second stroller going the other way, with glasses
    const prof = mk({ x: W * 0.3, dir: -1, acc: ['glasses', 'book'] });
    prof.brain = walker(prof, 0.028, (t, s) => ({ ...P.walk(s.ph, 0.7), aR1: 0.95, aR2: 0.95, aL1: 0.75, aL2: 1.15 }));
  }
  list.forEach(a => { a.vis = true; a.crowd = true; });
  return list;
}

/* ============================ 6. cursor stick figure ============================ */
let cur = null;
function makeCursor() {
  if (REDUCED || COARSE) return null;
  const a = add_(new Actor({ parent: document.body, cls: 'sk-cursor', k: 1.1, box: [-46, -110, 92, 122] }));
  a.vis = true; a.svg.style.opacity = '0';
  const st = { px: -200, py: -200, lx: null, ly: null, speed: 0, ph: 0, last: performance.now(), down: false, hover: false, jumpAt: -1e9, seen: false };
  document.documentElement.classList.add('sk-cursor-on');
  addEventListener('mousemove', e => { st.px = e.clientX; st.py = e.clientY; st.last = performance.now(); if (!st.seen || a.svg.style.opacity === '0') { st.seen = true; a.svg.style.opacity = '1'; } }, { passive: true });
  addEventListener('mousedown', () => { st.down = true; });
  addEventListener('mouseup', () => { st.down = false; st.jumpAt = performance.now(); });
  document.addEventListener('mouseover', e => { st.hover = !!(e.target.closest && e.target.closest('a, button, summary, [role=tab], img.zoom, .tnode, .sk-hit, canvas')); });
  document.documentElement.addEventListener('mouseleave', () => { a.svg.style.opacity = '0'; });
  document.documentElement.addEventListener('mouseenter', () => { if (st.seen) a.svg.style.opacity = '1'; });
  a.step = function (dt, now) {
    this.t += dt / 1000;
    const dx = st.lx == null ? 0 : st.px - st.lx, dy = st.ly == null ? 0 : st.py - st.ly;
    st.lx = st.px; st.ly = st.py;
    const dist = Math.hypot(dx, dy);
    st.speed = lerp(st.speed, dist * 16 / Math.max(dt, 1), 0.25);
    st.ph += dist / 7;                       // one stride every ~44 px of mouse travel
    if (Math.abs(dx) > 1.2) this.dir = Math.sign(dx);
    this.flipVis = lerp(this.flipVis, this.dir, 0.3);
    const idle = now - st.last;
    let p;
    if (st.down) p = P.crouch();
    else if (st.speed > 13) p = P.run(st.ph);
    else if (st.speed > 0.6) p = P.walk(st.ph);
    else if (idle > 6000) p = P.sit(this.t * 0.4);
    else p = P.stand(this.t);
    // pointing arm (the hotspot): forward-up, clear of the head (straight up looked like a horn)
    p.aR1 = st.hover ? 1.95 + 0.07 * Math.sin(this.t * 14) : 2.15;
    p.aR2 = st.hover ? 0.04 : 0.14;
    if (!st.hover && idle > 6000) { p.aR1 = 2.2; }
    const e = now - st.jumpAt;
    this.jump = e < 380 ? Math.sin(Math.PI * e / 380) * 12 : 0;
    blendInto(this.pose, p, 0.35);
    this.mood = st.hover ? 'happy' : null;
    this.say = idle > 6000 ? { text: 'z z', until: now + 100 } : st.speed > 26 ? { text: 'whoosh', until: now + 100 } : null;
    this.acc = st.down && st.speed > 0.6 ? ['marker'] : [];
    this.speed = st.speed;
  };
  a.anchor = function (J) {
    const tip = add(J.hR, unit(J.eR, J.hR), 3.4 * this.k);   // finger tip = exact pointer position
    this._tip = tip;
    this.x = st.px - tip[0] * this.flipVis;
    this.y = st.py - tip[1] + this.jump;
  };
  a.extra = function (J) {   // small fist + index finger
    return `<circle class="sk-fillink" cx="${f1(J.hR[0])}" cy="${f1(J.hR[1])}" r="${f1(1.7 * this.k)}"/><path d="M${pt(J.hR)} L${pt(this._tip || J.hR)}"/>`;
  };
  cur = { a, st };
  return cur;
}

/* =================== 7. doodles, crowd toggle, main loop, init =================== */
function doodles() {
  const shapes = [
    rc => rc.path('M24 4 L29 18 L44 18 L32 27 L37 42 L24 33 L11 42 L16 27 L4 18 L19 18 Z', { stroke: C.state, strokeWidth: 1.8, roughness: 1.4 }),
    rc => { const pts = []; for (let j = 0; j < 40; j++) { const a = j * 0.45, r = 2 + j * 0.55; pts.push([26 + Math.cos(a) * r, 26 + Math.sin(a) * r]); } return rc.curve(pts, { stroke: C.stage, strokeWidth: 1.6, roughness: 1 }); },
    rc => { const g = svgEl('g'); g.append(rc.circle(26, 26, 18, { stroke: '#e9a800', strokeWidth: 2 })); for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4; g.append(rc.line(26 + Math.cos(a) * 13, 26 + Math.sin(a) * 13, 26 + Math.cos(a) * 22, 26 + Math.sin(a) * 22, { stroke: '#e9a800', strokeWidth: 1.6 })); } return g; },
    rc => rc.path('M10 34 Q6 24 16 22 Q18 10 30 14 Q40 8 44 20 Q52 24 46 34 Z', { stroke: C.stage, strokeWidth: 1.6, roughness: 1.3 }),
    rc => rc.path('M26 44 C10 32 4 22 12 14 C18 8 24 12 26 18 C28 12 34 8 40 14 C48 22 42 32 26 44 Z', { stroke: C.err, strokeWidth: 1.8, roughness: 1.3 }),
    rc => { const g = svgEl('g'); g.append(rc.circle(26, 20, 22, { stroke: C.ink, strokeWidth: 1.6 }), rc.line(20, 32, 32, 32, { stroke: C.ink }), rc.line(21, 37, 31, 37, { stroke: C.ink }), rc.line(26, 10, 26, 22, { stroke: '#e9a800', strokeWidth: 2 })); return g; },
  ];
  $$('main > section.block').forEach((sec, i) => {
    const s = svgEl('svg', { class: 'sk-doodle sk-mid-only', width: 52, height: 52, 'aria-hidden': 'true' }, sec);
    s.style.right = (14 + (i % 3) * 10) + 'px'; s.style.top = (18 + (i % 2) * 10) + 'px'; s.style.rotate = (i % 2 ? 12 : -9) + 'deg';
    s.append(shapes[i % shapes.length](rough.svg(s)));
  });
  const stain = (host, css) => {
    if (!host) return;
    const s = svgEl('svg', { class: 'sk-stain sk-mid-only', width: 150, height: 150, 'aria-hidden': 'true' }, host);
    Object.assign(s.style, css);
    const rc = rough.svg(s);
    s.append(rc.circle(75, 75, 112, { stroke: 'rgba(140,90,40,.22)', strokeWidth: 7, roughness: 2.6, seed: 3 }),
      rc.circle(77, 73, 100, { stroke: 'rgba(140,90,40,.12)', strokeWidth: 3, roughness: 2.2, seed: 4 }),
      rc.circle(136, 30, 9, { stroke: 'none', fill: 'rgba(140,90,40,.18)', fillStyle: 'solid', seed: 5 }));
  };
  stain($('.hero'), { right: '-30px', bottom: '30px' });   // below the title banner
  stain($('#dataset'), { left: '10px', bottom: '20px' });
}

function crowdToggle(list) {
  const nav = $('#sk-controls'); if (!nav || !crowdWrap) return;
  const b = document.createElement('a');
  const set = on => {
    crowdWrap.classList.toggle('off', !on); list.forEach(a => a.active = on);
    b.textContent = on ? 'Crowd ✓' : 'Crowd ✗';
    try { localStorage.setItem('restate-crowd', on ? '1' : '0'); } catch (e) {}
  };
  b.addEventListener('click', () => set(crowdWrap.classList.contains('off')));
  nav.appendChild(b);
  let on = true; try { on = localStorage.getItem('restate-crowd') !== '0'; } catch (e) {}
  set(on);
}

/* greetings: characters wave when the cursor figure walks by, jump if it rushes past */
let frame = 0;
function interactions(now) {
  if (!cur || (frame++ % 6)) return;
  const { px, py } = cur.st, fast = (cur.a.speed || 0) > 22;
  for (const a of actors) {
    if (!a.greet || !a.svg || !a.vis || !a.active || a.react || a.cooldown > 0) continue;
    const r = a.svg.getBoundingClientRect();
    if (!r.width) continue;
    const sx = r.left - a.box[0] * a.k, sy = r.top - a.box[1] * a.k - 30 * a.k;
    const d = Math.hypot(px - sx, py - sy);
    if (fast && d < 120) { a.trigger('jump', now, 600, '!'); a.cooldown = 3000; }
    else if (d < 85) { a.trigger('wave', now, 1300, ['hi!', 'hey', 'hello!'][a.id % 3]); a.cooldown = 4500; }
  }
}

let last = 0, tick = 0;
function loop(now) {
  tick++;
  const dt = Math.min(50, now - (last || now)); last = now;
  if (!document.hidden) {
    for (const s of scenes) if (s.vis) s.step(dt, now);
    for (const a of actors) {
      const hostVis = a._sceneHost ? a._sceneHost.vis : true;
      if (!a.active) continue;
      if (a.svg && !a.vis) continue;
      if (!a.svg && !hostVis) continue;
      a.step(dt, now);
      if (a === (cur && cur.a) || ((tick + a.id) & 1) === 0) a.render(now);   // figures redraw at ~30 fps, cursor at 60
    }
    interactions(now);
  }
  requestAnimationFrame(loop);
}

function init() {
  if (init.done || typeof rough === 'undefined') return;
  init.done = true;
  C = { ink: css('--ink'), paper: css('--paper'), card: css('--card'), state: css('--state'), stage: css('--stage'),
    ok: css('--ok'), err: css('--err'), marker: css('--marker'), mind: css('--mind') };
  R0 = { stroke: C.ink, strokeWidth: 1.6, roughness: 1.4, bowing: 1.3 };
  initDecor();
  heroScene();
  boardTeacher();
  professor(); demoWalker(); noteFigures(); domainFigures(); perched(); relay();
  const crowd = makeCrowd();
  crowdToggle(crowd);
  makeCursor();
  doodles();
  // hero figure belongs to the hero scene -> only animate when the hero is visible
  actors.forEach(a => { if (!a.svg && a._scene) a._sceneHost = a._scene; });
  // fonts change box sizes and chart text: redraw once they are ready
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
    $$('.sk-box').forEach(queue);
    if (window.Chart && Chart.instances) Object.values(Chart.instances).forEach(c => c.update('none'));
  });
  if (REDUCED) {   // draw everything once, no animation
    const now = performance.now();
    scenes.forEach(s => s.step(0, now));
    actors.forEach(a => { a.snap = true; a.vis = true; a.step(16, now); a.render(now); });
    return;
  }
  requestAnimationFrame(loop);
}

window.Sketch = { init };
})();
