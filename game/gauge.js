// The "just right" gauge every page has (and the reveal draws big): a cream bar, the green band with its darker perfect strip
// and a ✓ notch, a blue "too little" end and a red "too much" end (each with an arrow, so colour is never the only sign), and the
// thing that moves: a fill or a pointer. Fog clouds it over but leaves a ghost of the pointer and the band's outline.

import { C, T, rr, circle, withShadow } from './kit.js';
import { perfectRadius } from './pages.js';

/** Where v sits along the bar (a y for 'up'/'down', an x for 'right'). range: the part of 0..1 the bar shows. */
export function gaugePos(g, axis, v, range = [0, 1]) {
  const [lo, hi] = range;
  const k = Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));
  const pad = axis === 'right' ? g.h * 0.55 : g.w * 0.55;
  if (axis === 'up') return g.y + g.h - pad - k * (g.h - pad * 2);
  if (axis === 'down') return g.y + pad + k * (g.h - pad * 2);
  return g.x + pad + k * (g.w - pad * 2);
}

function arrowCap(ctx, x, y, r, dir, color) {
  circle(ctx, x + r * 0.1, y + r * 0.14, r, T.shadow);
  circle(ctx, x, y, r, color);
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.strokeStyle = C.ink;
  circle(ctx, x, y, r);
  ctx.stroke();
  // A chevron pointing away from the bar: down (less) / up (more), or left / right.
  ctx.save();
  ctx.translate(x, y);
  const rot = { down: 0, up: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[dir];
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.2);
  ctx.lineTo(0, r * 0.32);
  ctx.lineTo(r * 0.45, -r * 0.2);
  ctx.lineWidth = Math.max(2.5, r * 0.22);
  ctx.strokeStyle = C.cream;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

function cloud(ctx, x, y, w, h, t) {
  const puffs = Math.max(4, Math.round(Math.max(w, h) / Math.min(w, h)) * 2 + 2);
  ctx.fillStyle = 'rgba(250,240,220,0.86)';
  const along = h > w;
  for (let i = 0; i < puffs; i++) {
    const f = i / (puffs - 1);
    const wob = Math.sin(t * 1.3 + i * 1.7) * Math.min(w, h) * 0.06;
    const r = Math.min(w, h) * (0.62 + 0.12 * Math.sin(i * 2.3));
    const cx = along ? x + w / 2 + wob : x + f * w;
    const cy = along ? y + f * h : y + h / 2 + wob;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * g: the bar's rectangle. o: { axis, v, c, w, style: 'fill' | 'pointer', fog, pop, steps, range, t, body (colour stops for the
 * bar), dim (no indicator), indicator (false to skip) }
 */
export function drawGauge(ctx, g, o) {
  const axis = o.axis ?? 'up';
  const vertical = axis !== 'right';
  const range = o.range ?? [0, 1];
  const pos = (v) => gaugePos(g, axis, v, range);
  const thick = vertical ? g.w : g.h;
  const lw = Math.max(2.5, thick * 0.07);
  ctx.save();
  // Body.
  withShadow(ctx, () => rr(ctx, g.x, g.y, g.w, g.h, thick / 2), C.cream, thick * 0.08, thick * 0.1);
  if (o.body) {
    const grad = vertical ? ctx.createLinearGradient(0, pos(range[0]), 0, pos(range[1])) : ctx.createLinearGradient(pos(range[0]), 0, pos(range[1]), 0);
    for (const [stop, color] of o.body) grad.addColorStop(stop, color);
    rr(ctx, g.x + lw * 1.5, g.y + lw * 1.5, g.w - lw * 3, g.h - lw * 3, thick / 2 - lw * 1.5);
    ctx.fillStyle = grad;
    ctx.fill();
  }
  // The ends: blue for too little, red for too much.
  const endLen = thick * 0.5;
  ctx.save();
  rr(ctx, g.x, g.y, g.w, g.h, thick / 2);
  ctx.clip();
  const p0 = pos(range[0]);
  const p1 = pos(range[1]);
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = C.blue;
  if (axis === 'up') ctx.fillRect(g.x, p0 - endLen * 0.2, g.w, g.y + g.h - p0 + endLen);
  else if (axis === 'down') ctx.fillRect(g.x, g.y, g.w, p0 - g.y + endLen * 0.2);
  else ctx.fillRect(g.x, g.y, p0 - g.x + endLen * 0.2, g.h);
  ctx.fillStyle = C.red;
  if (axis === 'up') ctx.fillRect(g.x, g.y, g.w, p1 - g.y + endLen * 0.2);
  else if (axis === 'down') ctx.fillRect(g.x, p1 - endLen * 0.2, g.w, g.y + g.h - p1 + endLen);
  else ctx.fillRect(p1 - endLen * 0.2, g.y, g.x + g.w - p1 + endLen, g.h);
  ctx.globalAlpha = 1;
  // Ticks every tenth.
  ctx.strokeStyle = 'rgba(30,39,71,0.35)';
  ctx.lineWidth = Math.max(1, thick * 0.03);
  ctx.beginPath();
  for (let i = 1; i < 10; i++) {
    const v = i / 10;
    if (v < range[0] || v > range[1]) continue;
    const p = pos(v);
    const len = (o.steps ? 0.34 : i === 5 ? 0.3 : 0.18) * thick;
    if (vertical) {
      ctx.moveTo(g.x + lw, p);
      ctx.lineTo(g.x + lw + len, p);
      ctx.moveTo(g.x + g.w - lw, p);
      ctx.lineTo(g.x + g.w - lw - len, p);
    } else {
      ctx.moveTo(p, g.y + lw);
      ctx.lineTo(p, g.y + lw + len);
      ctx.moveTo(p, g.y + g.h - lw);
      ctx.lineTo(p, g.y + g.h - lw - len);
    }
  }
  ctx.stroke();
  // The band and its perfect strip.
  const c = o.c ?? 0.5;
  const w = o.w ?? 0.07;
  const pr = perfectRadius(w);
  const band = (from, to, color) => {
    const a = pos(from);
    const b = pos(to);
    ctx.fillStyle = color;
    if (vertical) ctx.fillRect(g.x, Math.min(a, b), g.w, Math.abs(b - a));
    else ctx.fillRect(Math.min(a, b), g.y, Math.abs(b - a), g.h);
  };
  band(c - w, c + w, C.green);
  band(c - pr, c + pr, T.greenDark);
  ctx.restore();
  // Popping point (the balloon).
  if (o.pop !== undefined) {
    const p = pos(o.pop);
    ctx.save();
    ctx.setLineDash([thick * 0.12, thick * 0.1]);
    ctx.lineWidth = Math.max(2, thick * 0.06);
    ctx.strokeStyle = C.red;
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(g.x - thick * 0.2, p);
      ctx.lineTo(g.x + g.w + thick * 0.2, p);
    } else {
      ctx.moveTo(p, g.y - thick * 0.2);
      ctx.lineTo(p, g.y + g.h + thick * 0.2);
    }
    ctx.stroke();
    ctx.restore();
  }
  // The indicator.
  const v = o.v ?? 0;
  const pv = pos(v);
  const drawIndicator = () => {
    if (o.indicator === false) return;
    if (o.style === 'fill') {
      const col = thick * 0.34;
      ctx.fillStyle = C.ink;
      if (vertical) {
        const from = axis === 'up' ? pos(range[0]) + thick * 0.2 : pos(range[0]) - thick * 0.2;
        rr(ctx, g.x + g.w / 2 - col / 2, Math.min(from, pv), col, Math.abs(pv - from), col / 2);
      } else {
        const from = pos(range[0]) - thick * 0.2;
        rr(ctx, from, g.y + g.h / 2 - col / 2, pv - from, col, col / 2);
      }
      ctx.fill();
      // The bulb.
      if (axis === 'up') circle(ctx, g.x + g.w / 2, g.y + g.h - thick * 0.5, thick * 0.3, C.ink);
    }
    // A bold pointer beside the bar and a line across it.
    ctx.fillStyle = C.ink;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(3, thick * 0.1);
    ctx.lineCap = 'round';
    const tri = thick * 0.42;
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(g.x - tri * 0.25, pv);
      ctx.lineTo(g.x + g.w + tri * 0.25, pv);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(g.x + g.w + tri * 0.2, pv);
      ctx.lineTo(g.x + g.w + tri * 1.25, pv - tri * 0.62);
      ctx.lineTo(g.x + g.w + tri * 1.25, pv + tri * 0.62);
    } else {
      ctx.moveTo(pv, g.y - tri * 0.25);
      ctx.lineTo(pv, g.y + g.h + tri * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pv, g.y - tri * 0.2);
      ctx.lineTo(pv - tri * 0.62, g.y - tri * 1.25);
      ctx.lineTo(pv + tri * 0.62, g.y - tri * 1.25);
    }
    ctx.closePath();
    ctx.fill();
  };
  if (!o.dim) drawIndicator();
  // Fog: a cloud over everything past the first quarter; the pointer shows through as a ghost.
  if (o.fog) {
    const from = pos(Math.max(range[0], 0.25));
    const to = pos(range[1]);
    const t = o.t ?? 0;
    if (vertical) cloud(ctx, g.x - thick * 0.45, Math.min(from, to) - thick * 0.2, g.w + thick * 0.9, Math.abs(to - from) + thick * 0.6, t);
    else cloud(ctx, Math.min(from, to) - thick * 0.2, g.y - thick * 0.45, Math.abs(to - from) + thick * 0.4, g.h + thick * 0.9, t);
    // The band's outline, painted on the cloud.
    const a = pos(c - w);
    const b = pos(c + w);
    ctx.save();
    ctx.setLineDash([thick * 0.16, thick * 0.1]);
    ctx.lineWidth = Math.max(2.5, thick * 0.08);
    ctx.strokeStyle = C.green;
    if (vertical) rr(ctx, g.x - 2, Math.min(a, b), g.w + 4, Math.abs(b - a), 4);
    else rr(ctx, Math.min(a, b), g.y - 2, Math.abs(b - a), g.h + 4, 4);
    ctx.stroke();
    ctx.restore();
  }
  // Outline over it all, then the end caps.
  rr(ctx, g.x, g.y, g.w, g.h, thick / 2);
  ctx.lineWidth = lw;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  // The ✓ notch at the band's centre.
  const pc = pos(c);
  const nr = thick * 0.2;
  ctx.save();
  if (vertical) ctx.translate(g.x - nr * 1.6, pc);
  else ctx.translate(pc, g.y + g.h + nr * 1.6);
  circle(ctx, 0, 0, nr * 1.25, C.green);
  ctx.beginPath();
  ctx.moveTo(-nr * 0.55, 0);
  ctx.lineTo(-nr * 0.1, nr * 0.45);
  ctx.lineTo(nr * 0.6, -nr * 0.45);
  ctx.lineWidth = Math.max(2, nr * 0.35);
  ctx.strokeStyle = C.cream;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
  // Ends.
  const capR = thick * 0.36;
  if (axis === 'up') {
    arrowCap(ctx, g.x + g.w / 2, g.y + g.h + capR * 1.15, capR, 'down', C.blue);
    arrowCap(ctx, g.x + g.w / 2, g.y - capR * 1.15, capR, 'up', C.red);
  } else if (axis === 'down') {
    arrowCap(ctx, g.x + g.w / 2, g.y - capR * 1.15, capR, 'up', C.blue);
    arrowCap(ctx, g.x + g.w / 2, g.y + g.h + capR * 1.15, capR, 'down', C.red);
  } else {
    arrowCap(ctx, g.x - capR * 1.15, g.y + g.h / 2, capR, 'left', C.blue);
    arrowCap(ctx, g.x + g.w + capR * 1.15, g.y + g.h / 2, capR, 'right', C.red);
  }
  ctx.restore();
}
