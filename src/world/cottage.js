// The bears' cottage: a cut-away dollhouse in a forest clearing at golden hour. Four rooms side by side (kitchen, dining room,
// parlour, bedroom) with papered walls over wainscots, windows, gables and a shingled roof behind, the garden to the right
// (pond, swing tree, beehives, a bell post) and the forest all round. Built once; the stations add the things that move.
import * as THREE from 'three';
import { floorTexture, wallTexture, stoneTexture, shingleTexture, grassTexture, blotTexture, shaftTexture, buntingTexture, rugTexture } from './textures.js';
import { createRng } from '../core/rng.js';
import { PAL } from '../gfx/palette.js';

export const ROOM = {
  kitchen: [-9.4, -4.8],
  dining: [-4.8, -0.2],
  parlour: [-0.2, 4.4],
  bedroom: [4.4, 9.0],
};
export const BACK = -2.0; // inner face of the back wall
export const FRONT = 1.8; // the cut-away front edge
export const WALL_H = 2.5;
export const GROUND = -0.3;

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const SKY_FRAG = /* glsl */ `
uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir; uniform vec3 sunColor;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 c = mix(horizon, top, smoothstep(0.0, 0.55, h));
  c = mix(c, ground, smoothstep(0.0, -0.2, h));
  float s = max(0.0, dot(d, normalize(sunDir)));
  c += sunColor * (pow(s, 6.0) * 0.35 + pow(s, 80.0) * 0.8 + pow(s, 900.0) * 3.0);
  // A few soft cloud bands.
  float band = sin(d.x * 7.0 + d.z * 3.0) * 0.5 + 0.5;
  c += vec3(1.0, 0.9, 0.75) * smoothstep(0.08, 0.2, h) * smoothstep(0.38, 0.2, h) * band * 0.06;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

const WATER_VERT = /* glsl */ `
varying vec3 vW; varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const WATER_FRAG = /* glsl */ `
uniform float time; uniform vec3 deep; uniform vec3 shallow; uniform vec3 sky; uniform vec3 sunDir; uniform vec2 ripple; uniform float rippleT;
varying vec3 vW; varying vec2 vUv;
void main() {
  vec2 p = vW.xz;
  float w = sin(p.x * 3.1 + time * 1.3) * 0.5 + sin(p.y * 4.3 - time * 1.1) * 0.5 + sin((p.x + p.y) * 6.0 + time * 2.0) * 0.25;
  // A ring where something fell in.
  float rd = length(p - ripple);
  float ring = rippleT < 3.0 ? sin(rd * 14.0 - rippleT * 12.0) * exp(-rd * 1.4) * exp(-rippleT * 1.2) : 0.0;
  w += ring * 3.0;
  vec3 n = normalize(vec3(cos(p.x * 3.1 + time) * 0.06 + ring * 0.2, 1.0, cos(p.y * 4.3 - time) * 0.06));
  vec3 v = normalize(cameraPosition - vW);
  float fres = pow(1.0 - max(0.0, dot(n, v)), 3.0);
  float edge = smoothstep(0.5, 0.35, length(vUv - 0.5));
  vec3 c = mix(shallow, deep, edge * 0.8);
  c = mix(c, sky, fres * 0.7);
  vec3 h = normalize(normalize(sunDir) + v);
  float spec = pow(max(0.0, dot(n, h)), 120.0);
  c += vec3(1.0, 0.85, 0.6) * spec * 1.6;
  c += vec3(1.0) * smoothstep(0.92, 1.0, w * 0.5 + 0.5) * 0.08;
  float a = smoothstep(0.5, 0.46, length(vUv - 0.5));
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}`;

/** Places a model so its height (or width/depth) is `h` metres; returns it. */
export function fit(obj, { h, w, d, s } = {}) {
  if (s) {
    obj.scale.setScalar(s);
    return obj;
  }
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const k = h ? h / size.y : w ? w / size.x : d ? d / size.z : 1;
  if (!Number.isFinite(k) || k <= 0) return obj;
  obj.scale.multiplyScalar(k);
  return obj;
}

/** Sits a model's bottom on y, centred on x/z (its own pivot may be anywhere). */
export function seat(obj, x, y, z) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) {
    obj.position.set(x, y, z);
    return obj;
  }
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x += x - c.x;
  obj.position.z += z - c.z;
  obj.position.y += y - box.min.y;
  return obj;
}

export function buildCottage(gfx, assets) {
  const { scene } = gfx;
  const root = new THREE.Group();
  root.name = 'cottage';
  scene.add(root);
  const rng = createRng('cottage');
  const lit = (o) => {
    o.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return o;
  };
  const add = (o, parent = root) => {
    parent.add(o);
    return o;
  };
  const prop = (key, opts = {}) => {
    const o = assets.prop(key, opts.colors ?? null, { shadows: opts.shadows ?? true });
    if (opts.ry) o.rotation.y = opts.ry;
    fit(o, opts);
    seat(o, opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
    return add(o, opts.parent ?? root);
  };

  /** A braided rug on the floor: w × d metres. */
  const rug = (w, d, colors, x, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), new THREE.MeshStandardMaterial({ map: rugTexture(colors, `rug:${x}`), roughness: 0.95, transparent: true, alphaTest: 0.5 }));
    m.rotation.set(-Math.PI / 2, 0, ry);
    m.scale.set(w, d, 1);
    m.position.set(x, 0.006, z);
    m.receiveShadow = true;
    return add(m);
  };

  // ---------------------------------------------------------------- sky, fog, ground
  const sunDir = new THREE.Vector3(-0.62, 0.38, 0.42).normalize();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(300, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        top: { value: new THREE.Color('#7fb0d6') },
        horizon: { value: new THREE.Color('#f7d7a3') },
        ground: { value: new THREE.Color('#c9a77a') },
        sunDir: { value: sunDir },
        sunColor: { value: new THREE.Color('#ffd08a') },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);
  scene.fog = new THREE.Fog('#f0d3a0', 34, 120);

  const grass = grassTexture();
  grass.repeat.set(80, 80);
  const groundMat = new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95, color: '#ffffff', vertexColors: true });
  // Mottled meadow: patches of deeper green and sunlit straw, gentle swells away from the house.
  const gGeo = new THREE.PlaneGeometry(240, 240, 120, 120);
  gGeo.rotateX(-Math.PI / 2);
  {
    const pos = gGeo.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const deep = new THREE.Color('#5d7f36');
    const straw = new THREE.Color('#c9c071');
    const n2 = (x, z) => Math.sin(x * 0.21 + Math.sin(z * 0.13) * 2) * 0.5 + Math.sin(z * 0.27 + x * 0.05) * 0.35 + Math.sin((x + z) * 0.6) * 0.15;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const n = n2(x, z);
      c.setRGB(1, 1, 1);
      if (n > 0.2) c.lerp(deep, Math.min(1, (n - 0.2) * 1.4) * 0.55);
      if (n < -0.35) c.lerp(straw, Math.min(1, (-n - 0.35) * 1.6) * 0.45);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      // Flat around the house, the garden and the side yard; swells beyond.
      const away = Math.min(Math.max(0, Math.hypot(x - 3, (z + 2) * 1.4) - 16), Math.hypot(Math.max(0, Math.abs(x - 4.25) - 20.25), Math.max(0, Math.abs(z) - 6)));
      pos.setY(i, Math.min(away * 0.12, 2.5) * (0.6 + 0.4 * Math.sin(x * 0.15) * Math.cos(z * 0.11)));
    }
    gGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    gGeo.computeVertexNormals();
  }
  const ground = new THREE.Mesh(gGeo, groundMat);
  ground.position.y = GROUND;
  ground.receiveShadow = true;
  add(ground);

  // ---------------------------------------------------------------- the house
  const floorTex = floorTexture();
  const X0 = ROOM.kitchen[0];
  const X1 = ROOM.bedroom[1];
  const W = X1 - X0;
  const D = FRONT - BACK;
  floorTex.repeat.set(W / 2.4, D / 2.4);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.72 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W + 0.28, 0.08, D + 0.14), [null, null, floorMat, null, null, null].map((m) => m ?? new THREE.MeshStandardMaterial({ color: PAL.woodDark, roughness: 0.7 })));
  floor.position.set((X0 + X1) / 2, -0.04, (BACK + FRONT) / 2 - 0.07);
  floor.receiveShadow = true;
  add(floor);
  const stone = stoneTexture();
  stone.repeat.set(W / 2, 1);
  const stoneMat = new THREE.MeshStandardMaterial({ map: stone, roughness: 0.92 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, -GROUND, D + 0.4), stoneMat);
  base.position.set((X0 + X1) / 2, GROUND / 2 - 0.04, (BACK + FRONT) / 2 - 0.12);
  base.receiveShadow = true;
  add(base);
  // The cut edge: a dark beam along the front of the floor.
  const trimMat = new THREE.MeshStandardMaterial({ color: '#4a2a17', roughness: 0.6 });
  const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.12, 0.14), trimMat);
  frontBeam.position.set((X0 + X1) / 2, -0.05, FRONT + 0.02);
  frontBeam.castShadow = true;
  add(frontBeam);

  const plasterMat = new THREE.MeshStandardMaterial({ map: wallTexture('plaster', 512, 256), roughness: 0.9 });
  const outerMat = new THREE.MeshStandardMaterial({ color: '#efe1c7', roughness: 0.92 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#7a4a2a', roughness: 0.65 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#cfe6f2', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false });

  /** A wall face with window holes: a Shape (UVs from its x/y) in the XY plane, facing +z. */
  function wallFace(w, h, holes, map) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(w, 0);
    s.lineTo(w, h);
    s.lineTo(0, h);
    s.closePath();
    for (const o of holes) {
      const p = new THREE.Path();
      if (o.round) p.absarc(o.x, o.y, o.r, 0, Math.PI * 2, true);
      else {
        p.moveTo(o.x - o.w / 2, o.y - o.h / 2);
        p.lineTo(o.x - o.w / 2, o.y + o.h / 2 - (o.arch ? o.w / 2 : 0));
        if (o.arch) p.absarc(o.x, o.y + o.h / 2 - o.w / 2, o.w / 2, Math.PI, 0, true);
        else p.lineTo(o.x + o.w / 2, o.y + o.h / 2);
        p.lineTo(o.x + o.w / 2, o.y - o.h / 2);
        p.closePath();
      }
      s.holes.push(p);
    }
    const g = new THREE.ShapeGeometry(s, 12);
    const pos = g.getAttribute('position');
    const uv = g.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w, pos.getY(i) / h);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map, roughness: 0.88 }));
    m.receiveShadow = true;
    return m;
  }

  /** A window: frame, mullions, sill and glass. */
  function windowAt(parent, x, y, z, w, h, { round = false, ry = 0 } = {}) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    const t = 0.07;
    if (round) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(w / 2, t * 0.7, 10, 28), woodMat);
      g.add(ring);
      const bar1 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.04), woodMat);
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, w, 0.04), woodMat);
      g.add(bar1, bar2);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 24), glassMat);
      g.add(glass);
    } else {
      const parts = [
        [w + t * 2, t, 0, h / 2 + t / 2],
        [w + t * 2, t, 0, -h / 2 - t / 2],
        [t, h, -w / 2 - t / 2, 0],
        [t, h, w / 2 + t / 2, 0],
        [0.04, h, 0, 0],
        [w, 0.04, 0, 0],
      ];
      for (const [bw, bh, bx, by] of parts) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.1), woodMat);
        b.position.set(bx, by, 0);
        b.castShadow = true;
        g.add(b);
      }
      const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.06, 0.24), woodMat);
      sill.position.set(0, -h / 2 - t, 0.08);
      sill.castShadow = true;
      g.add(sill);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat);
      g.add(glass);
    }
    parent.add(g);
    return g;
  }

  const rooms = {};
  const kinds = { kitchen: 'kitchen', dining: 'dining', parlour: 'parlour', bedroom: 'bedroom' };
  const WT = 0.14;
  for (const [name, [a, b]] of Object.entries(ROOM)) {
    const w = b - a;
    const holes = [{ x: w / 2, y: 1.45, w: 1.0, h: 1.05 }];
    const face = wallFace(w, WALL_H, holes, wallTexture(kinds[name], 1024, 560));
    face.position.set(a, 0, BACK);
    add(face);
    // Thickness and the outside of the wall.
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, WT), outerMat);
    back.position.set(a + w / 2, WALL_H / 2, BACK - WT / 2 - 0.002);
    back.receiveShadow = true;
    back.castShadow = true;
    // Cut a matching hole in the thick part by building it from four slabs instead.
    const hole = holes[0];
    const slabs = [
      [w, hole.y - hole.h / 2, w / 2, (hole.y - hole.h / 2) / 2],
      [w, WALL_H - (hole.y + hole.h / 2), w / 2, (WALL_H + hole.y + hole.h / 2) / 2],
      [(w - hole.w) / 2, hole.h, (w - hole.w) / 4, hole.y],
      [(w - hole.w) / 2, hole.h, w - (w - hole.w) / 4, hole.y],
    ];
    for (const [sw, sh, sx, sy] of slabs) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, WT), outerMat);
      m.position.set(a + sx, sy, BACK - WT / 2 - 0.004);
      m.castShadow = true;
      add(m);
    }
    windowAt(root, a + w / 2, 1.45, BACK - 0.02, 1.0, 1.05);
    // A gable above each room: the storybook row of roofs.
    const gable = new THREE.Shape();
    gable.moveTo(0, 0);
    gable.lineTo(w, 0);
    gable.lineTo(w / 2, 1.3);
    gable.closePath();
    const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: WT, bevelEnabled: false }), outerMat);
    gm.position.set(a, WALL_H, BACK - WT);
    gm.castShadow = true;
    add(gm);
    // Half-timbering on the gable's front.
    const beamH = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.1, 0.06), trimMat);
    beamH.position.set(a + w / 2, WALL_H + 0.02, BACK + 0.02);
    add(beamH);
    for (const sgn of [-1, 1]) {
      const len = Math.hypot(w / 2, 1.3);
      const rb = new THREE.Mesh(new THREE.BoxGeometry(len + 0.25, 0.12, 0.08), trimMat);
      rb.position.set(a + w / 2 + (sgn * w) / 4, WALL_H + 0.65, BACK + 0.03);
      rb.rotation.z = -sgn * Math.atan2(1.3, w / 2);
      rb.castShadow = true;
      add(rb);
    }
    const roundWin = windowAt(root, a + w / 2, WALL_H + 0.5, BACK + 0.03, 0.38, 0.38, { round: true });
    roundWin.scale.setScalar(1);
    rooms[name] = { a, b, mid: (a + b) / 2 };
  }
  // Roofs behind the gables: each room's pitched roof running back from its gable.
  const shingles = shingleTexture();
  shingles.repeat.set(2, 1.4);
  const roofMat = new THREE.MeshStandardMaterial({ map: shingles, roughness: 0.85 });
  for (const { a, b } of Object.values(rooms)) {
    const w = b - a;
    const len = 3.2;
    const slope = Math.hypot(w / 2 + 0.25, 1.38);
    for (const sgn of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(slope, 0.1, len), roofMat);
      r.position.set(a + w / 2 + (sgn * (w / 2 + 0.25)) / 2, WALL_H + 0.66, BACK - WT - len / 2 + 0.08);
      r.rotation.z = -sgn * Math.atan2(1.38, w / 2 + 0.25);
      r.castShadow = true;
      r.receiveShadow = true;
      add(r);
    }
  }
  // Chimney above the parlour's fireplace.
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.6, 0.55), stoneMat);
  chimney.position.set(rooms.parlour.mid + 0.9, WALL_H + 1.2, BACK - 0.9);
  chimney.castShadow = true;
  add(chimney);
  const chimneyTop = new THREE.Vector3(chimney.position.x, WALL_H + 2.05, chimney.position.z);

  // Partitions between rooms, with arched doorways, and the two end walls.
  const partitionAt = (x, { door = true, outer = false, frontDoor = false } = {}) => {
    const g = new THREE.Group();
    const holes = [];
    if (door) holes.push({ x: D * 0.38, y: 0.9, w: 0.95, h: 1.8, arch: true });
    if (outer && !frontDoor) holes.push({ x: D * 0.55, y: 1.45, round: true, r: 0.32 });
    for (const sgn of [-1, 1]) {
      // The +x face runs front to back, so its holes are mirrored to line up with the -x face's.
      const hs = sgn > 0 ? holes.map((o) => ({ ...o, x: D - o.x })) : holes;
      const outward = outer && (x < 0 ? sgn < 0 : sgn > 0);
      const map = outward ? null : outer ? wallTexture(x < 0 ? 'kitchen' : 'bedroom', 512, 560) : plasterMat.map;
      const f = wallFace(D, WALL_H, hs, map);
      if (outward) f.material = outerMat;
      f.rotation.y = sgn > 0 ? Math.PI / 2 : -Math.PI / 2;
      // The face lies in its own XY plane from x=0..D: turn it to run back to front along z.
      if (sgn > 0) f.position.set(x + WT / 2, 0, FRONT);
      else f.position.set(x - WT / 2, 0, BACK);
      g.add(f);
    }
    // The cut edge facing us: a timber post.
    const post = new THREE.Mesh(new THREE.BoxGeometry(WT + 0.06, WALL_H + 0.05, 0.12), trimMat);
    post.position.set(x, (WALL_H + 0.05) / 2, FRONT - 0.04);
    post.castShadow = true;
    g.add(post);
    // A top plate.
    const plate = new THREE.Mesh(new THREE.BoxGeometry(WT + 0.06, 0.1, D), trimMat);
    plate.position.set(x, WALL_H + 0.05, (BACK + FRONT) / 2);
    g.add(plate);
    if (door) {
      // The doorway's trim.
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.475, 0.05, 8, 20, Math.PI), trimMat);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(x, 1.8 - 0.475, BACK + D * 0.38);
      g.add(arch);
    }
    add(g);
    return g;
  };
  partitionAt(ROOM.kitchen[0] - WT / 2, { door: true, outer: true, frontDoor: true });
  partitionAt(ROOM.kitchen[1]);
  partitionAt(ROOM.dining[1]);
  partitionAt(ROOM.parlour[1]);
  partitionAt(ROOM.bedroom[1] + WT / 2, { door: false, outer: true });
  // Ceiling beams across the cut-away top: the dollhouse frame.
  const beam = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.16, 0.16), trimMat);
  beam.position.set((X0 + X1) / 2, WALL_H + 0.06, FRONT - 0.04);
  beam.castShadow = true;
  add(beam);

  // The front door in the kitchen's end wall (the bears come home through it).
  // Hinged on its back edge (the side its hinges are drawn on); it swings out into the garden.
  const doorPivot = new THREE.Group();
  doorPivot.position.set(X0 - WT / 2, 0, BACK + D * 0.38 - 0.475);
  const door = assets.prop('door');
  // The model runs its width along z (0.925 × 2.1 m): squeeze it into the arched hole.
  door.scale.set(1.82 / 2.1, 1.82 / 2.1, 0.97 / 0.925);
  seat(door, 0, 0.002, 0.485);
  doorPivot.add(door);
  add(doorPivot);
  let doorOpen = 0;
  let doorTarget = 0;
  let doorV = 0;

  // ---------------------------------------------------------------- the kitchen
  const K = rooms.kitchen;
  const stove = prop('stove', { h: 0.95, x: -7.85, z: BACK + 0.44, colors: { Main: '#b8442e' } });
  // Counter run: painted cabinets under a butcher-block top.
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.07, 0.66), new THREE.MeshStandardMaterial({ color: '#d8a868', roughness: 0.6 }));
  counterTop.position.set(-6.04, 0.62, BACK + 0.33);
  lit(counterTop);
  add(counterTop);
  for (let i = 0; i < 3; i++) prop('cabinet', { h: 0.585, x: -6.7 + i * 0.66, z: BACK + 0.3, colors: { wood: '#5f7e9a' } });
  // Shelf above the counter with crocks and a plant.
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.26), woodMat);
  shelf.position.set(-6.0, 1.6, BACK + 0.14);
  lit(shelf);
  add(shelf);
  prop('honey', { h: 0.22, x: -6.8, y: 1.625, z: BACK + 0.14 });
  prop('honey', { h: 0.18, x: -6.55, y: 1.625, z: BACK + 0.14 });
  prop('mug', { h: 0.2, x: -5.6, y: 1.625, z: BACK + 0.14 });
  prop('plant', { h: 0.36, x: -5.25, y: 1.625, z: BACK + 0.14 });
  prop('loaf', { h: 0.12, x: -6.95, y: 0.655, z: BACK + 0.25 });
  rug(2.0, 1.3, ['#b5543c', '#d9b47a', '#c46a4c', '#e8d2a8'], -6.9, -0.25);
  prop('barrel2', { h: 0.5, x: K.a + 0.38, z: 0.95 });
  prop('crate', { h: 0.36, x: K.a + 0.42, z: 1.4, ry: 0.4 });
  // A stool tucked by the counter.
  prop('stoolRed', { h: 0.34, x: -4.95 - 0.2, z: 0.9 });

  // ---------------------------------------------------------------- the dining room
  const Dn = rooms.dining;
  rug(2.9, 1.9, ['#5e8c3a', '#7a9f4a', '#d9c27a', '#6b8f3e'], Dn.mid - 0.15, -0.6);
  prop('plankTable', { h: 0.55, x: Dn.mid - 0.15, z: -0.75, ry: Math.PI / 2 });
  prop('sideTable', { h: 0.62, x: Dn.mid + 1.25, z: BACK + 0.22, colors: { wood: PAL.woodDark } });
  prop('lamp', { h: 0.42, x: Dn.mid + 1.55, y: 0.62, z: BACK + 0.2 });
  prop('pie', { w: 0.34, x: Dn.mid + 1.0, y: 0.62, z: BACK + 0.24 });
  prop('bench', { h: 0.5, x: Dn.a + 0.35, z: BACK + 0.2, ry: 0 });
  // Bunting along the top of the wall.
  const bunt = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.26), new THREE.MeshStandardMaterial({ map: buntingTexture(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }));
  bunt.position.set(rooms.parlour.mid, WALL_H - 0.28, BACK + 0.06);
  add(bunt);

  // ---------------------------------------------------------------- the parlour
  const P = rooms.parlour;
  const fireplace = prop('fireplace', { h: 1.45, x: P.mid + 0.9, z: BACK + 0.32 });
  rug(2.6, 1.7, ['#a8402e', '#c45a3c', '#e3b16a', '#8a3324'], P.mid + 0.5, -0.3);
  prop('armchair', { h: 0.95, x: P.mid - 1.6, z: -0.85, ry: 0.4, colors: { Main: '#3f6b3a' } });
  prop('chairBent', { h: 0.8, x: P.mid - 0.85, z: -1.05, ry: 0.15 });
  prop('bookcase', { h: 1.6, x: P.a + 0.5, z: BACK + 0.18 });
  prop('books', { h: 0.12, x: P.mid + 0.9, y: 1.45, z: BACK + 0.3 });
  const fireLight = new THREE.PointLight('#ff9a3c', 3.2, 6, 1.6);
  fireLight.position.set(P.mid + 0.9, 0.5, BACK + 0.7);
  add(fireLight);
  const fireGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  fireGlow.position.set(P.mid + 0.9, 0.32, BACK + 0.36);
  add(fireGlow);

  // ---------------------------------------------------------------- the bedroom
  const B = rooms.bedroom;
  prop('bedSingle', { h: 0.62, x: B.a + 0.85, z: BACK + 0.95, colors: { carpet: '#3f6b3a' } });
  prop('bedSingle', { h: 0.52, x: B.a + 2.15, z: BACK + 0.82, colors: { carpet: PAL.linen } });
  prop('nightStand', { h: 0.45, x: B.a + 2.95, z: BACK + 0.25, colors: { woodDark: '#8a5530' } });
  prop('lamp', { h: 0.38, x: B.a + 2.95, y: 0.45, z: BACK + 0.25 });
  rug(1.8, 1.3, ['#d8a6a0', '#b9c7d6', '#efe0cf', '#c88f94'], B.mid + 0.5, 0.2);
  const lampLight = new THREE.PointLight('#ffcf8a', 1.6, 4, 1.8);
  lampLight.position.set(B.a + 2.95, 1.0, BACK + 0.4);
  add(lampLight);

  // ---------------------------------------------------------------- outside: the garden, the path and the forest
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 48),
    new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        deep: { value: new THREE.Color('#2f6f7a') },
        shallow: { value: new THREE.Color('#6fb3a8') },
        sky: { value: new THREE.Color('#f3d9a8') },
        sunDir: { value: sunDir },
        ripple: { value: new THREE.Vector2(999, 999) },
        rippleT: { value: 9 },
      },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      transparent: true,
    }),
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(16.2, GROUND + 0.02, 0.2);
  pond.scale.set(1.3, 1, 1);
  add(pond);
  const bank = new THREE.Mesh(new THREE.RingGeometry(3.1, 3.6, 48), new THREE.MeshStandardMaterial({ color: '#8a7350', roughness: 1 }));
  bank.rotation.x = -Math.PI / 2;
  bank.position.set(16.2, GROUND + 0.01, 0.2);
  bank.scale.set(1.3, 1, 1);
  bank.receiveShadow = true;
  add(bank);

  // Dirt path from the front door into the woods (the bears' way home).
  const pathMat = new THREE.MeshStandardMaterial({ color: '#b08a5c', roughness: 1 });
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.9 - t * 0.2, 16), pathMat);
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(X0 - 1.2 - i * 1.25, GROUND + 0.012, -0.4 - Math.sin(t * 2.6) * 2.6 - t * 5);
    blob.scale.set(1.4, 1, 1);
    blob.receiveShadow = true;
    add(blob);
  }
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 1.0), stoneMat);
  step.position.set(X0 - 0.45, GROUND + 0.075, BACK + D * 0.38 + 0.0);
  lit(step);
  add(step);

  // Trees: a ring of woods behind and around, and a few big ones close for scale.
  const treeKeys = ['tree1', 'tree2', 'tree3', 'tree4', 'tree5', 'pine1', 'pine2', 'pine3', 'blobTree1', 'blobTree2'];
  const blocked = (x, z) => (z > 2 && x > X0 - 4 && x < X1 + 14) || (x > 9.5 && x < 23.5 && z > -5 && z < 5) || (x > X0 - 2.5 && x < X1 + 1.0 && z > BACK - 4.5 && z < FRONT + 6) || (Math.hypot((x - 16.2) / 1.3, z - 0.2) < 4.8) || (x > X0 - 7.5 && x < X0 && z > -0.2 && z < 7) || (x < X0 - 1 && x > X0 - 18 && Math.abs(z - (-0.4 - Math.sin(((X0 - 1.2 - x) / 16.25) * 2.6) * 2.6 - ((X0 - 1.2 - x) / 16.25) * 5)) < 2.2);
  let placed = 0;
  for (let tries = 0; tries < 600 && placed < 95; tries++) {
    const ang = rng.range(0, Math.PI * 2);
    const r = rng.range(10, 46);
    const x = 3 + Math.cos(ang) * r * 1.25;
    const z = -6 + Math.sin(ang) * r;
    if (z > 9) continue; // keep the view open in front
    if (blocked(x, z)) continue;
    const key = rng.pick(treeKeys);
    const t = assets.prop(key, null, { shadows: r < 22 });
    const s = rng.range(0.75, 1.15) * (r > 30 ? 1.25 : 1);
    t.scale.setScalar(s);
    t.rotation.y = rng.range(0, Math.PI * 2);
    t.position.set(x, GROUND, z);
    add(t);
    placed++;
  }
  // Undergrowth.
  const small = ['bush1', 'bush2', 'flowerBush', 'flowers1', 'flowers2', 'grass1', 'grass2', 'grass3', 'fern', 'mushrooms', 'clover', 'tallGrass', 'rock1', 'rock2'];
  for (let i = 0, tries = 0; i < 110 && tries < 900; tries++) {
    const x = rng.range(X0 - 18, X1 + 20);
    const z = rng.range(-16, 7);
    if (blocked(x, z)) continue;
    if (z > 3.2 && x > X0 - 1 && x < X1 + 1) continue;
    const key = rng.pick(small);
    const o = assets.prop(key, null, { shadows: false });
    const big = /rock|fern/.test(key) ? 0.35 : /bush/.test(key) ? 0.55 : 0.6;
    o.scale.setScalar(big * rng.range(0.7, 1.2));
    o.rotation.y = rng.range(0, Math.PI * 2);
    o.position.set(x, GROUND, z);
    add(o);
    i++;
  }
  // Flowers along the front of the house.
  for (let x = X0 + 0.2; x < X1; x += rng.range(0.9, 1.6)) {
    const o = assets.prop(rng.pick(['flowers1', 'flowers2', 'grass2', 'clover']), null, { shadows: false });
    o.scale.setScalar(rng.range(0.28, 0.4));
    o.position.set(x, GROUND, FRONT + rng.range(0.55, 0.9));
    o.rotation.y = rng.range(0, 6);
    add(o);
  }

  // The garden: a fence, the swing tree, beehives, a well, a bench.
  const garden = new THREE.Group();
  add(garden);
  prop('fence2', { w: 5.4, x: 12.4, z: -4.6, parent: garden });
  prop('fence2', { w: 5.4, x: 17.9, z: -4.6, parent: garden });
  prop('well', { h: 1.4, x: 22.2, z: -2.4, parent: garden });
  prop('gardenBench', { h: 0.6, x: 19.6, z: -3.9, ry: 0, parent: garden });
  prop('barrel', { h: 0.8, x: 22.3, z: -0.6, parent: garden });
  prop('hay', { h: 0.7, x: 23.1, z: -1.3, parent: garden });

  // Sun patches through the windows on the floors, and soft light shafts.
  const blot = blotTexture();
  const shaft = shaftTexture();
  for (const { mid } of Object.values(rooms)) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.9), new THREE.MeshBasicMaterial({ map: blot, color: '#ffcf8a', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(mid + 0.5, 0.01, BACK + 1.25);
    add(patch);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.2), new THREE.MeshBasicMaterial({ map: shaft, color: '#ffd9a0', transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    sh.position.set(mid + 0.25, 1.0, BACK + 0.65);
    sh.rotation.set(-0.55, 0.0, 0.2);
    add(sh);
  }

  // Dust motes drifting in the light (instanced, tiny).
  const motes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.012, 0.012), new THREE.MeshBasicMaterial({ color: '#fff1cf', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }), 160);
  const moteSeeds = [];
  for (let i = 0; i < 160; i++) moteSeeds.push([rng.range(X0, X1), rng.range(0.2, 2.3), rng.range(BACK + 0.2, FRONT - 0.2), rng.range(0, 6.28)]);
  motes.frustumCulled = false;
  add(motes);
  const dummy = new THREE.Object3D();

  return {
    root,
    rooms,
    sunDir,
    pond,
    fireplace,
    stove,
    fireLight,
    lampLight,
    doorPivot,
    chimneyTop,
    sky,
    /** 0 shut … 1 wide open; `bang` flings it there with a bounce. */
    door(open, { bang = false } = {}) {
      doorTarget = open;
      if (bang) doorV = 9;
    },
    update(dt, t, camera) {
      // The door on a spring: a bang overshoots and wobbles back.
      doorV += ((doorTarget - doorOpen) * 60 - doorV * 7) * Math.min(dt, 0.05);
      doorOpen = Math.max(-0.02, Math.min(1.15, doorOpen + doorV * Math.min(dt, 0.05)));
      doorPivot.rotation.y = -doorOpen * 1.7;
      pond.material.uniforms.time.value = t;
      pond.material.uniforms.rippleT.value += dt;
      fireLight.intensity = 2.6 + Math.sin(t * 11) * 0.3 + Math.sin(t * 17.3) * 0.25 + Math.sin(t * 5.1) * 0.2;
      fireGlow.material.opacity = 0.75 + Math.sin(t * 13) * 0.12;
      for (let i = 0; i < moteSeeds.length; i++) {
        const [x, y, z, p] = moteSeeds[i];
        dummy.position.set(x + Math.sin(t * 0.2 + p) * 0.3, y + Math.sin(t * 0.13 + p * 2) * 0.2, z + Math.cos(t * 0.17 + p) * 0.2);
        if (camera) dummy.quaternion.copy(camera.quaternion);
        dummy.updateMatrix();
        motes.setMatrixAt(i, dummy.matrix);
      }
      motes.instanceMatrix.needsUpdate = true;
    },
    splash(x, z) {
      pond.material.uniforms.ripple.value.set(x, z);
      pond.material.uniforms.rippleT.value = 0;
    },
    setQuality(q) {
      fireLight.visible = q !== 'low';
      lampLight.visible = q !== 'low';
      motes.visible = q === 'high';
    },
  };
}
