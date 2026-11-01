// The twelve pages, drawn: one object and its motion each, and what happens when you let go (a dip of the spoon, a cracked
// chair, a pop, a splash). Every scene is drawn from one state S (no memory of its own), so a reload, the title's attract mode
// and the posters draw the same thing:
//   S = { P, box {x,y,w,h}, u (unit), floor (y), v (the value now), c (the band now), w, holding, pressed, released, k (the
//         verdict, once let go), since (s since letting go), e (effective s held), t (s), reduced, gx(v) (x along a level gauge),
//         g (the gauge's rectangle) }
// burst(fx, S) throws the particles of a verdict.

import { C, T, rr, circle, ellipse, withShadow, inkLine, drawGirl } from './kit.js';
import { WOBBLY } from './pages.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - (1 - clamp01(k)) ** 3;
const easeIn = (k) => clamp01(k) ** 2;
const hash = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const okK = (k) => k === 'perfect' || k === 'good';

function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const m = (s) => Math.round(lerp(ch(pa, s), ch(pb, s), clamp01(k)));
  return `rgb(${m(16)},${m(8)},${m(0)})`;
}

/** A colour along stops [[at, '#hex'], ...]. */
function ramp(stops, x) {
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (x - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  }
  return stops[stops.length - 1][1];
}

/** The girl's face for this moment. */
function faceFor(S, { hold = 'focus', good = 'cheer', bad = 'oops', big = 'shock' } = {}) {
  if (S.k === 'asleep') return 'focus';
  if (S.k) return okK(S.k) ? good : S.k === 'over' || S.k === 'pop' ? big : bad;
  return S.holding ? hold : 'smile';
}

/** Floating zZz over someone who never pressed. */
function zzz(ctx, x, y, u, t) {
  ctx.save();
  ctx.font = `900 ${Math.round(u * 0.7)}px Fraunces, Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.6 + i / 3) % 1;
    ctx.globalAlpha = Math.sin(k * Math.PI);
    ctx.fillStyle = C.ink;
    ctx.font = `900 ${Math.round(u * (0.4 + i * 0.15))}px Fraunces, Georgia, serif`;
    ctx.fillText('z', x + k * u * 0.8 + i * u * 0.2, y - k * u * 1.4);
  }
  ctx.restore();
}

/** Wisps of steam: amount 0..1. */
function steam(ctx, x, y, u, t, amount, spread = 1) {
  if (amount <= 0.02) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.7 + i / 3) % 1;
    const sx = x + (i - 1) * u * 0.55 * spread;
    ctx.globalAlpha = amount * Math.sin(k * Math.PI) * 0.85;
    ctx.strokeStyle = T.paper;
    ctx.lineWidth = u * (0.16 + 0.1 * amount);
    ctx.beginPath();
    const y0 = y - k * u * 1.6;
    ctx.moveTo(sx, y0);
    ctx.bezierCurveTo(sx + u * 0.3, y0 - u * 0.4, sx - u * 0.3, y0 - u * 0.8, sx + u * 0.1, y0 - u * 1.2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The rattle of the Wobbly twist. */
const rattle = (S, amt = 0.04) => (S.P.tw === WOBBLY && S.holding && !S.reduced ? Math.sin(S.t * 48) * amt : 0);

function counter(ctx, x, y, w, u) {
  withShadow(ctx, () => rr(ctx, x, y, w, u * 0.45, u * 0.08), T.brownLight, 0, u * 0.12);
  ctx.fillStyle = T.brownMid;
  ctx.fillRect(x + u * 0.1, y + u * 0.45, w - u * 0.2, u * 0.25);
}

// ---------------------------------------------------------------- porridge

function porridge(ctx, S) {
  const { box, u, t } = S;
  const fy = S.floor;
  const cx = box.x + box.w * 0.6;
  const sw = u * 4.2;
  const sh = u * 2.9;
  const sx = cx - sw / 2;
  const sy = fy - sh;
  // The iron range.
  withShadow(ctx, () => rr(ctx, sx, sy, sw, sh, u * 0.25), C.ink, u * 0.14, u * 0.12);
  ctx.fillStyle = '#2B355E';
  rr(ctx, sx + sw * 0.16, sy + sh * 0.3, sw * 0.68, sh * 0.52, u * 0.14);
  ctx.fill();
  const glow = S.holding ? 0.9 : 0.25;
  rr(ctx, sx + sw * 0.28, sy + sh * 0.42, sw * 0.44, sh * 0.26, u * 0.1);
  ctx.fillStyle = mix('#3A2A2A', '#F08A3A', glow * (0.8 + 0.2 * Math.sin(t * 13)));
  ctx.fill();
  for (const kx of [0.12, 0.88]) circle(ctx, sx + sw * kx, sy + sh * 0.16, u * 0.13, C.mustard);
  rr(ctx, sx - u * 0.18, sy - u * 0.28, sw + u * 0.36, u * 0.32, u * 0.08);
  ctx.fillStyle = '#2B355E';
  ctx.fill();
  // Flames licking up round the pot.
  const pw = u * 3.0;
  const ph = u * 1.8;
  const potBase = sy - u * 0.28;
  const flame = S.holding ? 1 : S.pressed ? 0.2 : 0.35;
  for (let i = 0; i < 7; i++) {
    const fx = cx + (i - 3) * pw * 0.17;
    const fl = u * (0.25 + flame * 0.75) * (0.75 + 0.25 * Math.sin(t * 17 + i * 1.9));
    ctx.fillStyle = i % 2 ? C.mustard : C.red;
    ctx.beginPath();
    ctx.moveTo(fx - u * 0.2, potBase);
    ctx.quadraticCurveTo(fx - u * 0.05, potBase - fl * 0.6, fx + Math.sin(t * 9 + i) * u * 0.06, potBase - fl);
    ctx.quadraticCurveTo(fx + u * 0.05, potBase - fl * 0.6, fx + u * 0.2, potBase);
    ctx.fill();
  }
  // The pot (it rattles with the Wobbly twist).
  ctx.save();
  ctx.translate(cx, potBase);
  ctx.rotate(rattle(S));
  const px = -pw / 2;
  const py = -ph - u * 0.12;
  withShadow(ctx, () => rr(ctx, px, py, pw, ph, u * 0.4), C.red, u * 0.08, u * 0.1);
  ctx.fillStyle = T.redDark;
  ctx.fillRect(px, py + ph * 0.18, pw, u * 0.16);
  rr(ctx, px - u * 0.45, py + u * 0.3, u * 0.5, u * 0.22, u * 0.1);
  ctx.fill();
  rr(ctx, px + pw - u * 0.05, py + u * 0.3, u * 0.5, u * 0.22, u * 0.1);
  ctx.fill();
  // The porridge: colder is greyer and skinned over, hotter is golden and bubbling.
  const d = S.v - S.c;
  const cold = S.k === 'under' || S.k === 'asleep';
  const surf = cold ? '#C9CED6' : ramp([[-0.4, '#E9DEC4'], [0, '#EFC56A'], [0.3, '#E9A23C']], d);
  ellipse(ctx, 0, py + u * 0.05, pw * 0.5, u * 0.3, T.redDark);
  ellipse(ctx, 0, py + u * 0.08, pw * 0.44, u * 0.22, surf);
  if (cold) {
    ctx.strokeStyle = 'rgba(76,141,201,0.6)';
    ctx.lineWidth = u * 0.05;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc((i - 1) * pw * 0.14, py + u * 0.1, u * 0.18, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }
  // Bubbles, faster with heat.
  const heat = clamp01(S.v * 1.2);
  const nb = cold ? 0 : Math.round(heat * 7);
  for (let i = 0; i < nb; i++) {
    const k = (t * (0.8 + heat * 2.2) + hash(i) * 3) % 1;
    const bx = (hash(i + 7) - 0.5) * pw * 0.72;
    ctx.globalAlpha = 1 - k;
    circle(ctx, bx, py + u * 0.06 - k * u * 0.15, u * (0.05 + 0.12 * Math.sin(k * Math.PI)), T.paper);
    ctx.globalAlpha = 1;
  }
  // Boiling over.
  if (S.k === 'over') {
    const k = easeOut(S.since / 0.5);
    ctx.fillStyle = '#F2D48A';
    for (let i = 0; i < 6; i++) {
      const fxp = (i / 5 - 0.5) * pw * 0.95;
      circle(ctx, fxp, py - u * 0.05, u * (0.22 + 0.12 * hash(i)) * k, '#F2D48A');
      if (i === 0 || i === 5 || i === 2) {
        rr(ctx, fxp - u * 0.1, py, u * 0.2, ph * 0.6 * k * (0.6 + hash(i + 3) * 0.4), u * 0.1);
        ctx.fill();
      }
    }
  }
  ctx.restore();
  steam(ctx, cx, potBase - ph - u * 0.3, u, t, S.k === 'over' ? 1 : clamp01((S.v - 0.25) * 1.6), 1.3);
  // Goldilocks with her spoon.
  const s = (u * 4.4) / 170;
  const gx = sx - u * 1.0;
  const hip = fy - 45 * s;
  const ate = okK(S.k) ? easeOut(S.since / 0.3) : 0;
  drawGirl(ctx, gx, hip, s, { armR: 1.25 + ate * 0.6, armL: 0.25, face: faceFor(S), look: 2, lean: S.holding ? 0.06 : 0 });
  // The spoon in her hand.
  const a = 1.25 + ate * 0.6;
  const hx = gx + (13 + Math.sin(a) * 34) * s;
  const hy = hip + (-44 + Math.cos(a) * 34) * s;
  ctx.strokeStyle = T.brownLight;
  ctx.lineWidth = u * 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx + u * 0.9, hy - u * 0.7);
  ctx.stroke();
  ellipse(ctx, hx + u * 1.0, hy - u * 0.8, u * 0.2, u * 0.13, T.brownLight, -0.6);
  if (S.k === 'asleep') zzz(ctx, gx + u * 0.4, hip - 130 * s, u, t);
}

// ---------------------------------------------------------------- the little chair

function chairGeometry(S) {
  const { box, u } = S;
  const fy = S.floor;
  const cx = box.x + box.w * 0.5;
  const s = (u * 4.6) / 170;
  const seatH = u * 1.5;
  const cushion = u * 0.5;
  const stand = fy - 45 * s;
  const top = fy - seatH - cushion;
  const lo = S.c - S.w;
  const hi = S.c + S.w;
  const hipAt = (v) => {
    if (v <= lo) return lerp(stand, top - u * 0.15, v / Math.max(0.01, lo));
    if (v <= hi) return lerp(top - u * 0.15, top + cushion * 0.55 - u * 0.15, (v - lo) / Math.max(0.01, hi - lo));
    return lerp(top + cushion * 0.55 - u * 0.15, fy - u * 0.5, (v - hi) / Math.max(0.01, 1 - hi));
  };
  return { cx, s, seatH, cushion, stand, top, hipAt, fy, lo, hi };
}

function chair(ctx, S) {
  const { u, t } = S;
  const G = chairGeometry(S);
  const { cx, s, seatH, cushion, fy } = G;
  const cracked = S.k === 'over';
  const ck = cracked ? easeOut(S.since / 0.25) : 0;
  const hip = cracked ? lerp(G.hipAt(S.v), fy - u * 0.45, ck) : G.hipAt(S.v);
  // How far the cushion is pressed (0..1) and how much the chair bends past it.
  const press = clamp01((hip - (G.top - u * 0.15)) / (cushion * 0.7));
  const bend = cracked ? 1 : clamp01((S.v - G.hi) / Math.max(0.05, 1 - G.hi));
  const cw = u * 2.4;
  const seatY = cracked ? lerp(fy - seatH, fy - u * 0.35, ck) : fy - seatH + bend * u * 0.35;
  const wood = T.brownLight;
  const woodDark = T.brownMid;
  // The back: two posts and a top rail with a heart (it's Baby Bear's), behind her. Cracked, it falls over.
  const backTilt = cracked ? -1.25 * ck : -bend * 0.12;
  ctx.save();
  ctx.translate(cx - cw * 0.42 - (cracked ? ck * u * 0.4 : 0), cracked ? lerp(seatY, fy - u * 0.15, ck) : seatY);
  ctx.rotate(backTilt);
  const bw = cw * 0.84;
  for (const px of [0, bw]) withShadow(ctx, () => rr(ctx, px - u * 0.13, -u * 2.3, u * 0.26, u * 2.35, u * 0.1), woodDark, u * 0.05, u * 0.05);
  withShadow(ctx, () => rr(ctx, -u * 0.2, -u * 2.55, bw + u * 0.4, u * 0.62, u * 0.25), wood, u * 0.05, u * 0.06);
  ctx.fillStyle = C.red;
  const hx = bw / 2;
  const hy = -u * 2.27;
  const hr = u * 0.13;
  ctx.beginPath();
  ctx.moveTo(hx, hy + hr * 1.4);
  ctx.bezierCurveTo(hx - hr * 2.2, hy - hr * 0.2, hx - hr * 0.9, hy - hr * 1.8, hx, hy - hr * 0.5);
  ctx.bezierCurveTo(hx + hr * 0.9, hy - hr * 1.8, hx + hr * 2.2, hy - hr * 0.2, hx, hy + hr * 1.4);
  ctx.fill();
  rr(ctx, -u * 0.05, -u * 1.25, bw + u * 0.1, u * 0.2, u * 0.08);
  ctx.fillStyle = woodDark;
  ctx.fill();
  ctx.restore();
  // Legs: they bow under too much, then snap into pieces.
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const lx = cx + side * cw * 0.4;
    ctx.strokeStyle = woodDark;
    ctx.lineWidth = u * 0.24;
    ctx.beginPath();
    if (cracked) {
      // A stub on the floor and the broken half flung aside.
      ctx.moveTo(lx, fy);
      ctx.lineTo(lx + side * u * 0.12, fy - u * 0.45);
      ctx.stroke();
      ctx.save();
      ctx.translate(lx + side * u * (0.4 + ck * 0.9), fy - u * 0.12);
      ctx.rotate(side * (0.6 + ck * 0.9));
      rr(ctx, -u * 0.12, -u * 0.95, u * 0.24, u * 0.95, u * 0.1);
      ctx.fillStyle = woodDark;
      ctx.fill();
      ctx.restore();
    } else {
      ctx.moveTo(lx, fy);
      ctx.quadraticCurveTo(lx + side * bend * u * 0.7, (fy + seatY) / 2, lx, seatY);
      ctx.stroke();
    }
  }
  if (!cracked) {
    ctx.strokeStyle = woodDark;
    ctx.lineWidth = u * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx - cw * 0.4, fy - (fy - seatY) * 0.42);
    ctx.lineTo(cx + cw * 0.4, fy - (fy - seatY) * 0.42);
    ctx.stroke();
  }
  // The seat and its red cushion, which squashes (cracked: on the floor, tipped).
  ctx.save();
  ctx.translate(cx, seatY);
  if (cracked) ctx.rotate(0.12 * ck);
  withShadow(ctx, () => rr(ctx, -cw / 2, -u * 0.22, cw, u * 0.32, u * 0.1), wood, u * 0.06, u * 0.1);
  const ch = cushion * (1 - press * 0.6);
  rr(ctx, -cw * 0.46, -u * 0.2 - ch, cw * 0.92, ch + u * 0.06, u * 0.22);
  ctx.fillStyle = C.red;
  ctx.fill();
  ctx.fillStyle = T.redDark;
  ctx.fillRect(-cw * 0.3, -u * 0.2 - ch * 0.55, cw * 0.6, u * 0.05);
  ctx.restore();
  // Goldilocks lowering herself (she rattles with Wobbly).
  const crouch = clamp01((hip - G.stand) / (G.fy - u * 0.5 - G.stand));
  const face = cracked ? 'shock' : faceFor(S);
  drawGirl(ctx, cx + u * 0.15 + rattle(S, u * 0.05) * 20, hip, s, { crouch: crouch * 1.05, armL: 0.6 + crouch * 0.5, armR: 0.6 + crouch * 0.5, face, lean: -crouch * 0.12 + rattle(S) });
  if (S.k === 'asleep') zzz(ctx, cx + u * 0.6, hip - 130 * s, u, t);
}

function chairBurst(fx, S) {
  if (S.k !== 'over') return;
  const G = chairGeometry(S);
  fx.burst('splinter', G.cx, G.fy - S.u * 0.9, 22, { speed: S.u * 6 });
}

// ---------------------------------------------------------------- the pillow

function pillow(ctx, S) {
  const { box, u, t } = S;
  const fy = S.floor;
  const bx = box.x + box.w * 0.12;
  const bw = box.w * 0.8;
  const mattY = fy - u * 1.6;
  // The bed: a headboard, the mattress, a checked blanket.
  withShadow(ctx, () => rr(ctx, bx, mattY - u * 2.6, u * 0.6, u * 2.6 + (fy - mattY), u * 0.2), T.brownMid, u * 0.1, u * 0.1);
  circle(ctx, bx + u * 0.3, mattY - u * 2.7, u * 0.38, T.brownLight);
  withShadow(ctx, () => rr(ctx, bx + u * 0.5, mattY, bw, u * 0.9, u * 0.25), T.paper, 0, u * 0.12);
  ctx.save();
  rr(ctx, bx + bw * 0.42, mattY - u * 0.12, bw * 0.62, u * 1.0, u * 0.25);
  ctx.clip();
  ctx.fillStyle = C.red;
  ctx.fillRect(bx + bw * 0.4, mattY - u * 0.2, bw * 0.7, u * 1.2);
  ctx.fillStyle = 'rgba(243,227,195,0.35)';
  for (let x = bx + bw * 0.42; x < bx + bw * 1.1; x += u * 0.5) ctx.fillRect(x, mattY - u * 0.2, u * 0.22, u * 1.2);
  for (let y = mattY - u * 0.1; y < mattY + u; y += u * 0.5) ctx.fillRect(bx + bw * 0.4, y, bw * 0.7, u * 0.22);
  ctx.restore();
  ctx.fillStyle = T.brownMid;
  ctx.fillRect(bx + u * 0.5, mattY + u * 0.85, bw, u * 0.25);
  ctx.fillRect(bx + bw + u * 0.2, mattY + u * 0.85, u * 0.3, fy - mattY - u * 0.85);
  // The pillow: its height is the value; each pump puffs it.
  const v = S.v;
  const pump = (S.e % 0.4) / 0.4;
  const puff = S.holding && !S.reduced ? Math.sin(Math.min(1, pump / 0.7) * Math.PI) * 0.06 : 0;
  const ph = u * (0.35 + v * 2.4) * (1 + puff);
  const pwid = u * (2.6 + v * 0.6) * (1 - puff * 0.5);
  const pcx = bx + u * 0.6 + pwid / 2 + u * 0.15;
  const burst = S.k === 'over' ? easeOut(S.since / 0.3) : 0;
  withShadow(ctx, () => {
    ctx.beginPath();
    ctx.ellipse(pcx, mattY - ph / 2 + u * 0.08, pwid / 2 * (1 + burst * 0.15), ph / 2 * (1 + burst * 0.1), 0, 0, Math.PI * 2);
  }, '#FFF7E6', u * 0.08, u * 0.1);
  ctx.strokeStyle = T.creamDark;
  ctx.lineWidth = u * 0.06;
  ctx.beginPath();
  ctx.moveTo(pcx - pwid * 0.3, mattY - ph * 0.5);
  ctx.quadraticCurveTo(pcx, mattY - ph * 0.42, pcx + pwid * 0.3, mattY - ph * 0.5);
  ctx.stroke();
  // Goldilocks: fluffing it while you hold, lying down when it's just right.
  const s = (u * 4.2) / 170;
  if (okK(S.k)) {
    const k = easeOut((S.since - 0.1) / 0.4);
    ctx.save();
    ctx.translate(lerp(pcx + u * 2.2, pcx + u * 2.6, k), lerp(fy - 45 * s, mattY - ph * 0.55, k));
    ctx.rotate(-Math.PI / 2 * k);
    drawGirl(ctx, 0, 0, s, { face: k > 0.8 ? 'focus' : 'smile', armL: 0.2, armR: 0.2 });
    ctx.restore();
    if (k > 0.9) zzz(ctx, pcx, mattY - ph - u * 0.4, u, t);
  } else {
    const pat = S.holding && !S.reduced ? Math.abs(Math.sin(t * Math.PI / 0.4)) : 0;
    drawGirl(ctx, pcx + u * 2.2, fy - 45 * s, s, { armL: 1.6 + pat * 0.5, armR: 1.4 + pat * 0.6, face: faceFor(S), flip: true, look: -2 });
    if (S.k === 'asleep') zzz(ctx, pcx + u * 2.5, fy - 170 * s, u, t);
  }
}

function pillowBurst(fx, S) {
  if (S.k !== 'over') return;
  fx.burst('feather', S.box.x + S.box.w * 0.25, S.floor - S.u * 3, 26, { speed: S.u * 4 });
}

// ---------------------------------------------------------------- toast

const TOAST = [[-0.45, '#F4E6BF'], [-0.2, '#EFD08A'], [0, '#D9963A'], [0.15, '#9A5524'], [0.3, '#3A2418']];

function toast(ctx, S) {
  const { box, u, t } = S;
  const fy = S.floor;
  const cy = fy - u * 1.6;
  counter(ctx, box.x + box.w * 0.05, cy, box.w * 0.9, u);
  const cx = box.x + box.w * 0.55;
  const tw = u * 3.4;
  const th = u * 2.3;
  const ty = cy - th;
  const col = S.k === 'asleep' ? TOAST[0][1] : ramp(TOAST, S.v - S.c);
  // The bread in its slots, rising out of them when it pops.
  const pop = S.released ? easeOut(S.since / 0.22) * (1 - easeIn((S.since - 0.5) / 0.4) * 0.35) : 0;
  const rise = S.holding ? -u * 0.55 : 0;
  ctx.save();
  ctx.translate(rattle(S, u * 0.4), 0);
  for (const off of [-0.22, 0.22]) {
    const sx = cx + off * tw - u * 0.55;
    const sy = ty - u * 0.65 - pop * u * 1.6 - rise;
    rr(ctx, sx, sy, u * 1.1, u * 1.5, u * 0.35);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.lineWidth = u * 0.08;
    ctx.strokeStyle = mix('#C9A066', '#22140C', clamp01((S.v - S.c + 0.1) * 3));
    ctx.stroke();
  }
  // The toaster.
  withShadow(ctx, () => rr(ctx, cx - tw / 2, ty, tw, th, u * 0.6), T.bluePale, u * 0.1, u * 0.1);
  rr(ctx, cx - tw / 2 + u * 0.2, ty + th * 0.55, tw - u * 0.4, u * 0.18, u * 0.09);
  ctx.fillStyle = C.blue;
  ctx.fill();
  for (const off of [-0.22, 0.22]) {
    rr(ctx, cx + off * tw - u * 0.6, ty - u * 0.05, u * 1.2, u * 0.25, u * 0.12);
    ctx.fillStyle = S.holding ? mix('#3A2A2A', '#F08A3A', 0.7 + 0.3 * Math.sin(t * 15)) : C.ink;
    ctx.fill();
  }
  // The lever: down while you hold.
  const lever = S.holding ? th * 0.62 : th * 0.2;
  ctx.fillStyle = C.ink;
  ctx.fillRect(cx + tw / 2 - u * 0.05, ty + th * 0.15, u * 0.12, th * 0.65);
  rr(ctx, cx + tw / 2, ty + lever, u * 0.6, u * 0.28, u * 0.12);
  ctx.fillStyle = C.red;
  ctx.fill();
  ctx.restore();
  // Smoke when it's burnt; a pat of butter when it's golden.
  if (S.k === 'over') {
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.5 + i / 4) % 1;
      ctx.globalAlpha = (1 - k) * 0.7;
      circle(ctx, cx + Math.sin(i * 2 + t) * u * 0.5, ty - u * 2.2 - k * u * 2, u * (0.3 + k * 0.5), '#4A4038');
      ctx.globalAlpha = 1;
    }
  } else if (okK(S.k)) {
    const k = easeOut((S.since - 0.25) / 0.3);
    rr(ctx, cx - u * 0.25 - u * 0.4 * 0.22 * 4, ty - u * 2.15 - (1 - k) * u, u * 0.5, u * 0.3, u * 0.06);
    ctx.globalAlpha = k;
    ctx.fillStyle = '#FBE7A1';
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (S.holding) steam(ctx, cx, ty - u * 0.3, u * 0.7, t, clamp01((S.v - S.c + 0.15) * 3));
  // Goldilocks watching, a plate in hand.
  const s = (u * 4.4) / 170;
  const gx = cx - tw / 2 - u * 1.6;
  drawGirl(ctx, gx, fy - 45 * s, s, { armR: 0.9, face: faceFor(S), look: 2 });
  if (S.k === 'asleep') zzz(ctx, gx + u * 0.4, fy - 175 * s, u, t);
}

// ---------------------------------------------------------------- the balloon

function balloonGeom(S) {
  const { box, u } = S;
  const fy = S.floor;
  const pumpX = box.x + box.w * 0.25;
  const bx = box.x + box.w * 0.62;
  const r = u * (0.35 + S.v * 2.3);
  const by = fy - u * 1.4 - r;
  return { pumpX, bx, by, r, fy };
}

function balloon(ctx, S) {
  const { u, t } = S;
  const B = balloonGeom(S);
  const popped = S.k === 'pop';
  const floatUp = okK(S.k) ? easeIn((S.since - 0.3) / 1.4) * u * 4 : 0;
  // The pump: its handle goes up and down while you hold.
  const stroke = S.holding && !S.reduced ? (Math.sin(S.e * Math.PI * 2.4) + 1) / 2 : 0;
  const ph = u * 2.0;
  withShadow(ctx, () => rr(ctx, B.pumpX - u * 0.35, B.fy - ph, u * 0.7, ph, u * 0.2), C.blue, u * 0.08, u * 0.08);
  ctx.fillStyle = T.blueDark;
  ctx.fillRect(B.pumpX - u * 0.9, B.fy - u * 0.12, u * 1.8, u * 0.12);
  const hy = B.fy - ph - u * 0.3 - (1 - stroke) * u * 0.9;
  ctx.fillStyle = C.ink;
  ctx.fillRect(B.pumpX - u * 0.06, hy, u * 0.12, B.fy - ph - hy);
  rr(ctx, B.pumpX - u * 0.7, hy - u * 0.12, u * 1.4, u * 0.24, u * 0.12);
  ctx.fillStyle = C.red;
  ctx.fill();
  // The hose to the balloon's neck.
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = u * 0.12;
  ctx.beginPath();
  ctx.moveTo(B.pumpX + u * 0.35, B.fy - u * 0.4);
  ctx.quadraticCurveTo(B.bx - u * 0.6, B.fy + u * 0.2, B.bx, B.fy - u * 1.15);
  ctx.stroke();
  // Goldilocks on the pump.
  const s = (u * 4.3) / 170;
  const gx = B.pumpX - u * 1.1;
  drawGirl(ctx, gx, B.fy - 45 * s + stroke * u * 0.2, s, { armL: 1.2 + stroke * 0.35, armR: 1.35 + stroke * 0.35, crouch: stroke * 0.25, face: popped ? 'shock' : faceFor(S), look: 2 });
  if (S.k === 'asleep') zzz(ctx, gx + u * 0.4, B.fy - 175 * s, u, t);
  if (popped) {
    const k = S.since;
    if (k < 0.12) {
      ctx.globalAlpha = 1 - k / 0.12;
      circle(ctx, B.bx, B.by, B.r * (1 + k * 4), T.paper);
      ctx.globalAlpha = 1;
    }
    return;
  }
  // The balloon: it trembles near its limit.
  const near = clamp01((S.v - (S.c + S.w - 0.02)) / 0.04);
  const tremble = S.holding && !S.reduced ? Math.sin(t * 60) * near * u * 0.06 : 0;
  const x = B.bx + tremble;
  const y = B.by - floatUp;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = u * 0.05;
  ctx.beginPath();
  ctx.moveTo(x, y + B.r * 1.05);
  ctx.quadraticCurveTo(x + u * 0.3, y + B.r * 1.05 + u * 0.6, x, B.fy - u * 1.15 - floatUp * 0.4);
  ctx.stroke();
  withShadow(ctx, () => {
    ctx.beginPath();
    ctx.ellipse(x, y, B.r * 0.94, B.r * 1.05, 0, 0, Math.PI * 2);
  }, near > 0.5 ? mix('#D2452B', '#F07A5E', near) : C.red, u * 0.1, u * 0.12);
  ctx.fillStyle = T.redDark;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.16, y + B.r * 1.12);
  ctx.lineTo(x + u * 0.16, y + B.r * 1.12);
  ctx.lineTo(x, y + B.r * 0.98);
  ctx.fill();
  ellipse(ctx, x - B.r * 0.38, y - B.r * 0.42, B.r * 0.16, B.r * 0.26, 'rgba(255,255,255,0.55)', -0.5);
  if (S.k === 'under') {
    // Too small: it sags.
    ctx.globalAlpha = 0.25;
    ellipse(ctx, x, y + B.r * 0.6, B.r * 0.8, B.r * 0.3, T.redDark);
    ctx.globalAlpha = 1;
  }
}

function balloonBurst(fx, S) {
  if (S.k !== 'pop') return;
  const B = balloonGeom(S);
  fx.burst('shred', B.bx, B.by, 22, { speed: S.u * 7 });
}

// ---------------------------------------------------------------- cool the spoon

function spoon(ctx, S) {
  const { box, u, t } = S;
  const fy = S.floor;
  // Big: her head and shoulders, the spoon held up before her.
  const s = Math.min(box.h * 0.95, box.w * 1.2) / 170;
  const gx = box.x + box.w * 0.34;
  const hip = fy - 45 * s + 30 * s;
  const ate = okK(S.k) ? easeOut(S.since / 0.3) : 0;
  const face = S.holding ? 'blow' : faceFor(S, { big: 'shock', bad: 'oops' });
  drawGirl(ctx, gx, hip, s, { armR: 1.9 - ate * 0.7, face, look: 2 });
  const headX = gx;
  const headY = hip - 72 * s;
  const sx = lerp(headX + 70 * s, headX + 30 * s, ate);
  const sy = lerp(headY + 6 * s, headY + 10 * s, ate);
  // The spoon.
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(rattle(S, 0.08));
  ctx.strokeStyle = '#B9C4CF';
  ctx.lineWidth = 7 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(16 * s, 6 * s);
  ctx.lineTo(70 * s, 40 * s);
  ctx.stroke();
  ellipse(ctx, 0, 0, 22 * s, 13 * s, '#D3DCE4');
  const d = S.v - S.c;
  const hot = clamp01(d / 0.3);
  const cold = clamp01(-d / 0.3);
  const k = S.k;
  ellipse(ctx, 0, -2 * s, 17 * s, 8 * s, k === 'under' ? '#D7E4EF' : mix(mix('#E9DEC4', '#EFC56A', 1 - cold), '#F08A3A', hot * 0.5));
  if (k === 'under' || (!k && cold > 0.6)) {
    ctx.strokeStyle = C.blue;
    ctx.lineWidth = 2 * s;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6 * s, Math.sin(a) * 3 * s - 2 * s);
      ctx.lineTo(Math.cos(a) * 14 * s, Math.sin(a) * 6 * s - 2 * s);
      ctx.stroke();
    }
  }
  ctx.restore();
  if (k !== 'under') steam(ctx, sx, sy - 10 * s, u * 0.9, t, clamp01(S.v * 1.2), 0.8);
  // Her breath.
  if (S.holding && !S.reduced) {
    ctx.save();
    ctx.strokeStyle = 'rgba(250,240,220,0.9)';
    ctx.lineWidth = 3 * s;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const kk = (t * 2.2 + i / 3) % 1;
      const bx = headX + 16 * s + kk * 46 * s;
      ctx.globalAlpha = 1 - kk;
      ctx.beginPath();
      ctx.moveTo(bx, headY + 11 * s + (i - 1) * 5 * s);
      ctx.lineTo(bx + 10 * s, headY + 11 * s + (i - 1) * 7 * s);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Too hot: a puff of fire; too cold: shivers.
  if (k === 'over') {
    const kk = easeOut(S.since / 0.3);
    ctx.globalAlpha = 1 - clamp01((S.since - 0.6) / 0.5);
    circle(ctx, headX + 12 * s, headY + 14 * s, 10 * s * kk, C.red);
    circle(ctx, headX + 12 * s, headY + 14 * s, 6 * s * kk, C.mustard);
    ctx.globalAlpha = 1;
  }
  if (k === 'asleep') zzz(ctx, headX + 20 * s, headY - 30 * s, u, t);
}

// ---------------------------------------------------------------- milk

function milkGeom(S) {
  const { box, u } = S;
  const fy = S.floor;
  const cy = fy - u * 1.4;
  const gw = u * 1.6;
  const gh = u * 3.2;
  const gxx = box.x + box.w * 0.62;
  return { cy, gw, gh, gxx, gTop: cy - gh, inner: gh - u * 0.25 };
}

function milk(ctx, S) {
  const { box, u, t } = S;
  const M = milkGeom(S);
  counter(ctx, box.x + box.w * 0.05, M.cy, box.w * 0.9, u);
  const levelY = (v) => M.cy - u * 0.15 - clamp01(v) * M.inner;
  // The glass with the just-right band painted on it.
  const gl = M.gxx - M.gw / 2;
  ctx.save();
  ctx.translate(rattle(S, u * 0.3), 0);
  withShadow(ctx, () => rr(ctx, gl, M.gTop, M.gw, M.gh, u * 0.18), 'rgba(188,214,236,0.55)', u * 0.08, u * 0.06);
  ctx.save();
  rr(ctx, gl + u * 0.08, M.gTop, M.gw - u * 0.16, M.gh - u * 0.08, u * 0.14);
  ctx.clip();
  const v = S.v;
  const spilled = S.k === 'over' && finalOver(S);
  ctx.fillStyle = '#FFFDF6';
  ctx.fillRect(gl, levelY(v), M.gw, M.cy - levelY(v));
  ctx.restore();
  ctx.fillStyle = 'rgba(47,122,78,0.85)';
  const b0 = levelY(S.c + S.w);
  const b1 = levelY(S.c - S.w);
  ctx.fillRect(gl - u * 0.12, b0, u * 0.12, b1 - b0);
  ctx.fillRect(gl + M.gw, b0, u * 0.12, b1 - b0);
  rr(ctx, gl, M.gTop, M.gw, M.gh, u * 0.18);
  inkLine(ctx, u * 0.08, 'rgba(30,39,71,0.55)');
  ctx.restore();
  // Spilt: down the side and a puddle.
  if (spilled) {
    const k = easeOut(S.since / 0.5);
    ctx.fillStyle = '#FFFDF6';
    rr(ctx, gl + M.gw - u * 0.1, M.gTop - u * 0.05, u * 0.25, M.gh * k, u * 0.12);
    ctx.fill();
    ellipse(ctx, M.gxx + M.gw * 0.7, M.cy, u * 1.2 * k, u * 0.18 * k, '#FFFDF6');
  }
  // The jug: tilts to pour while you hold, then back.
  const pouring = S.holding && S.e > 0.05;
  const tilt = S.holding ? Math.min(1, S.e / 0.25) : S.released ? 1 - easeOut(S.since / 0.3) : 0;
  const jx = gl - u * 1.2;
  const jy = M.gTop - u * 1.5;
  ctx.save();
  ctx.translate(jx, jy);
  ctx.rotate(tilt * 1.0);
  withShadow(ctx, () => rr(ctx, -u * 1.0, -u * 0.9, u * 1.6, u * 2.0, u * 0.45), T.paper, u * 0.08, u * 0.08);
  ctx.fillStyle = C.blue;
  ctx.fillRect(-u * 1.0, -u * 0.2, u * 1.6, u * 0.3);
  ctx.lineWidth = u * 0.22;
  ctx.strokeStyle = T.paper;
  ctx.beginPath();
  ctx.arc(-u * 1.0, u * 0.1, u * 0.45, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = T.paper;
  ctx.beginPath();
  ctx.moveTo(u * 0.55, -u * 0.9);
  ctx.lineTo(u * 0.95, -u * 1.05);
  ctx.lineTo(u * 0.6, -u * 0.55);
  ctx.fill();
  ctx.restore();
  // The stream: it starts a moment late and keeps falling after you let go.
  const spout = { x: jx + Math.cos(tilt) * u * 0.9 + Math.sin(tilt) * u * 0.95, y: jy - Math.cos(tilt) * u * 1.0 + Math.sin(tilt) * u * 0.9 };
  const surface = levelY(v);
  let top = null;
  let bottom = null;
  if (pouring && S.e > 0.25) {
    top = spout.y;
    bottom = surface;
  } else if (S.released && S.P.g === 'milk' && S.since < 0.4 && S.e > 0.25) {
    // The last of it, already in the air.
    const k = S.since / 0.38;
    top = lerp(spout.y, surface, easeIn(k));
    bottom = surface;
  }
  if (top !== null && bottom > top) {
    ctx.strokeStyle = '#FFFDF6';
    ctx.lineCap = 'round';
    ctx.lineWidth = u * 0.22;
    ctx.beginPath();
    ctx.moveTo(lerp(spout.x, M.gxx, 0.3), top);
    ctx.quadraticCurveTo(M.gxx - u * 0.1, top + (bottom - top) * 0.3, M.gxx, bottom);
    ctx.stroke();
    circle(ctx, M.gxx, bottom, u * 0.18, '#FFFDF6');
  }
  // Goldilocks holding the jug up.
  const s = (u * 4.3) / 170;
  const gx = jx - u * 1.5;
  drawGirl(ctx, gx, S.floor - 45 * s, s, { armR: 2.3 - tilt * 0.3, armL: 2.0, face: faceFor(S), look: 2 });
  if (S.k === 'asleep') zzz(ctx, gx + u * 0.4, S.floor - 175 * s, u, t);
}

const finalOver = (S) => S.v >= 0.985 || S.v - S.c > S.w + 0.12;

// ---------------------------------------------------------------- cake (level)

function cake(ctx, S) {
  const { u, t } = S;
  const x0 = S.gx(0) - u * 0.2;
  const x1 = S.gx(1) + u * 0.2;
  const fy = S.floor;
  const ch = Math.min(u * 1.8, S.box.h * 0.32);
  const top = fy - ch - u * 0.3;
  // The board.
  withShadow(ctx, () => rr(ctx, x0 - u * 0.4, fy - u * 0.32, x1 - x0 + u * 0.8, u * 0.32, u * 0.1), T.brownLight, 0, u * 0.12);
  const cut = S.released ? S.v : null;
  const slide = cut !== null ? easeOut((S.since - 0.18) / 0.35) * u * 0.7 : 0;
  // The cake: sponge, jam, sponge, icing; the slice slides away once cut.
  const layer = (xa, xb, dx) => {
    if (xb - xa < 1) return;
    ctx.save();
    ctx.translate(dx, 0);
    withShadow(ctx, () => rr(ctx, xa, top, xb - xa, ch, u * 0.2), '#EFCB82', u * 0.06, u * 0.08);
    ctx.fillStyle = C.red;
    ctx.fillRect(xa, top + ch * 0.48, xb - xa, ch * 0.13);
    ctx.fillStyle = T.paper;
    rr(ctx, xa, top - u * 0.08, xb - xa, ch * 0.28, u * 0.16);
    ctx.fill();
    for (let x = xa + u * 0.3; x < xb - u * 0.1; x += u * 0.55) circle(ctx, x, top + ch * 0.22, u * 0.09, T.paper);
    ctx.restore();
  };
  const cx = cut !== null ? S.gx(cut) : null;
  if (cx === null) layer(x0, x1, 0);
  else {
    layer(x0, cx, -slide);
    layer(cx, x1, slide * 0.3);
  }
  // The guest's slice, marked in green icing on top.
  const ga = S.gx(S.c - S.w);
  const gb = S.gx(S.c + S.w);
  ctx.fillStyle = C.green;
  rr(ctx, ga, top - u * 0.22, gb - ga, u * 0.16, u * 0.08);
  ctx.fill();
  // The knife over the cake (chopping down once you let go).
  const kx = S.gx(S.v) + rattle(S, u * 0.6);
  const down = cut !== null ? easeIn(S.since / 0.12) : 0;
  const ky = lerp(top - u * 1.9, top + ch * 0.6, down);
  ctx.save();
  ctx.translate(kx, ky);
  withShadow(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-u * 0.04, 0);
    ctx.lineTo(u * 0.36, -u * 0.05);
    ctx.lineTo(u * 0.36, -u * 1.6);
    ctx.lineTo(-u * 0.04, -u * 1.6);
    ctx.closePath();
  }, '#DCE3EA', u * 0.06, u * 0.06);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = u * 0.05;
  ctx.beginPath();
  ctx.moveTo(-u * 0.04, 0);
  ctx.lineTo(-u * 0.04, -u * 1.6);
  ctx.stroke();
  rr(ctx, -u * 0.12, -u * 2.7, u * 0.5, u * 1.15, u * 0.15);
  ctx.fillStyle = T.brownDark;
  ctx.fill();
  ctx.restore();
  if (S.k === 'asleep') zzz(ctx, S.gx(0.1), top - u * 0.8, u, t);
  if (okK(S.k)) {
    const k = easeOut((S.since - 0.3) / 0.3);
    if (k > 0) {
      ctx.globalAlpha = k;
      const px = (S.gx(0) + S.gx(S.v)) / 2 - slide;
      ellipse(ctx, px, top - u * 0.45, u * 0.12, u * 0.12, C.mustard);
      ctx.fillStyle = C.red;
      ctx.fillRect(px - u * 0.04, top - u * 0.45, u * 0.08, u * 0.35);
      ctx.globalAlpha = 1;
    }
  }
}

function cakeBurst(fx, S) {
  if (S.k === 'asleep') return;
  fx.burst('crumb', S.gx(S.v), S.floor - S.u * 1.2, 10, { speed: S.u * 3 });
}

// ---------------------------------------------------------------- the bowl slide (level)

function bowl(ctx, S) {
  const { u, t } = S;
  const fy = S.floor;
  const tableY = fy - u * 0.9;
  const x0 = S.gx(0) - u * 1.2;
  const edge = S.gx(1);
  // The table and its checked cloth, ending at the edge.
  ctx.fillStyle = T.brownMid;
  ctx.fillRect(x0 + u * 0.4, tableY, u * 0.35, fy - tableY + u * 3);
  ctx.fillRect(edge - u * 0.75, tableY, u * 0.35, fy - tableY + u * 3);
  withShadow(ctx, () => rr(ctx, x0, tableY - u * 0.3, edge - x0, u * 0.45, u * 0.06), C.red, 0, u * 0.14);
  ctx.fillStyle = 'rgba(243,227,195,0.4)';
  for (let x = x0; x < edge - u * 0.2; x += u * 0.6) ctx.fillRect(x, tableY - u * 0.3, u * 0.3, u * 0.45);
  // The place mat: just right.
  const ma = S.gx(S.c - S.w);
  const mb = S.gx(S.c + S.w);
  ctx.fillStyle = C.green;
  rr(ctx, ma, tableY - u * 0.38, mb - ma, u * 0.14, u * 0.07);
  ctx.fill();
  // The bowl: slides with your push, glides on, and may go over the edge.
  let bx = S.gx(Math.min(1, S.v));
  let by = tableY - u * 0.3;
  let rot = 0;
  const off = S.released && S.v >= 0.985;
  if (off) {
    const k = clamp01((S.since - 0.55) / 0.5);
    bx += k * u * 1.2;
    by += easeIn(k) * u * 3.2;
    rot = k * 1.6;
  }
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(rot);
  withShadow(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-u * 0.75, -u * 0.55);
    ctx.quadraticCurveTo(0, u * 0.35, u * 0.75, -u * 0.55);
    ctx.closePath();
  }, C.red, u * 0.06, u * 0.06);
  ellipse(ctx, 0, -u * 0.55, u * 0.75, u * 0.16, T.redDark);
  ellipse(ctx, 0, -u * 0.53, u * 0.62, u * 0.11, '#EFC56A');
  ctx.restore();
  // The pushing hand while you hold.
  if (S.holding) {
    const hx = bx - u * 0.95;
    ctx.fillStyle = C.cream;
    rr(ctx, hx - u * 2.2, by - u * 0.55, u * 2.0, u * 0.32, u * 0.16);
    ctx.fill();
    circle(ctx, hx, by - u * 0.4, u * 0.24, T.skin);
  }
  if (S.k === 'asleep') zzz(ctx, bx, by - u * 1.0, u, t);
}

function bowlBurst(fx, S) {
  if (S.v < 0.985) return;
  fx.burst('shard', S.gx(1) + S.u, S.floor + S.u * 2, 14, { speed: S.u * 4, delay: 1.0 });
}

// ---------------------------------------------------------------- the honey jar (level)

function jarGeom(S) {
  const { u } = S;
  const fy = S.floor;
  const pivotX = S.gx(0.5);
  const span = Math.abs(S.gx(0.92) - pivotX);
  const L = Math.max(span * 1.25, (fy - S.box.y) * 0.75);
  const pivotY = S.box.y + (fy - S.box.y) * 0.62 - L;
  return { pivotX, pivotY, L, fy, crateY: fy - u * 0.9 };
}

function jarAt(J, x) {
  const dx = x - J.pivotX;
  return { x, y: J.pivotY + Math.sqrt(Math.max(0, J.L * J.L - dx * dx)) };
}

function honeyJar(ctx, x, y, u, rot = 0, broken = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (broken > 0) {
    ellipse(ctx, 0, u * 0.5, u * (0.9 + broken * 0.6), u * 0.22, C.mustard);
    for (const [dx, a] of [[-0.5, -0.6], [0.4, 0.5], [0.1, 0.1]]) {
      ctx.save();
      ctx.translate(dx * u, u * 0.3);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(232,169,46,0.9)';
      ctx.beginPath();
      ctx.moveTo(-u * 0.25, 0);
      ctx.lineTo(u * 0.2, -u * 0.35);
      ctx.lineTo(u * 0.3, u * 0.05);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    return;
  }
  withShadow(ctx, () => rr(ctx, -u * 0.55, -u * 0.6, u * 1.1, u * 1.2, u * 0.3), C.mustard, u * 0.06, u * 0.06);
  rr(ctx, -u * 0.55, -u * 0.2, u * 1.1, u * 0.45, u * 0.06);
  ctx.fillStyle = T.paper;
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.font = `900 ${Math.round(u * 0.32)}px Fraunces, Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', 0, u * 0.03);
  rr(ctx, -u * 0.6, -u * 0.8, u * 1.2, u * 0.28, u * 0.1);
  ctx.fillStyle = C.red;
  ctx.fill();
  ctx.restore();
}

function jar(ctx, S) {
  const { u, t } = S;
  const J = jarGeom(S);
  // The beam the rope hangs from.
  ctx.fillStyle = T.beam;
  ctx.fillRect(S.box.x - u, J.pivotY - u * 0.3, S.box.w + u * 2, u * 0.4);
  // The crate on the floor: the green, just-right spot.
  const ca = S.gx(S.c - S.w);
  const cb = S.gx(S.c + S.w);
  withShadow(ctx, () => rr(ctx, ca, J.crateY, cb - ca, J.fy - J.crateY, u * 0.1), T.brownLight, u * 0.08, u * 0.08);
  ctx.fillStyle = C.green;
  ctx.fillRect(ca, J.crateY, cb - ca, u * 0.16);
  ctx.strokeStyle = T.brownMid;
  ctx.lineWidth = u * 0.08;
  ctx.beginPath();
  ctx.moveTo(ca, J.crateY + (J.fy - J.crateY) * 0.55);
  ctx.lineTo(cb, J.crateY + (J.fy - J.crateY) * 0.55);
  ctx.stroke();
  // The jar, swinging; once let go it drops straight down.
  const x = S.gx(S.v);
  const at = jarAt(J, x);
  if (!S.released) {
    ctx.strokeStyle = T.brownDark;
    ctx.lineWidth = u * 0.07;
    ctx.beginPath();
    ctx.moveTo(J.pivotX, J.pivotY);
    ctx.lineTo(at.x, at.y - u * 0.8);
    ctx.stroke();
    honeyJar(ctx, at.x, at.y, u, Math.atan2(at.x - J.pivotX, at.y - J.pivotY) * -0.4);
  } else {
    const inCrate = okK(S.k);
    const landY = inCrate ? J.crateY - u * 0.4 : J.fy - u * 0.6;
    const k = easeIn(S.since / 0.38);
    const y = lerp(at.y, landY, k);
    honeyJar(ctx, at.x, y, u, 0, !inCrate && S.k !== 'asleep' && S.since > 0.38 ? Math.min(1, (S.since - 0.38) * 4) : 0);
    // The rope swings back empty.
    ctx.strokeStyle = T.brownDark;
    ctx.lineWidth = u * 0.07;
    ctx.beginPath();
    ctx.moveTo(J.pivotX, J.pivotY);
    ctx.lineTo(lerp(at.x, J.pivotX, easeOut(S.since / 0.8)), J.pivotY + J.L * 0.8);
    ctx.stroke();
  }
  if (S.k === 'asleep') zzz(ctx, at.x, at.y - u, u, t);
}

function jarBurst(fx, S) {
  const J = jarGeom(S);
  if (okK(S.k)) fx.burst('spark', S.gx(S.v), J.crateY - S.u * 0.2, 10, { speed: S.u * 3, delay: 0.38 });
  else if (S.k !== 'asleep') fx.burst('honey', S.gx(S.v), J.fy - S.u * 0.5, 14, { speed: S.u * 4, delay: 0.38 });
}

// ---------------------------------------------------------------- the bell (a strength test)

function bell(ctx, S) {
  const { box, u, t, g } = S;
  const fy = S.floor;
  const padX = g ? g.x + g.w / 2 : box.x + box.w * 0.85;
  // The pad at the tower's foot.
  withShadow(ctx, () => rr(ctx, padX - u * 0.9, fy - u * 0.45, u * 1.8, u * 0.45, u * 0.1), C.red, u * 0.06, u * 0.06);
  rr(ctx, padX - u * 0.6, fy - u * 0.6, u * 1.2, u * 0.2, u * 0.08);
  ctx.fillStyle = T.paper;
  ctx.fill();
  // The bell, hung beside the tower at the band.
  if (g) {
    const by = g.y + g.h - (g.w * 0.55) - clamp01((S.c - 0) / 1) * (g.h - g.w * 1.1);
    const rung = okK(S.k) && S.since > 0.35;
    const swing = rung && !S.reduced ? Math.sin((S.since - 0.35) * 18) * 0.4 * Math.max(0, 1 - (S.since - 0.35) / 1.5) : 0;
    ctx.save();
    ctx.translate(g.x - g.w * 1.2, by - u * 0.5);
    ctx.rotate(swing);
    ctx.fillStyle = C.ink;
    ctx.fillRect(-u * 0.05, -u * 0.3, u * 0.1, u * 0.3);
    withShadow(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-u * 0.55, u * 0.7);
      ctx.quadraticCurveTo(-u * 0.5, -u * 0.05, 0, -u * 0.05);
      ctx.quadraticCurveTo(u * 0.5, -u * 0.05, u * 0.55, u * 0.7);
      ctx.closePath();
    }, C.mustard, u * 0.06, u * 0.06);
    circle(ctx, 0, u * 0.75, u * 0.14, T.mustardDark);
    ctx.restore();
    if (rung && !S.reduced) {
      ctx.save();
      ctx.strokeStyle = C.mustard;
      ctx.lineWidth = u * 0.08;
      for (let i = 0; i < 3; i++) {
        const k = ((S.since - 0.35) * 1.4 + i / 3) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.arc(g.x - g.w * 1.2, by - u * 0.1, u * (0.8 + k * 1.4), -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  // Goldilocks and the mallet: wound back with the strength while you hold, down on the pad when you let go.
  const s = (u * 4.4) / 170;
  const gx = padX - u * 2.6;
  const hip = fy - 45 * s;
  const strike = S.released ? easeIn(S.since / 0.1) : 0;
  const wind = S.holding ? S.v : S.released ? S.v * (1 - strike) : 0;
  const a = lerp(0.6, 2.9, wind) - strike * 0.9;
  drawGirl(ctx, gx, hip, s, { armL: a, armR: a, face: faceFor(S, { hold: 'focus' }), look: 2, lean: S.holding ? -0.08 * S.v : strike * 0.1 });
  const sx = gx;
  const sy = hip - 44 * s;
  const hx = sx + Math.sin(a) * 40 * s;
  const hy = sy + Math.cos(a) * 40 * s;
  const mx = sx + Math.sin(a) * (40 * s + u * 1.9);
  const my = sy + Math.cos(a) * (40 * s + u * 1.9);
  ctx.strokeStyle = T.brownMid;
  ctx.lineWidth = u * 0.14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(mx, my);
  ctx.stroke();
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(-a + Math.PI / 2);
  withShadow(ctx, () => rr(ctx, -u * 0.35, -u * 0.6, u * 0.7, u * 1.2, u * 0.15), T.brownDark, u * 0.05, u * 0.05);
  ctx.restore();
  if (S.k === 'asleep') zzz(ctx, gx + u * 0.4, hip - 130 * s, u, t);
}

/** The bell's tower shows the puck: your strength while you hold, then its flight up the tower. */
function bellGauge(S) {
  if (!S.released || S.k === 'asleep') return S.v;
  const k = clamp01((S.since - 0.08) / 0.3);
  if (S.k === 'over') return Math.min(1, S.v * easeOut(k) * (1 + 0.1 * k));
  return S.v * easeOut(k);
}

// ---------------------------------------------------------------- the rope swing (level)

function swingGeom(S) {
  const { u } = S;
  const fy = S.floor;
  const treeX = S.gx(0) - u * 0.8;
  const pivot = { x: S.gx(0.06), y: S.box.y + u * 0.6 };
  const L = (fy - pivot.y) * 0.72;
  return { treeX, pivot, L, fy, bank: S.gx(0.08) };
}

function swing(ctx, S) {
  const { u, t } = S;
  const W = swingGeom(S);
  const fy = W.fy;
  // The pond, the dock (just right) and the brambles past it.
  const da = S.gx(S.c - S.w);
  const db = S.gx(S.c + S.w);
  const far = S.gx(1) + u * 1.2;
  ctx.fillStyle = C.blue;
  rr(ctx, W.bank - u * 0.2, fy - u * 0.25, da - W.bank + u * 0.4, u * 1.2, u * 0.3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(243,227,195,0.6)';
  ctx.lineWidth = u * 0.06;
  for (let i = 0; i < 4; i++) {
    const wx = lerp(W.bank + u * 0.5, da - u * 0.5, (i + 0.5) / 4) + Math.sin(t * 1.5 + i) * u * 0.2;
    ctx.beginPath();
    ctx.moveTo(wx - u * 0.3, fy + u * 0.15);
    ctx.lineTo(wx + u * 0.3, fy + u * 0.15);
    ctx.stroke();
  }
  withShadow(ctx, () => rr(ctx, da, fy - u * 0.4, db - da, u * 0.4, u * 0.06), T.brownLight, 0, u * 0.1);
  ctx.fillStyle = T.brownMid;
  for (let x = da + u * 0.35; x < db - u * 0.1; x += u * 0.7) ctx.fillRect(x, fy - u * 0.4, u * 0.06, u * 0.4);
  ctx.fillStyle = T.brownDark;
  ctx.fillRect(da + u * 0.1, fy - u * 0.4, u * 0.18, u * 1.0);
  ctx.fillRect(db - u * 0.28, fy - u * 0.4, u * 0.18, u * 1.0);
  // A green flag on the dock.
  const fxp = (da + db) / 2;
  ctx.fillStyle = C.ink;
  ctx.fillRect(fxp - u * 0.04, fy - u * 1.6, u * 0.08, u * 1.2);
  ctx.fillStyle = C.green;
  ctx.beginPath();
  ctx.moveTo(fxp + u * 0.04, fy - u * 1.6);
  ctx.lineTo(fxp + u * 0.7 + Math.sin(t * 4) * u * 0.06, fy - u * 1.4);
  ctx.lineTo(fxp + u * 0.04, fy - u * 1.2);
  ctx.fill();
  for (let x = db + u * 0.5; x < far; x += u * 0.9) {
    circle(ctx, x, fy - u * 0.35, u * 0.5, T.greenDark);
    circle(ctx, x + u * 0.2, fy - u * 0.5, u * 0.08, C.red);
  }
  // The tree and its branch.
  withShadow(ctx, () => rr(ctx, W.treeX - u * 0.5, W.pivot.y - u * 0.6, u * 1.0, fy - W.pivot.y + u * 0.6, u * 0.2), T.brownDark, u * 0.08, 0);
  ctx.fillStyle = T.brownDark;
  ctx.fillRect(W.treeX, W.pivot.y - u * 0.2, W.pivot.x - W.treeX + u * 0.3, u * 0.35);
  circle(ctx, W.treeX + u * 0.4, W.pivot.y - u * 0.9, u * 1.4, C.green);
  circle(ctx, W.treeX + u * 1.6, W.pivot.y - u * 0.6, u * 1.0, T.greenLight);
  // The swing: growing swings while you hold.
  const e = S.e;
  const amp = Math.min(1, 0.275 + 0.125 * e);
  const phase = S.pressed ? 0.5 - 0.5 * Math.cos(Math.PI * e) : 0;
  const theta = S.pressed ? lerp(-0.25 - amp * 0.4, 0.15 + amp * 0.85, phase) : -0.25 + Math.sin(t * 1.2) * 0.04;
  const ropeEnd = (th) => ({ x: W.pivot.x + Math.sin(th) * W.L, y: W.pivot.y + Math.cos(th) * W.L });
  const s = (u * 3.8) / 170;
  let gx;
  let gy;
  let rot = 0;
  if (!S.released || S.k === 'asleep') {
    const end = ropeEnd(theta);
    ctx.strokeStyle = T.brownLight;
    ctx.lineWidth = u * 0.08;
    ctx.beginPath();
    ctx.moveTo(W.pivot.x, W.pivot.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    gx = end.x;
    gy = end.y + 60 * s;
    rot = -theta;
    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.rotate(-theta);
    drawGirl(ctx, 0, 70 * s, s, { armL: Math.PI, armR: Math.PI, legs: 0.5 + phase * 0.6, face: faceFor(S), look: 2 });
    ctx.restore();
  } else {
    // Flying from where she let go to where she lands.
    const start = ropeEnd(theta);
    const land = { x: S.gx(S.v), y: S.k === 'under' ? fy + u * 0.2 : fy - u * 0.45 - 45 * s };
    const k = clamp01(S.since / 0.65);
    gx = lerp(start.x, land.x, k);
    gy = lerp(start.y + 70 * s, land.y, k) - Math.sin(k * Math.PI) * u * 2.2;
    rot = k < 1 ? k * Math.PI * 0.4 : 0;
    // The rope swings back by itself.
    const back = ropeEnd(theta * (1 - easeOut(S.since / 1.2)));
    ctx.strokeStyle = T.brownLight;
    ctx.lineWidth = u * 0.08;
    ctx.beginPath();
    ctx.moveTo(W.pivot.x, W.pivot.y);
    ctx.lineTo(back.x, back.y);
    ctx.stroke();
    if (S.k === 'under' && k >= 1) {
      // Splash: just her head and arms above the water.
      ctx.save();
      ctx.beginPath();
      ctx.rect(gx - u * 2, S.box.y - u * 5, u * 4, fy - S.box.y + u * 5);
      ctx.clip();
      drawGirl(ctx, gx, fy + 60 * s, s, { armL: 2.6, armR: 2.6, face: 'oops' });
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(k >= 1 ? 0 : rot);
      drawGirl(ctx, 0, 0, s, { armL: k >= 1 && okK(S.k) ? 2.8 : 1.2, armR: k >= 1 && okK(S.k) ? 2.8 : 1.6, legs: k < 1 ? 0.6 : 0, face: k >= 1 ? faceFor(S) : 'shock', look: 2, crouch: S.k === 'over' && k >= 1 ? 0.6 : 0 });
      ctx.restore();
    }
  }
  if (S.k === 'asleep') zzz(ctx, gx + u * 0.4, gy - u * 2, u, t);
}

function swingBurst(fx, S) {
  const fy = S.floor;
  if (S.k === 'under') fx.burst('drop', S.gx(S.v), fy, 18, { speed: S.u * 6, delay: 0.62 });
  else if (S.k === 'over') fx.burst('leaf', S.gx(S.v), fy - S.u * 0.5, 14, { speed: S.u * 4, delay: 0.62 });
  else if (okK(S.k)) fx.burst('spark', S.gx(S.v), fy - S.u * 0.6, 10, { speed: S.u * 3, delay: 0.62 });
}

// ---------------------------------------------------------------- the table of scenes

function porridgeBurst(fx, S) {
  const cx = S.box.x + S.box.w * 0.6;
  if (S.k === 'over') fx.burst('steam', cx, S.floor - S.u * 5, 12, { speed: S.u * 3 });
  else if (S.k === 'under') fx.burst('frost', cx, S.floor - S.u * 5, 10, { speed: S.u * 2 });
}

function toastBurst(fx, S) {
  const cx = S.box.x + S.box.w * 0.55;
  if (S.k === 'over') fx.burst('smoke', cx, S.floor - S.u * 5, 10, { speed: S.u * 2 });
  else if (S.k !== 'asleep') fx.burst('crumb', cx, S.floor - S.u * 4.5, 6, { speed: S.u * 2 });
}

function milkBurst(fx, S) {
  if (S.k === 'over' && finalOver(S)) {
    const M = milkGeom(S);
    fx.burst('drop', M.gxx + M.gw / 2, M.gTop, 12, { speed: S.u * 3, color: '#FFFDF6', delay: 0.3 });
  }
}

function spoonBurst(fx, S) {
  if (S.k === 'under') fx.burst('frost', S.box.x + S.box.w * 0.7, S.floor - S.box.h * 0.6, 10, { speed: S.u * 2 });
}

export const SCENES = {
  porridge: { room: 'kitchen', draw: porridge, burst: porridgeBurst },
  chair: { room: 'kitchen', draw: chair, burst: chairBurst },
  pillow: { room: 'kitchen', draw: pillow, burst: pillowBurst },
  toast: { room: 'kitchen', draw: toast, burst: toastBurst },
  balloon: { room: 'kitchen', draw: balloon, burst: balloonBurst },
  cake: { room: 'kitchen', draw: cake, burst: cakeBurst },
  spoon: { room: 'kitchen', draw: spoon, burst: spoonBurst },
  milk: { room: 'kitchen', draw: milk, burst: milkBurst },
  bowl: { room: 'kitchen', draw: bowl, burst: bowlBurst },
  jar: { room: 'kitchen', draw: jar, burst: jarBurst },
  bell: { room: 'outdoors', draw: bell, gauge: bellGauge },
  swing: { room: 'outdoors', draw: swing, burst: swingBurst },
};

/** The gauge's look per page: a thermometer's fill, or a pointer. */
export const GAUGE_STYLE = { porridge: 'fill', spoon: 'fill', toast: 'fill', milk: 'fill', pillow: 'fill', balloon: 'fill' };
