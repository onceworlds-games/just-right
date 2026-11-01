// The things that move on the pages, made in code so they can bend, fill, split and break: pots, bowls, a glass of milk, a
// layered cake that cuts where the knife falls, a pillow that fluffs, a balloon, a chair that comes apart, toast that browns,
// a pump, a rope, a striker and a honey jar.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PAL } from '../gfx/palette.js';

class RoundedBox extends RoundedBoxGeometry {
  constructor(w, h, d, r) {
    super(w, h, d, 2, r);
  }
}

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.6, metalness: o.m ?? 0, ...o.extra });
export const shadowed = (o) => {
  o.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return o;
};

/** A turned profile (pot, bowl, jar, glass): points [r, y] from the bottom up. */
function lathe(points, mat, segs = 32) {
  const g = new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segs,
  );
  return new THREE.Mesh(g, mat);
}

/** A cast-iron pot with a porridge surface that rises, bubbles and goes from cold blue-grey to warm cream to angry orange. */
export function makePot() {
  const g = new THREE.Group();
  const iron = std('#2c2a2e', { r: 0.45, m: 0.6 });
  const body = lathe(
    [
      [0.0, 0.0],
      [0.2, 0.0],
      [0.25, 0.04],
      [0.27, 0.2],
      [0.26, 0.27],
      [0.28, 0.28],
      [0.28, 0.3],
      [0.25, 0.3],
      [0.24, 0.27],
      [0.235, 0.05],
      [0.0, 0.05],
    ],
    iron,
  );
  body.material.side = THREE.DoubleSide;
  g.add(body);
  for (const s of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 8, 16, Math.PI), iron);
    handle.position.set(s * 0.29, 0.25, 0);
    handle.rotation.set(0, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI / 2);
    g.add(handle);
  }
  const porridgeMat = std('#efe0c0', { r: 0.5 });
  const surf = new THREE.Mesh(new THREE.CircleGeometry(0.236, 32), porridgeMat);
  surf.rotation.x = -Math.PI / 2;
  surf.position.y = 0.2;
  g.add(surf);
  // Bubbles: little domes that swell and pop on the surface.
  const bubbles = [];
  const bubbleMat = std('#f6e9cc', { r: 0.35 });
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), bubbleMat);
    const a = (i / 9) * Math.PI * 2 + i;
    const r = 0.05 + (i % 3) * 0.06;
    b.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r);
    b.userData.phase = i * 0.37;
    b.scale.setScalar(0.001);
    g.add(b);
    bubbles.push(b);
  }
  // The boil-over: a foam ring that rises over the rim.
  const foam = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.05, 10, 32), std('#f8efdc', { r: 0.4 }));
  foam.rotation.x = Math.PI / 2;
  foam.position.y = 0.3;
  foam.scale.setScalar(0.001);
  g.add(foam);
  const cold = new THREE.Color('#b9c8d6');
  const warm = new THREE.Color('#f2dfb6');
  const hot = new THREE.Color('#f0a34a');
  const tmp = new THREE.Color();
  return {
    group: shadowed(g),
    surf,
    /** heat 0..1, boil 0..1 (rolling boil), over 0..1 (foam out of the pot), t seconds */
    update(heat, boil, over, t) {
      if (heat < 0.5) tmp.copy(cold).lerp(warm, heat / 0.5);
      else tmp.copy(warm).lerp(hot, Math.min(1, (heat - 0.5) / 0.5) * 0.6);
      porridgeMat.color.copy(tmp);
      porridgeMat.emissive = porridgeMat.emissive || new THREE.Color();
      porridgeMat.emissive.setRGB(heat * 0.08, heat * 0.03, 0);
      surf.position.y = 0.2 + boil * 0.02 + over * 0.08 + Math.sin(t * 20) * 0.003 * boil;
      for (const b of bubbles) {
        const p = (t * (0.8 + boil * 2.2) + b.userData.phase) % 1;
        const s = boil > 0.05 ? Math.sin(p * Math.PI) * (0.5 + boil * 1.2) : 0;
        b.scale.setScalar(Math.max(0.001, s));
        b.position.y = surf.position.y;
      }
      foam.scale.setScalar(Math.max(0.001, over));
      foam.position.y = 0.29 + over * 0.03;
    },
  };
}

/** A wooden bowl with porridge in it (for the table and the boss). */
export function makeBowl(r = 0.14, color = '#b06a35') {
  const g = new THREE.Group();
  const wood = std(color, { r: 0.55 });
  const body = lathe(
    [
      [0.0, 0.0],
      [r * 0.55, 0.0],
      [r * 0.6, 0.012],
      [r * 0.92, r * 0.35],
      [r, r * 0.62],
      [r * 0.92, r * 0.64],
      [r * 0.84, r * 0.4],
      [r * 0.5, r * 0.12],
      [0.0, r * 0.12],
    ],
    wood,
  );
  g.add(body);
  const porridge = new THREE.Mesh(new THREE.CircleGeometry(r * 0.86, 24), std('#efe0c0', { r: 0.5 }));
  porridge.rotation.x = -Math.PI / 2;
  porridge.position.y = r * 0.48;
  g.add(porridge);
  return { group: shadowed(g), porridge };
}

/** A tall glass with milk that rises, and a fill band painted on it. */
export function makeGlass() {
  const g = new THREE.Group();
  const H = 0.36;
  const R = 0.085;
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#eaf6ff', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1 });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.86, H, 32, 1, true), glassMat);
  glass.position.y = H / 2;
  glass.renderOrder = 4;
  g.add(glass);
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.86, R * 0.86, 0.02, 32), glassMat);
  bottom.position.y = 0.01;
  g.add(bottom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.004, 6, 32), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = H;
  g.add(rim);
  const milkMat = std('#fbf8f2', { r: 0.35 });
  const milk = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.93, R * 0.84, 1, 32), milkMat);
  milk.geometry.translate(0, 0.5, 0);
  milk.position.y = 0.02;
  g.add(milk);
  // The just-right band: a green painted ring with a gold line.
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.003, R + 0.003, 1, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#58c95a', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
  band.renderOrder = 5;
  g.add(band);
  const line = new THREE.Mesh(new THREE.TorusGeometry(R + 0.004, 0.003, 6, 32), new THREE.MeshBasicMaterial({ color: PAL.gold }));
  line.rotation.x = Math.PI / 2;
  g.add(line);
  const inner = 0.02;
  const usable = H - 0.04;
  return {
    group: g,
    H,
    /** level 0..1 (of the usable height), band centre and half-width */
    set(level, c, w) {
      milk.scale.y = Math.max(0.0001, Math.min(1, level) * usable);
      band.position.y = inner + c * usable;
      band.scale.y = Math.max(0.002, 2 * w * usable);
      line.position.y = inner + c * usable;
    },
    surfaceY: (level) => inner + Math.min(1, level) * usable,
  };
}

/** A layered sheet cake that splits into two pieces where the knife falls. Length along x, from -L/2 to L/2. */
export function makeCake(L = 0.9) {
  const g = new THREE.Group();
  const D = 0.32;
  const layers = [
    ['#e8c48c', 0.07],
    ['#fbeee0', 0.025],
    ['#c8442f', 0.02],
    ['#e8c48c', 0.07],
    ['#fbf3ea', 0.035],
  ];
  const makePiece = () => {
    const p = new THREE.Group();
    let y = 0;
    for (const [col, h] of layers) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, h, D), std(col, { r: 0.7 }));
      m.position.y = y + h / 2;
      p.add(m);
      y += h;
    }
    return p;
  };
  const left = makePiece();
  const right = makePiece();
  g.add(left, right);
  const top = layers.reduce((a, [, h]) => a + h, 0);
  // Strawberries along the top.
  const berries = [];
  const berryMat = std('#d8323a', { r: 0.35 });
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.05, 8), berryMat);
    b.rotation.x = Math.PI;
    b.position.set(-L / 2 + ((i + 0.5) / 7) * L, top + 0.022, 0);
    g.add(b);
    berries.push(b);
  }
  // The board under it and the band: a dotted line and a soft green glow on the frosting.
  const board = new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.025, D + 0.12), std('#c98a4e', { r: 0.6 }));
  board.position.y = -0.0125;
  g.add(board);
  const bandMat = new THREE.MeshBasicMaterial({ color: '#58c95a', transparent: true, opacity: 0.5, depthWrite: false });
  const band = new THREE.Mesh(new THREE.PlaneGeometry(1, D + 0.004), bandMat);
  band.rotation.x = -Math.PI / 2;
  band.position.y = top + 0.002;
  g.add(band);
  const notch = new THREE.Mesh(new THREE.PlaneGeometry(0.008, D + 0.06), new THREE.MeshBasicMaterial({ color: PAL.gold }));
  notch.rotation.x = -Math.PI / 2;
  notch.position.y = top + 0.004;
  g.add(notch);
  shadowed(g);
  band.castShadow = notch.castShadow = false;
  let cut = null;
  let gap = 0;
  return {
    group: g,
    top,
    L,
    /** Lays out the two pieces: whole until cut, then split at `cut` (0..1) and pushed apart by `gap` metres. */
    set({ c, w, cutAt = null, apart = 0, tilt = 0 }) {
      cut = cutAt;
      gap = apart;
      band.scale.x = Math.max(0.001, 2 * w * L);
      band.position.x = -L / 2 + c * L;
      notch.position.x = -L / 2 + c * L;
      const k = cut === null ? 1 : Math.max(0.02, Math.min(0.98, cut));
      left.scale.x = k * L;
      left.position.x = -L / 2 + (k * L) / 2 - gap / 2;
      right.visible = cut !== null;
      right.scale.x = (1 - k) * L;
      right.position.x = -L / 2 + k * L + ((1 - k) * L) / 2 + gap / 2;
      left.rotation.z = tilt;
      right.rotation.z = -tilt;
      for (const b of berries) {
        const bx = b.position.x;
        b.visible = true;
        b.userData.side = cut === null ? 0 : bx + L / 2 < k * L ? -1 : 1;
      }
    },
    berries,
  };
}

/** A big kitchen knife (blade along -x from the handle). */
export function makeKnife() {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.32), std('#dfe6ea', { r: 0.18, m: 0.85 }));
  blade.position.set(0, -0.05, 0);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.14), std('#5a3620', { r: 0.6 }));
  handle.position.set(0, 0.0, 0.23);
  g.add(blade, handle);
  return shadowed(g);
}

/** A soft pillow: a subdivided box puffed into a cushion; `fluff` (0..1+) puffs it up. */
export function makePillow() {
  const geo = new THREE.BoxGeometry(0.62, 0.16, 0.38, 16, 6, 12);
  const base = geo.getAttribute('position').array.slice();
  const mat = std('#f7f1e6', { r: 0.85 });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  const pos = geo.getAttribute('position');
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.02, 0.06), std('#C8442F', { r: 0.7 }));
  const g = new THREE.Group();
  g.add(m);
  return {
    group: g,
    mesh: m,
    /** fluff: 0 flat .. 1 full .. >1 overstuffed; squish: a quick squash (0..1) */
    set(fluff, squish = 0) {
      const puff = 0.25 + fluff * 1.25;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3] / 0.31;
        const y = base[i * 3 + 1] / 0.08;
        const z = base[i * 3 + 2] / 0.19;
        // Round off the corners; bulge the middle.
        const bulge = (1 - x * x) * (1 - z * z);
        const yy = y * (0.35 + bulge * puff) * (1 - squish * 0.4);
        const xx = x * (1 + squish * 0.08) * (1 - Math.abs(y) * 0.06 * puff);
        const zz = z * (1 + squish * 0.08) * (1 - Math.abs(y) * 0.1 * puff);
        pos.setXYZ(i, xx * 0.31, yy * 0.08 + 0.08 * (0.35 + puff), zz * 0.19);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}

/** A party balloon with a knot and a ribbon; `size` 0..1+. */
export function makeBalloon(color = '#d8323a') {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.3 });
  const geo = new THREE.SphereGeometry(0.5, 32, 20);
  // A balloon shape: narrower at the bottom.
  const p = geo.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = y < 0 ? 1 + y * 0.35 : 1;
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
    p.setY(i, y * 1.12);
  }
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = true;
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.08, 8), mat);
  knot.position.y = -0.6;
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }));
  shine.position.set(-0.18, 0.25, 0.36);
  shine.scale.set(1, 1.6, 0.4);
  const balloon = new THREE.Group();
  balloon.add(body, knot, shine);
  g.add(balloon);
  return { group: g, balloon, body, mat };
}

/** A hand pump: a barrel, a plunger handle that goes down and up, a hose. */
export function makePump() {
  const g = new THREE.Group();
  const red = std('#C8442F', { r: 0.45 });
  const metal = std('#c9ced2', { r: 0.25, m: 0.8 });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.42, 16), red);
  barrel.position.y = 0.25;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.025, 0.1), metal);
  foot.position.y = 0.0125;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), metal);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.24, 10), std('#1D2440', { r: 0.6 }));
  grip.rotation.z = Math.PI / 2;
  const plunger = new THREE.Group();
  rod.position.y = 0.15;
  grip.position.y = 0.3;
  plunger.add(rod, grip);
  plunger.position.y = 0.42;
  g.add(barrel, foot, plunger);
  return { group: shadowed(g), plunger };
}

/** Baby Bear's little chair, built of parts that fly apart when it breaks. */
export function makeLittleChair() {
  // Baby Bear's chair: low and sturdy-looking (it isn't), painted, with a tall back topped by two bear ears.
  const g = new THREE.Group();
  const paint = std('#7fb2d6', { r: 0.55 });
  const trim = std('#f2e3c4', { r: 0.6 });
  const cushion = std('#C8442F', { r: 0.85 });
  const parts = [];
  const part = (geo, mat, x, y, z, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.z = rz;
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.home = m.position.clone();
    m.userData.homeRot = m.rotation.clone();
    g.add(m);
    parts.push(m);
    return m;
  };
  const S = 0.44; // seat width
  const H = 0.2; // seat height (under the cushion)
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    part(new THREE.CylinderGeometry(0.022, 0.016, H, 8), paint, x * (S / 2 - 0.04) + x * 0.012, H / 2, z * (S / 2 - 0.04) + z * 0.012);
  // Stretchers between the legs.
  part(new THREE.BoxGeometry(S - 0.06, 0.02, 0.02), trim, 0, 0.07, S / 2 - 0.035);
  part(new THREE.BoxGeometry(S - 0.06, 0.02, 0.02), trim, 0, 0.07, -S / 2 + 0.035);
  const seat = part(new RoundedBox(S, 0.04, S, 0.015), paint, 0, H + 0.02, 0);
  const pad = part(new RoundedBox(S - 0.05, 0.06, S - 0.06, 0.025), cushion, 0, H + 0.07, 0.01);
  // The back: two posts, a board with bear ears, and slats.
  const BY = H + 0.04;
  for (const x of [-1, 1]) part(new THREE.CylinderGeometry(0.02, 0.022, 0.5, 8), paint, x * (S / 2 - 0.03), BY + 0.25, -S / 2 + 0.03);
  part(new RoundedBox(S, 0.16, 0.035, 0.015), paint, 0, BY + 0.44, -S / 2 + 0.03);
  for (const x of [-1, 1]) {
    part(new THREE.CylinderGeometry(0.07, 0.07, 0.035, 18).rotateX(Math.PI / 2), paint, x * (S / 2 - 0.05), BY + 0.54, -S / 2 + 0.03);
    part(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 16).rotateX(Math.PI / 2), trim, x * (S / 2 - 0.05), BY + 0.545, -S / 2 + 0.03);
  }
  part(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16).rotateX(Math.PI / 2), cushion, 0, BY + 0.44, -S / 2 + 0.01);
  for (const x of [-0.11, 0, 0.11]) part(new THREE.BoxGeometry(0.035, 0.26, 0.02), trim, x, BY + 0.22, -S / 2 + 0.03);
  return { group: g, parts, seat, pad, H: H + 0.1 };
}

/** A toaster with two slices that brown and pop. */
export function makeToaster() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.2, 2, 2, 2), std('#d6dde0', { r: 0.18, m: 0.75 }));
  shell.position.y = 0.13;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, 0.22), std('#3a3a40', { r: 0.5 }));
  base.position.y = 0.0125;
  const slotMat = new THREE.MeshBasicMaterial({ color: '#1a1012' });
  const glowMat = new THREE.MeshBasicMaterial({ color: '#ff7a2a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  g.add(shell, base);
  const slices = [];
  const toastMat = [];
  for (const x of [-0.07, 0.07]) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.005, 0.15), slotMat);
    slot.position.set(x, 0.243, 0);
    g.add(slot);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.14), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(x, 0.246, 0);
    g.add(glow);
    const crustMat = std('#c58a4a', { r: 0.8 });
    const crumbMat = std('#f3dfb3', { r: 0.9 });
    toastMat.push([crumbMat, crustMat]);
    const slice = new THREE.Group();
    const bread = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.14), [crustMat, crustMat, crustMat, crustMat, crumbMat, crumbMat]);
    bread.position.y = 0.08;
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 16, 1, false, 0, Math.PI), crustMat);
    dome.rotation.set(0, Math.PI / 2, Math.PI / 2);
    dome.position.y = 0.16;
    slice.add(bread, dome);
    slice.position.set(x, 0.12, 0);
    slice.castShadow = true;
    g.add(slice);
    slices.push(slice);
  }
  // The lever on the side.
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.05), std('#1D2440', { r: 0.4 }));
  lever.position.set(0.19, 0.2, 0);
  g.add(lever);
  // Dials.
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 12), std('#C8442F', { r: 0.4 }));
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0.09, 0.08, 0.105);
  g.add(dial);
  shadowed(g);
  const pale = new THREE.Color('#f3dfb3');
  const gold = new THREE.Color('#d9952f');
  const brown = new THREE.Color('#7a4320');
  const black = new THREE.Color('#1c1410');
  const tmp = new THREE.Color();
  return {
    group: g,
    slices,
    lever,
    glowMat,
    /** doneness 0..1 (0.5 golden), down: slices in the slots */
    setDone(v) {
      if (v < 0.5) tmp.copy(pale).lerp(gold, v / 0.5);
      else if (v < 0.8) tmp.copy(gold).lerp(brown, (v - 0.5) / 0.3);
      else tmp.copy(brown).lerp(black, Math.min(1, (v - 0.8) / 0.2));
      for (const [crumb, crust] of toastMat) {
        crumb.color.copy(tmp);
        crust.color.copy(tmp).multiplyScalar(0.8);
      }
    },
  };
}

/** A honey jar (lathe, amber glass look, a cloth lid tied with string). */
export function makeHoneyJar(scale = 1) {
  const g = new THREE.Group();
  const honey = new THREE.MeshStandardMaterial({ color: '#e59a1e', roughness: 0.2, emissive: new THREE.Color('#5a2a00'), emissiveIntensity: 0.25 });
  const body = lathe(
    [
      [0, 0],
      [0.07, 0],
      [0.085, 0.02],
      [0.09, 0.1],
      [0.08, 0.15],
      [0.06, 0.165],
      [0.06, 0.18],
      [0, 0.18],
    ],
    honey,
    20,
  );
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.03, 16), std('#C8442F', { r: 0.8 }));
  lid.position.y = 0.19;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0905, 0.0905, 0.05, 20, 1, true), std('#F7E8CB', { r: 0.8 }));
  label.position.y = 0.08;
  g.add(body, lid, label);
  g.scale.setScalar(scale);
  return shadowed(g);
}

/** A rope from a to b (a thin cylinder you re-aim each frame). */
export function makeRope(color = '#c9a46a', r = 0.012) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 6), std(color, { r: 0.9 }));
  m.geometry.translate(0, -0.5, 0);
  m.castShadow = true;
  const up = new THREE.Vector3(0, -1, 0);
  const d = new THREE.Vector3();
  return {
    mesh: m,
    between(a, b) {
      m.position.copy(a);
      d.subVectors(b, a);
      const len = d.length();
      m.scale.set(1, Math.max(0.001, len), 1);
      if (len > 1e-5) m.quaternion.setFromUnitVectors(up, d.normalize());
    },
  };
}

/** The fairground strength tester: a tall post with a painted scale, a puck on a rail and a brass bell at the top. */
export function makeStriker(H = 2.6) {
  const g = new THREE.Group();
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 512;
  const c = cv.getContext('2d');
  const bands = ['#5FA8D8', '#7fc0a0', '#F2B33D', '#e8873a', '#C8442F'];
  for (let i = 0; i < 10; i++) {
    c.fillStyle = bands[Math.floor((i / 10) * bands.length)];
    c.fillRect(0, 512 - (i + 1) * 51.2, 64, 51.2);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(0, 512 - (i + 1) * 51.2, 64, 3);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.22, H, 0.06), [std('#7a4a2a'), std('#7a4a2a'), std('#7a4a2a'), std('#7a4a2a'), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), std('#7a4a2a')]);
  board.position.y = H / 2;
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, H, 6), std('#c9ced2', { r: 0.3, m: 0.8 }));
  rail.position.set(0, H / 2, 0.06);
  const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), std('#C8442F', { r: 0.4 }));
  puck.rotation.x = Math.PI / 2;
  puck.position.set(0, 0.12, 0.07);
  const bell = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e4b24a', metalness: 0.85, roughness: 0.28, side: THREE.DoubleSide }));
  cup.rotation.x = Math.PI;
  cup.position.y = 0.0;
  bell.add(cup);
  bell.position.set(0, H + 0.12, 0.05);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.45), std('#5a3620'));
  base.position.y = 0.06;
  const target = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.08, 16), std('#C8442F', { r: 0.5 }));
  target.position.set(0, 0.16, 0.12);
  g.add(board, rail, puck, bell, base, target);
  // The band: a glowing green bracket on the scale.
  const bandMat = new THREE.MeshBasicMaterial({ color: '#58c95a', transparent: true, opacity: 0.55, depthWrite: false });
  const band = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1), bandMat);
  band.position.z = 0.035;
  g.add(band);
  shadowed(g);
  band.castShadow = false;
  const bottom = 0.15;
  const travel = H - 0.25;
  return {
    group: g,
    puck,
    bell,
    target,
    yAt: (v) => bottom + v * travel,
    setBand(c, w) {
      band.position.y = bottom + c * travel;
      band.scale.y = Math.max(0.01, 2 * w * travel);
    },
  };
}

/** A wooden mallet (handle along +y from the grip). */
export function makeMallet() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.5, 8), std('#c98a4e'));
  handle.position.y = 0.25;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 12), std('#7a4a2a'));
  head.rotation.z = Math.PI / 2;
  head.position.y = 0.52;
  g.add(handle, head);
  return shadowed(g);
}

/** A spoon (bowl at -z). */
export function makeSpoon() {
  const g = new THREE.Group();
  const metal = std('#d9dfe3', { r: 0.2, m: 0.85 });
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.006, 0.16), metal);
  handle.position.z = 0.06;
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), metal);
  bowl.scale.set(1, 0.4, 1.4);
  bowl.position.z = -0.03;
  const food = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 6), std('#efe0c0', { r: 0.5 }));
  food.scale.set(1, 0.45, 1.3);
  food.position.set(0, 0.003, -0.03);
  g.add(handle, bowl, food);
  return { group: shadowed(g), food };
}

/** A milk jug (lathe, cream with a blue band) with its spout toward +x. */
export function makeJug() {
  const g = new THREE.Group();
  const mat = std('#f3ead8', { r: 0.4 });
  const body = lathe(
    [
      [0, 0],
      [0.07, 0],
      [0.085, 0.03],
      [0.09, 0.12],
      [0.075, 0.2],
      [0.072, 0.24],
      [0.08, 0.26],
      [0.075, 0.26],
      [0.066, 0.24],
      [0.0, 0.24],
    ],
    mat,
    24,
  );
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.091, 0.091, 0.03, 24, 1, true), std('#4f79a8', { r: 0.4 }));
  band.position.y = 0.09;
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 10, 1, true), mat);
  spout.rotation.z = -Math.PI / 2 - 0.4;
  spout.position.set(0.085, 0.245, 0);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16, Math.PI), mat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-0.09, 0.14, 0);
  g.add(body, band, spout, handle);
  return { group: shadowed(g), spoutTip: new THREE.Vector3(0.11, 0.25, 0) };
}

/** A stack of crates (or jars) as a pedestal. */
export function makeCrate(w = 0.4, h = 0.3, color = '#a8703f') {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), std(color, { r: 0.8 }));
  m.position.y = h / 2;
  g.add(m);
  for (const y of [0.04, h - 0.04]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.03, w + 0.01), std('#6e4127', { r: 0.8 }));
    s.position.y = y;
    g.add(s);
  }
  return shadowed(g);
}
