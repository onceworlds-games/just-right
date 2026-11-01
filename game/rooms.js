// The places: the bears' kitchen (wallpaper, wainscot, a round window onto the woods, a shelf of three bowls) and the clearing
// outside (the far hills, the cottage on its hill, the trees). Static layers are drawn once per size on offscreen canvases; the
// woods through the window sway live, and everything shifts a little with the camera (parallax).

import { C, T, rr, circle, ellipse, drawTree, drawBearHead } from './kit.js';

const cache = new Map();

function layer(key, W, H, dpr, paint) {
  const id = `${key}|${W}|${H}|${dpr}`;
  let c = cache.get(id);
  if (c) return c;
  // A few sizes at a time (a rotation, the lobby's floor and the play floor); the oldest goes first.
  while (cache.size >= 6) cache.delete(cache.keys().next().value);
  c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(W * dpr));
  c.height = Math.max(1, Math.ceil(H * dpr));
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  paint(g, W, H);
  cache.set(id, c);
  return c;
}

/** Where things stand in the kitchen for this screen. */
export function kitchenLayout(W, H, floor, noWindow = false) {
  const portrait = H > W * 1.1;
  const floorY = Math.round(floor ?? H * (portrait ? 0.86 : 0.82));
  const win = noWindow ? null : portrait ? { x: W * 0.2, y: H * 0.28, r: Math.min(W, H) * 0.13 } : { x: W * 0.13, y: H * 0.36, r: Math.min(W, H) * 0.14 };
  return { portrait, floorY, win, wainTop: floorY - Math.round(H * 0.13) };
}

function paintKitchen(g, W, H, K) {
  g.fillStyle = T.wall;
  g.fillRect(0, 0, W, H);
  // Wallpaper: small diamonds in rows.
  g.fillStyle = T.wallDot;
  const step = Math.max(26, Math.min(W, H) * 0.06);
  for (let y = step * 0.6, row = 0; y < K.wainTop; y += step, row++) {
    for (let x = (row % 2) * step * 0.5; x < W + step; x += step) {
      g.beginPath();
      g.moveTo(x, y - step * 0.12);
      g.lineTo(x + step * 0.08, y);
      g.lineTo(x, y + step * 0.12);
      g.lineTo(x - step * 0.08, y);
      g.closePath();
      g.fill();
    }
  }
  // Wainscot boards and the rail.
  g.fillStyle = T.wainscot;
  g.fillRect(0, K.wainTop, W, K.floorY - K.wainTop);
  g.strokeStyle = T.wainscotDark;
  g.lineWidth = 2;
  for (let x = 0; x < W; x += Math.max(22, W / 40)) {
    g.beginPath();
    g.moveTo(x, K.wainTop + 8);
    g.lineTo(x, K.floorY);
    g.stroke();
  }
  g.fillStyle = T.beam;
  g.fillRect(0, K.wainTop - 6, W, 12);
  // Floor planks.
  g.fillStyle = T.floor;
  g.fillRect(0, K.floorY, W, H - K.floorY);
  g.strokeStyle = T.floorDark;
  g.lineWidth = 2;
  for (let y = K.floorY + 10, i = 0; y < H; y += 12 + i * 5, i++) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  g.fillStyle = 'rgba(30,39,71,0.18)';
  g.fillRect(0, K.floorY, W, 6);
  // The beam along the top.
  g.fillStyle = T.beam;
  g.fillRect(0, 0, W, Math.max(10, H * 0.025));
  // The window's frame (its woods are drawn live).
  if (K.win) {
    const { x, y, r } = K.win;
    circle(g, x + 6, y + 8, r + r * 0.16, T.shadow);
    circle(g, x, y, r + r * 0.16, T.brownMid);
  }
  // A shelf with the three bowls, on the far wall.
  if (!K.portrait) {
    const sx = W * 0.8;
    const sy = H * 0.3;
    const sw = W * 0.15;
    g.fillStyle = T.shadow;
    g.fillRect(sx + 4, sy + 6, sw, 10);
    g.fillStyle = T.brownMid;
    g.fillRect(sx, sy, sw, 10);
    const bowl = (bx, br, color) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(bx - br, sy - br * 0.7);
      g.quadraticCurveTo(bx, sy + br * 0.25, bx + br, sy - br * 0.7);
      g.closePath();
      g.fill();
      ellipse(g, bx, sy - br * 0.7, br, br * 0.22, T.redDark);
    };
    bowl(sx + sw * 0.2, sw * 0.13, C.red);
    bowl(sx + sw * 0.52, sw * 0.105, C.red);
    bowl(sx + sw * 0.8, sw * 0.08, C.red);
  }
}

/** The woods seen through the round window: sky, trees in two rows that sway, parallax from the camera. */
function drawWindowView(ctx, K, t, cam) {
  const { x, y, r } = K.win;
  ctx.save();
  circle(ctx, x, y, r);
  ctx.clip();
  ctx.fillStyle = T.bluePale;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  circle(ctx, x + r * 0.45 - cam.x * 0.05, y - r * 0.45, r * 0.22, T.mustardLight);
  const px = -cam.x * 0.15;
  ctx.fillStyle = T.greenPale;
  ctx.beginPath();
  ctx.ellipse(x + px * 0.5, y + r * 0.75, r * 1.4, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = -3; i <= 3; i++) {
    const sway = Math.sin(t * 0.9 + i) * r * 0.02;
    drawTree(ctx, x + i * r * 0.42 + px * 0.6 + sway, y + r * 0.62, r * 0.75, i % 2 === 0 ? 1 : 0, T.greenLight, T.brownMid);
  }
  for (let i = -2; i <= 2; i++) {
    const sway = Math.sin(t * 1.1 + i * 2) * r * 0.03;
    drawTree(ctx, x + i * r * 0.62 + r * 0.2 + px + sway, y + r * 1.02, r * 1.05, i % 2 === 0 ? 0 : 1, C.green, T.brownDark);
  }
  ctx.restore();
  // Mullions over the glass.
  ctx.save();
  ctx.lineWidth = Math.max(4, r * 0.08);
  ctx.strokeStyle = T.brownMid;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
  ctx.stroke();
  circle(ctx, x, y, r);
  ctx.lineWidth = Math.max(3, r * 0.05);
  ctx.strokeStyle = T.brownDark;
  ctx.stroke();
  ctx.restore();
}

/** The three bears' heads at the window, looking in (exprs: papa, mama, baby). */
export function drawBearsAtWindow(ctx, K, exprs = ['grump', 'shock', 'sleepy']) {
  if (!K.win) return;
  const { x, y, r } = K.win;
  ctx.save();
  circle(ctx, x, y, r);
  ctx.clip();
  ['papa', 'mama', 'baby'].forEach((kind, i) => {
    const hr = r * (kind === 'papa' ? 0.42 : kind === 'mama' ? 0.36 : 0.3);
    drawBearHead(ctx, kind, x + (i - 1) * r * 0.62, y + r * 0.62 - hr * 0.2 + (kind === 'baby' ? r * 0.12 : 0), hr, exprs[i]);
  });
  ctx.restore();
  // The mullions again, over the bears.
  ctx.save();
  ctx.lineWidth = Math.max(4, r * 0.08);
  ctx.strokeStyle = T.brownMid;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
  ctx.stroke();
  ctx.restore();
}

export function drawKitchen(ctx, W, H, dpr, t, cam = { x: 0, y: 0 }, floor, noWindow = false) {
  const K = kitchenLayout(W, H, floor, noWindow);
  const img = layer(`kitchen:${K.floorY}:${noWindow ? 0 : 1}`, W, H, dpr, (g) => paintKitchen(g, W, H, K));
  ctx.drawImage(img, -cam.x * 0.3, -cam.y * 0.3, W, H);
  if (!K.win) return K;
  drawWindowView(ctx, { ...K, win: { ...K.win, x: K.win.x - cam.x * 0.3, y: K.win.y - cam.y * 0.3 } }, t, cam);
  // Warm light from the window across the room.
  ctx.save();
  ctx.globalAlpha = 0.07 + 0.015 * Math.sin(t * 0.7);
  ctx.fillStyle = C.mustard;
  ctx.beginPath();
  ctx.moveTo(K.win.x - K.win.r * 0.6, K.win.y - K.win.r * 0.4);
  ctx.lineTo(K.win.x + K.win.r * 0.7, K.win.y + K.win.r * 0.5);
  ctx.lineTo(K.win.x + W * 0.55, K.floorY + 30);
  ctx.lineTo(K.win.x + W * 0.12, K.floorY + 30);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return K;
}

/** The clearing: sky, sun, hills, the cottage far off, trees; groundY where the grass begins. */
export function outdoorLayout(W, H, ground) {
  const portrait = H > W * 1.1;
  return { portrait, groundY: Math.round(ground ?? H * (portrait ? 0.8 : 0.78)) };
}

function paintOutdoors(g, W, H, O) {
  g.fillStyle = T.sky;
  g.fillRect(0, 0, W, H);
  circle(g, W * 0.82, H * 0.2, Math.min(W, H) * 0.08, T.mustardLight);
  // Far hills.
  g.fillStyle = T.greenPale;
  g.beginPath();
  g.moveTo(0, O.groundY - H * 0.12);
  g.quadraticCurveTo(W * 0.25, O.groundY - H * 0.32, W * 0.5, O.groundY - H * 0.16);
  g.quadraticCurveTo(W * 0.78, O.groundY - H * 0.36, W, O.groundY - H * 0.18);
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.closePath();
  g.fill();
  // The cottage on the far hill: cream walls, a red roof, a round window.
  const cx = W * 0.7;
  const cy = O.groundY - H * 0.27;
  const s = Math.min(W, H) * 0.06;
  g.fillStyle = C.cream;
  g.fillRect(cx - s, cy - s * 0.9, s * 2, s * 0.9);
  g.fillStyle = C.red;
  g.beginPath();
  g.moveTo(cx - s * 1.3, cy - s * 0.85);
  g.lineTo(cx, cy - s * 1.9);
  g.lineTo(cx + s * 1.3, cy - s * 0.85);
  g.closePath();
  g.fill();
  g.fillStyle = T.brownDark;
  g.fillRect(cx - s * 0.2, cy - s * 0.55, s * 0.4, s * 0.55);
  circle(g, cx + s * 0.6, cy - s * 0.55, s * 0.18, C.ink);
  // Middle trees.
  for (let i = 0; i < 9; i++) {
    const x = (i / 8) * W + ((i * 37) % 23) - 11;
    drawTree(g, x, O.groundY - H * 0.06, H * (0.2 + ((i * 13) % 7) * 0.012), i % 3 === 0 ? 1 : 0, T.greenLight, T.brownMid);
  }
  // Grass.
  g.fillStyle = C.green;
  g.fillRect(0, O.groundY, W, H - O.groundY);
  g.fillStyle = T.greenDark;
  g.fillRect(0, O.groundY, W, 5);
}

export function drawOutdoors(ctx, W, H, dpr, t, cam = { x: 0, y: 0 }, ground) {
  const O = outdoorLayout(W, H, ground);
  const img = layer(`outdoors:${O.groundY}`, W, H, dpr, (g) => paintOutdoors(g, W, H, O));
  ctx.drawImage(img, -cam.x * 0.3, -cam.y * 0.3, W, H);
  // A cloud drifting.
  ctx.save();
  ctx.fillStyle = T.paper;
  const cx = ((t * 12) % (W + 300)) - 150;
  const cy = H * 0.18;
  const r = Math.min(W, H) * 0.04;
  circle(ctx, cx, cy, r, T.paper);
  circle(ctx, cx + r * 1.1, cy - r * 0.3, r * 1.2, T.paper);
  circle(ctx, cx + r * 2.3, cy, r * 0.9, T.paper);
  ctx.restore();
  return O;
}

export function clearRoomCache() {
  cache.clear();
}

export { rr };
