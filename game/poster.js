// Store art: one staged, deterministic frame drawn with the game's own renderer (?poster=cover|action|win|multi|icon|badge-<id>).
// No room, no SDK, no HUD from the platform; document.body.dataset.ready = '1' once it's on screen.

import { C, T, loadFonts, circle, ellipse, rr, withShadow, drawStamp, stampSize, drawFace, drawBearHead, drawGirlHead, outlined, FONT_DISPLAY } from './kit.js';
import { createFx } from './fx.js';
import { stageLayout, hudLayout, clearAreas } from './layout.js';
import { drawPage } from './view.js';
import { SCENES } from './scenes.js';
import { drawGauge, gaugePos } from './gauge.js';
import { drawPath, drawHeads, drawScoreSign, drawReveal, drawPodium, drawLobby, spread } from './screens.js';
import { kitchenLayout, drawBearsAtWindow } from './rooms.js';
import { readPage } from './pages.js';
import { FOLK } from './brain.js';

const folk = (i) => ({ animal: FOLK[i % FOLK.length].animal, name: FOLK[i % FOLK.length].name });

/** Runs a few frames of particles so a burst is mid-air in the picture. */
function settle(fx, seconds) {
  for (let t = 0; t < seconds; t += 1 / 60) fx.update(1 / 60);
}

function bearsInWindow(ctx, W, H, floor, exprs) {
  drawBearsAtWindow(ctx, kitchenLayout(W, H, floor), exprs);
}

function cover(ctx, W, H, fx) {
  const P = readPage({ g: 'porridge', c: 610, w: 75, sp: 100, tw: 0, ph: 0, n: 1 });
  const L = stageLayout(W, H, H * 0.24, 'up');
  // Bigger and closer than in play: the pot and the thermometer fill the picture.
  L.box = { x: W * 0.22, y: H * 0.18, w: W * 0.5, h: H * 0.8 };
  L.u = Math.min(L.box.w / 7.2, L.box.h / 6.2);
  L.floor = H * 0.97;
  L.g = { x: W * 0.74, y: H * 0.1, w: 70, h: H * 0.8 };
  fx.setUnit(L.u);
  const st = { v: 0.612, c: 0.61, holding: false, pressed: true, released: true, k: 'perfect', since: 0.4, held: 2300, t: 1.2 };
  drawPage(ctx, W, H, 1, P, L, st, { gauge: false });
  bearsInWindow(ctx, W, H, L.floor);
  drawGauge(ctx, L.g, { axis: 'up', v: 0.612, c: 0.61, w: 0.075, style: 'fill', t: 1 });
  // Everyone's marks on the gauge, the closest crowned.
  const vs = [0.58, 0.64, 0.55, 0.69, 0.6, 0.47];
  const ys = vs.map((v) => gaugePos(L.g, 'up', v));
  const placed = spread(ys, 52, L.g.y, L.g.y + L.g.h);
  vs.forEach((v, i) => {
    const mx = L.g.x + L.g.w + 70;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(L.g.x + L.g.w + 4, ys[i]);
    ctx.lineTo(mx - 26, placed[i]);
    ctx.stroke();
    drawFace(ctx, folk(i), mx, placed[i], 23, {});
  });
  drawStamp(ctx, 'JUST RIGHT', W * 0.36, H * 0.13, 92, { rot: -0.07, dpr: 1 });
  fx.burst('spark', W * 0.5, H * 0.42, 16, { speed: 220 });
  settle(fx, 0.25);
  fx.drawParticles(ctx);
}

function action(ctx, W, H, fx) {
  const P = readPage({ g: 'chair', c: 650, w: 70, sp: 100, tw: 0, ph: 0, n: 2 });
  const L = stageLayout(W, H, H * 0.1, 'up');
  L.box = { x: W * 0.3, y: H * 0.1, w: W * 0.44, h: H * 0.78 };
  L.u = Math.min(L.box.w / 6.2, L.box.h / 5.6);
  L.floor = H * 0.86;
  fx.setUnit(L.u);
  const st = { v: 0.86, c: 0.65, pressed: true, released: true, k: 'over', since: 0.14, held: 2600, t: 2.0 };
  const S = drawPage(ctx, W, H, 1, P, L, st, { gauge: false });
  bearsInWindow(ctx, W, H, L.floor, ['roar', 'shock', 'shock']);
  SCENES.chair.burst(fx, { ...S, k: 'over' });
  settle(fx, 0.34);
  fx.drawParticles(ctx);
  drawStamp(ctx, P.page.over, W * 0.83, H * 0.42, 60, { rot: -0.14, dpr: 1 });
}

function win(ctx, W, H, fx) {
  const rows = [
    { who: folk(2), name: 'Corvin', points: 1062, place: 1, color: C.blue },
    { who: folk(0), name: 'Ottoline', points: 1018, place: 2, color: C.green },
    { who: folk(1), name: 'Fen', points: 944, place: 3, color: C.red },
    { who: folk(3), name: 'Hazel', points: 871, place: 4 },
    { who: folk(4), name: 'Sorrel', points: 803, place: 5 },
    { who: folk(6), name: 'Burdock', points: 690, place: 6 },
  ];
  drawPodium(ctx, W, H, 1, 30, { rows, age: 3.2 });
  fx.burst('oat', W / 2, H * 0.3, 60, { speed: 520 });
  settle(fx, 0.5);
  fx.drawParticles(ctx);
  drawStamp(ctx, 'JUST RIGHT', W / 2, H * 0.14, 64, { rot: -0.08, dpr: 1 });
}

function multi(ctx, W, H) {
  const P = readPage({ g: 'toast', c: 560, w: 60, sp: 115, tw: 0, ph: 0, n: 6 });
  const hud = hudLayout(W, H, []);
  const L = stageLayout(W, H, hud.bottom, 'up');
  drawPage(ctx, W, H, 1, P, L, { v: 0.57, c: 0.56, pressed: true, released: true, k: 'perfect', since: 1, held: 2700, t: 3 });
  const seats = FOLK.map((f, i) => ({ id: f.name, who: folk(i), name: f.name }));
  const vs = [0.561, 0.6, 0.52, 0.645, 0.49, 0.58, 0.7, 0.43];
  const pts = [100, 84, 79, 64, 52, 90, 30, 18];
  const marks = seats.map((s, i) => ({ ...s, v: vs[i], k: i === 0 ? 'perfect' : Math.abs(vs[i] - 0.56) <= 0.06 ? 'good' : vs[i] < 0.56 ? 'under' : 'over', points: pts[i], d: vs[i] - 0.56, me: false }));
  marks.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const totals = [612, 590, 560, 498, 470, 455, 380, 342];
  const standings = seats.map((s, i) => ({ ...s, points: totals[i], gain: 0, me: false }));
  drawPath(ctx, hud.path, { kind: 'match', pages: 12, current: 6, progress: 1, x2: true, t: 1 });
  drawHeads(ctx, hud.heads, seats.map((s, i) => ({ id: s.id, who: s.who, x: hud.heads.x + hud.headR + 4 + i * (hud.headR * 2 + 8), done: true })), hud.headR, 0, true);
  drawScoreSign(ctx, hud.sign, '612', '1st');
  const best = drawReveal(ctx, W, H, hud.bottom, { name: 'Toast', axis: 'up', c: 0.56, w: 0.06, marks, standings, age: 4 });
  const half = best ? stampSize('JUST RIGHT!', 28).w / 2 : 0;
  if (best && best.end + half * 2 + 16 < best.limit) drawStamp(ctx, 'JUST RIGHT!', best.end + half + 16, best.y - 4, 28, { rot: -0.12, dpr: 1 });
}

/** The lobby with a full table (to check the layout at any size; not store art). */
function lobby(ctx, W, H) {
  const seats = FOLK.slice(0, 6).map((f, i) => ({ who: folk(i), name: f.name, ready: i % 2 === 0, host: i === 0, me: i === 1, color: C.blue }));
  seats.push({ empty: true, invite: true }, { empty: true, invite: true });
  drawLobby(ctx, W, H, 1, { ...clearAreas(W, H, null), bottom: 88 }, { seats, pages: 12, best: 1840, daily: { day: 1, month: 'Nov', best: 412 }, soloOk: true, t: 0, winner: folk(2) });
}

function icon(ctx, W, H) {
  // Full bleed: Goldilocks peeking over a bowl of porridge, on storybook blue.
  ctx.fillStyle = C.blue;
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2;
  ctx.fillStyle = T.blueDark;
  ctx.globalAlpha = 0.35;
  circle(ctx, cx, H * 0.46, W * 0.44, T.blueDark);
  ctx.globalAlpha = 1;
  drawGirlHead(ctx, cx, H * 0.4, W / 100, { face: 'cheer' });
  // The bowl, with a spoon in it.
  const by = H * 0.74;
  const br = W * 0.36;
  ctx.save();
  ctx.translate(cx + br * 0.42, by - br * 0.2);
  ctx.rotate(0.5);
  rr(ctx, -W * 0.018, -W * 0.2, W * 0.036, W * 0.2, W * 0.018);
  ctx.fillStyle = '#C9CED6';
  ctx.fill();
  ctx.restore();
  withShadow(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx - br, by - br * 0.2);
    ctx.quadraticCurveTo(cx, by + br * 0.95, cx + br, by - br * 0.2);
    ctx.closePath();
  }, C.red, W * 0.012, W * 0.016);
  ellipse(ctx, cx, by - br * 0.2, br, br * 0.2, T.redDark);
  ellipse(ctx, cx, by - br * 0.17, br * 0.88, br * 0.14, '#EFC56A');
  ctx.fillStyle = C.cream;
  ctx.fillRect(cx - br * 0.62, by + br * 0.16, br * 1.24, br * 0.07);
}

function check(ctx, x, y, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y + r * 0.02);
  ctx.lineTo(x - r * 0.12, y + r * 0.45);
  ctx.lineTo(x + r * 0.62, y - r * 0.42);
  ctx.stroke();
}

function star(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const k = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  ctx.closePath();
  ctx.fill();
}

const BADGES = {
  'just-right': { disc: C.green, draw: (ctx, c, r) => check(ctx, c, c, r * 0.6, C.cream) },
  'perfect-streak': {
    disc: C.red,
    draw: (ctx, c, r) => {
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (1.15 + (i / 4) * 0.7);
        star(ctx, c + Math.cos(a) * r * 0.55, c + 6 + Math.sin(a) * r * 0.55, r * 0.17, C.mustard);
      }
      check(ctx, c, c + r * 0.15, r * 0.42, C.cream);
    },
  },
  'too-hot': {
    disc: C.red,
    draw: (ctx, c, r) => {
      const flame = (s, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(c, c - r * 0.62 * s);
        ctx.bezierCurveTo(c + r * 0.55 * s, c - r * 0.1 * s, c + r * 0.45 * s, c + r * 0.5 * s, c, c + r * 0.55 * s);
        ctx.bezierCurveTo(c - r * 0.45 * s, c + r * 0.5 * s, c - r * 0.55 * s, c - r * 0.1 * s, c, c - r * 0.62 * s);
        ctx.fill();
      };
      flame(1, C.mustard);
      flame(0.55, C.cream);
    },
  },
  'broke-the-chair': {
    disc: T.brownMid,
    draw: (ctx, c, r) => {
      ctx.fillStyle = C.cream;
      rr(ctx, c - r * 0.42, c - r * 0.55, r * 0.14, r * 0.7, r * 0.05);
      ctx.fill();
      rr(ctx, c - r * 0.45, c + r * 0.02, r * 0.9, r * 0.14, r * 0.05);
      ctx.fill();
      ctx.save();
      ctx.translate(c + r * 0.3, c + r * 0.3);
      ctx.rotate(0.6);
      ctx.fillRect(-r * 0.06, -r * 0.1, r * 0.12, r * 0.4);
      ctx.restore();
      ctx.fillRect(c - r * 0.38, c + r * 0.16, r * 0.12, r * 0.38);
      ctx.strokeStyle = C.red;
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.moveTo(c + r * 0.05, c - r * 0.15);
      ctx.lineTo(c + r * 0.18, c - r * 0.02);
      ctx.lineTo(c + r * 0.08, c + r * 0.06);
      ctx.lineTo(c + r * 0.22, c + r * 0.2);
      ctx.stroke();
    },
  },
  'porridge-pro': {
    disc: C.mustard,
    draw: (ctx, c, r) => {
      const by = c + r * 0.1;
      ctx.fillStyle = C.red;
      ctx.beginPath();
      ctx.moveTo(c - r * 0.6, by - r * 0.1);
      ctx.quadraticCurveTo(c, by + r * 0.7, c + r * 0.6, by - r * 0.1);
      ctx.closePath();
      ctx.fill();
      ellipse(ctx, c, by - r * 0.1, r * 0.6, r * 0.13, T.redDark);
      ellipse(ctx, c, by - r * 0.08, r * 0.5, r * 0.09, C.cream);
      outlined(ctx, '10', c, c - r * 0.38, { size: r * 0.5, fill: C.ink, stroke: null, family: FONT_DISPLAY });
    },
  },
  'before-the-bears': { disc: C.ink, draw: (ctx, c, r) => drawBearHead(ctx, 'papa', c, c + r * 0.08, r * 0.52, 'grump') },
  'daily-porridge': {
    disc: C.blue,
    draw: (ctx, c, r) => {
      ctx.fillStyle = C.cream;
      rr(ctx, c - r * 0.45, c - r * 0.45, r * 0.9, r * 0.9, r * 0.1);
      ctx.fill();
      ctx.fillStyle = C.red;
      rr(ctx, c - r * 0.45, c - r * 0.45, r * 0.9, r * 0.24, r * 0.1);
      ctx.fill();
      check(ctx, c, c + r * 0.14, r * 0.36, C.green);
    },
  },
  'every-story': {
    disc: C.green,
    draw: (ctx, c, r) => {
      ctx.fillStyle = C.cream;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(c, c - r * 0.3);
        ctx.quadraticCurveTo(c + side * r * 0.3, c - r * 0.45, c + side * r * 0.62, c - r * 0.35);
        ctx.lineTo(c + side * r * 0.62, c + r * 0.4);
        ctx.quadraticCurveTo(c + side * r * 0.3, c + r * 0.3, c, c + r * 0.45);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = T.greenDark;
      ctx.lineWidth = r * 0.04;
      for (let i = 0; i < 3; i++) {
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(c + side * r * 0.12, c - r * 0.15 + i * r * 0.17);
          ctx.lineTo(c + side * r * 0.5, c - r * 0.2 + i * r * 0.17);
          ctx.stroke();
        }
      }
    },
  },
  'happily-ever-after': {
    disc: C.mustard,
    draw: (ctx, c, r) => {
      ctx.fillStyle = C.red;
      ctx.beginPath();
      const w = r * 0.6;
      ctx.moveTo(c - w, c + r * 0.3);
      ctx.lineTo(c - w, c - r * 0.25);
      ctx.lineTo(c - w * 0.45, c + r * 0.05);
      ctx.lineTo(c, c - r * 0.45);
      ctx.lineTo(c + w * 0.45, c + r * 0.05);
      ctx.lineTo(c + w, c - r * 0.25);
      ctx.lineTo(c + w, c + r * 0.3);
      ctx.closePath();
      ctx.fill();
      for (const dx of [-0.45, 0, 0.45]) circle(ctx, c + dx * w, c + r * 0.18, r * 0.06, C.cream);
    },
  },
};

function badge(ctx, W, id) {
  const B = BADGES[id] ?? BADGES['just-right'];
  const c = W / 2;
  const r = W * 0.42;
  circle(ctx, c + W * 0.012, c + W * 0.018, r, T.shadow);
  circle(ctx, c, c, r, B.disc);
  // The stamp's double rule.
  ctx.strokeStyle = C.cream;
  ctx.lineWidth = W * 0.022;
  circle(ctx, c, c, r * 0.88);
  ctx.stroke();
  ctx.lineWidth = W * 0.008;
  circle(ctx, c, c, r * 0.8);
  ctx.stroke();
  B.draw(ctx, c, r);
}

export async function runPoster(full) {
  // "multi.390x844": the same scene drawn at a phone's size in the corner, to check a layout.
  const at = /^(.*)[.](\d{2,4})x(\d{2,4})$/.exec(full);
  const name = at ? at[1] : full;
  const W = at ? Number(at[2]) : Math.max(1, window.innerWidth);
  const H = at ? Number(at[3]) : Math.max(1, window.innerHeight);
  const cv = document.getElementById('cv');
  cv.width = W;
  cv.height = H;
  cv.style.width = `${W}px`;
  cv.style.height = `${H}px`;
  const ctx = cv.getContext('2d');
  await loadFonts(3000);
  try {
    await document.fonts.ready;
  } catch {}
  const fx = createFx();
  fx.setUnit(Math.min(W, H) / 22);
  ctx.fillStyle = T.wall;
  if (name === 'icon' || name.startsWith('badge-')) ctx.clearRect(0, 0, W, H);
  else ctx.fillRect(0, 0, W, H);
  // The particles are random: make them the same every time.
  let seed = 7;
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  if (name === 'cover') cover(ctx, W, H, fx);
  else if (name === 'action') action(ctx, W, H, fx);
  else if (name === 'win') win(ctx, W, H, fx);
  else if (name === 'multi') multi(ctx, W, H);
  else if (name === 'icon') icon(ctx, W, H);
  else if (name === 'lobby') lobby(ctx, W, H);
  else if (name.startsWith('badge-')) badge(ctx, W, name.slice(6));
  else cover(ctx, W, H, fx);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  document.body.dataset.ready = '1';
}
