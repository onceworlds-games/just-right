// Painted textures for the cottage, made once at load on canvases: floorboards, wallpapers over a wainscot, kitchen tiles,
// plaster, stone, shingles, grass and a dirt path. Seeded, so every screen paints the same house.
import * as THREE from 'three';
import { createRng } from '../core/rng.js';

function canvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return [cv, cv.getContext('2d')];
}

function tex(cv, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  return t;
}

const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k);
  return '#' + c.getHexString();
};

/** Speckle noise over a canvas region: soft paint grain. */
function grain(g, w, h, rng, { n = 4000, alpha = 0.05, size = 2, light = true, dark = true } = {}) {
  for (let i = 0; i < n; i++) {
    const x = rng.next() * w;
    const y = rng.next() * h;
    const s = size * (0.5 + rng.next());
    g.fillStyle = (rng.next() < 0.5 ? light : !dark) ? `rgba(255,248,230,${alpha})` : `rgba(40,20,10,${alpha})`;
    g.fillRect(x, y, s, s);
  }
}

/** Warm floorboards with grain, knots and dark gaps. */
export function floorTexture() {
  const [cv, g] = canvas(1024, 1024);
  const rng = createRng('floor');
  const rows = 8;
  const rh = 1024 / rows;
  const tones = ['#b97a45', '#c4864f', '#ad6f3e', '#bf8049', '#b47443'];
  for (let r = 0; r < rows; r++) {
    let x = -rng.range(0, 400);
    while (x < 1024) {
      const len = rng.range(320, 620);
      const base = rng.pick(tones);
      g.fillStyle = base;
      g.fillRect(x, r * rh, len, rh);
      // Grain lines.
      for (let k = 0; k < 9; k++) {
        g.strokeStyle = `rgba(80,40,15,${rng.range(0.05, 0.14)})`;
        g.lineWidth = rng.range(1, 2.5);
        g.beginPath();
        const y0 = r * rh + rng.range(6, rh - 6);
        g.moveTo(x, y0);
        for (let s = 0; s <= 8; s++) g.lineTo(x + (len * s) / 8, y0 + Math.sin(s * 1.3 + k) * rng.range(0.5, 3));
        g.stroke();
      }
      if (rng.chance(0.35)) {
        g.fillStyle = 'rgba(70,35,12,0.35)';
        g.beginPath();
        g.ellipse(x + rng.range(40, len - 40), r * rh + rng.range(20, rh - 20), rng.range(6, 12), rng.range(3, 6), 0, 0, Math.PI * 2);
        g.fill();
      }
      // Highlight along the top edge, gap at the end.
      g.fillStyle = 'rgba(255,220,170,0.18)';
      g.fillRect(x, r * rh + 2, len, 3);
      g.fillStyle = 'rgba(45,22,8,0.75)';
      g.fillRect(x + len - 3, r * rh, 3, rh);
      // Nails.
      g.fillStyle = 'rgba(40,25,15,0.6)';
      g.fillRect(x + 10, r * rh + 14, 4, 4);
      g.fillRect(x + 10, r * rh + rh - 18, 4, 4);
      x += len;
    }
    g.fillStyle = 'rgba(40,20,8,0.85)';
    g.fillRect(0, r * rh, 1024, 4);
  }
  grain(g, 1024, 1024, rng, { n: 6000, alpha: 0.05 });
  return tex(cv);
}

/** A room's back wall: wallpaper above a wooden wainscot, a picture rail and a skirting board. `kind` picks the paper. */
export function wallTexture(kind, w = 1024, h = 512) {
  const [cv, g] = canvas(w, h);
  const rng = createRng(`wall:${kind}`);
  const wains = Math.round(h * 0.36);
  const paper = {
    kitchen: ['#f1e2c4', '#e7d3ad'],
    dining: ['#e9c56f', '#dfb65c'],
    parlour: ['#b84a36', '#a8402e'],
    bedroom: ['#7e9fbf', '#7393b3'],
    plaster: ['#efe0c5', '#e6d4b4'],
  }[kind] ?? ['#efe0c5', '#e6d4b4'];
  g.fillStyle = paper[0];
  g.fillRect(0, 0, w, h);
  if (kind === 'kitchen') {
    // Tiles: cream with a blue checker band.
    const s = 32;
    for (let y = 0; y < h - wains; y += s)
      for (let x = 0; x < w; x += s) {
        g.fillStyle = (x / s + y / s) % 2 === 0 ? '#f4e8cf' : '#ecdcbc';
        g.fillRect(x + 1, y + 1, s - 2, s - 2);
      }
    g.fillStyle = '#4f79a8';
    for (let x = 0; x < w; x += s * 2) g.fillRect(x + 1, h - wains - s * 3 + 1, s - 2, s - 2);
    for (let x = s; x < w; x += s * 2) g.fillRect(x + 1, h - wains - s * 2 + 1, s - 2, s - 2);
  } else if (kind === 'dining') {
    // Mustard stripes with a thin cream pin line.
    for (let x = 0; x < w; x += 48) {
      g.fillStyle = paper[1];
      g.fillRect(x, 0, 24, h - wains);
      g.fillStyle = 'rgba(255,240,200,0.5)';
      g.fillRect(x + 34, 0, 3, h - wains);
    }
  } else if (kind === 'parlour') {
    // Red damask: little cream lozenges with a leaf.
    for (let y = 20; y < h - wains; y += 56)
      for (let x = (y / 56) % 2 ? 28 : 0; x < w + 28; x += 56) {
        g.fillStyle = 'rgba(255,214,170,0.22)';
        g.beginPath();
        g.moveTo(x, y - 14);
        g.quadraticCurveTo(x + 10, y, x, y + 14);
        g.quadraticCurveTo(x - 10, y, x, y - 14);
        g.fill();
        g.fillStyle = 'rgba(255,214,170,0.14)';
        g.beginPath();
        g.arc(x, y, 3, 0, Math.PI * 2);
        g.fill();
      }
  } else if (kind === 'bedroom') {
    // Blue with tiny white sprigs.
    for (let y = 16; y < h - wains; y += 40)
      for (let x = (y / 40) % 2 ? 20 : 0; x < w + 20; x += 40) {
        g.fillStyle = 'rgba(255,255,255,0.35)';
        for (let k = 0; k < 4; k++) {
          g.beginPath();
          g.arc(x + Math.cos((k * Math.PI) / 2) * 4, y + Math.sin((k * Math.PI) / 2) * 4, 2.6, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = 'rgba(242,179,61,0.6)';
        g.beginPath();
        g.arc(x, y, 2, 0, Math.PI * 2);
        g.fill();
      }
  }
  grain(g, w, h - wains, rng, { n: 2500, alpha: 0.04 });
  // A soft shadow under the picture rail and above the wainscot.
  const grad = g.createLinearGradient(0, h - wains - 40, 0, h - wains);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(40,20,10,0.18)');
  g.fillStyle = grad;
  g.fillRect(0, h - wains - 40, w, 40);
  // Wainscot: vertical boards.
  const wood = kind === 'parlour' ? '#6e3f24' : kind === 'bedroom' ? '#e9dcc4' : '#8a5530';
  g.fillStyle = wood;
  g.fillRect(0, h - wains, w, wains);
  for (let x = 0; x < w; x += 40) {
    g.fillStyle = shade(wood, rng.range(-0.04, 0.04));
    g.fillRect(x + 2, h - wains + 10, 36, wains - 30);
    g.fillStyle = 'rgba(30,15,5,0.35)';
    g.fillRect(x, h - wains, 2, wains);
  }
  grain(g, w, wains, rng, { n: 800, alpha: 0.05 });
  // Rail and skirting.
  g.fillStyle = shade(wood, -0.08);
  g.fillRect(0, h - wains - 6, w, 12);
  g.fillStyle = 'rgba(255,230,190,0.3)';
  g.fillRect(0, h - wains - 6, w, 3);
  g.fillStyle = shade(wood, -0.12);
  g.fillRect(0, h - 18, w, 18);
  return tex(cv, { repeat: [1, 1] });
}

/** Rough stone for the foundation and the hearth. */
export function stoneTexture() {
  const [cv, g] = canvas(512, 256);
  const rng = createRng('stone');
  g.fillStyle = '#6f675d';
  g.fillRect(0, 0, 512, 256);
  for (let r = 0; r < 5; r++) {
    let x = -rng.range(0, 60);
    while (x < 512) {
      const w = rng.range(50, 110);
      const y = r * 52 + rng.range(-3, 3);
      const tone = rng.range(-0.08, 0.08);
      g.fillStyle = shade('#b3a690', tone);
      g.beginPath();
      g.roundRect(x + 3, y + 3, w - 6, 46, 12);
      g.fill();
      g.fillStyle = 'rgba(255,245,220,0.25)';
      g.beginPath();
      g.roundRect(x + 6, y + 5, w - 14, 10, 6);
      g.fill();
      x += w;
    }
  }
  grain(g, 512, 256, rng, { n: 3000, alpha: 0.08 });
  return tex(cv);
}

/** Roof shingles, rounded, in rows. */
export function shingleTexture() {
  const [cv, g] = canvas(512, 512);
  const rng = createRng('shingles');
  g.fillStyle = '#5a2f22';
  g.fillRect(0, 0, 512, 512);
  const s = 32;
  for (let r = 0; r < 512 / s + 1; r++)
    for (let c = -1; c < 512 / s + 1; c++) {
      const x = c * s + (r % 2 ? s / 2 : 0);
      const y = r * s;
      g.fillStyle = shade('#a5492f', rng.range(-0.07, 0.05));
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + s - 2, y);
      g.lineTo(x + s - 2, y + s * 0.6);
      g.quadraticCurveTo(x + s / 2, y + s * 1.1, x, y + s * 0.6);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,220,180,0.15)';
      g.fillRect(x + 2, y + 2, s - 6, 3);
    }
  return tex(cv);
}

/** Grass seen from above: tufts and flecks over a warm green. */
export function grassTexture() {
  const [cv, g] = canvas(512, 512);
  const rng = createRng('grass');
  g.fillStyle = '#6f9a3c';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2200; i++) {
    const x = rng.next() * 512;
    const y = rng.next() * 512;
    const l = rng.range(4, 12);
    g.strokeStyle = rng.pick(['#5d8a30', '#7fae46', '#8bb84d', '#557f2a', '#9cc055']);
    g.lineWidth = rng.range(1, 2.2);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + rng.range(-3, 3), y - l);
    g.stroke();
  }
  for (let i = 0; i < 90; i++) {
    g.fillStyle = rng.pick(['rgba(255,240,180,0.5)', 'rgba(255,255,255,0.45)', 'rgba(242,179,61,0.55)']);
    g.beginPath();
    g.arc(rng.next() * 512, rng.next() * 512, rng.range(1.2, 2.4), 0, Math.PI * 2);
    g.fill();
  }
  return tex(cv);
}

/** A soft round blot (for light pools, contact shadows and sun patches), white on transparent. */
export function blotTexture() {
  const [cv, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A shaft of light (fades along its length and at its sides). */
export function shaftTexture() {
  const [cv, g] = canvas(64, 256);
  for (let y = 0; y < 256; y++) {
    const a = Math.sin((y / 256) * Math.PI) ** 1.5 * (1 - y / 300);
    const grad = g.createLinearGradient(0, 0, 64, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, `rgba(255,255,255,${a})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, y, 64, 1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Bunting flags: a strip of triangles. */
export function buntingTexture() {
  const [cv, g] = canvas(512, 64);
  const cols = ['#C8442F', '#F2B33D', '#3FA34D', '#5FA8D8', '#F7E8CB'];
  for (let i = 0; i < 8; i++) {
    g.fillStyle = cols[i % cols.length];
    g.beginPath();
    g.moveTo(i * 64 + 4, 4);
    g.lineTo(i * 64 + 60, 4);
    g.lineTo(i * 64 + 32, 60);
    g.closePath();
    g.fill();
  }
  g.fillStyle = '#F7E8CB';
  g.fillRect(0, 0, 512, 5);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A braided rag rug: rings of colour with a stitched look, on transparent (an oval when stretched). */
export function rugTexture(colors, seed = 'rug') {
  const [cv, g] = canvas(512, 512);
  const rng = createRng(seed);
  const rings = 11;
  for (let i = 0; i < rings; i++) {
    const r = 250 - i * (230 / rings);
    const col = colors[i % colors.length];
    g.fillStyle = col;
    g.beginPath();
    g.arc(256, 256, r, 0, Math.PI * 2);
    g.fill();
    // Braid: little slanted marks round the ring.
    const n = Math.round(r * 0.55);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const rr = r - 230 / rings / 2;
      g.save();
      g.translate(256 + Math.cos(a) * rr, 256 + Math.sin(a) * rr);
      g.rotate(a + 0.7);
      g.fillStyle = k % 2 ? 'rgba(255,240,215,0.16)' : 'rgba(40,20,10,0.16)';
      g.fillRect(-5, -2, 10, 4);
      g.restore();
    }
    g.strokeStyle = 'rgba(30,15,5,0.35)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(256, 256, r, 0, Math.PI * 2);
    g.stroke();
  }
  grain(g, 512, 512, rng, { n: 1500, alpha: 0.05 });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
