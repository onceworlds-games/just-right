// Juice: pooled particles (splinters, feathers, shreds, milk, steam, oats...), the stamp slam with its hit-stop, floating points
// and a smooth trauma² shake. Reduced motion: no shake, stamps fade in, fewer particles.

import { C, T, circle, ellipse, rr, drawStamp, outlined, FONT_DISPLAY } from './kit.js';

const KINDS = {
  splinter: { colors: [T.brownLight, '#D9A877', C.cream], grav: 1.6, size: [0.14, 0.32], life: [0.7, 1.1], shape: 'rect' },
  feather: { colors: ['#FFF7E6', T.paper, '#F3E3C3'], grav: 0.12, drag: 1.8, size: [0.1, 0.18], life: [1.2, 2.0], shape: 'leaf' },
  shred: { colors: [C.red, T.redDark, T.redLight], grav: 1.1, size: [0.1, 0.22], life: [0.6, 1.0], shape: 'rect' },
  drop: { colors: [T.bluePale, C.blue, '#FFFFFF'], grav: 1.8, size: [0.06, 0.12], life: [0.5, 0.9], shape: 'dot' },
  steam: { colors: [T.paper], grav: -0.5, drag: 1.2, size: [0.2, 0.45], life: [0.8, 1.3], shape: 'puff' },
  smoke: { colors: ['#4A4038', '#5E544A'], grav: -0.4, drag: 1.2, size: [0.25, 0.5], life: [1.0, 1.6], shape: 'puff' },
  frost: { colors: [C.blue, T.bluePale, '#FFFFFF'], grav: 0.1, drag: 1.5, size: [0.06, 0.12], life: [0.6, 1.0], shape: 'star' },
  spark: { colors: [C.mustard, T.mustardLight, C.cream], grav: 0.3, drag: 1.5, size: [0.08, 0.16], life: [0.5, 0.9], shape: 'star' },
  honey: { colors: [C.mustard, T.mustardDark], grav: 1.6, size: [0.06, 0.14], life: [0.5, 0.8], shape: 'dot' },
  shard: { colors: [C.red, T.redDark, '#EFC56A'], grav: 1.8, size: [0.1, 0.22], life: [0.6, 1.0], shape: 'rect' },
  leaf: { colors: [C.green, T.greenLight, T.greenDark], grav: 0.5, drag: 1.4, size: [0.1, 0.2], life: [0.8, 1.3], shape: 'leaf' },
  crumb: { colors: ['#EFCB82', '#D9963A', T.paper], grav: 1.6, size: [0.05, 0.1], life: [0.4, 0.7], shape: 'dot' },
  oat: { colors: [C.cream, '#EFCB82', C.mustard, T.paper], grav: 0.5, drag: 0.6, size: [0.07, 0.13], life: [2.0, 3.0], shape: 'leaf' },
};

export function createFx() {
  const MAX = 220;
  const pool = [];
  for (let i = 0; i < MAX; i++) pool.push({ on: false });
  let cap = MAX;
  const stamps = [];
  const floats = [];
  const queued = [];
  let trauma = 0;
  let stop = 0;
  let time = 0;
  let unit = 20;

  function spawnOne(kind, x, y, speed, color) {
    const K = KINDS[kind] ?? KINDS.spark;
    let p = null;
    for (let i = 0; i < cap; i++) {
      if (!pool[i].on) {
        p = pool[i];
        break;
      }
    }
    if (!p) return;
    const a = Math.random() * Math.PI * 2;
    const sp = speed * (0.35 + Math.random() * 0.75);
    p.on = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(a) * sp;
    p.vy = Math.sin(a) * sp - speed * (K.grav > 0.8 ? 0.6 : 0.1);
    p.rot = Math.random() * 6.28;
    p.vr = (Math.random() - 0.5) * 12;
    p.max = K.life[0] + Math.random() * (K.life[1] - K.life[0]);
    p.life = p.max;
    p.size = unit * (K.size[0] + Math.random() * (K.size[1] - K.size[0]));
    p.color = color ?? K.colors[(Math.random() * K.colors.length) | 0];
    p.grav = K.grav * unit * 9;
    p.drag = K.drag ?? 0.3;
    p.shape = K.shape;
  }

  const fx = {
    /** The size of a unit on screen (particles and speeds scale with it). */
    setUnit(u) {
      unit = Math.max(4, u);
    },
    setQuality(q) {
      cap = q === 'low' ? 80 : MAX;
    },
    reduced: false,
    burst(kind, x, y, n, { speed = unit * 4, color, delay = 0 } = {}) {
      const count = Math.max(1, Math.round(n * (fx.reduced ? 0.4 : 1)));
      if (delay > 0) queued.push({ at: time + delay, kind, x, y, n: count, speed, color });
      else for (let i = 0; i < count; i++) spawnOne(kind, x, y, speed, color);
    },
    /** A stamp slammed down: it lands at 0.12 s with a stop of `hold` ms. */
    stamp(text, x, y, size, { color = C.red, rot = -0.1, life = 1.6, hold = 80, follow = null } = {}) {
      stamps.push({ text, x, y, size, color, rot, life, age: 0, hold, landed: false, follow });
    },
    float(text, x, y, { color = C.ink, size = 30, life = 1.1 } = {}) {
      floats.push({ text, x, y, color, size, life, age: 0 });
    },
    shake(amount) {
      if (!fx.reduced) trauma = Math.min(1, trauma + amount);
    },
    hitstop(ms) {
      if (!fx.reduced) stop = Math.max(stop, ms / 1000);
    },
    /** True while the hit-stop holds the action still. */
    get stopped() {
      return stop > 0;
    },
    clear() {
      for (const p of pool) p.on = false;
      stamps.length = 0;
      floats.length = 0;
      queued.length = 0;
      trauma = 0;
      stop = 0;
    },
    clearStamps() {
      stamps.length = 0;
    },
    update(dt) {
      time += dt;
      if (stop > 0) stop = Math.max(0, stop - dt);
      trauma = Math.max(0, trauma - dt * 1.7);
      for (let i = queued.length - 1; i >= 0; i--) {
        const q = queued[i];
        if (time >= q.at) {
          for (let j = 0; j < q.n; j++) spawnOne(q.kind, q.x, q.y, q.speed, q.color);
          queued.splice(i, 1);
        }
      }
      for (const p of pool) {
        if (!p.on) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.on = false;
          continue;
        }
        const drag = Math.exp(-p.drag * dt);
        p.vx *= drag;
        p.vy = p.vy * drag + p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
      for (let i = stamps.length - 1; i >= 0; i--) {
        const s = stamps[i];
        s.age += dt;
        if (!s.landed && s.age >= 0.12) {
          s.landed = true;
          if (s.hold) fx.hitstop(s.hold);
        }
        if (s.age > s.life) stamps.splice(i, 1);
      }
      for (let i = floats.length - 1; i >= 0; i--) {
        floats[i].age += dt;
        if (floats[i].age > floats[i].life) floats.splice(i, 1);
      }
    },
    /** The camera's shake offset now. */
    offset() {
      if (fx.reduced || trauma <= 0) return { x: 0, y: 0, r: 0 };
      const k = trauma * trauma;
      const m = unit * 0.9;
      return {
        x: k * m * (Math.sin(time * 41) * 0.6 + Math.sin(time * 67 + 1) * 0.4),
        y: k * m * (Math.sin(time * 53 + 2) * 0.6 + Math.sin(time * 29 + 3) * 0.4),
        r: k * 0.02 * Math.sin(time * 37),
      };
    },
    drawParticles(ctx) {
      for (const p of pool) {
        if (!p.on) continue;
        const k = p.life / p.max;
        ctx.save();
        ctx.globalAlpha = p.shape === 'puff' ? k * 0.7 : Math.min(1, k * 2.5);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.shape === 'rect') {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size, -p.size * 0.3, p.size * 2, p.size * 0.6);
        } else if (p.shape === 'leaf') ellipse(ctx, 0, 0, p.size, p.size * 0.45, p.color);
        else if (p.shape === 'puff') circle(ctx, 0, 0, p.size * (1.6 - k * 0.6), p.color);
        else if (p.shape === 'star') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const r = i % 2 ? p.size * 0.35 : p.size;
            const a = (i / 8) * Math.PI * 2;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.fill();
        } else circle(ctx, 0, 0, p.size, p.color);
        ctx.restore();
      }
    },
    drawStamps(ctx, dpr) {
      for (const s of stamps) {
        const at = s.follow ? s.follow() : s;
        const fade = s.age > s.life - 0.25 ? (s.life - s.age) / 0.25 : 1;
        let scale = 1;
        let alpha = fade;
        if (fx.reduced) alpha *= Math.min(1, s.age / 0.15);
        else if (s.age < 0.12) {
          const k = s.age / 0.12;
          scale = 2.3 - 1.3 * k * k;
          alpha *= 0.4 + 0.6 * k;
        } else if (s.age < 0.22) scale = 1 - 0.05 * Math.sin(((s.age - 0.12) / 0.1) * Math.PI);
        drawStamp(ctx, s.text, at.x, at.y, s.size, { rot: s.rot, color: s.color, alpha, scale, dpr });
      }
    },
    drawFloats(ctx) {
      for (const f of floats) {
        const k = f.age / f.life;
        ctx.save();
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.4 : 1;
        outlined(ctx, f.text, f.x, f.y - k * f.size * 1.6, { size: f.size * pop, fill: f.color, stroke: C.cream, family: FONT_DISPLAY });
        ctx.restore();
      }
    },
    get busy() {
      return stamps.length > 0;
    },
  };
  return fx;
}

export { rr };
