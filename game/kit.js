// The picture book's kit: the palette, the type, flat shapes with offset shadows, the red rubber stamp, Goldilocks, the three
// bears, the woodland folk and the players' faces. Everything is drawn in code with the canvas 2D API.

export const C = {
  cream: '#F3E3C3',
  ink: '#1E2747',
  red: '#D2452B',
  mustard: '#E8A92E',
  green: '#2F7A4E',
  blue: '#4C8DC9',
  brown: '#7B4A2B',
};

/** Tints and shades of the palette. */
export const T = {
  paper: '#FAF0DC',
  creamDark: '#E4CB9E',
  wall: '#EED8AE',
  wallDot: '#E2C690',
  wainscot: '#A8653B',
  wainscotDark: '#8E5230',
  floor: '#9A5B35',
  floorDark: '#7E4728',
  beam: '#5E3820',
  skin: '#F4C6A0',
  skinShade: '#E3A57C',
  cheek: '#E98B74',
  brownDark: '#55301A',
  brownMid: '#94603A',
  brownLight: '#B98157',
  mustardDark: '#C6871A',
  mustardLight: '#F4CB6A',
  greenDark: '#1F5A37',
  greenLight: '#5C9E6E',
  greenPale: '#9CC79C',
  redDark: '#A3321D',
  redLight: '#E9765C',
  blueDark: '#2E6299',
  bluePale: '#BCD6EC',
  inkSoft: 'rgba(30,39,71,0.18)',
  shadow: 'rgba(30,39,71,0.22)',
  sky: '#F6E7C4',
};

export const FONT_DISPLAY = '"Fraunces", Georgia, "Times New Roman", serif';
export const FONT_LABEL = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
export const font = (weight, size, family = FONT_DISPLAY) => `${weight} ${Math.round(size)}px ${family}`;

/** Waits for the game's two faces (at most `ms`), so canvas text never draws in a fallback first. */
export async function loadFonts(ms = 1500) {
  try {
    if (!document.fonts || !document.fonts.load) return;
    const all = Promise.all([
      document.fonts.load(`900 40px "Fraunces"`),
      document.fonts.load(`700 40px "Fraunces"`),
      document.fonts.load(`800 40px "Barlow Condensed"`),
      document.fonts.load(`700 40px "Barlow Condensed"`),
    ]);
    await Promise.race([all, new Promise((r) => setTimeout(r, ms))]);
  } catch {}
}

// ---------------------------------------------------------------- shapes

export function rr(ctx, x, y, w, h, r) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

export function circle(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

export function ellipse(ctx, x, y, rx, ry, fill, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

/** Fill the current path's shape twice: an offset flat shadow, then the colour. */
export function withShadow(ctx, path, fill, dx = 4, dy = 5, shade = T.shadow) {
  ctx.save();
  ctx.translate(dx, dy);
  path();
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.restore();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** An ink outline on the current path. */
export function inkLine(ctx, w = 3, color = C.ink) {
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Text with a thick outline, readable over any scene. */
export function outlined(ctx, text, x, y, { size = 32, weight = 900, family = FONT_DISPLAY, fill = C.ink, stroke = C.cream, lw = 0, align = 'center', baseline = 'middle', maxWidth } = {}) {
  ctx.font = font(weight, size, family);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const w = lw || Math.max(3, size * 0.16);
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  if (stroke) {
    ctx.lineWidth = w;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y, maxWidth);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y, maxWidth);
}

/** Fit text into a width by shrinking it. */
export function fitSize(ctx, text, size, maxWidth, weight = 900, family = FONT_DISPLAY) {
  ctx.font = font(weight, size, family);
  const w = ctx.measureText(text).width;
  return w > maxWidth ? Math.max(10, Math.floor((size * maxWidth) / w)) : size;
}

const hashOf = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

// ---------------------------------------------------------------- the stamp

const stampCache = new Map();

/** The red rubber stamp: double ruled, condensed capitals, an inked edge. Cached per text, size and colour. */
function stampCanvas(text, size, color, dpr) {
  const key = `${text}|${size}|${color}|${dpr}`;
  let c = stampCache.get(key);
  if (c) return c;
  if (stampCache.size > 80) stampCache.clear();
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font(800, size, FONT_LABEL);
  const tw = probe.measureText(text).width;
  const padX = size * 0.5;
  const padY = size * 0.3;
  const w = Math.ceil(tw + padX * 2);
  const h = Math.ceil(size * 1.05 + padY * 2);
  c = document.createElement('canvas');
  c.width = Math.ceil(w * dpr) + 4;
  c.height = Math.ceil(h * dpr) + 4;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.translate(1, 1);
  const lw = Math.max(2.5, size * 0.09);
  rr(g, lw / 2, lw / 2, w - lw, h - lw, size * 0.22);
  g.lineWidth = lw;
  g.strokeStyle = color;
  g.stroke();
  const inset = lw * 2.1;
  rr(g, inset, inset, w - inset * 2, h - inset * 2, size * 0.14);
  g.lineWidth = Math.max(1, lw * 0.38);
  g.stroke();
  g.fillStyle = color;
  g.font = font(800, size, FONT_LABEL);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + size * 0.04);
  // The ink: little bare specks where the rubber didn't take.
  g.globalCompositeOperation = 'destination-out';
  let s = hashOf(text);
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const specks = Math.round((w * h) / (size * 2.2));
  for (let i = 0; i < specks; i++) {
    g.globalAlpha = 0.35 + rnd() * 0.65;
    circle(g, rnd() * w, rnd() * h, size * (0.015 + rnd() * 0.045));
    g.fill();
  }
  g.globalAlpha = 1;
  c.cssW = w + 2;
  c.cssH = h + 2;
  stampCache.set(key, c);
  return c;
}

export function drawStamp(ctx, text, x, y, size, { rot = -0.12, color = C.red, alpha = 0.95, scale = 1, dpr = 2 } = {}) {
  if (scale <= 0 || alpha <= 0) return;
  const c = stampCanvas(text, Math.round(size), color, Math.min(3, Math.max(1, Math.round(dpr))));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(c, -c.cssW / 2, -c.cssH / 2, c.cssW, c.cssH);
  ctx.restore();
}

export const stampSize = (text, size) => {
  try {
    const c = stampCanvas(text, Math.round(size), C.red, 1);
    return { w: c.cssW, h: c.cssH };
  } catch {
    return { w: size * text.length * 0.5, h: size * 1.6 };
  }
};

// ---------------------------------------------------------------- Goldilocks

/**
 * Goldilocks, hip at (x, y), about 125 units tall at s = 1 (head top at -125, feet at +45 standing).
 * o: { crouch 0..1, armL, armR (radians from hanging down, + forward), legs (radians, + forward), lean, face, look, flip }
 */
export function drawGirl(ctx, x, y, s, o = {}) {
  const crouch = o.crouch ?? 0;
  const armL = o.armL ?? 0.15;
  const armR = o.armR ?? -0.15;
  const legs = o.legs ?? 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * (o.flip ? -1 : 1), s);
  ctx.rotate(o.lean ?? 0);
  const limb = (x0, y0, ang, len, wid, color, end) => {
    ctx.save();
    ctx.translate(x0, y0);
    ctx.rotate(-ang);
    rr(ctx, -wid / 2, 0, wid, len, wid / 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (end) end(len);
    ctx.restore();
  };
  // Legs: thighs, then shins; crouching folds them forward.
  const leg = (side) => {
    const hx = side * 7;
    ctx.save();
    ctx.translate(hx, -2);
    ctx.rotate(-(legs + crouch * 1.35) * (side > 0 ? 1 : 0.92));
    rr(ctx, -6, 0, 12, 24, 6);
    ctx.fillStyle = T.skin;
    ctx.fill();
    ctx.translate(0, 22);
    ctx.rotate(crouch * 1.45);
    rr(ctx, -5.5, 0, 11, 24, 5.5);
    ctx.fill();
    // Shoe
    ellipse(ctx, 3, 25, 9, 6, C.red);
    ctx.restore();
  };
  leg(-1);
  limb(-13, -44, armL, 34, 10, T.skin, (len) => circle(ctx, 0, len, 6.5, T.skin));
  // Sleeves of the blouse over the shoulders.
  // Torso: the ink-blue pinafore over a cream blouse.
  ctx.beginPath();
  ctx.moveTo(-14, -50);
  ctx.lineTo(14, -50);
  ctx.lineTo(22, 4);
  ctx.quadraticCurveTo(0, 9, -22, 4);
  ctx.closePath();
  ctx.fillStyle = C.ink;
  ctx.fill();
  rr(ctx, -9, -50, 18, 12, 4);
  ctx.fillStyle = C.cream;
  ctx.fill();
  // Pinafore pocket and a mustard button.
  circle(ctx, 0, -32, 2.6, C.mustard);
  rr(ctx, -8, -16, 16, 11, 3);
  ctx.fillStyle = 'rgba(243,227,195,0.18)';
  ctx.fill();
  leg(1);
  limb(13, -44, armR, 34, 10, T.skin, (len) => circle(ctx, 0, len, 6.5, T.skin));
  // Sleeves
  ellipse(ctx, -14, -45, 7, 6, C.cream);
  ellipse(ctx, 14, -45, 7, 6, C.cream);
  drawGirlHead(ctx, 0, -72, 1, o);
  ctx.restore();
}

/** Her head alone, centred at (x, y), radius 22 × s. */
export function drawGirlHead(ctx, x, y, s, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const look = o.look ?? 0;
  // Curls behind.
  const curls = [[-20, -4, 12], [20, -4, 12], [-22, 10, 10], [22, 10, 10], [-17, 22, 9], [17, 22, 9], [-12, -18, 12], [12, -18, 12], [0, -22, 13]];
  for (const [cx, cy, r] of curls) circle(ctx, cx, cy, r, C.mustard);
  for (const [cx, cy, r] of curls) circle(ctx, cx + 1.5, cy + 2, r * 0.45, T.mustardDark);
  circle(ctx, 0, 0, 19, T.skin);
  // Fringe.
  ctx.beginPath();
  ctx.moveTo(-19, -2);
  ctx.quadraticCurveTo(-14, -22, 2, -20);
  ctx.quadraticCurveTo(16, -22, 19, -4);
  ctx.quadraticCurveTo(10, -12, 2, -9);
  ctx.quadraticCurveTo(-8, -13, -19, -2);
  ctx.fillStyle = C.mustard;
  ctx.fill();
  // Face.
  const face = o.face ?? 'smile';
  ctx.fillStyle = C.ink;
  if (face === 'oops' || face === 'shock') {
    circle(ctx, -7 + look, 1, 3.2, C.ink);
    circle(ctx, 7 + look, 1, 3.2, C.ink);
    ellipse(ctx, look, 11, 3.5, 4.5, C.ink);
  } else if (face === 'blow') {
    rr(ctx, -10 + look, 0, 6, 2.4, 1.2);
    ctx.fill();
    rr(ctx, 4 + look, 0, 6, 2.4, 1.2);
    ctx.fill();
    circle(ctx, -13, 9, 6.5, T.cheek);
    circle(ctx, 13, 9, 6.5, T.cheek);
    circle(ctx, look + 2, 11, 3, C.ink);
  } else if (face === 'focus') {
    circle(ctx, -7 + look, 1, 2.4, C.ink);
    circle(ctx, 7 + look, 1, 2.4, C.ink);
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(-4 + look, 11);
    ctx.lineTo(4 + look, 11);
    ctx.stroke();
  } else {
    circle(ctx, -7 + look, 1, 2.5, C.ink);
    circle(ctx, 7 + look, 1, 2.5, C.ink);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.arc(look, 7, face === 'cheer' ? 6 : 4.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  if (face !== 'blow') {
    ctx.globalAlpha = 0.55;
    circle(ctx, -12, 7, 4, T.cheek);
    circle(ctx, 12, 7, 4, T.cheek);
    ctx.globalAlpha = 1;
  }
  // A red ribbon.
  ctx.save();
  ctx.translate(13, -16);
  ctx.rotate(0.4);
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-8, -5);
  ctx.lineTo(-8, 5);
  ctx.closePath();
  ctx.moveTo(0, 0);
  ctx.lineTo(8, -5);
  ctx.lineTo(8, 5);
  ctx.closePath();
  ctx.fill();
  circle(ctx, 0, 0, 2.5, T.redDark);
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- the three bears

const BEAR = {
  papa: { fur: T.brownDark, light: '#7A4A2C', size: 1.25 },
  mama: { fur: '#8A5532', light: '#A86D45', size: 1.0 },
  baby: { fur: '#A66F43', light: '#C08A5C', size: 0.72 },
};

/** A bear's head, centred at (x, y), radius r. expr: 'grump' | 'sweet' | 'sleepy' | 'shock' | 'roar' */
export function drawBearHead(ctx, kind, x, y, r, expr) {
  const b = BEAR[kind] ?? BEAR.mama;
  const e = expr ?? (kind === 'papa' ? 'grump' : kind === 'baby' ? 'sleepy' : 'sweet');
  ctx.save();
  ctx.translate(x, y);
  const k = r / 30;
  ctx.scale(k, k);
  circle(ctx, -22, -22, 11, b.fur);
  circle(ctx, 22, -22, 11, b.fur);
  circle(ctx, -22, -22, 5.5, b.light);
  circle(ctx, 22, -22, 5.5, b.light);
  circle(ctx, 0, 0, 30, b.fur);
  ellipse(ctx, 0, 11, 15, 11.5, C.cream);
  ellipse(ctx, 0, 4, 6.5, 4.5, C.ink);
  ctx.fillStyle = C.ink;
  ctx.strokeStyle = C.ink;
  ctx.lineCap = 'round';
  if (e === 'sleepy') {
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(-11, -6, 4.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.moveTo(15.5, -6);
    ctx.arc(11, -6, 4.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (e === 'shock') {
    circle(ctx, -11, -7, 4.6, C.cream);
    circle(ctx, 11, -7, 4.6, C.cream);
    circle(ctx, -11, -7, 2.4, C.ink);
    circle(ctx, 11, -7, 2.4, C.ink);
  } else {
    circle(ctx, -11, -7, 3.4, C.ink);
    circle(ctx, 11, -7, 3.4, C.ink);
  }
  if (e === 'grump' || e === 'roar') {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-18, -17);
    ctx.lineTo(-5, -12);
    ctx.moveTo(18, -17);
    ctx.lineTo(5, -12);
    ctx.stroke();
  }
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  if (e === 'roar' || e === 'shock') {
    ellipse(ctx, 0, 16, 6, e === 'roar' ? 6 : 4, C.ink);
  } else if (e === 'grump') {
    ctx.moveTo(-6, 18);
    ctx.quadraticCurveTo(0, 14, 6, 18);
    ctx.stroke();
  } else {
    ctx.moveTo(-6, 14);
    ctx.quadraticCurveTo(0, 20, 6, 14);
    ctx.stroke();
  }
  if (kind === 'mama') {
    // A mustard headscarf knot.
    ctx.fillStyle = C.mustard;
    ctx.beginPath();
    ctx.moveTo(-30, -8);
    ctx.quadraticCurveTo(0, -42, 30, -8);
    ctx.quadraticCurveTo(0, -24, -30, -8);
    ctx.fill();
  }
  if (kind === 'papa') {
    // A green flat cap.
    ctx.fillStyle = C.green;
    ctx.beginPath();
    ctx.moveTo(-27, -16);
    ctx.quadraticCurveTo(-4, -44, 26, -20);
    ctx.lineTo(34, -14);
    ctx.quadraticCurveTo(4, -20, -27, -16);
    ctx.fill();
  }
  ctx.restore();
}

/** A whole bear standing, feet at (x, y), base size s (Papa is biggest). o: { walk (phase), expr, wave, flip } */
export function drawBear(ctx, kind, x, y, s, o = {}) {
  const b = BEAR[kind] ?? BEAR.mama;
  const k = s * b.size;
  const step = Math.sin(o.walk ?? 0);
  const bob = o.walk !== undefined ? Math.abs(Math.cos(o.walk ?? 0)) * 3 : 0;
  ctx.save();
  ctx.translate(x, y - bob * k);
  ctx.scale(k * (o.flip ? -1 : 1), k);
  // Shadow
  ellipse(ctx, 0, 2 + bob, 42, 7, T.shadow);
  // Legs
  rr(ctx, -26 + step * 5, -46, 22, 48, 10);
  ctx.fillStyle = b.fur;
  ctx.fill();
  rr(ctx, 4 - step * 5, -46, 22, 48, 10);
  ctx.fill();
  // Body
  ellipse(ctx, 0, -86, 40, 52, b.fur);
  if (kind === 'baby') {
    rr(ctx, -28, -92, 56, 56, 16);
    ctx.fillStyle = C.red;
    ctx.fill();
    rr(ctx, -20, -120, 7, 34, 3);
    ctx.fill();
    rr(ctx, 13, -120, 7, 34, 3);
    ctx.fill();
    circle(ctx, -16, -90, 3, C.mustard);
    circle(ctx, 16, -90, 3, C.mustard);
  } else {
    ellipse(ctx, 0, -78, 24, 32, b.light);
  }
  if (kind === 'mama') {
    rr(ctx, -24, -96, 48, 58, 10);
    ctx.fillStyle = C.cream;
    ctx.fill();
    rr(ctx, -24, -46, 48, 8, 4);
    ctx.fillStyle = C.red;
    ctx.fill();
  }
  if (kind === 'papa') {
    // Braces.
    ctx.fillStyle = C.green;
    rr(ctx, -22, -132, 7, 80, 3);
    ctx.fill();
    rr(ctx, 15, -132, 7, 80, 3);
    ctx.fill();
  }
  // Arms
  const wave = o.wave ? Math.sin(o.wave) * 0.4 - 1.9 : 0.2 - step * 0.25;
  ctx.save();
  ctx.translate(-36, -118);
  ctx.rotate(0.25 + step * 0.25);
  rr(ctx, -10, 0, 20, 52, 10);
  ctx.fillStyle = b.fur;
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(36, -118);
  ctx.rotate(-wave);
  rr(ctx, -10, 0, 20, 52, 10);
  ctx.fillStyle = b.fur;
  ctx.fill();
  ctx.restore();
  drawBearHead(ctx, kind, 0, -150, 34, o.expr);
  ctx.restore();
}

// ---------------------------------------------------------------- the woodland folk

const FOLK_LOOK = {
  owl: { disc: C.green },
  fox: { disc: C.mustard },
  crow: { disc: C.blue },
  hare: { disc: C.red },
  squirrel: { disc: T.greenLight },
  hedgehog: { disc: C.blue },
  badger: { disc: C.mustard },
  mole: { disc: T.redLight },
};

/** A woodland rival's face in a disc of radius r. */
export function drawAnimal(ctx, animal, x, y, r) {
  const look = FOLK_LOOK[animal] ?? FOLK_LOOK.owl;
  ctx.save();
  ctx.translate(x, y);
  circle(ctx, 0, 0, r, look.disc);
  ctx.save();
  circle(ctx, 0, 0, r);
  ctx.clip();
  const k = r / 30;
  ctx.scale(k, k);
  const eyes = (dx, yy, rad = 3) => {
    circle(ctx, -dx, yy, rad, C.ink);
    circle(ctx, dx, yy, rad, C.ink);
  };
  switch (animal) {
    case 'owl':
      ellipse(ctx, 0, 6, 22, 26, T.brownMid);
      ctx.fillStyle = T.brownMid;
      ctx.beginPath();
      ctx.moveTo(-20, -8);
      ctx.lineTo(-17, -26);
      ctx.lineTo(-6, -14);
      ctx.moveTo(20, -8);
      ctx.lineTo(17, -26);
      ctx.lineTo(6, -14);
      ctx.fill();
      circle(ctx, -9, 0, 9, C.cream);
      circle(ctx, 9, 0, 9, C.cream);
      circle(ctx, -9, 0, 4.5, C.ink);
      circle(ctx, 9, 0, 4.5, C.ink);
      ctx.fillStyle = C.mustard;
      ctx.beginPath();
      ctx.moveTo(-4, 8);
      ctx.lineTo(4, 8);
      ctx.lineTo(0, 16);
      ctx.fill();
      break;
    case 'fox':
      ctx.fillStyle = C.red;
      ctx.beginPath();
      ctx.moveTo(-24, -24);
      ctx.lineTo(-8, -12);
      ctx.lineTo(8, -12);
      ctx.lineTo(24, -24);
      ctx.lineTo(22, 4);
      ctx.lineTo(0, 24);
      ctx.lineTo(-22, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = C.cream;
      ctx.beginPath();
      ctx.moveTo(-22, 4);
      ctx.lineTo(-8, 6);
      ctx.lineTo(0, 24);
      ctx.lineTo(8, 6);
      ctx.lineTo(22, 4);
      ctx.lineTo(0, 30);
      ctx.closePath();
      ctx.fill();
      eyes(9, -2, 2.8);
      circle(ctx, 0, 22, 3.2, C.ink);
      break;
    case 'crow':
      circle(ctx, 0, 4, 22, C.ink);
      ctx.fillStyle = C.mustard;
      ctx.beginPath();
      ctx.moveTo(-2, 4);
      ctx.lineTo(24, 10);
      ctx.lineTo(-2, 16);
      ctx.fill();
      circle(ctx, -7, -3, 4.5, C.cream);
      circle(ctx, -6, -3, 2.2, C.ink);
      break;
    case 'hare':
      ellipse(ctx, -9, -24, 6, 18, T.creamDark, -0.15);
      ellipse(ctx, 9, -24, 6, 18, T.creamDark, 0.15);
      ellipse(ctx, -9, -24, 2.5, 12, T.redLight, -0.15);
      ellipse(ctx, 9, -24, 2.5, 12, T.redLight, 0.15);
      ellipse(ctx, 0, 8, 20, 19, T.creamDark);
      eyes(8, 3, 2.8);
      circle(ctx, 0, 13, 2.6, T.redDark);
      break;
    case 'squirrel':
      ctx.fillStyle = T.brownLight;
      ctx.beginPath();
      ctx.moveTo(-18, -6);
      ctx.lineTo(-16, -28);
      ctx.lineTo(-6, -12);
      ctx.moveTo(18, -6);
      ctx.lineTo(16, -28);
      ctx.lineTo(6, -12);
      ctx.fill();
      circle(ctx, 0, 6, 20, T.brownLight);
      ellipse(ctx, 0, 14, 11, 9, C.cream);
      eyes(8, 0, 3);
      circle(ctx, 0, 10, 2.4, C.ink);
      break;
    case 'hedgehog':
      ctx.fillStyle = T.brownDark;
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14 + 6);
        ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30 + 6);
        ctx.lineTo(Math.cos(a + 0.3) * 14, Math.sin(a + 0.3) * 14 + 6);
        ctx.fill();
      }
      circle(ctx, 0, 6, 20, T.brownDark);
      ellipse(ctx, 0, 12, 14, 13, T.creamDark);
      eyes(6, 6, 2.4);
      circle(ctx, 0, 17, 3, C.ink);
      break;
    case 'badger':
      circle(ctx, 0, 6, 22, C.ink);
      ctx.fillStyle = C.cream;
      ctx.beginPath();
      ctx.ellipse(0, 4, 6, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ellipse(ctx, -13, 2, 5, 7, C.cream);
      ellipse(ctx, 13, 2, 5, 7, C.cream);
      circle(ctx, -13, 3, 2.4, C.ink);
      circle(ctx, 13, 3, 2.4, C.ink);
      circle(ctx, 0, 24, 3.2, C.ink);
      break;
    case 'mole':
      circle(ctx, 0, 8, 22, '#5B4A5E');
      ellipse(ctx, 0, 16, 8, 6, T.redLight);
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(-5, 2);
      ctx.lineTo(-11, 2);
      ctx.moveTo(5, 2);
      ctx.lineTo(11, 2);
      ctx.stroke();
      // Little round spectacles.
      ctx.beginPath();
      ctx.arc(-8, 2, 5, 0, Math.PI * 2);
      ctx.moveTo(13, 2);
      ctx.arc(8, 2, 5, 0, Math.PI * 2);
      ctx.strokeStyle = C.mustard;
      ctx.stroke();
      break;
    default:
      break;
  }
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- players' faces

/**
 * A seat's face in a disc: the player's avatar head (an Image), a woodland animal for a bot, or an initial on a coloured disc.
 * o: { ring (colour), ringW, me (a mustard ring), dim }
 */
export function drawFace(ctx, who, x, y, r, o = {}) {
  ctx.save();
  if (o.dim) ctx.globalAlpha *= 0.45;
  if (o.shadow !== false) circle(ctx, x + r * 0.08, y + r * 0.12, r, T.shadow);
  if (who?.animal) drawAnimal(ctx, who.animal, x, y, r);
  else {
    circle(ctx, x, y, r, who?.color ?? C.blue);
    const img = who?.img;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      circle(ctx, x, y, r);
      ctx.clip();
      // The headshot is square; the face sits a little high in it.
      ctx.drawImage(img, x - r * 1.08, y - r * 1.02, r * 2.16, r * 2.16);
      ctx.restore();
    } else {
      ctx.fillStyle = C.cream;
      ctx.font = font(900, r * 1.1);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((who?.name ?? '?').trim().charAt(0).toUpperCase() || '?', x, y + r * 0.06);
    }
  }
  ctx.lineWidth = o.ringW ?? Math.max(2, r * 0.12);
  ctx.strokeStyle = o.me ? C.mustard : (o.ring ?? C.ink);
  circle(ctx, x, y, r);
  ctx.stroke();
  if (o.me) {
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.strokeStyle = C.ink;
    circle(ctx, x, y, r + (o.ringW ?? Math.max(2, r * 0.12)) / 2 + 1);
    ctx.stroke();
  }
  ctx.restore();
}

/** Seat colours for the storybook bodies at the table and on the podium. */
export const SEAT_COLORS = [C.blue, C.green, C.red, C.mustard, T.brownMid, '#6E4A7E', T.greenLight, T.blueDark];

/** A small storybook body (sitting), the face on top. */
export function drawSitter(ctx, who, x, y, s, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  const k = s;
  const body = o.color ?? C.blue;
  rr(ctx, -16 * k, -6 * k, 32 * k, 30 * k, 12 * k);
  ctx.fillStyle = body;
  ctx.fill();
  rr(ctx, -20 * k, 4 * k, 9 * k, 22 * k, 4.5 * k);
  ctx.fill();
  rr(ctx, 11 * k, 4 * k, 9 * k, 22 * k, 4.5 * k);
  ctx.fill();
  ctx.restore();
  drawFace(ctx, who, x, y - 20 * s, 18 * s, o);
}

// ---------------------------------------------------------------- props

/** A wooden sign hanging from two ropes (score, labels). */
export function drawSign(ctx, x, y, w, h, { ropes = 16, color = T.brownMid } = {}) {
  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = T.brownDark;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.2, y - ropes);
  ctx.lineTo(x + w * 0.22, y + 4);
  ctx.moveTo(x + w * 0.8, y - ropes);
  ctx.lineTo(x + w * 0.78, y + 4);
  ctx.stroke();
  withShadow(ctx, () => rr(ctx, x, y, w, h, 8), color, 3, 4);
  rr(ctx, x + 4, y + 4, w - 8, h - 8, 6);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(85,48,26,0.45)';
  ctx.stroke();
  circle(ctx, x + w * 0.22, y + 6, 2.5, T.brownDark);
  circle(ctx, x + w * 0.78, y + 6, 2.5, T.brownDark);
  ctx.restore();
}

/** A lollipop tree (round crown) or a triangle tree, base at (x, y). */
export function drawTree(ctx, x, y, h, kind = 0, color = C.green, trunk = T.brownDark) {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - h * 0.035, y - h * 0.4, h * 0.07, h * 0.4);
  if (kind === 0) {
    circle(ctx, x, y - h * 0.62, h * 0.3, color);
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + h * 0.26, y - h * 0.28);
    ctx.lineTo(x - h * 0.26, y - h * 0.28);
    ctx.closePath();
    ctx.fill();
  }
}
