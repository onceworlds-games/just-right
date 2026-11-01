// One page on screen: the room behind it, the scene, the gauge beside (or under) it, and the Foggy twist's cloud. The game, the
// title's attract mode and the posters all draw a page through here.

import { drawKitchen, drawOutdoors } from './rooms.js';
import { drawGauge, gaugePos } from './gauge.js';
import { SCENES, GAUGE_STYLE } from './scenes.js';
import { FOGGY, popLine } from './pages.js';

/**
 * The scene state for a page: st = { v, c, holding, pressed, released, k, since (s), held (ms), t (s), reduced }.
 */
export function sceneState(P, L, st) {
  const axis = P.page.axis;
  return {
    P,
    box: L.box,
    u: L.u,
    floor: L.floor,
    g: L.g,
    v: st.v,
    c: st.c,
    w: P.w,
    holding: !!st.holding,
    pressed: !!st.pressed,
    released: !!st.released,
    k: st.k ?? null,
    since: st.since ?? 0,
    e: ((st.held ?? 0) / 1000) * P.sp,
    t: st.t ?? 0,
    reduced: !!st.reduced,
    gx: (v) => gaugePos(L.g, axis === 'right' ? 'right' : axis, v),
  };
}

function fogPuffs(ctx, box, u, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(250,240,220,0.78)';
  for (let i = 0; i < 7; i++) {
    const x = box.x + box.w * (0.15 + 0.12 * i) + Math.sin(t * 0.7 + i) * u * 0.4;
    const y = box.y + box.h * (0.35 + 0.18 * Math.sin(i * 1.7)) + Math.cos(t * 0.5 + i) * u * 0.2;
    ctx.beginPath();
    ctx.arc(x, y, u * (1.4 + 0.4 * Math.sin(i * 2.1)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Draws the page and returns its scene state. backdrop: false skips the room (the caller drew it). */
export function drawPage(ctx, W, H, dpr, P, L, st, { backdrop = true, cam = { x: 0, y: 0 }, gauge = true } = {}) {
  const S = sceneState(P, L, st);
  const scene = SCENES[P.g];
  if (backdrop) {
    if (scene.room === 'outdoors') drawOutdoors(ctx, W, H, dpr, S.t, cam, L.floor);
    else drawKitchen(ctx, W, H, dpr, S.t, cam, L.floor);
  }
  scene.draw(ctx, S);
  const foggy = P.tw === FOGGY;
  if (foggy && S.pressed && !S.released) fogPuffs(ctx, L.box, L.u, S.t);
  if (gauge) {
    const gv = scene.gauge ? scene.gauge(S) : S.v;
    drawGauge(ctx, L.g, {
      axis: P.page.axis,
      v: gv,
      c: S.c,
      w: P.w,
      style: GAUGE_STYLE[P.g] ?? 'pointer',
      fog: foggy && !S.released,
      pop: P.page.pops ? popLine(P) : undefined,
      steps: !!P.page.steps,
      t: S.t,
    });
  }
  return S;
}
