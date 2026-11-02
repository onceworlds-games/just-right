// Store art (?poster=cover|action|win|multi|icon|badge-<id>): one staged, deterministic frame drawn with the game's own
// renderer and cast, no HUD and no platform UI. The cover carries the name once, as the title's rubber stamp.
import * as THREE from 'three';
import { createWorld } from '../play/world.js';
import { readPage } from '../core/pages.js';
import { practicePage } from '../core/plan.js';
import { CHARACTERS, FOLK_LOOKS, BEARS } from '../gfx/palette.js';
import { ANIM, Character, LIFE } from '../gfx/cast.js';
import { makeHat } from '../world/hats.js';
import { makePot, makeBowl, makeLittleChair, makeSpoon } from '../world/props3d.js';

const CH = 0.36;

/** Math.random from a fixed seed, so particles land the same way every time. */
function seedRandom(seed) {
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function finish(gfx) {
  await document.fonts.ready;
  gfx.render(1 / 60);
  gfx.render(1 / 60);
  await new Promise((r) => requestAnimationFrame(() => r()));
  gfx.render(1 / 60);
  document.body.dataset.ready = '1';
}

/** A page mid-hold at `v`, then (with `k`) its verdict and `after` frames of what follows. */
function stagePage(world, id, { v, k = null, after = 20, frames = 45, bears = 0 } = {}) {
  const raw = id === 'bowls' ? { ...practicePage('porridge', 0), bo: 2 } : practicePage(id, 0);
  const P = readPage(raw);
  world.setBearsHome(bears);
  world.showPage(P, { glide: 0 });
  const val = typeof v === 'function' ? v(P) : v;
  const st = { v: 0, c: P.c0, w: P.w, holding: true, pressed: true, released: false, k: null, since: -1, sp: 1, P, hold: 0 };
  for (let i = 0; i < frames; i++) {
    st.v = (val * (i + 1)) / frames;
    st.hold = ((i + 1) / frames) * 2500;
    world.update(1 / 30, st);
  }
  if (k) {
    st.holding = false;
    st.released = true;
    st.k = k;
    st.since = 0;
    world.stationFor(P).verdict({ k, v: val, s: 0 }, st);
    for (let i = 0; i < after; i++) {
      st.since += 1 / 30;
      world.update(1 / 30, st);
    }
  }
  return { P, st };
}

const params = new URLSearchParams(location.search);
/** Put the camera on a framing now (?cam=x_y_z_tx_ty_tz overrides it, m for minus, while staging a poster). */
function shoot(world, f, st = null) {
  world.rig.go(world.frameFor({ fov: 32, ...f }), 0);
  world.update(1 / 600, st);
  const v = (params.get('cam') ?? '').split('_').map((x) => Number(x.replace('m', '-')));
  if (v.length === 6 && v.every(Number.isFinite)) {
    world.rig.go({ pos: new THREE.Vector3(v[0], v[1], v[2]), look: new THREE.Vector3(v[3], v[4], v[5]), fov: f.fov ?? 32 }, 0);
    world.update(1 / 600, st);
  }
}
const num = (k, d) => (params.has(k) && Number.isFinite(Number(params.get(k))) ? Number(params.get(k)) : d);

/** The title's rubber stamp, over the picture. */
function titleStamp({ x = '50%', y = '18%', size = 118, rot = -5 }) {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;left:${x};top:${y};transform:translate(-50%,-50%);z-index:5;pointer-events:none`;
  el.innerHTML = `<div class="stamp" style="position:relative;left:auto;top:auto;display:inline-block;transform:rotate(${rot}deg);--s:${size}px">Just Right</div>`;
  document.body.appendChild(el);
  return el;
}

const people = (list) =>
  list.map(([key, hat, ready], i) => {
    const def = CHARACTERS[key] ?? FOLK_LOOKS[key];
    return { key, def: { ...def, key }, name: key, hat: hat ?? '', ready: !!ready, me: i === 0 };
  });

export async function storePoster(name, gfx, assets) {
  seedRandom(7);
  LIFE.blink = false;
  if (name === 'icon' || name.startsWith('badge-')) return medal(name, gfx, assets);
  const world = createWorld(gfx, assets, { reduced: () => true });
  world.setQuality('high');

  if (name === 'cover') {
    // The three bowls: Goldi at the bears' table, the middle bowl just right, Papa Bear home in the doorway behind her.
    world.setLook('goldi', '');
    const { st } = stagePage(world, 'bowls', { v: (P) => P.c0, k: 'perfect', after: num('after', 10), bears: 1 });
    gfx.setGolden(1);
    shoot(world, { target: [-2.82, 0.8, -1.0], from: [0.08, 0.3, 1], radius: num('r', 1.02) }, st);
    titleStamp({ x: '66%', y: '14%', size: 92, rot: -5 });
    return finish(gfx);
  }
  if (name === 'action') {
    // Off the rope swing: Goldi in the air over the pond, the raft below.
    const { st } = stagePage(world, 'swing', { v: (P) => P.c0, k: 'perfect', after: num('after', 12) });
    const p = world.stationFor(st.P).follow?.() ?? world.me.headAt(new THREE.Vector3());
    gfx.setGolden(0.5);
    shoot(world, { target: [p.x, p.y + num('dy', 0.12), p.z], from: [num('fx', 0.5), num('fy', -0.2), 1], radius: num('r', 1.2) }, st);
    return finish(gfx);
  }
  if (name === 'win') {
    // The podium: the winner in the just-right chair, everyone cheering, the bears walking in.
    world.setLook('goldi', 'crown');
    world.showPodium(people([['goldi', 'crown'], ['rosie', 'party'], ['bramble', 'straw'], ['cub', 'acorn'], ['sky', 'beret'], ['Ottoline', 'chef'], ['pepper', 'bow']]));
    for (let i = 0; i < num('after', 36); i++) world.update(1 / 30, null);
    gfx.setGolden(1);
    shoot(world, { target: [num('tx', 1.85), 0.66, -0.55], from: [0.12, 0.26, 1], radius: num('r', 1.35) });
    return finish(gfx);
  }
  if (name === 'multi') {
    // Story time: eight at the bears' table, hats on, ready.
    world.setLook('goldi', 'party');
    world.showLobby(
      people([
        ['goldi', 'party', true],
        ['rosie', 'bow', false],
        ['bramble', '', false],
        ['sky', 'beret', true],
        ['pepper', 'straw', true],
        ['cub', 'acorn', true],
        ['bao', 'chef', false],
        ['Fen', 'crown', true],
      ]),
      { glide: 0 },
    );
    for (let i = 0; i < 30; i++) world.update(1 / 30, null);
    gfx.setGolden(0.4);
    shoot(world, { target: [-2.65, 0.62, -0.6], from: [0, 0.36, 1], radius: 1.7 });
    return finish(gfx);
  }
  return finish(gfx);
}

// ---------------------------------------------------------------------------------------------------- medals (icon, badges)
// A coin seen through a round window: a paper plate with a hole, a brass rim, a coloured disc behind, the subject between.

const BADGES = {
  'just-right': { disc: '#3E7A34', subject: 'bowl' },
  'perfect-streak': { disc: '#2B5FA8', subject: 'stars' },
  'too-hot': { disc: '#C8442F', subject: 'pot' },
  'broke-the-chair': { disc: '#7a4a2a', subject: 'chair' },
  'porridge-pro': { disc: '#8f2a1c', subject: 'goldbowl' },
  'before-the-bears': { disc: '#3f6b3a', subject: 'papa' },
  'daily-porridge': { disc: '#5fa8d8', subject: 'sunbowl' },
  'every-story': { disc: '#5b3a6e', subject: 'books' },
  'happily-ever-after': { disc: '#d9668a', subject: 'heart' },
  'three-bowls': { disc: '#2f7f7a', subject: 'threebowls' },
  'all-dressed-up': { disc: '#6a3a7a', subject: 'hat' },
  'cottage-regular': { disc: '#B8892B', subject: 'door' },
};

function discTexture(color) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  const c = new THREE.Color(color);
  const lite = c.clone().lerp(new THREE.Color('#ffffff'), 0.3);
  const dark = c.clone().lerp(new THREE.Color('#000000'), 0.28);
  const grd = g.createRadialGradient(104, 92, 8, 128, 128, 150);
  grd.addColorStop(0, `#${lite.getHexString()}`);
  grd.addColorStop(0.55, `#${c.getHexString()}`);
  grd.addColorStop(1, `#${dark.getHexString()}`);
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  // Soft sunburst rays.
  g.globalAlpha = 0.08;
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 20; i += 2) {
    const a0 = (i / 20) * Math.PI * 2;
    const a1 = ((i + 1) / 20) * Math.PI * 2;
    g.beginPath();
    g.moveTo(128, 128);
    g.arc(128, 128, 220, a0, a1);
    g.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function starShape(r1 = 0.5, r0 = 0.22) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
    const r = i % 2 ? r0 : r1;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}
function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.3, -0.55, -0.1, -0.55, 0.18);
  s.bezierCurveTo(-0.55, 0.42, -0.32, 0.55, -0.15, 0.5);
  s.bezierCurveTo(-0.05, 0.47, 0, 0.38, 0, 0.32);
  s.bezierCurveTo(0, 0.38, 0.05, 0.47, 0.15, 0.5);
  s.bezierCurveTo(0.32, 0.55, 0.55, 0.42, 0.55, 0.18);
  s.bezierCurveTo(0.55, -0.1, 0.15, -0.3, 0, -0.5);
  return s;
}
const extrude = (shape, depth, color, { metal = 0, rough = 0.45 } = {}) => {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.35, bevelSize: 0.03, bevelSegments: 3, curveSegments: 18 });
  geo.center();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough }));
  m.castShadow = true;
  return m;
};
const lit = (o) => {
  o.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return o;
};
/** Scale an object so the largest side of its box is `size`, centred on (x, y, z). */
function fitAt(o, size, x = 0, y = 0, z = 0) {
  o.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(o);
  const s = b.getSize(new THREE.Vector3());
  const k = size / Math.max(s.x, s.y, s.z, 1e-6);
  o.scale.multiplyScalar(k);
  o.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(o);
  const c = b2.getCenter(new THREE.Vector3());
  o.position.x += x - c.x;
  o.position.y += y - c.y;
  o.position.z += z - c.z;
  return o;
}

function porridgeBowl(r, color) {
  const b = makeBowl(r, color);
  if (b.porridge) b.porridge.visible = true;
  return b;
}

function subjectFor(kind, assets, root) {
  const g = new THREE.Group();
  root.add(g);
  if (kind === 'bowl' || kind === 'sunbowl' || kind === 'goldbowl') {
    const b = porridgeBowl(0.3, kind === 'goldbowl' ? '#f2c14e' : '#b06a35');
    if (kind === 'goldbowl')
      b.group.traverse((m) => {
        if (m.isMesh && m !== b.porridge && !m.material.map) {
          m.material = m.material.clone();
          m.material.metalness = 0.85;
          m.material.roughness = 0.28;
        }
      });
    b.group.rotation.x = 0.55;
    g.add(b.group);
    const sp = makeSpoon();
    sp.group.scale.setScalar(2.1);
    sp.group.position.set(0.12, 0.2, 0.02);
    sp.group.rotation.set(0.2, 0.4, -0.7);
    b.group.add(sp.group);
    fitAt(g, kind === 'sunbowl' ? 1.15 : 1.35, 0, kind === 'sunbowl' ? -0.22 : -0.08, -0.3);
    if (kind === 'sunbowl') {
      const sunMat = new THREE.MeshBasicMaterial({ color: '#ffe08a' });
      const sun = new THREE.Mesh(new THREE.CircleGeometry(0.3, 40), sunMat);
      sun.position.set(0, 0.36, -0.9);
      root.add(sun);
      for (let i = 0; i < 12; i++) {
        const r = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.2), sunMat);
        const a = (i / 12) * Math.PI * 2;
        r.position.set(Math.cos(a) * 0.45, 0.36 + Math.sin(a) * 0.45, -0.9);
        r.rotation.z = a - Math.PI / 2;
        root.add(r);
      }
    }
    return g;
  }
  if (kind === 'stars') {
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.92 - (i / 4) * 0.84);
      const big = i === 2;
      const st = extrude(starShape(big ? 0.3 : 0.21, big ? 0.13 : 0.09), 0.08, '#f2c14e', { metal: 0.8, rough: 0.28 });
      st.position.set(Math.cos(a) * 0.56, Math.sin(a) * 0.52 - 0.24, -0.2);
      st.rotation.set(-0.12, (i - 2) * 0.2, (i - 2) * -0.14);
      g.add(st);
    }
    return g;
  }
  if (kind === 'pot') {
    const pot = makePot();
    pot.update(1, 1, 1, 0.3);
    pot.group.rotation.x = 0.35;
    g.add(pot.group);
    // Boiling over: foam down the side, steam above.
    const foam = new THREE.MeshStandardMaterial({ color: '#f3e3c0', roughness: 0.8 });
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.03 + (i % 3) * 0.008, 12, 10), foam);
      const a = -0.9 + i * 0.3;
      m.position.set(Math.cos(a) * 0.16, 0.2 - (i % 3) * 0.035, Math.sin(a) * 0.16 + 0.03);
      pot.group.add(m);
    }
    const steam = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
    [
      [-0.05, 0.36, 0.05],
      [0.07, 0.44, 0],
      [-0.02, 0.53, -0.02],
    ].forEach(([x, y, z], i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06 - i * 0.012, 14, 12), steam);
      m.position.set(x, y, z);
      pot.group.add(m);
    });
    const flameMat = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, roughness: 1 });
    for (let i = 0; i < 5; i++) {
      const big = i % 2 === 0;
      const f = new THREE.Mesh(new THREE.ConeGeometry(big ? 0.06 : 0.045, big ? 0.2 : 0.14, 10), flameMat(big ? '#ff8a1e' : '#ffd23d'));
      f.position.set(-0.14 + i * 0.07, -0.07, 0.08);
      pot.group.add(f);
    }
    fitAt(g, 1.45, 0, -0.04, -0.3);
    return g;
  }
  if (kind === 'chair') {
    // Baby Bear's chair, one leg snapped off and flying, the chair tipping after it.
    const ch = makeLittleChair();
    g.add(ch.group);
    ch.group.rotation.set(0.32, -0.55, -0.22);
    const leg = ch.parts[3];
    leg.position.set(0.3, -0.04, 0.32);
    leg.rotation.set(0.6, 0, 1.1);
    const wood = new THREE.MeshStandardMaterial({ color: '#f2e3c4', roughness: 0.7 });
    [
      [0.2, 0.02, 0.3, 0.4],
      [0.28, 0.1, 0.25, 1.4],
      [0.12, -0.02, 0.36, 2.2],
    ].forEach(([x, y, z, r]) => {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.07), wood);
      sp.position.set(x, y, z);
      sp.rotation.set(r, r * 2, r * 0.5);
      sp.castShadow = true;
      ch.group.add(sp);
    });
    fitAt(g, 1.5, 0, -0.02, -0.3);
    // The crack: a white burst behind it.
    const burst = new THREE.Mesh(new THREE.ShapeGeometry(starShape(0.62, 0.3)), new THREE.MeshBasicMaterial({ color: '#fbf3e2', transparent: true, opacity: 0.35 }));
    burst.position.set(0.05, 0.02, -0.9);
    burst.rotation.z = 0.2;
    root.add(burst);
    return g;
  }
  if (kind === 'papa') {
    const def = BEARS.papa;
    const ch = new Character(assets, def.kind, def.look, { scale: CH * 2.3 });
    ch.play(ANIM.idle);
    ch.update(0.6);
    ch.group.rotation.y = 0.3;
    g.add(ch.group);
    ch.group.updateMatrixWorld(true);
    const h = ch.headAt(new THREE.Vector3());
    ch.group.position.set(-h.x, -h.y - 0.36, -0.5 - h.z);
    root.userData.chars = [ch];
    return g;
  }
  if (kind === 'books') {
    // The storybook, open: a red cover, two fanned pages with lines and a little bowl drawn on one.
    const cover = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.04, 0.92), new THREE.MeshStandardMaterial({ color: '#b8392a', roughness: 0.6 }));
    g.add(cover);
    const pageTex = (pic) => {
      const cv = document.createElement('canvas');
      cv.width = 256;
      cv.height = 340;
      const c = cv.getContext('2d');
      c.fillStyle = '#fbf3e2';
      c.fillRect(0, 0, 256, 340);
      c.strokeStyle = '#c9b48f';
      c.lineWidth = 6;
      c.lineCap = 'round';
      for (let y = pic ? 200 : 50; y < 310; y += 34) {
        c.beginPath();
        c.moveTo(34, y);
        c.lineTo(222 - ((y * 7) % 50), y);
        c.stroke();
      }
      if (pic) {
        c.fillStyle = '#b06a35';
        c.beginPath();
        c.ellipse(128, 120, 70, 38, 0, 0, Math.PI);
        c.fill();
        c.fillStyle = '#f3e3c0';
        c.beginPath();
        c.ellipse(128, 120, 70, 16, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#ffffff';
        c.lineWidth = 7;
        for (const x of [100, 128, 156]) {
          c.beginPath();
          c.moveTo(x, 92);
          c.bezierCurveTo(x - 12, 74, x + 12, 62, x, 40);
          c.stroke();
        }
      }
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    for (const side of [-1, 1]) {
      const page = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.84), [
        new THREE.MeshStandardMaterial({ color: '#efe2c6' }),
        new THREE.MeshStandardMaterial({ color: '#efe2c6' }),
        new THREE.MeshStandardMaterial({ map: pageTex(side < 0), roughness: 0.9 }),
        new THREE.MeshStandardMaterial({ color: '#efe2c6' }),
        new THREE.MeshStandardMaterial({ color: '#efe2c6' }),
        new THREE.MeshStandardMaterial({ color: '#efe2c6' }),
      ]);
      page.position.set(side * 0.32, 0.06, 0);
      page.rotation.z = side * -0.1;
      page.castShadow = page.receiveShadow = true;
      g.add(page);
    }
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.5), new THREE.MeshStandardMaterial({ color: '#f2b33d' }));
    ribbon.position.set(0.05, 0.1, 0.55);
    ribbon.rotation.x = 0.5;
    g.add(ribbon);
    g.rotation.set(1.0, 0, 0.12);
    fitAt(g, 1.45, 0, -0.04, -0.3);
    return g;
  }
  if (kind === 'heart') {
    const h = extrude(heartShape(), 0.18, '#d8323a', { rough: 0.35 });
    h.rotation.set(-0.2, 0.3, 0.08);
    h.scale.setScalar(1.45);
    h.position.z = -0.2;
    g.add(h);
    const sp = extrude(starShape(0.12, 0.05), 0.04, '#f2c14e', { metal: 0.8, rough: 0.3 });
    sp.position.set(0.5, 0.46, 0);
    g.add(sp);
    const sp2 = sp.clone();
    sp2.position.set(-0.56, -0.36, 0);
    sp2.scale.setScalar(0.7);
    g.add(sp2);
    return g;
  }
  if (kind === 'threebowls') {
    // Papa's, Mama's and Baby's: big, middle, little.
    const sizes = [0.24, 0.18, 0.13];
    const cols = ['#7a4a2a', '#b06a35', '#d9955a'];
    let x = -0.5;
    sizes.forEach((r, i) => {
      const b = porridgeBowl(r, cols[i]);
      x += r;
      b.group.position.set(x, 0, 0);
      x += r + 0.05;
      b.group.rotation.x = 0.4;
      g.add(b.group);
    });
    fitAt(g, 1.55, 0, -0.06, -0.3);
    return g;
  }
  if (kind === 'hat') {
    const h = makeHat('crown');
    lit(h);
    h.rotation.set(0.45, 0.3, -0.12);
    g.add(h);
    fitAt(g, 1.2, 0, -0.04, -0.3);
    return g;
  }
  if (kind === 'door') {
    // The cottage: cream walls, a red roof, a round door, windows lit, smoke from the chimney.
    const std = (c, r = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    const house = new THREE.Group();
    g.add(house);
    const walls = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.56, 0.62), std('#f3e6d2'));
    walls.position.y = 0.28;
    house.add(walls);
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-0.6, 0);
    roofShape.lineTo(0.6, 0);
    roofShape.lineTo(0, 0.42);
    roofShape.closePath();
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 0.78, bevelEnabled: false }), std('#c8442f', 0.6));
    roof.position.set(0, 0.55, -0.39);
    house.add(roof);
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), std('#8a5634'));
    chim.position.set(0.3, 0.86, -0.1);
    house.add(chim);
    const door = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 24, 1, false, -Math.PI / 2, Math.PI), std('#7a4a2a'));
    door.rotation.x = Math.PI / 2;
    door.position.set(-0.1, 0.2, 0.315);
    const doorLow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.03), std('#7a4a2a'));
    doorLow.position.set(-0.1, 0.1, 0.315);
    house.add(door, doorLow);
    const glow = new THREE.MeshStandardMaterial({ color: '#ffd76a', emissive: '#ffb63d', emissiveIntensity: 0.6 });
    for (const [x, y, z, ry] of [
      [0.27, 0.32, 0.315, 0],
      [0.505, 0.3, 0.1, Math.PI / 2],
    ]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.02), glow);
      w.position.set(x, y, z);
      w.rotation.y = ry;
      const fr = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.19, 0.015), std('#fbf3e2'));
      fr.position.set(x, y, z).add(new THREE.Vector3(ry ? -0.006 : 0, 0, ry ? 0 : -0.006));
      fr.rotation.y = ry;
      house.add(fr, w);
    }
    const smoke = std('#ffffff', 1);
    [
      [0.32, 1.06, -0.1, 0.06],
      [0.38, 1.17, -0.12, 0.05],
      [0.46, 1.26, -0.14, 0.04],
    ].forEach(([x, y, z, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), smoke);
      m.position.set(x, y, z);
      house.add(m);
    });
    lit(house);
    house.rotation.set(0.28, -0.5, 0);
    fitAt(g, 1.35, 0, -0.04, -0.4);
    return g;
  }
  return g;
}

async function medal(name, gfx, assets) {
  const { scene, camera } = gfx;
  const icon = name === 'icon';
  const id = name.slice(6);
  const def = icon ? { disc: '#F2B33D' } : (BADGES[id] ?? { disc: '#7a4a2a', subject: '' });
  const PAPER = '#f2dfb8';
  scene.background = new THREE.Color(PAPER);
  scene.fog = null;
  scene.environment = null;
  const root = new THREE.Group();
  scene.add(root);
  const R = 1.0;
  // The plate with its window.
  const plateShape = new THREE.Shape();
  plateShape.moveTo(-6, -6);
  plateShape.lineTo(6, -6);
  plateShape.lineTo(6, 6);
  plateShape.lineTo(-6, 6);
  const hole = new THREE.Path();
  hole.absarc(0, 0, R, 0, Math.PI * 2, true);
  plateShape.holes.push(hole);
  const plate = new THREE.Mesh(new THREE.ShapeGeometry(plateShape, 64), new THREE.MeshBasicMaterial({ color: PAPER }));
  plate.position.z = 0.35;
  root.add(plate);
  // The brass rim.
  const brass = new THREE.MeshStandardMaterial({ color: '#d9a441', metalness: 0.75, roughness: 0.32 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.075, 20, 96), brass);
  rim.position.z = 0.36;
  rim.castShadow = true;
  root.add(rim);
  const line = new THREE.Mesh(new THREE.TorusGeometry(R - 0.1, 0.012, 8, 96), new THREE.MeshStandardMaterial({ color: '#fbf3e2', roughness: 0.6 }));
  line.position.z = -0.95;
  // The disc behind.
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R * 1.05, 96), new THREE.MeshStandardMaterial({ map: discTexture(def.disc), roughness: 0.9 }));
  disc.position.z = -1.0;
  disc.receiveShadow = true;
  root.add(disc, line);

  let chars = [];
  if (icon) {
    // Goldi holding a bowl of porridge, steam curling up.
    const c = CHARACTERS.goldi;
    const ch = new Character(assets, c.kind, c.look, { scale: CH * num('is', 1.45) });
    ch.play(ANIM.hold);
    ch.update(0.5);
    ch.group.rotation.y = 0.18;
    root.add(ch.group);
    ch.group.updateMatrixWorld(true);
    const h = ch.headAt(new THREE.Vector3());
    ch.group.position.set(-h.x - 0.02, -h.y + num('hy', 0.06), -0.6 - h.z);
    ch.update(1 / 60);
    ch.group.updateMatrixWorld(true);
    const hands = ch.hands(new THREE.Vector3());
    const bowl = porridgeBowl(0.26);
    bowl.group.position.copy(hands).add(new THREE.Vector3(0, -0.1, 0.14));
    bowl.group.rotation.x = 0.3;
    root.add(lit(bowl.group));
    // Two curls of steam: soft white ribbons rising from the bowl.
    const steam = new THREE.MeshBasicMaterial({ color: '#fffaf0', transparent: true, opacity: 0.85, depthWrite: false });
    [
      [-0.07, 0, 1],
      [0.08, 1.7, 0.8],
    ].forEach(([dx, ph, k]) => {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        pts.push(new THREE.Vector3(dx + Math.sin(t * 5.2 + ph) * 0.06 * (0.4 + t), 0.12 + t * 0.42 * k, 0.02 - t * 0.05));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 48, 0.022, 8, false);
      // Taper the tube to a point at the top.
      const pos = geo.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        const seg = Math.floor(i / 9) / 48;
        const c = curve.getPointAt(Math.min(1, seg));
        v.fromBufferAttribute(pos, i).sub(c).multiplyScalar(1 - seg * 0.85).add(c);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      const m = new THREE.Mesh(geo, steam);
      m.position.copy(bowl.group.position);
      root.add(m);
    });
    chars = [ch];
  } else {
    subjectFor(def.subject, assets, root);
    chars = root.userData.chars ?? [];
  }

  // A warm key from the upper left (its shadow falls on the disc), a cool fill, a soft sky.
  if (gfx.sun) gfx.sun.visible = false;
  if (gfx.hemi) gfx.hemi.intensity = 0.9;
  const key = new THREE.DirectionalLight('#fff1d6', 2.4);
  key.position.set(-2.5, 3.5, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -1.6;
  key.shadow.camera.right = key.shadow.camera.top = 1.6;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 14;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  const fill = new THREE.DirectionalLight('#bcd6f0', 0.6);
  fill.position.set(3, -1, 4);
  scene.add(key, fill);
  // A long lens straight on: the window fills the badge; the icon keeps its outer tenth clear.
  const fill01 = icon ? 0.8 : 0.9;
  const dist = 12;
  camera.fov = (2 * Math.atan((R + 0.08) / fill01 / dist) * 180) / Math.PI;
  camera.position.set(0, 0, dist + 0.35);
  camera.lookAt(0, 0, 0);
  camera.near = 1;
  camera.far = 40;
  camera.updateProjectionMatrix();
  for (const c of chars) c.update(1 / 60);
  gfx.setTilt(0);
  gfx.setGolden(0);
  return finish(gfx);
}
