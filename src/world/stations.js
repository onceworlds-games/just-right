// The twelve pages as staged little scenes in the cottage, plus the boss (The Three Bowls). Each station places Goldi, the
// meter and its own things, drives them from the page's live value while she holds, and acts out the verdict: the porridge
// boils over, the chair snaps, the balloon bursts, the toast flies, the bowl smashes, the jar lands on the stack, the bell flies
// off its post, she splashes into the pond.
//
// A station: { id, frame, meter, enter(P), update(dt, st), verdict(r, st), leave() }. st (from the director, every frame):
// { v, c, w, holding, pressed, released, k, since (s since the verdict, -1 before), t, sp, P, ghost }.
import * as THREE from 'three';
import { ANIM } from '../gfx/cast.js';
import { SHAPE } from '../gfx/particles.js';
import { BACK } from './cottage.js';
import { makePot, makeBowl, makeGlass, makeCake, makeKnife, makePillow, makeBalloon, makePump, makeLittleChair, makeToaster, makeHoneyJar, makeRope, makeStriker, makeMallet, makeSpoon, makeJug, makeCrate, shadowed } from './props3d.js';
import { PAL } from '../gfx/palette.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (x) => 1 - (1 - clamp01(x)) ** 3;
const easeOutBack = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const t = clamp01(x);
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

/** Emits at a steady rate: returns how many to emit this frame. */
function rate(state, key, perSec, dt) {
  state[key] = (state[key] ?? 0) + perSec * dt;
  const n = Math.floor(state[key]);
  state[key] -= n;
  return n;
}

/** Parts flying apart: each gets a velocity and spin, falls, bounces on a floor and settles. */
/** Parts burst outward from their group's centre (legs splay, the back falls back), tumbling, bouncing on the floor. */
function debris(parts, { floor = 0, power = 1.6 } = {}) {
  const live = parts.map((m) => ({
    m,
    v: V((m.position.x * 7 + (Math.random() - 0.5) * 0.9) * power, (0.7 + Math.random() * 1.1) * power, (m.position.z * 7 + (Math.random() - 0.5) * 0.9) * power),
    w: V((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14),
  }));
  return (dt) => {
    for (const p of live) {
      p.v.y -= 9.8 * dt;
      p.m.position.addScaledVector(p.v, dt);
      p.m.rotation.x += p.w.x * dt;
      p.m.rotation.y += p.w.y * dt;
      p.m.rotation.z += p.w.z * dt;
      if (p.m.position.y < floor + 0.02) {
        p.m.position.y = floor + 0.02;
        p.v.y *= -0.3;
        p.v.x *= 0.6;
        p.v.z *= 0.6;
        p.w.multiplyScalar(0.5);
      }
    }
  };
}

export function createStations(ctx) {
  const { scene, fx, house } = ctx;
  const root = new THREE.Group();
  root.name = 'stations';
  scene.add(root);
  const sound = (n, o) => ctx.sound(n, o);
  const goldi = () => ctx.goldi();
  const sparkle = (x, y, z, n = 18, color = [PAL.gold, '#fff6d0']) => fx.emit(n, x, y, z, { shape: SHAPE.spark, color, speed: 1.6, spread: 1.2, size: [0.05, 0.11], life: [0.5, 0.9], drag: 2.5, additive: true, gravity: -0.3 });
  const puff = (x, y, z, n = 10, color = ['#ffffff', '#f3ece0'], o = {}) => fx.emit(n, x, y, z, { shape: SHAPE.puff, color, speed: 0.5, spread: 1, size: [0.12, 0.22], grow: 2.2, life: [0.7, 1.3], drag: 1.5, gravity: -0.4, alpha: 0.75, ...o });
  const hearts = (x, y, z) => fx.emit(6, x, y, z, { shape: SHAPE.spark, color: ['#ff8fa8', '#ffd0dc'], speed: 0.7, spread: 0.6, dir: [0, 1, 0], size: [0.06, 0.1], life: [0.8, 1.2], gravity: -0.6, drag: 1.2, additive: true });
  const frost = (x, y, z, n = 14) => fx.emit(n, x, y, z, { shape: SHAPE.spark, color: ['#cfe9ff', '#ffffff', '#9cc9f0'], speed: 0.8, spread: 1.2, size: [0.03, 0.07], life: [0.6, 1.1], gravity: 0.6, drag: 1.5, additive: true });

  const stations = {};

  // ================================================================ porridge (the stove)
  {
    const g = new THREE.Group();
    root.add(g);
    const perm = new THREE.Group();
    root.add(perm);
    const pot = makePot();
    pot.group.position.set(-7.85, 0.93, -1.6);
    pot.group.scale.setScalar(0.9);
    perm.add(pot.group);
    const ladle = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), new THREE.MeshStandardMaterial({ color: '#8a5530', roughness: 0.6 })));
    perm.add(ladle);
    ladle.position.set(-7.78, 1.22, -1.6);
    ladle.rotation.set(0, 0, -0.35);
    // The burner's flames: additive cones that grow with the heat.
    const flames = new THREE.Group();
    const flameMat = new THREE.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const flameMat2 = new THREE.MeshBasicMaterial({ color: '#5fa8ff', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 10; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), i % 2 ? flameMat : flameMat2);
      const a = (i / 10) * Math.PI * 2;
      f.position.set(Math.cos(a) * 0.17, 0.0, Math.sin(a) * 0.17);
      f.userData.p = i * 0.7;
      flames.add(f);
    }
    flames.position.set(-7.85, 0.94, -1.6);
    g.add(flames);
    const glow = new THREE.PointLight('#ff8a3a', 0, 2.5, 2);
    glow.position.set(-7.85, 1.0, -1.3);
    // Always in the scene (at 0 when the stove is off): a light coming and going recompiles every material.
    perm.add(glow);
    const s = { heat: 0, boil: 0, over: 0, rattle: 0 };
    stations.porridge = {
      id: 'porridge',
      group: g,
      idle() {
        glow.intensity = 0;
      },
      frame: { target: [-7.8, 0.82, -1.35], from: [0.14, 0.36, 1], radius: 1.2 },
      meter: { at: [-7.08, 0, -1.25], s: 0.58 },
      enter() {
        Object.assign(s, { heat: 0, boil: 0, over: 0, rattle: 0 });
        goldi().place(-8.68, 0, -1.2, 1.15);
        goldi().play(ANIM.idle);
        pot.update(0, 0, 0, 0);
      },
      update(dt, st) {
        const v = st.v;
        s.heat = v;
        const hot = smooth(st.c - st.w * 1.5, st.c + st.w + 0.15, v);
        s.boil = lerp(s.boil, st.holding ? 0.15 + hot : st.released ? hot * 0.6 : 0.05, Math.min(1, dt * 4));
        if (st.k === 'over' && st.since >= 0) s.over = lerp(s.over, 1, Math.min(1, dt * 3));
        pot.update(s.heat, s.boil, s.over, st.t);
        // Rattle when it's too hot.
        const shake = st.holding ? Math.max(0, v - st.c - st.w) * 0.8 : 0;
        pot.group.rotation.set(Math.sin(st.t * 47) * shake * 0.08, 0, Math.cos(st.t * 53) * shake * 0.08);
        pot.group.position.y = 0.93 + Math.abs(Math.sin(st.t * 31)) * shake * 0.02;
        // Flames.
        const fl = st.holding ? 0.4 + v * 0.9 : st.released ? 0.12 : 0.18;
        flames.children.forEach((f) => {
          const flick = 0.75 + Math.sin(st.t * 23 + f.userData.p) * 0.25;
          f.scale.set(1, Math.max(0.05, fl * flick), 1);
          f.position.y = 0.06 * fl * flick;
        });
        glow.intensity = (st.holding ? 1.2 + v * 2.5 : 0.4) * (0.85 + Math.sin(st.t * 19) * 0.15);
        // Steam: more as it heats.
        const n = rate(s, 'steam', (st.holding ? 3 + v * 26 : 2 + v * 10) * (st.k === 'under' ? 0.1 : 1), dt);
        if (n) puff(-7.85 + (Math.random() - 0.5) * 0.2, 1.12, -1.6, n, ['#ffffff', '#f6efe4'], { speed: 0.35 + v * 0.5, size: [0.06, 0.12], grow: 3, alpha: 0.35 + v * 0.3, life: [0.9, 1.6], wobble: 0.6 });
        // Goldi stirs while it heats.
        const G = goldi();
        if (st.holding && G.currentName !== ANIM.pan) G.play(ANIM.pan, { fade: 0.2 });
        if (G.currentName === ANIM.pan) G.current.timeScale = 0.8 + v * 1.4;
        if (!st.holding && !st.released && G.currentName === ANIM.pan) G.play(ANIM.idle);
        // The ladle sticks out of the pot and circles.
        const a = st.t * (st.holding ? 4 + v * 6 : 1);
        ladle.position.set(-7.85 + Math.cos(a) * 0.07, 1.22, -1.6 + Math.sin(a) * 0.07);
        ladle.rotation.set(Math.sin(a) * 0.25, 0, -0.35 + Math.cos(a) * 0.15);
        if (st.k === 'over' && st.since > 0 && st.since < 1.2) {
          const m = rate(s, 'spill', 30, dt);
          if (m) fx.emit(m, -7.85 + (Math.random() - 0.5) * 0.4, 1.2, -1.6 + (Math.random() - 0.5) * 0.3, { shape: SHAPE.blob, color: ['#f8efdc', '#efe0c0'], speed: 0.9, spread: 0.8, size: [0.05, 0.09], life: [0.6, 1.0], gravity: 4, floor: 0.0, drag: 0.6 });
        }
        if (st.k === 'under' && st.since > 0 && st.since < 1.5) {
          const m = rate(s, 'frost', 16, dt);
          if (m) frost(-7.85, 1.15, -1.6, m);
        }
      },
      verdict(r) {
        const G = goldi();
        const k = r.k;
        if (k === 'perfect' || k === 'good') {
          G.play(ANIM.yes, { then: ANIM.idle });
          if (k === 'perfect') G.jumpUp(2.6);
          sparkle(-7.85, 1.2, -1.6, k === 'perfect' ? 26 : 12);
          hearts(-8.68, 1.45, -1.2);
          sound('slurp');
        } else if (k === 'over') {
          G.play(ANIM.hit, { then: ANIM.idle });
          G.jumpUp(2.2);
          puff(-7.85, 1.2, -1.6, 26, ['#ffffff', '#fff4e0'], { speed: 1.4, size: [0.12, 0.2], grow: 3, life: [0.8, 1.4], alpha: 0.8 });
          ctx.shake(0.35);
          sound('sizzle');
          sound('boilover');
        } else if (k === 'under') {
          G.play(ANIM.no, { then: ANIM.idle });
          frost(-7.85, 1.15, -1.6, 22);
          sound('frost');
        } else {
          G.play(ANIM.no, { then: ANIM.idle });
        }
      },
    };
  }

  // ================================================================ chair (Baby Bear's little chair by the fire)
  {
    const g = new THREE.Group();
    root.add(g);
    const chair = makeLittleChair();
    // Small enough that she sits on it just right: the seat at the height the sit-down clip lands on.
    const CS = 1;
    const CX = 1.95;
    const CZ = -0.95;
    // Turned away from the fire and seen three-quarters from the front: she stands beside it (not in front of it), the sit
    // reads, and when it snaps she goes over backwards onto the open rug.
    const RY = -0.75;
    const FX = Math.sin(RY);
    const FZ = Math.cos(RY);
    const sitAt = (k) => [CX + FX * (0.46 - k * 0.22), CZ + FZ * (0.46 - k * 0.22)];
    chair.group.position.set(CX, 0, CZ);
    chair.group.scale.setScalar(CS);
    chair.group.rotation.y = RY;
    root.add(chair.group);
    const seatY = chair.H * CS;
    let broken = null;
    const s = { creak: 0 };
    stations.chair = {
      id: 'chair',
      group: g,
      frame: { target: [CX - 0.12, 0.48, CZ + 0.2], from: [0.25, 0.3, 1], radius: 1.15 },
      meter: { at: [CX - 0.9, 0, CZ + 0.12], s: 0.52, axis: 'down' },
      /** Whole again, turned to ry (the podium turns it to face the room and sits the winner in it). */
      rest(ry = RY) {
        broken = null;
        for (const p of chair.parts) {
          p.position.copy(p.userData.home);
          p.rotation.copy(p.userData.homeRot);
        }
        chair.group.scale.setScalar(CS);
        chair.group.rotation.set(0, ry, 0);
        return { x: CX + Math.sin(ry) * 0.24, z: CZ + Math.cos(ry) * 0.24, ry };
      },
      enter() {
        this.rest();
        const [x, z] = sitAt(0);
        goldi().place(x, 0, z, RY);
        goldi().scrub(ANIM.sitStart, 0);
      },
      update(dt, st) {
        const G = goldi();
        const v = st.v;
        // She lowers herself: the sit-down clip follows the gauge, reaching the seat at the band.
        const k = clamp01(v / Math.max(0.2, st.c));
        const crush = Math.max(0, v - st.c);
        if (!broken) {
          if (!(st.released && st.k !== 'under')) G.scrub(ANIM.sitStart, k * 0.98);
          // The seat gives as she presses past just right.
          const sq = 1 - Math.min(0.25, crush * 0.6);
          chair.group.scale.set(CS * (1 + (1 - sq) * 0.3), CS * sq, CS * (1 + (1 - sq) * 0.3));
          G.group.position.y = -crush * 0.1;
          const [x, z] = sitAt(k);
          G.group.position.x = x;
          G.group.position.z = z;
          if (st.holding && crush > 0.02) {
            chair.group.rotation.z = Math.sin(st.t * 40) * crush * 0.05;
            if (rate(s, 'creak', 2 + crush * 10, dt)) sound('creak', { pitch: 1 + crush });
          } else chair.group.rotation.z *= 0.8;
          chair.group.rotation.y = RY;
        } else {
          broken(dt);
          G.group.position.y = Math.min(0, G.group.position.y + dt);
        }
      },
      verdict(r) {
        const G = goldi();
        if (r.k === 'over') {
          // CRACK: the chair comes apart.
          broken = debris(chair.parts.map((p) => p), { floor: 0, power: 1.3 });
          chair.group.scale.setScalar(CS);
          puff(CX, 0.15, CZ, 18, ['#d8b98a', '#c9a47a'], { speed: 1.2, size: [0.1, 0.18], grow: 2.4, gravity: -0.2 });
          fx.emit(16, CX, 0.3, CZ, { shape: SHAPE.crumb, color: ['#c98a4e', '#8a5530'], speed: 2.2, spread: 1.3, size: [0.03, 0.06], life: [0.8, 1.4], gravity: 9, floor: 0.01, drag: 0.4, spin: 10 });
          ctx.shake(0.7, 1, 1);
          ctx.hitstop(110);
          // Down on her bottom among the pieces, then over on her back.
          G.play(ANIM.fall, { fade: 0.1, at: 0.3 });
          sound('crack');
        } else if (r.k === 'perfect' || r.k === 'good') {
          G.play(ANIM.sit, { fade: 0.25 });
          G.group.position.y = 0;
          sparkle(CX, seatY + 0.5, CZ + 0.1, r.k === 'perfect' ? 24 : 10);
          sound('cushion');
        } else if (r.k === 'under') {
          // Hovering: she gives up and stands.
          G.play(ANIM.sitEnd, { then: ANIM.no });
          sound('boing');
        } else {
          G.play(ANIM.idle);
        }
      },
    };
  }

  // ================================================================ pillow (Baby Bear's bed)
  {
    const g = new THREE.Group();
    root.add(g);
    const bed = ctx.assets.prop('bedSingle', { carpet: PAL.red });
    // The small bed: 0.42 tall.
    const box = new THREE.Box3().setFromObject(bed);
    const k = 0.44 / (box.max.y - box.min.y);
    bed.scale.setScalar(k);
    bed.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(bed);
    const BX = 8.15;
    const BZ = -1.2;
    bed.position.x += BX - (b2.min.x + b2.max.x) / 2;
    bed.position.z += BZ - (b2.min.z + b2.max.z) / 2;
    root.add(bed);
    const top = 0.4;
    const pillow = makePillow();
    pillow.group.position.set(BX, top, BZ - 0.42);
    pillow.group.scale.setScalar(0.85);
    root.add(pillow.group);
    pillow.set(0.55, 0);
    const s = { lastPump: -1, squish: 0, fluff: 0.2, flop: 0, onBed: false };
    stations.pillow = {
      id: 'pillow',
      group: g,
      frame: { target: [BX - 0.22, 0.5, BZ - 0.1], from: [0.03, 0.42, 1], radius: 1.15 },
      meter: { at: [BX + 0.62, 0, BZ + 0.55], s: 0.55 },
      enter() {
        Object.assign(s, { lastPump: -1, squish: 0, fluff: 0.15, flop: 0, onBed: false });
        goldi().place(BX - 0.58, 0, BZ - 0.42, Math.PI / 2);
        goldi().play(ANIM.idle);
        pillow.set(0.15, 0);
      },
      update(dt, st) {
        const G = goldi();
        const n = Math.round(st.v * 10);
        if (st.holding && n !== s.lastPump && n > 0) {
          s.lastPump = n;
          s.squish = 1;
          G.play(ANIM.punch, { restart: true, speed: 1.6, then: ANIM.hold });
          fx.emit(3, BX + (Math.random() - 0.5) * 0.3, top + 0.15, BZ - 0.42, { shape: SHAPE.feather, color: ['#ffffff', '#f6efe4'], speed: 0.9, spread: 1, size: [0.05, 0.08], life: [1.2, 2], gravity: 0.5, drag: 2.5, spin: 4, wobble: 2 });
          sound('whump', { pitch: 0.9 + st.v * 0.6 });
        }
        s.squish = Math.max(0, s.squish - dt * 5);
        // Over-stuffed past the band: it keeps swelling and trembles.
        const target = st.v * 1.7;
        s.fluff = lerp(s.fluff, target, Math.min(1, dt * 12));
        let tremble = 0;
        if (st.v > st.c + st.w) tremble = Math.sin(st.t * 40) * 0.03 * (st.v - st.c);
        pillow.set(s.fluff + tremble, s.squish * 0.6);
        if (s.onBed) {
          s.flop = Math.min(1, s.flop + dt * 2.2);
          const k = easeOut(s.flop);
          G.group.position.set(lerp(BX - 0.58, BX, k), top * k + Math.sin(k * Math.PI) * 0.35, lerp(BZ - 0.42, BZ - 0.1, k));
          if (s.flop > 0.95 && rate(s, 'z', 1.2, dt)) fx.emit(1, BX - 0.1, top + 0.55, BZ - 0.4, { shape: SHAPE.ring, color: ['#ffffff'], speed: 0.25, dir: [0.3, 1, 0], spread: 0.2, size: [0.06, 0.08], grow: 1.6, life: [1.6, 2], drag: 0.5, alpha: 0.8 });
        }
      },
      verdict(r) {
        const G = goldi();
        if (r.k === 'perfect' || r.k === 'good') {
          // She flops back onto the bed, head on the pillow.
          s.onBed = true;
          G.group.rotation.y = 0;
          G.play(ANIM.fall, { fade: 0.12, at: 0.3 });
          sparkle(BX, top + 0.3, BZ - 0.42, r.k === 'perfect' ? 22 : 10);
          sound('flop');
        } else if (r.k === 'over') {
          fx.emit(40, BX, top + 0.2, BZ - 0.42, { shape: SHAPE.feather, color: ['#ffffff', '#f6efe4', '#fff9ef'], speed: 2.4, spread: 1.4, size: [0.05, 0.09], life: [1.6, 2.6], gravity: 0.4, drag: 2.2, spin: 6, wobble: 2.5 });
          G.play(ANIM.hit, { then: ANIM.idle });
          G.jumpUp(2.4);
          ctx.shake(0.3);
          sound('poof');
        } else if (r.k === 'under') {
          G.play(ANIM.no, { then: ANIM.idle });
          sound('thud');
        } else G.play(ANIM.no, { then: ANIM.idle });
      },
    };
  }

  // ================================================================ toast (the counter)
  {
    const g = new THREE.Group();
    root.add(g);
    const toaster = makToasterAt(root);
    function makToasterAt(parent) {
      const t = makeToaster();
      t.group.position.set(-6.3, 0.655, -1.68);
      t.group.scale.setScalar(1.35);
      parent.add(t.group);
      return t;
    }
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.02, 24), new THREE.MeshStandardMaterial({ color: '#f7f1e6', roughness: 0.3 }));
    plate.position.set(-5.97, 0.665, -1.55);
    plate.castShadow = true;
    plate.receiveShadow = true;
    root.add(plate);
    const s = { lever: 0, pop: -1, smoke: 0 };
    const home = toaster.slices.map((sl) => sl.position.clone());
    stations.toast = {
      id: 'toast',
      group: g,
      frame: { target: [-6.3, 0.78, -1.45], from: [0.28, 0.4, 1], radius: 1.1 },
      meter: { at: [-5.45, 0.655, -1.72], s: 0.4 },
      enter() {
        s.lever = 0;
        s.pop = -1;
        toaster.slices.forEach((sl, i) => {
          sl.position.copy(home[i]);
          sl.rotation.set(0, 0, 0);
        });
        toaster.setDone(0);
        goldi().place(-6.95, 0, -1.2, 0.95);
        goldi().play(ANIM.idle);
      },
      update(dt, st) {
        const v = st.v;
        toaster.setDone(v);
        const down = st.holding ? 1 : 0;
        s.lever = lerp(s.lever, down, Math.min(1, dt * 14));
        toaster.lever.position.y = 0.2 - s.lever * 0.12;
        toaster.glowMat.opacity = st.holding ? 0.4 + v * 0.6 : Math.max(0, toaster.glowMat.opacity - dt * 2);
        if (s.pop < 0) toaster.slices.forEach((sl, i) => (sl.position.y = home[i].y - s.lever * 0.1));
        // Wisps, then smoke past golden.
        if (st.holding) {
          const n = rate(s, 'steam', 2 + v * 6, dt);
          if (n) puff(-6.3, 1.0, -1.68, n, ['#ffffff'], { speed: 0.3, size: [0.04, 0.08], grow: 3, alpha: 0.3, life: [0.8, 1.3] });
          const burnt = Math.max(0, v - st.c - st.w * 0.5);
          const m = rate(s, 'smoke', burnt * 40, dt);
          if (m) puff(-6.3, 1.0, -1.68, m, ['#4a4440', '#2e2a28'], { speed: 0.5, size: [0.06, 0.12], grow: 3.5, alpha: 0.6, life: [1, 1.8], wobble: 0.5 });
        }
        if (s.pop >= 0) {
          s.pop += dt;
          const t = s.pop;
          const high = st.k === 'under' ? 0.18 : 0.45;
          toaster.slices.forEach((sl, i) => {
            const h0 = home[i].y;
            if (st.k === 'perfect' || st.k === 'good') {
              // Up, a flip, and down onto the plate.
              const k = clamp01(t / 0.75);
              const tx = lerp(home[i].x, (plate.position.x - toaster.group.position.x) / 1.35 + (i - 0.5) * 0.05, smooth(0.15, 0.9, k));
              sl.position.x = tx;
              sl.position.z = lerp(home[i].z, (plate.position.z - toaster.group.position.z) / 1.35, smooth(0.15, 0.9, k));
              sl.position.y = h0 + Math.sin(k * Math.PI) * high * 1.4 + lerp(0, -0.05, k);
              sl.rotation.z = lerp(0, Math.PI / 2, smooth(0.2, 1, k)) * (i ? 1 : -1);
              sl.rotation.x = k * Math.PI * 2;
            } else {
              const y = h0 + Math.max(0, high * Math.sin(Math.min(Math.PI, (t / 0.6) * Math.PI)));
              sl.position.y = y;
            }
          });
          if (st.k === 'over' && t < 2) {
            const m = rate(s, 'burnt', 22, dt);
            if (m) puff(-6.3, 1.05, -1.68, m, ['#3c3634', '#24201e'], { speed: 0.8, size: [0.08, 0.14], grow: 4, alpha: 0.75, life: [1.2, 2], wobble: 0.8 });
          }
        }
      },
      verdict(r) {
        const G = goldi();
        s.pop = 0;
        sound('toastPop');
        if (r.k === 'perfect' || r.k === 'good') {
          G.play(ANIM.yes, { then: ANIM.idle });
          ctx.later(650, () => {
            sparkle(-5.85, 0.75, -1.55, r.k === 'perfect' ? 18 : 8);
            sound('plate');
          });
        } else if (r.k === 'over') {
          G.play(ANIM.hit, { then: ANIM.no });
          puff(-6.3, 1.05, -1.68, 20, ['#3c3634', '#24201e'], { speed: 1.2, size: [0.1, 0.16], grow: 4, alpha: 0.8 });
          ctx.shake(0.2);
          sound('cough');
        } else {
          G.play(ANIM.no, { then: ANIM.idle });
        }
      },
    };
  }

  // ================================================================ balloon (the parlour's party corner)
  {
    const g = new THREE.Group();
    root.add(g);
    const PX = 2.95;
    const PZ = -0.55;
    const pump = makePump();
    pump.group.position.set(PX, 0, PZ);
    pump.group.scale.setScalar(1.25);
    g.add(pump.group);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.08, 0), V(0.14, 0.05, 0.03), V(0.32, 0.18, 0.02), V(0.42, 0.45, 0)]), 20, 0.012, 6), new THREE.MeshStandardMaterial({ color: '#1D2440', roughness: 0.5 }));
    hose.position.set(PX, 0, PZ);
    hose.scale.setScalar(1.25);
    g.add(hose);
    const bal = makeBalloon('#d8323a');
    const BX = PX + 0.53;
    const BY = 0.6;
    bal.group.position.set(BX, BY, PZ);
    g.add(bal.group);
    const s = { stroke: 0, popped: false, floatT: -1, jiggle: 0, size: 0.1 };
    const sizeFor = (v) => 0.1 + v * 0.62;
    stations.balloon = {
      id: 'balloon',
      group: g,
      frame: { target: [PX + 0.3, 0.75, PZ], from: [0.05, 0.25, 1], radius: 1.05 },
      meter: { at: [PX + 1.0, 0, PZ - 0.3], s: 0.56 },
      enter() {
        Object.assign(s, { stroke: 0, popped: false, floatT: -1, jiggle: 0, size: 0.1 });
        bal.group.visible = true;
        bal.group.position.set(BX, BY, PZ);
        bal.mat.color.set('#d8323a');
        goldi().place(PX - 0.42, 0, PZ + 0.05, 1.3);
        goldi().play(ANIM.hold);
      },
      update(dt, st) {
        const G = goldi();
        const v = st.v;
        if (st.holding) {
          s.stroke += dt * 2.6 * (st.sp ?? 1);
          if (Math.floor(s.stroke) !== Math.floor(s.stroke - dt * 2.6 * (st.sp ?? 1))) {
            sound('pump', { pitch: 0.8 + v * 0.6 });
            s.jiggle = 1;
          }
        }
        const ph = (s.stroke % 1) * Math.PI * 2;
        pump.plunger.position.y = 0.42 - (st.holding ? (0.5 - 0.5 * Math.cos(ph)) * 0.22 : 0);
        G.body.position.y = st.holding ? -(0.5 - 0.5 * Math.cos(ph)) * 0.05 : 0;
        s.jiggle = Math.max(0, s.jiggle - dt * 4);
        if (!s.popped) {
          const target = sizeFor(v);
          s.size = lerp(s.size, target, Math.min(1, dt * 10));
          const near = clamp01((v - st.c - st.w) / 0.06);
          const tremble = st.holding ? near * Math.sin(st.t * 60) * 0.03 : 0;
          const j = Math.sin(st.t * 30) * s.jiggle * 0.05;
          bal.balloon.scale.set(s.size * (1 + j + tremble), s.size * (1 - j + tremble), s.size * (1 + j + tremble));
          bal.balloon.position.y = s.size * 0.62;
          // Thin and pale when it's about to go.
          bal.mat.color.set('#d8323a').lerp(new THREE.Color('#ff9a9a'), near * 0.6);
          bal.group.rotation.z = Math.sin(st.t * 1.3) * 0.06 + (s.floatT >= 0 ? Math.sin(st.t * 2) * 0.1 : 0);
          if (s.floatT >= 0) {
            s.floatT += dt;
            bal.group.position.y = BY + easeOut(s.floatT / 2.4) * 1.3;
            bal.group.position.x = BX + Math.sin(s.floatT * 1.5) * 0.08;
          }
        }
      },
      verdict(r) {
        const G = goldi();
        if (r.k === 'pop') {
          s.popped = true;
          bal.group.visible = false;
          const y = BY + s.size * 0.62;
          fx.emit(34, BX, y, PZ, { shape: SHAPE.confetti, color: ['#d8323a', '#b82a30', '#ff6a6a'], speed: 3.2, spread: 1.4, size: [0.04, 0.09], life: [0.9, 1.6], gravity: 3, drag: 1.6, spin: 12, floor: 0.01 });
          fx.emit(1, BX, y, PZ, { shape: SHAPE.ring, color: ['#ffffff'], speed: 0, size: [0.3, 0.3], grow: 6, life: [0.25, 0.25], additive: true, alpha: 0.9 });
          ctx.shake(0.6, 1, 1);
          ctx.hitstop(90);
          G.play(ANIM.hit, { then: ANIM.idle });
          G.jumpUp(2.8);
          sound('pop');
        } else if (r.k === 'perfect' || r.k === 'good') {
          s.floatT = 0;
          G.play(ANIM.yes, { then: ANIM.idle });
          sparkle(BX, BY + s.size, PZ, r.k === 'perfect' ? 22 : 10);
          sound('squeak', { pitch: 1.3 });
        } else if (r.k === 'over') {
          G.play(ANIM.no, { then: ANIM.idle });
          sound('squeak', { pitch: 0.7 });
        } else {
          G.play(ANIM.no, { then: ANIM.idle });
          sound('squeak', { pitch: 1.6 });
        }
      },
    };
  }

  // ================================================================ the dining table (cake, bowl, spoon and the boss share it)
  const TX0 = -3.58;
  const TX1 = -1.72;
  const TZ = -0.75;
  const TOP = 0.55;

  // ================================================================ cake
  {
    const g = new THREE.Group();
    root.add(g);
    const cake = makeCake(0.95);
    const CX = -2.65;
    cake.group.position.set(CX, TOP + 0.025, TZ - 0.05);
    g.add(cake.group);
    const knife = makeKnife();
    knife.scale.setScalar(1.25);
    g.add(knife);
    const s = { chop: -1, apart: 0 };
    const L = cake.L;
    stations.cake = {
      id: 'cake',
      group: g,
      clearsTable: true,
      frame: { target: [CX, 0.78, TZ - 0.15], from: [0, 0.48, 1], radius: 0.95 },
      meter: { at: [CX, 0.32, TZ + 0.52], s: 0.75, axis: 'right' },
      enter(P) {
        s.chop = -1;
        s.apart = 0;
        cake.set({ c: P.c0, w: P.w });
        goldi().place(CX - L / 2 - 0.28, 0, TZ - 0.72, Math.PI / 2);
        goldi().play(ANIM.hold);
      },
      update(dt, st) {
        const G = goldi();
        const x = CX - L / 2 + st.v * L;
        const top = TOP + 0.025 + cake.top;
        if (s.chop < 0) {
          G.group.position.x = x - 0.3;
          if (st.holding && G.currentName !== ANIM.walkHold) G.play(ANIM.walkHold, { speed: 0.8 });
          if (!st.holding && G.currentName === ANIM.walkHold) G.play(ANIM.hold);
          knife.position.set(x, top + 0.24 + Math.sin(st.t * 8) * 0.01, TZ - 0.05);
          knife.rotation.set(0, 0, 0);
          cake.set({ c: st.c, w: st.w });
        } else {
          s.chop += dt;
          const k = clamp01(s.chop / 0.14);
          knife.position.y = lerp(top + 0.24, top - 0.08, easeOut(k));
          s.apart = lerp(s.apart, s.chop > 0.25 ? 0.07 : 0, Math.min(1, dt * 8));
          const lopsided = st.k !== 'perfect' && st.k !== 'good';
          const tilt = lopsided && s.chop > 0.3 ? -Math.min(0.5, (s.chop - 0.3) * 1.5) * (st.v < 0.5 ? -1 : 1) * 0.0 : 0;
          cake.set({ c: st.c, w: st.w, cutAt: st.v, apart: s.apart, tilt });
          if (s.chop > 0.35) knife.position.y = lerp(knife.position.y, top + 0.3, Math.min(1, dt * 6));
        }
      },
      verdict(r) {
        const G = goldi();
        s.chop = 0;
        G.play(ANIM.chopEnd, { speed: 1.4, then: r.k === 'perfect' || r.k === 'good' ? ANIM.yes : ANIM.no });
        sound('chop');
        const x = CX - L / 2 + r.v * L;
        fx.emit(10, x, TOP + 0.2, TZ - 0.05, { shape: SHAPE.crumb, color: ['#e8c48c', '#fbeee0', '#c8442f'], speed: 1.2, spread: 1, size: [0.015, 0.03], life: [0.5, 0.9], gravity: 6, floor: TOP + 0.03, drag: 0.5, spin: 8 });
        if (r.k === 'perfect' || r.k === 'good') ctx.later(200, () => sparkle(x, TOP + 0.3, TZ - 0.05, r.k === 'perfect' ? 24 : 10));
        else ctx.later(300, () => sound('thud'));
        ctx.shake(0.12, 0, 1);
      },
    };
  }

  // ================================================================ bowl slide
  {
    const g = new THREE.Group();
    root.add(g);
    const bowl = makeBowl(0.13, '#b06a35');
    g.add(bowl.group);
    const startX = TX0 + 0.25;
    const span = TX1 - startX; // v = 1 is the very edge
    const mat = new THREE.Group();
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.42), new THREE.MeshStandardMaterial({ color: '#C8442F', roughness: 0.9 }));
    cloth.rotation.x = -Math.PI / 2;
    const checks = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.42), new THREE.MeshBasicMaterial({ color: '#F7E8CB', transparent: true, opacity: 0.35 }));
    checks.rotation.x = -Math.PI / 2;
    checks.position.y = 0.001;
    const notch = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.14, 32), new THREE.MeshBasicMaterial({ color: PAL.gold }));
    notch.rotation.x = -Math.PI / 2;
    notch.position.y = 0.002;
    mat.add(cloth, checks, notch);
    mat.position.set(0, TOP + 0.003, TZ);
    g.add(mat);
    const s = { fall: -1, shattered: false, last: 0 };
    let fallV = V(0, 0, 0);
    stations.bowl = {
      id: 'bowl',
      group: g,
      clearsTable: true,
      frame: { target: [(TX0 + TX1) / 2 + 0.1, 0.62, TZ], from: [0, 0.5, 1], radius: 1.18 },
      meter: { at: [(TX0 + TX1) / 2, 0.34, TZ + 0.55], s: 0.95, axis: 'right' },
      enter(P) {
        s.fall = -1;
        s.shattered = false;
        bowl.group.visible = true;
        bowl.group.rotation.set(0, 0, 0);
        bowl.group.position.set(startX, TOP, TZ);
        mat.position.x = startX + P.c0 * span;
        cloth.scale.x = Math.max(0.2, 2 * P.w * span + 0.12);
        checks.scale.x = cloth.scale.x;
        goldi().place(startX - 0.45, 0, TZ - 0.55, 0.9);
        goldi().play(ANIM.hold);
      },
      update(dt, st) {
        const G = goldi();
        const x = startX + Math.min(1.12, st.v) * span;
        mat.position.x = startX + st.c * span;
        if (s.fall < 0) {
          bowl.group.position.set(x, TOP, TZ);
          bowl.group.rotation.y += (x - s.last) * 6;
          if (st.released && Math.abs(x - s.last) > 0.0005 && rate(s, 'scr', 20, dt)) fx.emit(1, x - 0.1, TOP + 0.02, TZ, { shape: SHAPE.blob, color: ['#e8d3b0'], speed: 0.1, size: [0.03, 0.05], life: [0.3, 0.5], alpha: 0.5 });
          s.last = x;
          // She pushes it along while she holds.
          if (st.holding) {
            G.group.position.x = Math.min(x - 0.38, TX1 - 0.4);
            if (G.currentName !== ANIM.walkHold) G.play(ANIM.walkHold);
            G.current.timeScale = 0.6 + st.v * 2.2;
          } else if (G.currentName === ANIM.walkHold) G.play(ANIM.hold);
          if (st.released && st.v >= 0.985 && st.since > 0.55) {
            s.fall = 0;
            fallV = V(1.2, 0.4, 0.1);
          }
        } else {
          s.fall += dt;
          fallV.y -= 9.8 * dt;
          bowl.group.position.addScaledVector(fallV, dt);
          bowl.group.rotation.z -= dt * 6;
          if (bowl.group.position.y <= 0.02 && !s.shattered) {
            s.shattered = true;
            bowl.group.visible = false;
            const p = bowl.group.position;
            fx.emit(18, p.x, 0.05, p.z, { shape: SHAPE.crumb, color: ['#b06a35', '#8a4b2a'], speed: 2, spread: 1.2, size: [0.03, 0.06], life: [0.8, 1.4], gravity: 9, floor: 0.01, spin: 12, drag: 0.5 });
            fx.emit(14, p.x, 0.05, p.z, { shape: SHAPE.blob, color: ['#efe0c0', '#f6e9cc'], speed: 1.4, spread: 1.2, size: [0.04, 0.08], life: [0.8, 1.3], gravity: 7, floor: 0.01, drag: 0.6 });
            ctx.shake(0.45, 1, 1);
            ctx.hitstop(80);
            sound('smash');
          }
        }
      },
      verdict(r) {
        const G = goldi();
        sound('scrape');
        const settle = 650;
        ctx.later(settle, () => {
          if (r.k === 'perfect' || r.k === 'good') {
            G.play(ANIM.yes, { then: ANIM.idle });
            sparkle(startX + r.v * span, TOP + 0.15, TZ, r.k === 'perfect' ? 22 : 10);
            sound('clink');
          } else if (r.v >= 0.985) G.play(ANIM.hit, { then: ANIM.no });
          else G.play(ANIM.no, { then: ANIM.idle });
        });
      },
    };
  }

  // ================================================================ spoon (seated at the table, blowing on a hot spoonful)
  {
    const g = new THREE.Group();
    root.add(g);
    const SX = -2.2;
    const SZ = TZ - 0.8;
    const chair = ctx.assets.prop('chairCushion', { carpet: PAL.honey });
    {
      const b = new THREE.Box3().setFromObject(chair);
      chair.scale.setScalar(0.62 / (b.max.y - b.min.y));
      chair.rotation.y = 0;
      chair.updateMatrixWorld(true);
      const b2 = new THREE.Box3().setFromObject(chair);
      chair.position.x += SX - (b2.min.x + b2.max.x) / 2;
      chair.position.z += SZ - 0.08 - (b2.min.z + b2.max.z) / 2;
    }
    root.add(chair);
    const bowl = makeBowl(0.12, '#c8442f');
    bowl.group.position.set(SX, TOP, TZ - 0.25);
    g.add(bowl.group);
    const spoon = makeSpoon();
    spoon.group.scale.setScalar(1.6);
    g.add(spoon.group);
    const foodMat = spoon.food.material;
    const icy = new THREE.Color('#bfe0f5');
    const warm = new THREE.Color('#efe0c0');
    const hot = new THREE.Color('#ff8a3a');
    const s = { eat: -1 };
    stations.spoon = {
      id: 'spoon',
      group: g,
      clearsTable: true,
      frame: { target: [SX - 0.1, 0.74, SZ + 0.4], from: [-0.2, 0.24, 1], radius: 0.92 },
      meter: { at: [SX - 0.55, TOP, TZ - 0.3], s: 0.4 },
      enter() {
        s.eat = -1;
        goldi().place(SX, 0, SZ + 0.02, 0);
        goldi().play(ANIM.sit, { fade: 0 });
      },
      update(dt, st) {
        const G = goldi();
        const v = st.v;
        // The spoon in her hands, held up at her mouth (the eating clip, held where the hands are up).
        if (s.eat < 0) {
          if (st.holding || st.pressed) G.scrub(ANIM.sitEat, 0.6 + Math.sin(st.t * 2.4) * 0.04);
          else if (G.currentName !== ANIM.sit) G.play(ANIM.sit, { fade: 0.25 });
        }
        G.hands(_v);
        G.headAt(_w);
        const up = G.currentName === ANIM.sitEat ? 1 : 0;
        spoon.group.position.set(_v.x, _v.y + 0.05 * up, _v.z + 0.04);
        spoon.group.rotation.set(-0.5 + up * 0.2, 0.3, 0);
        if (v > 0.55) foodMat.color.copy(warm).lerp(hot, (v - 0.55) / 0.45);
        else if (v < 0.25) foodMat.color.copy(warm).lerp(icy, (0.25 - v) / 0.25);
        else foodMat.color.copy(warm);
        foodMat.emissive = foodMat.emissive || new THREE.Color();
        foodMat.emissive.setRGB(Math.max(0, v - 0.6) * 0.5, Math.max(0, v - 0.6) * 0.15, 0);
        spoon.food.visible = s.eat < 0.35;
        const sp = spoon.group.position;
        const n = rate(s, 'steam', v * 18 * (s.eat < 0 ? 1 : 0), dt);
        if (n) puff(sp.x, sp.y + 0.03, sp.z - 0.05, n, ['#ffffff'], { speed: 0.3 + v * 0.3, size: [0.03, 0.06], grow: 3, alpha: 0.25 + v * 0.4, life: [0.6, 1.1], wobble: 0.6 });
        if (v < 0.2 && rate(s, 'ice', (0.2 - v) * 30, dt)) frost(sp.x, sp.y, sp.z, 1);
        // Blowing: little puffs from her mouth toward the spoon.
        if (st.holding) {
          const m = rate(s, 'blow', 14, dt);
          if (m) fx.emit(m, _w.x, _w.y - 0.04, _w.z + 0.1, { shape: SHAPE.blob, color: ['#ffffff'], speed: 0.9, dir: [0, -0.4, 1], spread: 0.25, size: [0.02, 0.04], grow: 2, life: [0.25, 0.4], alpha: 0.4 });
          if (rate(s, 'whoo', 2.5, dt)) sound('blow');
        }
        if (s.eat >= 0) s.eat += dt;
        if (st.k === 'over' && s.eat > 0.3 && s.eat < 1.8 && rate(s, 'ears', 18, dt)) {
          for (const side of [-1, 1]) puff(_w.x + side * 0.12, _w.y + 0.25, _w.z, 1, ['#ffffff'], { speed: 1, dir: [side, 1, 0], spread: 0.2, size: [0.05, 0.08], grow: 2.5, alpha: 0.7, life: [0.5, 0.8] });
        }
      },
      verdict(r) {
        const G = goldi();
        s.eat = 0;
        G.play(ANIM.sitEat, { fade: 0.1, speed: 1.4 });
        sound('slurp');
        ctx.later(450, () => {
          G.headAt(_w);
          if (r.k === 'perfect' || r.k === 'good') {
            hearts(_w.x, _w.y + 0.25, _w.z);
            sparkle(_w.x, _w.y + 0.1, _w.z + 0.1, r.k === 'perfect' ? 18 : 8);
            G.play(ANIM.sit, { fade: 0.3 });
          } else if (r.k === 'over') {
            // Too hot: she jolts in her seat, steam out of her ears.
            G.jumpUp(2.4);
            G.kick(-0.3);
            G.play(ANIM.sit, { fade: 0.1 });
            sound('yelp');
            ctx.shake(0.25);
          } else if (r.k === 'under') {
            // Too cold: a shiver.
            frost(_w.x, _w.y, _w.z + 0.1, 20);
            G.play(ANIM.sit, { fade: 0.2 });
            for (let i = 0; i < 5; i++) ctx.later(i * 90, () => G.kick(i % 2 ? 0.08 : -0.08));
            sound('frost');
          } else G.play(ANIM.sit);
        });
      },
    };
  }

  // ================================================================ milk (on the stool at the counter)
  {
    const g = new THREE.Group();
    root.add(g);
    const GX = -5.55;
    const GZ = -1.47;
    const glass = makeGlass();
    glass.group.position.set(GX, 0.655, GZ);
    glass.group.scale.setScalar(1.15);
    root.add(glass.group);
    glass.set(0, 0.6, 0.07);
    const jug = makeJug();
    jug.group.scale.setScalar(1.25);
    g.add(jug.group);
    const stool = ctx.assets.prop('stoolRed');
    {
      const b = new THREE.Box3().setFromObject(stool);
      stool.scale.setScalar(0.34 / (b.max.y - b.min.y));
      stool.updateMatrixWorld(true);
      const b2 = new THREE.Box3().setFromObject(stool);
      stool.position.x += -6.05 - (b2.min.x + b2.max.x) / 2;
      stool.position.z += -1.2 - (b2.min.z + b2.max.z) / 2;
    }
    root.add(stool);
    const streamMat = new THREE.MeshStandardMaterial({ color: '#fbf8f2', roughness: 0.3 });
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 1, 10), streamMat);
    stream.geometry.translate(0, -0.5, 0);
    g.add(stream);
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshStandardMaterial({ color: '#fbf8f2', roughness: 0.15 }));
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(GX, 0.657, GZ + 0.05);
    g.add(puddle);
    const spoutW = V();
    const s = { tilt: 0, pour: 0, spill: 0 };
    const RY = -1.6;
    let stand = null;
    const surface = (v) => 0.655 + glass.surfaceY(v) * 1.15;
    stations.milk = {
      id: 'milk',
      group: g,
      frame: { target: [GX + 0.12, 0.9, GZ + 0.05], from: [-0.45, 0.28, 1], radius: 1.0 },
      meter: { at: [GX - 0.42, 0.655, GZ - 0.3], s: 0.4 },
      enter(P) {
        Object.assign(s, { tilt: 0, pour: 0, spill: 0 });
        puddle.scale.setScalar(0.001);
        stream.visible = false;
        glass.set(0, P.c0, P.w);
        const G = goldi();
        G.play(ANIM.hold, { fade: 0 });
        // Stand her (and her stool) where her hands, holding the jug, reach the glass.
        if (!stand) {
          G.place(-5.1, 0.34, -1.15, RY);
          G.update(1 / 60);
          G.group.updateMatrixWorld(true);
          G.hands(_v);
          stand = [-5.1 + (GX + 0.27 - _v.x), -1.15 + (GZ + 0.1 - _v.z)];
          stool.position.x += stand[0] - -6.05;
          stool.position.z += stand[1] - -1.2;
        }
        G.place(stand[0], 0.34, stand[1], RY);
      },
      update(dt, st) {
        const G = goldi();
        glass.set(st.v, st.c, st.w);
        // The jug in her hands, tipping over the glass while she holds.
        const want = st.holding ? 0.5 + Math.min(1, st.v * 1.4) * 0.9 : 0;
        s.tilt = lerp(s.tilt, want, Math.min(1, dt * (st.holding ? 6 : 4)));
        G.hands(_v);
        jug.group.position.set(_v.x + 0.03, Math.max(_v.y + 0.02, 0.92), _v.z);
        jug.group.rotation.set(0, RY - Math.PI / 2, -s.tilt);
        jug.group.updateMatrixWorld(true);
        spoutW.copy(jug.spoutTip).applyMatrix4(jug.group.matrixWorld);
        // The stream: on while the jug tips far enough, and for a moment after (the milk in the air).
        const flowing = st.holding ? s.tilt > 0.55 : st.released && st.since >= 0 && st.since < 0.3;
        stream.visible = flowing;
        if (flowing) {
          const bottom = Math.min(surface(st.v), spoutW.y - 0.02);
          stream.position.copy(spoutW);
          stream.scale.y = Math.max(0.01, spoutW.y - bottom);
          stream.position.x = lerp(spoutW.x, GX, 0.6);
          stream.position.z = lerp(spoutW.z, GZ, 0.6);
          if (rate(s, 'drops', 20, dt)) fx.emit(1, GX, surface(st.v) + 0.01, GZ, { shape: SHAPE.drop, color: ['#ffffff'], speed: 0.6, spread: 0.8, size: [0.015, 0.025], life: [0.2, 0.35], gravity: 6 });
        }
        if (st.k === 'over' && st.since >= 0) {
          s.spill = Math.min(1, s.spill + dt * 1.2);
          puddle.scale.setScalar(Math.max(0.001, easeOut(s.spill)));
          if (s.spill < 0.8 && rate(s, 'drip', 26, dt)) fx.emit(1, GX + (Math.random() - 0.5) * 0.2, 0.66, GZ + 0.12, { shape: SHAPE.drop, color: ['#ffffff', '#f6f2ea'], speed: 0.2, dir: [0, -1, 0.2], size: [0.02, 0.035], life: [0.5, 0.8], gravity: 6, floor: 0.0 });
        }
      },
      verdict(r) {
        const G = goldi();
        ctx.later(360, () => {
          if (r.k === 'perfect' || r.k === 'good') {
            G.play(ANIM.yes, { then: ANIM.hold });
            sparkle(GX, surface(r.v), GZ, r.k === 'perfect' ? 22 : 10);
            sound('clink');
          } else if (r.k === 'over') {
            G.play(ANIM.hit, { then: ANIM.hold });
            fx.emit(18, GX, surface(1) + 0.02, GZ, { shape: SHAPE.drop, color: ['#ffffff'], speed: 1.4, spread: 1.2, size: [0.02, 0.04], life: [0.5, 0.9], gravity: 7, floor: 0.66 });
            sound('splash');
          } else G.play(ANIM.no, { then: ANIM.hold });
        });
      },
    };
  }

  // ================================================================ honey jar (the beehive crane in the garden)
  {
    const g = new THREE.Group();
    root.add(g);
    const perm = new THREE.Group();
    root.add(perm);
    // Out by the front door, where the bears' path leaves for the woods.
    const JX = -12.6;
    const JZ = 2.5;
    const beamY = 1.75;
    const x0 = JX - 0.9;
    const x1 = JX + 0.9;
    const wood = new THREE.MeshStandardMaterial({ color: '#7a4a2a', roughness: 0.75 });
    const post = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.1, beamY + 0.3, 0.1), wood));
    post.position.set(x0 - 0.15, (beamY - 0.3) / 2 - 0.15 + 0.15, JZ - 0.25);
    const post2 = post.clone();
    post2.position.x = x1 + 0.15;
    const beam = shadowed(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.5, 0.09, 0.09), wood));
    beam.position.set(JX, beamY, JZ - 0.25);
    perm.add(post, post2, beam);
    // The winch she turns: a wheel on the left post.
    const winch = new THREE.Group();
    {
      const red = new THREE.MeshStandardMaterial({ color: '#C8442F', roughness: 0.5 });
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 28), red);
      winch.add(rim);
      for (let i = 0; i < 3; i++) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.02), red);
        sp.rotation.z = (i / 3) * Math.PI;
        winch.add(sp);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d4a640', roughness: 0.3, metalness: 0.7 }));
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 8).rotateX(Math.PI / 2), wood);
      handle.position.set(0.15, 0, 0.05);
      winch.add(hub, handle);
      winch.position.set(x0 - 0.15, -0.3 + 0.62, JZ - 0.25 + 0.08);
      perm.add(shadowed(winch));
    }
    const trolley = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), new THREE.MeshStandardMaterial({ color: '#C8442F', roughness: 0.5 })));
    perm.add(trolley);
    const rope = makeRope();
    perm.add(rope.mesh);
    const jar = makeHoneyJar(1.3);
    perm.add(jar);
    // The stack it lands on: a crate with two jars.
    const stack = new THREE.Group();
    const crate = makeCrate(0.38, 0.3);
    stack.add(crate);
    const j1 = makeHoneyJar(1.3);
    j1.position.y = 0.3;
    const j2 = makeHoneyJar(1.3);
    j2.position.y = 0.3 + 0.26;
    stack.add(j1, j2);
    perm.add(stack);
    const stackTop = 0.3 + 0.26 * 2;
    // Beehives behind: stacked boxes with roofs.
    for (const [hx, hz] of [
      [JX - 1.3, JZ - 1.2],
      [JX + 1.4, JZ - 1.4],
    ]) {
      const hive = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.46 - i * 0.03, 0.2, 0.4 - i * 0.03), new THREE.MeshStandardMaterial({ color: i % 2 ? '#f2d16b' : '#e8b84a', roughness: 0.7 }));
        b.position.y = 0.1 + i * 0.2;
        hive.add(b);
      }
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.22, 4), new THREE.MeshStandardMaterial({ color: '#7a4a2a', roughness: 0.7 }));
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 0.71;
      hive.add(roof);
      hive.position.set(hx, -0.3, hz);
      perm.add(shadowed(hive));
    }
    const s = { drop: -1, dy: 0, vy: 0, swing: 0, swingV: 0, lastX: 0, smashed: false, wobble: 0 };
    const xAt = (v) => x0 + v * (x1 - x0);
    const G0 = -0.3; // the garden ground
    // At rest until a page brings it to life.
    stack.position.set(xAt(0.62), G0, JZ);
    trolley.position.set(xAt(0.2), beamY - 0.06, JZ - 0.25);
    jar.position.set(xAt(0.2), beamY - 0.06 - 0.62 - 0.24, JZ - 0.25);
    rope.between(trolley.position, _v.set(jar.position.x, jar.position.y + 0.24, jar.position.z));
    stations.jar = {
      id: 'jar',
      group: g,
      frame: { target: [JX - 0.1, 1.1, JZ], from: [0, 0.14, 1], radius: 1.5 },
      meter: { at: [JX, 2.12, JZ - 0.25], s: 0.85, axis: 'right' },
      enter(P) {
        Object.assign(s, { drop: -1, dy: 0, vy: 0, swing: 0, swingV: 0, lastX: xAt(0.08), smashed: false, wobble: 0 });
        jar.visible = true;
        jar.rotation.set(0, 0, 0);
        stack.position.set(xAt(P.c0), G0, JZ);
        goldi().place(x0 - 0.5, G0, JZ - 0.05, Math.PI / 2 - 0.35);
        goldi().play(ANIM.hold);
      },
      update(dt, st) {
        const G = goldi();
        const x = xAt(st.v);
        stack.position.x = xAt(st.c);
        trolley.position.set(s.drop < 0 ? x : trolley.position.x, beamY - 0.06, JZ - 0.25);
        if (s.drop < 0) winch.rotation.z = -st.v * Math.PI * 5;
        // The jar swings under the trolley (it lags the trolley's acceleration).
        const acc = (x - s.lastX) / Math.max(1e-4, dt);
        s.lastX = x;
        s.swingV += (-s.swing * 40 - acc * 1.2 - s.swingV * 3) * dt;
        s.swing += s.swingV * dt;
        const ropeLen = 0.62;
        if (s.drop < 0) {
          const a = s.swing * 0.5;
          jar.position.set(trolley.position.x + Math.sin(a) * ropeLen, beamY - 0.06 - Math.cos(a) * ropeLen - 0.24, JZ - 0.25);
          jar.rotation.z = a;
          rope.mesh.visible = true;
          rope.between(trolley.position, _v.set(jar.position.x, jar.position.y + 0.24, jar.position.z));
        } else {
          rope.between(trolley.position, _v.set(trolley.position.x, trolley.position.y - 0.25, trolley.position.z));
          s.drop += dt;
          if (!s.landed) {
            s.vy -= 9.8 * dt;
            jar.position.y += s.vy * dt;
            jar.position.z = lerp(jar.position.z, JZ, Math.min(1, dt * 8));
            const onStack = Math.abs(jar.position.x - stack.position.x) < 0.2 && st.k !== 'under' && st.k !== 'over';
            const floorY = onStack ? G0 + stackTop : G0;
            if (jar.position.y <= floorY) {
              jar.position.y = floorY;
              s.landed = true;
              if (onStack) {
                jar.position.x = lerp(jar.position.x, stack.position.x, st.k === 'perfect' ? 1 : 0.5);
                s.wobble = st.k === 'perfect' ? 0.2 : 1;
                sound('clink', { pitch: 1.2 });
                sparkle(stack.position.x, G0 + stackTop + 0.2, JZ, st.k === 'perfect' ? 26 : 10);
              } else {
                jar.visible = false;
                fx.emit(16, jar.position.x, G0 + 0.05, JZ, { shape: SHAPE.crumb, color: ['#e59a1e', '#f2b33d', '#c87a10'], speed: 1.8, spread: 1.2, size: [0.03, 0.06], life: [0.7, 1.2], gravity: 8, floor: G0 + 0.01, spin: 10 });
                fx.emit(12, jar.position.x, G0 + 0.05, JZ, { shape: SHAPE.blob, color: ['#e59a1e', '#f2b33d'], speed: 1, spread: 1, size: [0.05, 0.1], life: [0.8, 1.3], gravity: 6, floor: G0 + 0.01 });
                ctx.shake(0.35, 1, 1);
                sound('smash');
              }
            }
          } else if (s.wobble > 0) {
            s.wobble = Math.max(0, s.wobble - dt * 1.5);
            jar.rotation.z = Math.sin(s.drop * 18) * s.wobble * 0.12;
          }
        }
        if (st.holding && G.currentName !== ANIM.hold) G.play(ANIM.hold);
      },
      verdict(r) {
        const G = goldi();
        s.drop = 0;
        s.vy = 0;
        s.landed = false;
        jar.rotation.z = 0;
        sound('rope');
        ctx.later(420, () => {
          if (r.k === 'perfect' || r.k === 'good') G.play(ANIM.yes, { then: ANIM.idle });
          else G.play(ANIM.no, { then: ANIM.idle });
        });
      },
    };
  }

  // ================================================================ bell (the strength tester)
  {
    const g = new THREE.Group();
    root.add(g);
    // Across the pond, by the well.
    const BX = 21.2;
    const BZ = 0.6;
    const G0 = -0.3;
    const striker = makeStriker(2.4);
    striker.group.position.set(BX, G0, BZ);
    root.add(striker.group);
    const mallet = makeMallet();
    mallet.scale.setScalar(1.2);
    g.add(mallet);
    const s = { hit: -1, peak: 0, bellOff: null, bellV: V(), spin: 0, wind: 0 };
    stations.bell = {
      id: 'bell',
      group: g,
      frame: { target: [BX + 0.1, 1.12, BZ + 0.2], from: [0.12, 0.1, 1], radius: 1.7 },
      meter: { at: [BX + 0.9, G0, BZ + 0.35], s: 0.62, ground: G0 },
      enter(P) {
        Object.assign(s, { hit: -1, peak: 0, bellOff: null, spin: 0, wind: 0 });
        striker.bell.position.set(0, 2.4 + 0.12, 0.05);
        striker.bell.rotation.set(0, 0, 0);
        striker.puck.position.y = striker.yAt(0);
        striker.setBand(P.c0, P.w);
        goldi().place(BX - 0.5, G0, BZ + 0.55, 0.9);
        goldi().play(ANIM.idle);
      },
      update(dt, st) {
        const G = goldi();
        striker.setBand(st.c, st.w);
        // Winding up: the mallet rises with the strength.
        if (st.holding) {
          if (G.currentName !== ANIM.chopStart && G.currentName !== ANIM.chop) G.play(ANIM.chopStart, { then: ANIM.chop });
          s.wind = st.v;
        }
        G.hands(_v);
        if (s.hit < 0) {
          mallet.position.copy(_v);
          mallet.rotation.set(0, 0.9, st.holding ? -0.4 - s.wind * 1.2 : -0.2);
          striker.puck.position.y = lerp(striker.puck.position.y, striker.yAt(0), Math.min(1, dt * 6));
        } else {
          s.hit += dt;
          // The swing down.
          const k = clamp01(s.hit / 0.12);
          mallet.position.copy(_v);
          mallet.rotation.set(0, 0.9, lerp(-0.4 - s.wind * 1.2, 1.3, easeOut(k)));
          // The puck flies up to the strength, then falls back.
          const up = clamp01((s.hit - 0.1) / 0.45);
          const down = clamp01((s.hit - 0.75) / 0.6);
          const reach = Math.min(1.08, st.v);
          striker.puck.position.y = striker.yAt(reach * easeOut(up) * (1 - down * down));
          if (s.bellOff) {
            s.bellV.y -= 9.8 * dt;
            striker.bell.position.addScaledVector(s.bellV, dt);
            striker.bell.rotation.z += s.spin * dt;
            if (striker.bell.position.y < -G0 * 0 + 0.05) {
              striker.bell.position.y = 0.05;
              s.bellV.set(0, 0, 0);
              s.spin = 0;
            }
          } else if (s.ring > 0) {
            s.ring = Math.max(0, s.ring - dt * 0.8);
            striker.bell.rotation.z = Math.sin(s.hit * 26) * s.ring * 0.4;
          }
        }
      },
      verdict(r) {
        const G = goldi();
        s.hit = 0;
        s.ring = 0;
        G.play(ANIM.chopEnd, { fade: 0.05, speed: 1.3, then: ANIM.idle });
        sound('thwack');
        ctx.later(90, () => {
          ctx.shake(0.2, 0, 1);
          fx.emit(8, BX, G0 + 0.2, BZ + 0.15, { shape: SHAPE.puff, color: ['#d8c9a8'], speed: 0.8, spread: 1, size: [0.06, 0.1], grow: 2, life: [0.4, 0.7] });
        });
        const atTop = 100 + 450;
        if (r.k === 'perfect' || r.k === 'good') {
          ctx.later(atTop, () => {
            s.ring = 1;
            sound('bell');
            sparkle(BX, G0 + 2.5, BZ + 0.1, r.k === 'perfect' ? 30 : 14);
            G.play(ANIM.yes, { then: ANIM.idle });
          });
        } else if (r.k === 'over') {
          ctx.later(atTop - 40, () => {
            s.bellOff = true;
            s.bellV.set(1.6, 4.2, 0.6);
            s.spin = 9;
            sound('clang');
            sparkle(BX, G0 + 2.5, BZ + 0.1, 16, ['#ffffff', '#ffe08a']);
            ctx.shake(0.35, 1, 1);
            G.play(ANIM.hit, { then: ANIM.no });
          });
        } else {
          ctx.later(atTop + 200, () => G.play(ANIM.no, { then: ANIM.idle }));
        }
      },
    };
  }

  // ================================================================ rope swing (over the pond)
  {
    const g = new THREE.Group();
    root.add(g);
    const G0 = -0.3;
    const perm = new THREE.Group();
    root.add(perm);
    const PIV = V(13.6, 3.7, 0.2);
    const ROPE = 2.55;
    const tree = ctx.assets.prop('tree4', null);
    tree.scale.setScalar(1.25);
    tree.position.set(12.4, G0, -1.1);
    tree.rotation.y = 0.6;
    perm.add(tree);
    // A branch out over the water to hang the rope from.
    const branch = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 2.0, 8), new THREE.MeshStandardMaterial({ color: '#6e4127', roughness: 0.9 })));
    branch.rotation.z = Math.PI / 2 + 0.15;
    branch.position.set(13.0, 3.82, 0.0);
    perm.add(branch);
    const rope = makeRope('#d9b878', 0.016);
    perm.add(rope.mesh);
    rope.between(PIV, V(PIV.x, PIV.y - ROPE, PIV.z));
    const startX = 13.6;
    const span = 6.6;
    const xAt = (v) => startX + v * span;
    // The landing raft: a little floating dock.
    const raft = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.8), new THREE.MeshStandardMaterial({ color: i % 2 ? '#a8703f' : '#b98250', roughness: 0.8 }));
      p.position.x = (i - 2) * 0.17;
      raft.add(p);
    }
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.14), new THREE.MeshStandardMaterial({ color: '#58c95a', side: THREE.DoubleSide, emissive: new THREE.Color('#2a7a2c'), emissiveIntensity: 0.4 }));
    flag.position.set(0, 0.55, -0.35);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 6), new THREE.MeshStandardMaterial({ color: '#7a4a2a' }));
    pole.position.set(-0.11, 0.3, -0.35);
    raft.add(flag, pole);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 32), new THREE.MeshBasicMaterial({ color: PAL.gold, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.035;
    raft.add(ring);
    perm.add(shadowed(raft));
    raft.position.set(xAt(0.5), G0 + 0.03, 0.2);
    const s = { phase: 'swing', fly: 0, from: V(), to: V(), landX: 0, bob: 0 };
    stations.swing = {
      id: 'swing',
      group: g,
      frame: { target: [15.6, 1.45, 0.2], from: [0, 0.14, 1], radius: 3.1 },
      meter: { at: [16.6, 3.05, -0.4], s: 1.4, axis: 'right' },
      enter(P) {
        Object.assign(s, { phase: 'swing', fly: 0, bob: 0 });
        raft.position.set(xAt(P.c0), G0 + 0.03, 0.2);
        raft.scale.x = Math.max(0.35, (2 * P.w * span) / 0.85);
        goldi().place(PIV.x, PIV.y - ROPE, PIV.z, Math.PI / 2);
        goldi().play(ANIM.hold);
      },
      update(dt, st) {
        const G = goldi();
        raft.position.x = xAt(st.c);
        raft.position.y = G0 + 0.03 + Math.sin(st.t * 1.6) * 0.012;
        if (s.phase === 'swing') {
          // The swing's angle: back and forth, growing; forward tops at 1, 3 and 5 seconds of effective hold.
          const e = (st.hold / 1000) * (st.sp ?? 1);
          const amp = st.pressed ? Math.min(1, 0.275 + 0.125 * e) : 0.12;
          const ang = st.pressed ? -amp * Math.cos(Math.PI * e) * 0.95 : Math.sin(st.t * 1.4) * 0.08;
          const hx = PIV.x + Math.sin(ang) * ROPE;
          const hy = PIV.y - Math.cos(ang) * ROPE;
          G.group.position.set(hx, hy - 0.95, PIV.z);
          G.group.rotation.set(0, Math.PI / 2, -ang * 0.6);
          rope.between(PIV, _v.set(hx, hy, PIV.z));
          if (G.currentName !== ANIM.hold) G.play(ANIM.hold);
          if (st.holding && rate(s, 'woosh', Math.abs(Math.sin(Math.PI * e)) * 1.2, dt)) sound('whoosh', { pitch: 0.8 + amp * 0.5 });
          s.from.copy(G.group.position);
        } else {
          s.fly += dt;
          const T = 0.62;
          const k = clamp01(s.fly / T);
          const x = lerp(s.from.x, s.landX, k);
          const arc = Math.sin(k * Math.PI) * (0.8 + (s.landX - s.from.x) * 0.1);
          const yEnd = s.water ? G0 - 0.55 : G0 + 0.06;
          G.group.position.set(x, lerp(s.from.y, yEnd, k) + arc, PIV.z);
          G.group.rotation.set(0, Math.PI / 2, lerp(G.group.rotation.z, 0, Math.min(1, dt * 8)));
          rope.between(PIV, _v.set(PIV.x + Math.sin(Math.sin(s.fly * 3) * 0.3) * ROPE, PIV.y - Math.cos(0.2) * ROPE, PIV.z));
          if (k >= 1 && !s.landed) {
            s.landed = true;
            if (s.water) {
              house.splash(x, PIV.z);
              fx.emit(40, x, G0 + 0.05, PIV.z, { shape: SHAPE.drop, color: ['#bfe6f0', '#ffffff', '#8fcfe0'], speed: 3.2, spread: 0.7, dir: [0, 1, 0], size: [0.04, 0.08], life: [0.6, 1.1], gravity: 9, floor: G0 });
              fx.emit(1, x, G0 + 0.04, PIV.z, { shape: SHAPE.ring, color: ['#ffffff'], speed: 0, size: [0.4, 0.4], grow: 5, life: [0.6, 0.6], alpha: 0.7 });
              ctx.shake(0.4, 1, 1);
              ctx.hitstop(70);
              sound('splash');
              G.play(ANIM.hit, { then: ANIM.idle });
            } else {
              G.play(ANIM.land, { then: s.good ? ANIM.yes : ANIM.no });
              sparkle(x, G0 + 0.3, PIV.z, s.perfect ? 26 : 10);
              fx.emit(8, x, G0 + 0.05, PIV.z, { shape: SHAPE.puff, color: ['#e8d3b0'], speed: 0.6, spread: 1, size: [0.06, 0.1], grow: 2, life: [0.4, 0.7] });
              sound(s.good ? 'step' : 'thud');
            }
          }
          if (s.water && s.landed) {
            s.bob += dt;
            G.group.position.y = G0 - 0.55 + Math.sin(s.bob * 3) * 0.04;
          }
        }
      },
      verdict(r) {
        const G = goldi();
        s.phase = 'fly';
        s.fly = 0;
        s.landed = false;
        s.landX = xAt(r.v);
        s.good = r.k === 'perfect' || r.k === 'good';
        s.perfect = r.k === 'perfect';
        s.water = !s.good && s.landX < 20.2;
        G.play(ANIM.jump, { then: ANIM.jumpIdle });
        sound('whoosh', { pitch: 1.3 });
      },
      /** Where the camera should look while she flies. */
      follow() {
        return s.phase === 'fly' ? goldi().group.position : null;
      },
    };
  }

  // ================================================================ the boss: The Three Bowls
  {
    const g = new THREE.Group();
    root.add(g);
    const bowls = [makeBowl(0.17, '#7a4a2a'), makeBowl(0.14, '#c98a4e'), makeBowl(0.11, '#C8442F')];
    const xs = [-3.25, -2.65, -2.05];
    const table = new THREE.Group();
    root.add(table);
    bowls.forEach((b, i) => {
      b.group.position.set(xs[i], TOP, TZ - 0.1);
      table.add(b.group);
    });
    const spot = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 32), new THREE.MeshBasicMaterial({ color: PAL.gold, transparent: true, opacity: 0.85 }));
    spot.rotation.x = -Math.PI / 2;
    spot.position.y = TOP + 0.004;
    g.add(spot);
    const cold = new THREE.Color('#b9c8d6');
    const warm = new THREE.Color('#f2dfb6');
    const hot = new THREE.Color('#f0a34a');
    const s = { which: 0 };
    stations.bowls = {
      id: 'bowls',
      group: g,
      /** The three bowls stay on the table, except while the table holds another page. */
      table,
      clearsTable: false,
      frame: { target: [-2.65, 0.82, TZ - 0.15], from: [0, 0.38, 1], radius: 1.15 },
      meter: { at: [-1.75, TOP, TZ - 0.35], s: 0.4 },
      enter(P) {
        s.which = Math.max(0, Math.min(2, (P.bo ?? 1) - 1));
        spot.position.x = xs[s.which];
        spot.position.z = TZ - 0.1;
        goldi().place(xs[s.which], 0, TZ - 0.75, 0);
        goldi().play(ANIM.hold);
        bowls.forEach((b) => b.porridge.material.color.copy(warm));
      },
      update(dt, st) {
        const b = bowls[s.which];
        const heat = st.v;
        const c = b.porridge.material.color;
        if (heat < 0.5) c.copy(cold).lerp(warm, heat / 0.5);
        else c.copy(warm).lerp(hot, (heat - 0.5) / 0.5);
        const n = rate(s, 'steam', heat * 16, dt);
        if (n) puff(xs[s.which], TOP + 0.12, TZ - 0.1, n, ['#ffffff'], { speed: 0.3 + heat * 0.4, size: [0.05, 0.09], grow: 3, alpha: 0.25 + heat * 0.4, life: [0.8, 1.3], wobble: 0.5 });
        const G = goldi();
        G.group.position.x = lerp(G.group.position.x, xs[s.which], Math.min(1, dt * 10));
        spot.material.opacity = 0.6 + Math.sin(st.t * 6) * 0.25;
      },
      verdict(r) {
        const G = goldi();
        if (r.k === 'perfect' || r.k === 'good') {
          sparkle(xs[s.which], TOP + 0.2, TZ - 0.1, r.k === 'perfect' ? 22 : 10);
          G.play(ANIM.yes, { then: ANIM.hold });
          sound('slurp');
        } else {
          G.play(ANIM.no, { then: ANIM.hold });
          sound(r.k === 'under' ? 'frost' : 'sizzle');
        }
      },
    };
  }

  // Everything hidden until its page.
  for (const st of Object.values(stations)) st.group.visible = false;
  return stations;
}
