// Everything around the pages: the HUD (the woodland path, the heads, the score sign), the intro banner, the Hold prompt, the
// reveal, the countdown, the lobby at the bears' table, the podium, the end of a run, the daily's calendar, the practice shelf,
// the pause card and the room-closed card. Drawn on the canvas; the buttons are real buttons laid over it (ui.js).

import { C, T, rr, circle, ellipse, withShadow, outlined, fitSize, font, FONT_DISPLAY, FONT_LABEL, drawStamp, drawFace, drawBear, drawBearHead, drawSitter, drawSign, drawTree, drawGirl } from './kit.js';
import { drawGauge, gaugePos } from './gauge.js';
import { drawKitchen, kitchenLayout, drawBearsAtWindow } from './rooms.js';
import { PAGES } from './pages.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - (1 - clamp01(k)) ** 3;
const easeBack = (k) => {
  const x = clamp01(k);
  const c = 1.9;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
};
export const commas = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

function text(ctx, str, x, y, size, { weight = 900, family = FONT_DISPLAY, fill = C.ink, align = 'center', baseline = 'middle', maxWidth } = {}) {
  ctx.font = font(weight, size, family);
  ctx.fillStyle = fill;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(str, x, y, maxWidth);
}

// ---------------------------------------------------------------- the woodland path (the match's clock, the run's lives)

function door(ctx, x, y, h, open = 0) {
  if (!(h > 4)) return;
  const w = h * 0.62;
  withShadow(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x - w / 2, y - h + w / 2);
    ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();
  }, open > 0 ? C.ink : C.red, 2, 2);
  if (open <= 0) circle(ctx, x + w * 0.25, y - h * 0.42, Math.max(1.5, h * 0.05), C.mustard);
}

/**
 * kind 'match' | 'daily': stones for the pages and the bears walking to the door. kind 'run': the woods, the door, and each bear
 * either out in the woods (a life left) or home (a miss). home: how many are home; homeAge: s since the last came home.
 */
export function drawPath(ctx, r, o) {
  const { t } = o;
  const midY = r.y + r.h * 0.62;
  ctx.save();
  // The path itself.
  rr(ctx, r.x + 4, midY - r.h * 0.12, r.w - 8, r.h * 0.24, r.h * 0.12);
  ctx.fillStyle = 'rgba(123,74,43,0.28)';
  ctx.fill();
  const doorX = r.x + r.w - r.h * 0.38;
  // A little cottage end: the door in a cream wall under a red roof.
  ctx.fillStyle = C.cream;
  ctx.fillRect(doorX - r.h * 0.42, midY - r.h * 0.62, r.h * 0.84, r.h * 0.66);
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.moveTo(doorX - r.h * 0.55, midY - r.h * 0.6);
  ctx.lineTo(doorX, midY - r.h * 0.98);
  ctx.lineTo(doorX + r.h * 0.55, midY - r.h * 0.6);
  ctx.fill();
  door(ctx, doorX, midY + r.h * 0.04, r.h * 0.5, o.open ?? 0);
  const bs = r.h / 300;
  if (o.kind === 'run') {
    // The woods at the start.
    for (let i = 0; i < 3; i++) drawTree(ctx, r.x + r.h * (0.3 + i * 0.5), midY + r.h * 0.18, r.h * (0.85 + (i % 2) * 0.15), i % 2, i % 2 ? T.greenLight : C.green, T.brownDark);
    const kinds = ['papa', 'mama', 'baby'];
    kinds.forEach((kind, i) => {
      const home = i < o.home;
      const age = i === o.home - 1 ? o.homeAge : 9;
      const woodsX = r.x + r.h * (0.45 + i * 0.55);
      const homeX = doorX - r.h * (0.55 + i * 0.42);
      const k = home ? easeOut(age / 1.2) : 0;
      const x = lerp(woodsX, homeX, k);
      const walking = home && k < 1;
      drawBear(ctx, kind, x, midY + r.h * 0.2, bs, { walk: walking ? t * 9 + i : !home ? t * 2 + i : undefined, expr: home ? 'roar' : undefined, flip: false });
    });
  } else {
    const n = Math.max(1, o.pages);
    const x0 = r.x + r.h * 0.4;
    const x1 = doorX - r.h * 0.6;
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, n === 1 ? 0 : i / (n - 1));
      const done = i < o.current - 1;
      const cur = i === o.current - 1;
      const sr = Math.max(3, Math.min(r.h * 0.14, ((x1 - x0) / n) * 0.36));
      ellipse(ctx, x, midY, sr * (cur ? 1.3 : 1), sr * 0.7 * (cur ? 1.3 : 1), done ? T.brownMid : cur ? C.mustard : '#CDB58A');
      if (o.x2 && i === n - 1) ellipse(ctx, x, midY, sr * 0.5, sr * 0.35, C.red);
    }
    // The bears walk from the first stone to the door over the story.
    const f = clamp01((o.current - 1 + (o.progress ?? 0)) / n);
    const bx = lerp(x0, x1 + r.h * 0.2, f);
    ['baby', 'mama', 'papa'].forEach((kind, i) => {
      drawBear(ctx, kind, bx - i * r.h * 0.42, midY + r.h * 0.2, bs, { walk: o.walking ? t * 8 + i : undefined });
    });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the heads along the top

/** heads: [{ id, who, x (where it's drawn now), holding, done, me, away }] */
export function drawHeads(ctx, r, heads, radius, t, reduced) {
  for (const h of heads) {
    const wig = h.holding && !reduced ? Math.sin(t * 22 + h.x) * 0.18 : 0;
    const y = r.y + r.h / 2 - (h.holding ? 2 : 0);
    ctx.save();
    ctx.translate(h.x, y);
    ctx.rotate(wig);
    drawFace(ctx, h.who, 0, 0, radius, { me: h.me, dim: h.away, ringW: Math.max(2, radius * 0.14) });
    ctx.restore();
    if (h.done) {
      const cx = h.x + radius * 0.72;
      const cy = y + radius * 0.66;
      circle(ctx, cx, cy, radius * 0.42, C.green);
      ctx.strokeStyle = C.cream;
      ctx.lineWidth = Math.max(2, radius * 0.13);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.2, cy);
      ctx.lineTo(cx - radius * 0.04, cy + radius * 0.16);
      ctx.lineTo(cx + radius * 0.22, cy - radius * 0.16);
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------- the score sign

export function drawScoreSign(ctx, r, big, small, mult) {
  drawSign(ctx, r.x, r.y, r.w, r.h, { ropes: r.y });
  const size = fitSize(ctx, big, r.h * 0.56, r.w * (small ? 0.62 : 0.84));
  outlined(ctx, big, r.x + (small ? r.w * 0.4 : r.w / 2), r.y + r.h * 0.53, { size, fill: C.cream, stroke: T.brownDark, lw: Math.max(3, size * 0.14) });
  if (small) text(ctx, small, r.x + r.w * 0.86, r.y + r.h * 0.53, Math.max(16, r.h * 0.32), { family: FONT_LABEL, weight: 800, fill: T.mustardLight });
  if (mult && mult > 1) drawStamp(ctx, `×${mult}`, r.x - r.h * 0.05, r.y + r.h, Math.max(16, r.h * 0.34), { rot: -0.18, color: C.red });
}

// ---------------------------------------------------------------- page label, intro and prompt

/** The page's name slammed in at the top of the stage, the twist under it. age: s since the page began. */
export function drawIntro(ctx, L, W, { name, page, twist, x2, hint, age, reduced }) {
  const fade = age < 1.2 ? 1 : clamp01(1 - (age - 1.2) / 0.4);
  if (fade <= 0) return;
  const k = reduced ? 1 : easeBack(age / 0.28);
  const size = Math.min(fitSize(ctx, name, L.small ? 40 : 64, W * 0.8), L.small ? 40 : 64);
  const y = L.top + size * 0.75;
  ctx.save();
  ctx.globalAlpha = fade * (reduced ? clamp01(age / 0.2) : 1);
  ctx.translate(W / 2, y);
  ctx.scale(k, k);
  outlined(ctx, name, 0, 0, { size, fill: C.ink, stroke: C.cream, lw: size * 0.2 });
  ctx.restore();
  let ty = y + size * 0.85;
  ctx.save();
  ctx.globalAlpha = fade;
  if (page) {
    outlined(ctx, page.toUpperCase(), W / 2, ty - size * 0.2, { size: L.small ? 16 : 20, weight: 800, family: FONT_LABEL, fill: T.brownDark, stroke: C.cream, lw: 5 });
    ty += L.small ? 22 : 28;
  }
  if (twist) {
    drawStamp(ctx, twist.toUpperCase(), W / 2, ty, L.small ? 20 : 26, { rot: -0.06, color: C.blue, scale: reduced ? 1 : easeBack((age - 0.15) / 0.25) });
    ty += L.small ? 38 : 48;
  }
  if (x2) {
    drawStamp(ctx, 'DOUBLE POINTS', W / 2, ty, L.small ? 20 : 26, { rot: 0.05, color: C.red, scale: reduced ? 1 : easeBack((age - 0.25) / 0.25) });
    ty += L.small ? 38 : 48;
  }
  if (hint) outlined(ctx, hint, W / 2, ty, { size: L.small ? 18 : 22, weight: 700, fill: C.red, stroke: C.cream });
  ctx.restore();
}

/** "Hold" (with the key or a finger), "Let go!" once, or nothing; a pocket watch when time runs short. */
export function drawPrompt(ctx, L, { label, key, touch, t, watch, reduced }) {
  const { x, y } = L.prompt;
  if (label) {
    const pulse = reduced ? 1 : 1 + 0.05 * Math.sin(t * 6);
    const size = L.small ? 26 : 34;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.font = font(900, size);
    const tw = ctx.measureText(label).width;
    let iconW = 0;
    if (key) {
      ctx.font = font(800, size * 0.62, FONT_LABEL);
      iconW = ctx.measureText(key).width + size * 0.9;
    } else if (touch) iconW = size * 1.1;
    const total = tw + (iconW ? iconW + size * 0.35 : 0);
    let cx = -total / 2;
    if (key) {
      const kh = size * 1.1;
      withShadow(ctx, () => rr(ctx, cx, -kh / 2, iconW, kh, 8), C.cream, 0, 4, T.brownDark);
      rr(ctx, cx, -kh / 2, iconW, kh, 8);
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      text(ctx, key, cx + iconW / 2, 1, size * 0.62, { family: FONT_LABEL, weight: 800 });
      cx += iconW + size * 0.35;
    } else if (touch) {
      // A fingertip pressing down.
      const r = size * 0.42;
      circle(ctx, cx + r + 2, 0, r * (1.5 + 0.2 * Math.sin(t * 6)), 'rgba(243,227,195,0.55)');
      circle(ctx, cx + r + 2, 0, r, C.cream);
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      circle(ctx, cx + r + 2, 0, r);
      ctx.stroke();
      cx += iconW + size * 0.35;
    }
    outlined(ctx, label, cx + tw / 2, 0, { size, fill: C.ink, stroke: C.cream, lw: size * 0.22 });
    ctx.restore();
  }
  if (watch !== null && watch !== undefined) {
    const r = L.small ? 20 : 26;
    const wx = x + (label ? (L.small ? 150 : 210) : 0);
    circle(ctx, wx + 2, y + 3, r, T.shadow);
    circle(ctx, wx, y, r, C.mustard);
    circle(ctx, wx, y, r * 0.78, C.cream);
    circle(ctx, wx, y - r - 3, r * 0.2, C.mustard);
    const a = -Math.PI / 2 + (1 - watch / 3) * Math.PI * 2;
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(wx, y);
    ctx.lineTo(wx + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6);
    ctx.stroke();
    text(ctx, String(Math.ceil(watch)), wx, y + r * 0.1, r * 0.8, { fill: C.ink });
  }
}

// ---------------------------------------------------------------- the reveal

/** Spread markers along one axis so none overlap: ys sorted, each at least `gap` apart, kept near its true place. */
export function spread(ys, gap, lo, hi) {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const out = order.map((o) => o.y);
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 1; i < out.length; i++) {
      const over = gap - (out[i] - out[i - 1]);
      if (over > 0.01) {
        out[i - 1] -= over / 2;
        out[i] += over / 2;
        moved = true;
      }
    }
    if (out.length) {
      if (out[0] < lo) {
        const d = lo - out[0];
        for (let i = 0; i < out.length; i++) out[i] += d;
      }
      if (out[out.length - 1] > hi) {
        const d = out[out.length - 1] - hi;
        for (let i = 0; i < out.length; i++) out[i] -= d;
      }
    }
    if (!moved) break;
  }
  const res = new Array(ys.length);
  order.forEach((o, k) => (res[o.i] = out[k]));
  return res;
}

export const REVEAL_DROP = 0.12;
export const REVEAL_FIRST = 0.3;

/**
 * R: { name, axis, c (the band's centre, as it was), w, marks: [{ id, who, name, v, k, points, me }] (worst first),
 *      standings: [{ id, who, name, points, me }], age (s) }
 * Returns where the best marker sits (for its stamp).
 */
export function drawReveal(ctx, W, H, top, R) {
  const portrait = H > W * 1.1;
  const small = Math.min(W, H) < 500;
  const bottom = H - 12;
  // A cream page laid over the scene.
  const slide = easeOut(R.age / 0.25);
  const px = 12;
  const pw = W - 24;
  const ph = bottom - top;
  const py = top + (1 - slide) * ph * 0.25;
  ctx.save();
  ctx.globalAlpha = slide;
  withShadow(ctx, () => rr(ctx, px, py, pw, ph, 16), T.paper, 6, 8);
  ctx.restore();
  if (slide < 0.2) return null;
  const titleSize = small ? 22 : 30;
  outlined(ctx, R.name, W / 2, py + titleSize * 0.9, { size: titleSize, fill: C.ink, stroke: null });
  const areaTop = py + titleSize * 1.8;
  // The gauge (upright) zoomed on the band and the marks.
  const vs = R.marks.filter((m) => m.k !== 'asleep').map((m) => m.v);
  const lo = Math.max(0, Math.min(R.c - R.w * 3.2, ...vs.map((v) => v - 0.04)));
  const hi = Math.min(1, Math.max(R.c + R.w * 3.2, ...vs.map((v) => v + 0.04)));
  const range = [lo, hi];
  const thick = small ? 34 : 46;
  const rowH = small ? 28 : 36;
  // Upright, the standings go under the gauge: every row has to fit.
  const gaugeH = portrait ? Math.min(420, ph - titleSize * 1.8 - thick * 1.9 - R.standings.length * rowH - 24) : ph - titleSize * 1.8 - thick * 1.1 - 24;
  const g = { x: portrait ? px + 46 : W * 0.2, y: areaTop + thick * 0.5, w: thick, h: Math.max(120, gaugeH) };
  const axis = R.axis === 'down' ? 'down' : 'up';
  drawGauge(ctx, g, { axis, v: R.c, c: R.c, w: R.w, style: 'pointer', range, indicator: false, t: R.age });
  // Markers: each a face beside the gauge, spread so none hide another, a line to its true place.
  const r = small ? 14 : 18;
  const gap = r * 2 + 4;
  const ys = R.marks.map((m) => gaugePos(g, axis, m.k === 'asleep' ? (axis === 'down' ? lo : lo) : m.v, range));
  const placed = spread(ys, gap, g.y - r, g.y + g.h + r);
  const mx = g.x + g.w + thick * 1.4 + r;
  let best = null;
  R.marks.forEach((m, i) => {
    const at = REVEAL_FIRST + i * REVEAL_DROP;
    const k = (R.age - at) / 0.22;
    if (k <= 0) return;
    const drop = easeBack(k);
    const y = lerp(placed[i] - 60, placed[i], drop);
    ctx.save();
    ctx.globalAlpha = clamp01(k * 3);
    ctx.strokeStyle = m.me ? C.mustard : C.ink;
    ctx.lineWidth = m.me ? 3.5 : 2;
    ctx.beginPath();
    ctx.moveTo(g.x + g.w + 2, ys[i]);
    ctx.lineTo(mx - r - 4, y);
    ctx.stroke();
    circle(ctx, g.x + g.w + 2, ys[i], m.me ? 5 : 4, m.me ? C.mustard : C.ink);
    drawFace(ctx, m.who, mx, y, r, { me: m.me });
    const word = m.k === 'asleep' ? 'zZz' : `+${m.points}`;
    const nameMax = portrait ? W - mx - r - 90 : W * 0.36 - r;
    ctx.font = font(800, small ? 17 : 20, FONT_LABEL);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.ink;
    ctx.fillText(m.name, mx + r + 8, y, Math.max(40, nameMax));
    const nw = Math.min(ctx.measureText(m.name).width, Math.max(40, nameMax));
    const isBest = i === R.marks.length - 1 && m.k !== 'asleep';
    text(ctx, word, mx + r + 14 + nw, y, small ? 18 : 22, { align: 'left', fill: m.k === 'perfect' ? C.red : m.k === 'good' ? C.green : T.brownMid });
    ctx.font = font(900, small ? 18 : 22);
    if (isBest) best = { x: mx, y, r, end: mx + r + 14 + nw + ctx.measureText(word).width, limit: portrait ? W - 24 : W * 0.62 - 12 };
    ctx.restore();
  });
  // The crown on the closest.
  const crownAt = REVEAL_FIRST + R.marks.length * REVEAL_DROP + 0.1;
  if (best && R.age > crownAt) {
    const k = easeBack((R.age - crownAt) / 0.25);
    drawCrown(ctx, best.x - best.r * 0.55, best.y - best.r * 0.62, best.r * 0.62, -0.35, k);
  }
  // The standings: to the right (wide) or below (upright).
  const rows = R.standings;
  let sx;
  let sy;
  let sw;
  if (portrait) {
    sx = px + 16;
    sy = g.y + g.h + thick * 1.4;
    sw = pw - 32;
  } else {
    sx = W * 0.62;
    sy = areaTop + 6;
    sw = W - sx - 28;
  }
  const maxRows = Math.max(1, Math.floor((bottom - 10 - sy) / rowH));
  const show = rows.map((s, i) => ({ ...s, place: i + 1 })).slice(0, maxRows);
  // Short of room, your own row still shows (in the last line).
  const mine = rows.findIndex((s) => s.me);
  if (mine >= maxRows) show[maxRows - 1] = { ...rows[mine], place: mine + 1 };
  const pointsIn = clamp01((R.age - crownAt - 0.2) / 0.4);
  show.forEach((s, i) => {
    const y = sy + i * rowH + rowH / 2;
    if (s.me) {
      rr(ctx, sx - 6, y - rowH / 2 + 2, sw + 12, rowH - 4, 8);
      ctx.fillStyle = 'rgba(232,169,46,0.28)';
      ctx.fill();
    }
    text(ctx, String(s.place), sx + 10, y, small ? 17 : 20, { fill: T.brownMid });
    drawFace(ctx, s.who, sx + 40, y, rowH * 0.36, { me: s.me, shadow: false });
    ctx.font = font(800, small ? 17 : 20, FONT_LABEL);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink;
    ctx.fillText(s.name, sx + 40 + rowH * 0.5, y, sw * 0.5);
    const shown = Math.round(s.points - (s.gain ?? 0) * (1 - pointsIn));
    text(ctx, commas(shown), sx + sw, y, small ? 18 : 22, { align: 'right' });
  });
  return best;
}

// ---------------------------------------------------------------- the countdown

export function drawCountdown(ctx, W, H, countdown, reduced) {
  if (countdown === null || countdown === undefined) return;
  const n = Math.max(1, Math.ceil(countdown));
  if (n > 3) return;
  const frac = 1 - (countdown - (n - 1));
  const kind = n === 3 ? 'papa' : n === 2 ? 'mama' : 'baby';
  const k = reduced ? 1 : easeBack(frac / 0.25);
  const R = Math.min(W, H) * 0.16;
  const cx = W / 2;
  const cy = H * 0.42;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(k, k);
  drawBearHead(ctx, kind, -R * 0.8, 0, R, n === 1 ? 'sleepy' : n === 3 ? 'grump' : 'sweet');
  outlined(ctx, String(n), R * 0.9, R * 0.05, { size: R * 2.1, fill: C.red, stroke: C.cream, lw: R * 0.24 });
  ctx.restore();
}

// ---------------------------------------------------------------- the lobby at the bears' table

/** The lobby's places: the wall objects (each a button) and the seats at the table. */
export function lobbyLayout(W, H, clear) {
  const portrait = H > W * 1.1;
  const small = Math.min(W, H) < 500;
  const bottom = H - Math.max(clear.bottom, 88) - 6;
  const top = Math.max(clear.top + 6, 12);
  const objects = {};
  const ids = ['clock', 'bowls', 'calendar', 'shelf'];
  if (portrait) {
    const cell = Math.min((W - 40) / 2, (bottom - top) * 0.25);
    ids.forEach((id, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      objects[id] = { x: W / 2 + (col ? 10 : -10 - cell), y: top + row * (cell + 8), w: cell, h: cell };
    });
  } else {
    const wallH = (bottom - top) * (small ? 0.46 : 0.44);
    const cell = Math.min(wallH, (W - 60) / 4.4);
    const left = Math.max(clear.left, 20);
    const span = W - left - 20 - clear.right;
    ids.forEach((id, i) => {
      objects[id] = { x: left + (span / 4) * (i + 0.5) - cell / 2, y: top, w: cell, h: cell };
    });
  }
  const wallBottom = Math.max(...Object.values(objects).map((o) => o.y + o.h));
  const tableTop = wallBottom + (portrait ? 70 : small ? 40 : 60);
  const rows = portrait ? 2 : 1;
  const per = portrait ? 4 : 8;
  const seatW = Math.min((W - 24) / per, 150);
  const rowH = (bottom - tableTop) / rows;
  const seats = [];
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < per; i++) {
      const x = W / 2 + (i - (per - 1) / 2) * seatW;
      seats.push({ x, y: tableTop + row * rowH, w: seatW, h: rowH });
    }
  }
  return { portrait, small, objects, seats, tableTop, rowH, bottom, seatW, rows };
}

function bowlShape(ctx, x, y, r, color) {
  withShadow(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 0.55);
    ctx.quadraticCurveTo(x, y + r * 0.6, x + r, y - r * 0.55);
    ctx.closePath();
  }, color, 2, 3);
  ellipse(ctx, x, y - r * 0.55, r, r * 0.22, T.redDark);
  ellipse(ctx, x, y - r * 0.52, r * 0.82, r * 0.15, '#EFC56A');
}

function label(ctx, str, x, y, small) {
  outlined(ctx, str, x, y, { size: small ? 17 : 20, weight: 900, fill: C.ink, stroke: C.cream, lw: 5 });
}

/**
 * Lb: { seats: [{ who, name, ready, host, me, bot, empty, invite }], pages (8/12/16), isHost, soloOk, best, daily: { day, month,
 *       best, streak }, t, winner }
 */
export function drawLobby(ctx, W, H, dpr, clear, Lb) {
  const LL = lobbyLayout(W, H, clear);
  // Upright, the clock and the calendar take the wall where the window would be.
  drawKitchen(ctx, W, H, dpr, Lb.t, { x: 0, y: 0 }, LL.tableTop + LL.rowH * 0.95, LL.portrait);
  const s = LL.small;
  const O = LL.objects;
  const dimSolo = Lb.soloOk ? 1 : 0.45;
  // The cuckoo clock: Before the Bears, the best run on its face.
  {
    const o = O.clock;
    const cx = o.x + o.w / 2;
    ctx.save();
    ctx.globalAlpha = dimSolo;
    const bw = o.w * 0.62;
    const bh = o.h * 0.6;
    const by = o.y + o.h * 0.2;
    withShadow(ctx, () => rr(ctx, cx - bw / 2, by, bw, bh, 6), T.brownMid, 3, 4);
    ctx.fillStyle = T.brownDark;
    ctx.beginPath();
    ctx.moveTo(cx - bw * 0.62, by + 4);
    ctx.lineTo(cx, by - o.h * 0.16);
    ctx.lineTo(cx + bw * 0.62, by + 4);
    ctx.fill();
    circle(ctx, cx, by + bh * 0.42, bw * 0.36, C.cream);
    if (Lb.best > 0) text(ctx, commas(Lb.best), cx, by + bh * 0.44, Math.max(16, fitSize(ctx, commas(Lb.best), bw * 0.24, bw * 0.6)));
    else {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, by + bh * 0.42);
      ctx.lineTo(cx, by + bh * 0.24);
      ctx.moveTo(cx, by + bh * 0.42);
      ctx.lineTo(cx + bw * 0.16, by + bh * 0.5);
      ctx.stroke();
    }
    // The pendulum.
    const sw = Math.sin(Lb.t * 2.4) * 0.3;
    ctx.save();
    ctx.translate(cx, by + bh);
    ctx.rotate(sw);
    ctx.fillStyle = T.mustardDark;
    ctx.fillRect(-1.5, 0, 3, o.h * 0.14);
    circle(ctx, 0, o.h * 0.15, o.w * 0.05, C.mustard);
    ctx.restore();
    ctx.restore();
    label(ctx, 'Before the Bears', cx, o.y + o.h + (s ? 6 : 10), s);
  }
  // The three bowls on a shelf: the story's length.
  {
    const o = O.bowls;
    const cx = o.x + o.w / 2;
    const sy = o.y + o.h * 0.68;
    ctx.fillStyle = T.shadow;
    ctx.fillRect(o.x + 4, sy + 6, o.w, 10);
    ctx.fillStyle = T.brownMid;
    ctx.fillRect(o.x, sy, o.w, 10);
    const sizes = [8, 12, 16];
    sizes.forEach((n, i) => {
      const bx = o.x + o.w * (0.2 + i * 0.3);
      const r = o.w * (0.09 + i * 0.025);
      const on = Lb.pages === n;
      if (on) {
        ctx.save();
        ctx.lineCap = 'round';
        for (let j = 0; j < 2; j++) {
          const k = (Lb.t * 0.7 + j / 2) % 1;
          ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8;
          ctx.strokeStyle = T.paper;
          ctx.lineWidth = 4;
          ctx.beginPath();
          const y0 = sy - r * 0.9 - k * r * 1.6;
          ctx.moveTo(bx - 4 + j * 8, y0);
          ctx.quadraticCurveTo(bx + 6 + j * 8, y0 - r * 0.4, bx - 2 + j * 8, y0 - r * 0.8);
          ctx.stroke();
        }
        ctx.restore();
      }
      bowlShape(ctx, bx, sy, r, on ? C.red : '#B85A44');
      text(ctx, String(n), bx, sy + r * 0.05 + (s ? 16 : 20), s ? 17 : 20, { fill: on ? C.ink : T.brownDark });
      if (on) {
        circle(ctx, bx, sy + (s ? 34 : 42), s ? 7 : 9, C.green);
      }
    });
    label(ctx, 'Pages', cx, o.y + o.h + (s ? 6 : 10), s);
  }
  // The calendar: today's daily.
  {
    const o = O.calendar;
    const cx = o.x + o.w / 2;
    ctx.save();
    ctx.globalAlpha = dimSolo;
    const cw = o.w * 0.6;
    const ch = o.h * 0.7;
    const cy = o.y + o.h * 0.12;
    withShadow(ctx, () => rr(ctx, cx - cw / 2, cy, cw, ch, 6), T.paper, 3, 4);
    ctx.fillStyle = C.red;
    rr(ctx, cx - cw / 2, cy, cw, ch * 0.26, 6);
    ctx.fill();
    ctx.fillRect(cx - cw / 2, cy + ch * 0.14, cw, ch * 0.12);
    text(ctx, Lb.daily.month, cx, cy + ch * 0.14, Math.max(16, ch * 0.15), { family: FONT_LABEL, weight: 800, fill: C.cream });
    text(ctx, String(Lb.daily.day), cx, cy + ch * 0.55, Math.max(18, ch * 0.36));
    if (Lb.daily.best > 0) text(ctx, commas(Lb.daily.best), cx, cy + ch * 0.86, Math.max(16, ch * 0.14), { family: FONT_LABEL, weight: 800, fill: C.green });
    ctx.restore();
    label(ctx, 'Daily', cx, o.y + o.h + (s ? 6 : 10), s);
  }
  // The bookshelf: practice.
  {
    const o = O.shelf;
    const cx = o.x + o.w / 2;
    ctx.save();
    ctx.globalAlpha = dimSolo;
    const bw = o.w * 0.64;
    const bh = o.h * 0.74;
    const by = o.y + o.h * 0.1;
    withShadow(ctx, () => rr(ctx, cx - bw / 2, by, bw, bh, 4), T.brownMid, 3, 4);
    const cols = [C.red, C.blue, C.green, C.mustard, T.redLight, T.blueDark, T.greenLight];
    for (let row = 0; row < 2; row++) {
      const ry = by + 6 + row * (bh / 2);
      const rh = bh / 2 - 10;
      ctx.fillStyle = T.brownDark;
      ctx.fillRect(cx - bw / 2 + 5, ry, bw - 10, rh);
      let x = cx - bw / 2 + 7;
      let i = row * 3;
      while (x < cx + bw / 2 - 12) {
        const w = bw * (0.08 + ((i * 7) % 4) * 0.012);
        const h = rh * (0.78 + ((i * 5) % 3) * 0.1);
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(x, ry + rh - h, w - 2, h);
        x += w;
        i++;
      }
    }
    ctx.restore();
    label(ctx, 'Practice', cx, o.y + o.h + (s ? 6 : 10), s);
  }
  // The table and who sits at it.
  const rowH = LL.rowH;
  for (let row = 0; row < LL.rows; row++) {
    const ty = LL.tableTop + row * rowH + rowH * 0.62;
    // Seats of this row (behind the table).
    LL.seats.slice(row * (LL.seats.length / LL.rows), (row + 1) * (LL.seats.length / LL.rows)).forEach((seat, i) => {
      const idx = row * (LL.seats.length / LL.rows) + i;
      const who = Lb.seats[idx];
      const sx = seat.x;
      const sc = Math.min(seat.w / 70, rowH / 95);
      // The chair back.
      withShadow(ctx, () => rr(ctx, sx - 22 * sc, ty - 70 * sc, 44 * sc, 70 * sc, 10 * sc), who && !who.empty ? T.brownMid : T.brownLight, 3, 3);
      if (!who || who.empty) {
        if (who?.invite) {
          circle(ctx, sx, ty - 38 * sc, 15 * sc, C.cream);
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx - 7 * sc, ty - 38 * sc);
          ctx.lineTo(sx + 7 * sc, ty - 38 * sc);
          ctx.moveTo(sx, ty - 45 * sc);
          ctx.lineTo(sx, ty - 31 * sc);
          ctx.stroke();
        }
        return;
      }
      ctx.save();
      if (who.bot) ctx.globalAlpha = 0.85;
      drawSitter(ctx, who.who, sx, ty - 18 * sc, sc * 1.05, { color: who.color, me: who.me });
      ctx.restore();
      if (who.host) {
        ctx.fillStyle = C.mustard;
        const cy = ty - 66 * sc;
        ctx.beginPath();
        ctx.moveTo(sx - 12 * sc, cy);
        ctx.lineTo(sx - 12 * sc, cy - 9 * sc);
        ctx.lineTo(sx - 5 * sc, cy - 4 * sc);
        ctx.lineTo(sx, cy - 12 * sc);
        ctx.lineTo(sx + 5 * sc, cy - 4 * sc);
        ctx.lineTo(sx + 12 * sc, cy - 9 * sc);
        ctx.lineTo(sx + 12 * sc, cy);
        ctx.closePath();
        ctx.fill();
      }
    });
    // The table top with its checked cloth.
    withShadow(ctx, () => rr(ctx, 8, ty, W - 16, rowH * 0.2, 6), C.red, 0, 6);
    ctx.save();
    rr(ctx, 8, ty, W - 16, rowH * 0.2, 6);
    ctx.clip();
    ctx.fillStyle = 'rgba(243,227,195,0.35)';
    for (let x = 8; x < W; x += 28) ctx.fillRect(x, ty, 14, rowH * 0.2);
    ctx.restore();
    // Place cards in front.
    LL.seats.slice(row * (LL.seats.length / LL.rows), (row + 1) * (LL.seats.length / LL.rows)).forEach((seat, i) => {
      const idx = row * (LL.seats.length / LL.rows) + i;
      const who = Lb.seats[idx];
      if (!who || who.empty) return;
      const cw = Math.min(seat.w - 8, 132);
      const chh = s ? 26 : 30;
      const cy = ty + rowH * 0.1 - chh / 2 + 4;
      withShadow(ctx, () => rr(ctx, seat.x - cw / 2, cy, cw, chh, 4), who.me ? '#FBE9B5' : T.paper, 2, 3);
      const size = fitSize(ctx, who.name, s ? 16 : 18, cw - 10, 800, FONT_LABEL);
      text(ctx, who.name, seat.x, cy + chh / 2 + 1, Math.max(16, size), { family: FONT_LABEL, weight: 800, maxWidth: cw - 8 });
      if (who.ready) drawStamp(ctx, 'READY', seat.x + cw * 0.18, cy - (s ? 8 : 12), s ? 16 : 18, { rot: -0.14, color: C.green });
    });
  }
  // The last story's winner, framed on the wall (wide screens).
  if (Lb.winner && !LL.portrait && !LL.small) {
    const fx = W - 70;
    const fy = LL.tableTop - 64;
    withShadow(ctx, () => rr(ctx, fx - 34, fy - 34, 68, 68, 6), T.mustardDark, 3, 4);
    drawFace(ctx, Lb.winner, fx, fy, 24, { shadow: false });
  }
  return LL;
}

// ---------------------------------------------------------------- the podium

function podiumChair(ctx, x, floorY, size, color) {
  const w = 80 * size;
  const seatY = floorY - 46 * size;
  const back = 96 * size;
  // The back: two posts and a painted top rail.
  for (const px of [-w * 0.42, w * 0.42 - 9 * size]) withShadow(ctx, () => rr(ctx, x + px, seatY - back, 9 * size, back, 4 * size), T.brownMid, 2, 3);
  withShadow(ctx, () => rr(ctx, x - w * 0.5, seatY - back - 6 * size, w, 22 * size, 8 * size), color, 2, 3);
  // Legs and the seat.
  ctx.fillStyle = T.brownMid;
  ctx.fillRect(x - w * 0.42, seatY, 8 * size, 46 * size);
  ctx.fillRect(x + w * 0.42 - 8 * size, seatY, 8 * size, 46 * size);
  withShadow(ctx, () => rr(ctx, x - w / 2, seatY - 10 * size, w, 13 * size, 4 * size), T.brownLight, 2, 3);
  return seatY - 10 * size;
}

/** A small gold crown, its base centred at (x, y), cw half its width. */
export function drawCrown(ctx, x, y, cw, rot = 0, k = 1) {
  if (k <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(k, k);
  ctx.fillStyle = C.mustard;
  ctx.beginPath();
  ctx.moveTo(-cw, 0);
  ctx.lineTo(-cw, -cw * 0.7);
  ctx.lineTo(-cw * 0.45, -cw * 0.3);
  ctx.lineTo(0, -cw * 0.95);
  ctx.lineTo(cw * 0.45, -cw * 0.3);
  ctx.lineTo(cw, -cw * 0.7);
  ctx.lineTo(cw, 0);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.restore();
}

/** P: { rows: [{ who, name, points, place, me, color }], age }. */
export function drawPodium(ctx, W, H, dpr, top, P) {
  const portrait = H > W * 1.1;
  const floorY = Math.round(H * (portrait ? 0.66 : 0.76));
  const K = drawKitchen(ctx, W, H, dpr, P.age, { x: 0, y: 0 }, floorY);
  const small = Math.min(W, H) < 500;
  const unit = Math.min(W / (portrait ? 420 : 760), (floorY - top) / 260);
  // The bears are home: through the door behind the chairs (wide), or at the window (upright, where there's no room for a door).
  const doorX = W * 0.87;
  const bearAt = (i) => doorX + (i - 1) * 34 * unit;
  let speaker = null;
  if (portrait) {
    drawBearsAtWindow(ctx, K, ['grump', 'shock', 'shock']);
    if (K.win) speaker = { x: K.win.x + K.win.r * 0.62, y: K.win.y - K.win.r * 0.2 };
  } else {
    const dh = Math.min(240 * unit, (floorY - top) * 0.8);
    door(ctx, doorX, floorY - 2, dh, 1);
    const walkIn = easeOut(P.age / 2.2);
    ['papa', 'mama', 'baby'].forEach((kind, i) => {
      const x = lerp(doorX + 20 * unit, bearAt(i), walkIn);
      drawBear(ctx, kind, x, floorY - 4, 0.44 * unit, { walk: walkIn < 1 ? P.age * 8 + i : undefined, expr: kind === 'baby' ? 'shock' : kind === 'papa' ? 'grump' : 'sweet', flip: true });
    });
    speaker = { x: bearAt(2), y: floorY - 150 * unit };
  }
  const xs = portrait ? [W * 0.5, W * 0.2, W * 0.8] : [W * 0.47, W * 0.27, W * 0.67];
  const spots = [
    { place: 1, x: xs[0], size: 0.85 * unit, color: C.red },
    { place: 2, x: xs[1], size: 1.05 * unit, color: C.mustard },
    { place: 3, x: xs[2], size: 1.25 * unit, color: C.green },
  ];
  for (const spot of spots) {
    const who = P.rows.filter((r) => r.place === spot.place);
    const seatY = podiumChair(ctx, spot.x, floorY, spot.size, spot.color);
    const r = who[0];
    if (!r) continue;
    const rise = easeBack((P.age - 0.3 - (3 - spot.place) * 0.25) / 0.35);
    if (rise > 0) {
      ctx.save();
      ctx.translate(spot.x, seatY);
      ctx.scale(rise, rise);
      drawSitter(ctx, r.who, 0, -8 * unit, 1.25 * unit, { color: r.color, me: r.me });
      ctx.restore();
      if (spot.place === 1) drawCrown(ctx, spot.x - 13 * unit * rise, seatY - 47 * unit * rise, 14 * unit, -0.35, rise);
    }
    // The place, painted on the chair's top rail.
    const railY = seatY - 81 * spot.size;
    text(ctx, ordinal(spot.place), spot.x, railY, Math.max(13, 15 * spot.size), { family: FONT_LABEL, weight: 800, fill: C.cream, align: 'center' });
    const name = who.length > 1 ? `${r.name} +${who.length - 1}` : r.name;
    const cy = floorY + (small ? 20 : 28);
    const size = Math.max(16, Math.min(small ? 18 : 24, fitSize(ctx, name, small ? 18 : 24, (portrait ? W * 0.3 : W * 0.18), 800, FONT_LABEL)));
    outlined(ctx, name, spot.x, cy, { size, weight: 800, family: FONT_LABEL, fill: C.cream, stroke: T.brownDark, lw: 4 });
    outlined(ctx, commas(r.points), spot.x, cy + size + 6, { size: small ? 18 : 24, fill: C.mustard, stroke: T.brownDark, lw: 4 });
  }
  // Baby Bear's line, over everything.
  if (P.age > 2.2 && speaker) {
    const msg = "Someone's in my chair!";
    const size = small ? 16 : 20;
    ctx.font = font(900, size);
    const tw = ctx.measureText(msg).width;
    // Upright, the bubble sits to the right of the window and points back at it.
    const bx = portrait ? Math.min(W - tw / 2 - 16, speaker.x + tw / 2 + 24) : Math.min(W - tw / 2 - 20, Math.max(tw / 2 + 20, speaker.x));
    const by = portrait ? speaker.y - size * 1.6 : speaker.y;
    withShadow(ctx, () => rr(ctx, bx - tw / 2 - 14, by - size * 1.1, tw + 28, size * 2.2, 14), T.paper, 2, 3);
    ctx.fillStyle = T.paper;
    ctx.beginPath();
    if (portrait) {
      ctx.moveTo(bx - tw / 2 - 2, by + size * 0.4);
      ctx.lineTo(bx - tw / 2 + 18, by + size * 1.05);
      ctx.lineTo(speaker.x, speaker.y);
    } else {
      ctx.moveTo(speaker.x - 6, by + size * 1.05);
      ctx.lineTo(speaker.x + 8, by + size * 1.05);
      ctx.lineTo(speaker.x + 4, by + size * 1.9);
    }
    ctx.fill();
    text(ctx, msg, bx, by + 1, size);
  }
  // Everyone else, along the bottom.
  const rest = P.rows.filter((r) => r.place > 3);
  const rowY = H - (small ? 22 : 32);
  const each = Math.min(150, (W - 40) / Math.max(1, rest.length));
  rest.forEach((r, i) => {
    const x = W / 2 + (i - (rest.length - 1) / 2) * each;
    drawFace(ctx, r.who, x - each * 0.3, rowY, small ? 12 : 15, { me: r.me });
    text(ctx, `${ordinal(r.place)} ${commas(r.points)}`, x + 6, rowY, small ? 16 : 18, { family: FONT_LABEL, weight: 800, fill: C.cream, align: 'center' });
  });
}

// ---------------------------------------------------------------- the end of a run, the daily, practice, pause, closed

export function drawRunOver(ctx, W, H, dpr, top, R) {
  const floorY = Math.round(H * 0.8);
  drawKitchen(ctx, W, H, dpr, R.age, { x: 0, y: 0 }, floorY);
  const doorX = W * (H > W * 1.1 ? 0.75 : 0.78);
  const dh = Math.min(260, (floorY - top) * 0.8);
  door(ctx, doorX, floorY, dh, 1);
  const unit = dh / 260;
  ['papa', 'mama', 'baby'].forEach((kind, i) => {
    drawBear(ctx, kind, doorX + (i - 1) * 70 * unit, floorY + 4, 0.62 * unit, { expr: 'roar', wave: R.age * 6 + i });
  });
  // Goldilocks fleeing to the left.
  const s = Math.min(0.9, (floorY - top) / 300);
  drawGirl(ctx, W * 0.16 - Math.min(40, R.age * 30), floorY - 45 * s, s, { face: 'shock', flip: true, armL: 2.4, armR: 2.6, legs: Math.sin(R.age * 12) * 0.5 });
  const small = Math.min(W, H) < 500;
  const cx = H > W * 1.1 ? W / 2 : W * 0.42;
  const big = Math.min(small ? 76 : 120, W * 0.2);
  outlined(ctx, commas(R.score), cx, top + big * 0.7, { size: big, fill: C.ink, stroke: C.cream, lw: big * 0.16 });
  const line = `${R.pages} page${R.pages === 1 ? '' : 's'} · Best ${commas(R.best)}`;
  outlined(ctx, line, cx, top + big * 1.45, { size: small ? 18 : 24, weight: 700, fill: C.ink, stroke: C.cream });
  return { cx, y: top + big * 1.45 + (small ? 30 : 44) };
}

export function drawDailyOver(ctx, W, H, dpr, top, D) {
  drawKitchen(ctx, W, H, dpr, D.age, { x: 0, y: 0 }, Math.round(H * 0.84));
  const small = Math.min(W, H) < 500;
  const cw = Math.min(W - 40, small ? 300 : 380);
  const ch = Math.min(H - top - (small ? 110 : 150), small ? 230 : 320);
  const cx = W / 2;
  const cy = top + 6;
  withShadow(ctx, () => rr(ctx, cx - cw / 2, cy, cw, ch, 10), T.paper, 6, 8);
  rr(ctx, cx - cw / 2, cy, cw, ch * 0.22, 10);
  ctx.fillStyle = C.red;
  ctx.fill();
  ctx.fillRect(cx - cw / 2, cy + ch * 0.12, cw, ch * 0.1);
  text(ctx, `${D.day} ${D.month}`, cx, cy + ch * 0.12, Math.max(18, ch * 0.1), { family: FONT_LABEL, weight: 800, fill: C.cream });
  const big = ch * 0.34;
  text(ctx, commas(D.score), cx, cy + ch * 0.5, big);
  text(ctx, '/ 1,000', cx, cy + ch * 0.5 + big * 0.62, Math.max(16, ch * 0.075), { family: FONT_LABEL, weight: 800, fill: T.brownMid });
  text(ctx, `Best ${commas(D.best)} · ${D.streak} day${D.streak === 1 ? '' : 's'}`, cx, cy + ch * 0.88, Math.max(16, ch * 0.075), { family: FONT_LABEL, weight: 800, fill: C.green });
  return { cx, y: cy + ch + (small ? 44 : 60) };
}

/** The practice bookshelf: a spine per page (blank until met), stars on each. Returns each book's rectangle. */
export function drawShelf(ctx, W, H, dpr, top, S) {
  drawKitchen(ctx, W, H, dpr, S.t, { x: 0, y: 0 }, Math.round(H * 0.9));
  const small = Math.min(W, H) < 500;
  const portrait = H > W * 1.1;
  const cols = portrait ? 4 : 6;
  const rowsN = Math.ceil(PAGES.length / cols);
  const bottom = H - (small ? 84 : 100);
  const caseW = Math.min(W - 24, portrait ? W - 24 : (bottom - top) * 2.2);
  const caseH = bottom - top;
  const x0 = (W - caseW) / 2;
  withShadow(ctx, () => rr(ctx, x0, top, caseW, caseH, 8), T.brownMid, 5, 6);
  const rowH = (caseH - 16) / rowsN;
  const colW = (caseW - 24) / cols;
  const books = [];
  const tints = [C.red, C.blue, C.green, C.mustard, T.blueDark, T.redLight];
  PAGES.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = x0 + 12 + col * colW + 4;
    const by = top + 8 + row * rowH + 6;
    const bw = colW - 8;
    const bh = rowH - 14;
    if (col === 0) {
      ctx.fillStyle = T.brownDark;
      ctx.fillRect(x0 + 8, by - 2, caseW - 16, bh + 4);
    }
    const met = S.met[p.id] > 0;
    withShadow(ctx, () => rr(ctx, bx, by, bw, bh, 4), met ? tints[i % tints.length] : T.creamDark, 2, 2);
    if (met) {
      ctx.save();
      ctx.translate(bx + bw / 2, by + bh * 0.45);
      const along = bh * 0.7;
      const size = Math.max(16, Math.min(fitSize(ctx, p.name, small ? 18 : 22, bw * 0.9, 900), small ? 18 : 22));
      if (bw < bh * 0.55 && fitSize(ctx, p.name, 20, along, 900) >= 16) {
        ctx.rotate(-Math.PI / 2);
        outlined(ctx, p.name, 0, 0, { size: Math.min(20, fitSize(ctx, p.name, 20, along, 900)), fill: C.cream, stroke: null });
      } else outlined(ctx, p.name, 0, 0, { size, fill: C.cream, stroke: null, maxWidth: bw - 6 });
      ctx.restore();
      const stars = S.stars[p.id] ?? 0;
      for (let k = 0; k < 3; k++) {
        const sx = bx + bw / 2 + (k - 1) * Math.min(18, bw * 0.28);
        const sy = by + bh - 14;
        star(ctx, sx, sy, small ? 7 : 8, k < stars ? C.mustard : 'rgba(243,227,195,0.35)');
      }
    } else text(ctx, '?', bx + bw / 2, by + bh / 2, Math.max(18, bw * 0.3), { fill: T.brownLight });
    books.push({ id: p.id, x: bx, y: by, w: bw, h: bh, met });
  });
  return books;
}

export function star(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const rr2 = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
  }
  ctx.closePath();
  ctx.fill();
}

/** A cream card in the middle of the screen with a heading (the pause, a closed room). Returns its rectangle. */
export function drawCard(ctx, W, H, heading, sub) {
  const small = Math.min(W, H) < 500;
  const cw = Math.min(W - 40, 420);
  const ch = small ? 190 : 230;
  const x = (W - cw) / 2;
  const y = (H - ch) / 2 - 10;
  withShadow(ctx, () => rr(ctx, x, y, cw, ch, 14), T.paper, 6, 8);
  const size = fitSize(ctx, heading, small ? 28 : 36, cw - 40);
  text(ctx, heading, W / 2, y + (small ? 44 : 56), size);
  if (sub) text(ctx, sub, W / 2, y + (small ? 80 : 98), small ? 17 : 20, { family: FONT_LABEL, weight: 800, fill: T.brownMid, maxWidth: cw - 30 });
  return { x, y, w: cw, h: ch };
}

/** The title: the name stamped across the top third and the best run under it. */
export function drawTitle(ctx, W, H, { best, age, reduced, dpr }) {
  const small = Math.min(W, H) < 500;
  const size = Math.min(W * (H > W * 1.1 ? 0.13 : 0.085), small ? 60 : 96);
  const y = Math.max(H * 0.16, size * 0.9 + 70 * (W < 700 ? 1 : 0));
  const k = reduced ? 1 : age < 0.15 ? 0 : clamp01((age - 0.15) / 0.12);
  const scale = reduced ? 1 : k < 1 ? 2.2 - 1.2 * k * k : 1;
  if (k > 0) drawStamp(ctx, 'JUST RIGHT', W / 2, y, size, { rot: -0.06, color: C.red, scale, alpha: reduced ? clamp01(age / 0.3) : 0.4 + 0.6 * k, dpr });
  if (best > 0) outlined(ctx, `Best ${commas(best)}`, W / 2, y + size * 1.05, { size: small ? 18 : 24, weight: 900, fill: C.ink, stroke: C.cream });
}

export { kitchenLayout };
