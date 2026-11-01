// Pooled 3D particles: camera-facing quads drawn by two instanced meshes (soft alpha and additive glow), with sprite shapes from
// a small atlas drawn at load. Simulated on the CPU without allocating: steam, smoke, sparks, feathers, crumbs, confetti,
// splashes, dust, frost and ink.
import * as THREE from 'three';

const CELLS = 4; // 4×2 atlas
export const SHAPE = { blob: 0, spark: 1, feather: 2, crumb: 3, confetti: 4, ring: 5, drop: 6, puff: 7 };

function makeAtlas() {
  const S = 64;
  const cv = document.createElement('canvas');
  cv.width = S * CELLS;
  cv.height = S * 2;
  const g = cv.getContext('2d');
  const cell = (i, fn) => {
    g.save();
    g.translate((i % CELLS) * S + S / 2, Math.floor(i / CELLS) * S + S / 2);
    fn();
    g.restore();
  };
  // soft blob
  cell(0, () => {
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 30);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(-32, -32, 64, 64);
  });
  // four-point spark
  cell(1, () => {
    g.fillStyle = '#fff';
    g.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const rr = k % 2 === 0 ? 30 : 6;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 14);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(-16, -16, 32, 32);
  });
  // feather
  cell(2, () => {
    g.fillStyle = '#fff';
    g.beginPath();
    g.ellipse(0, 0, 9, 27, 0.35, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(200,200,210,1)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-9, 26);
    g.lineTo(8, -24);
    g.stroke();
  });
  // crumb (chunky square)
  cell(3, () => {
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(-18, -14);
    g.lineTo(16, -20);
    g.lineTo(20, 12);
    g.lineTo(-12, 20);
    g.closePath();
    g.fill();
  });
  // confetti strip
  cell(4, () => {
    g.fillStyle = '#fff';
    g.fillRect(-9, -24, 18, 48);
  });
  // ring
  cell(5, () => {
    g.strokeStyle = '#fff';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(0, 0, 24, 0, Math.PI * 2);
    g.stroke();
  });
  // drop
  cell(6, () => {
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(0, -28);
    g.quadraticCurveTo(20, 6, 0, 22);
    g.quadraticCurveTo(-20, 6, 0, -28);
    g.fill();
  });
  // puff: lumpy cloud
  cell(7, () => {
    const blobs = [
      [0, 4, 18],
      [-13, 6, 13],
      [13, 7, 13],
      [-6, -8, 13],
      [8, -7, 12],
    ];
    for (const [x, y, rr] of blobs) {
      const r = g.createRadialGradient(x, y, 0, x, y, rr);
      r.addColorStop(0, 'rgba(255,255,255,0.95)');
      r.addColorStop(0.7, 'rgba(255,255,255,0.6)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.beginPath();
      g.arc(x, y, rr, 0, Math.PI * 2);
      g.fill();
    }
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

const VERT = /* glsl */ `
attribute vec4 iPos;    // xyz, size
attribute vec4 iColor;  // rgb, alpha
attribute vec2 iSpin;   // rotation, shape
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vColor = iColor;
  float shape = iSpin.y;
  vec2 cell = vec2(mod(shape, 4.0), floor(shape / 4.0));
  vUv = (uv + cell) / vec2(4.0, 2.0);
  vUv.y = 1.0 - ((1.0 - uv.y) + cell.y) / 2.0;
  float c = cos(iSpin.x), s = sin(iSpin.x);
  vec2 corner = position.xy * iPos.w;
  corner = vec2(c * corner.x - s * corner.y, s * corner.x + c * corner.y);
  vec4 mv = modelViewMatrix * vec4(iPos.xyz, 1.0);
  mv.xy += corner;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform sampler2D map;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vec4 t = texture2D(map, vUv);
  float a = t.a * vColor.a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor.rgb * t.rgb, a);
  #include <colorspace_fragment>
}`;

function makeLayer(tex, max, additive) {
  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geo.index = quad.index;
  geo.setAttribute('position', quad.getAttribute('position'));
  geo.setAttribute('uv', quad.getAttribute('uv'));
  const pos = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  const col = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  const spin = new THREE.InstancedBufferAttribute(new Float32Array(max * 2), 2);
  pos.setUsage(THREE.DynamicDrawUsage);
  col.setUsage(THREE.DynamicDrawUsage);
  spin.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('iPos', pos);
  geo.setAttribute('iColor', col);
  geo.setAttribute('iSpin', spin);
  geo.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = additive ? 11 : 10;
  return { mesh, pos, col, spin, geo };
}

export function createParticles(scene, { max = 700 } = {}) {
  const tex = makeAtlas();
  const soft = makeLayer(tex, max, false);
  const glow = makeLayer(tex, Math.floor(max / 2), true);
  scene.add(soft.mesh);
  scene.add(glow.mesh);
  // Particle state, struct of arrays.
  const N = max + Math.floor(max / 2);
  const P = {
    alive: new Uint8Array(N),
    x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N),
    vx: new Float32Array(N), vy: new Float32Array(N), vz: new Float32Array(N),
    age: new Float32Array(N), life: new Float32Array(N),
    s0: new Float32Array(N), s1: new Float32Array(N),
    r: new Float32Array(N), g: new Float32Array(N), b: new Float32Array(N), a: new Float32Array(N),
    rot: new Float32Array(N), vrot: new Float32Array(N),
    shape: new Uint8Array(N), add: new Uint8Array(N),
    grav: new Float32Array(N), drag: new Float32Array(N), floor: new Float32Array(N), wob: new Float32Array(N),
  };
  let cursorSoft = 0;
  let cursorGlow = max;
  let scale = 1;
  let reduced = false;
  const col = new THREE.Color();

  function slot(additive) {
    if (additive) {
      for (let k = 0; k < N - max; k++) {
        const i = max + ((cursorGlow - max + k) % (N - max));
        if (!P.alive[i]) return (cursorGlow = i + 1), i;
      }
      return (cursorGlow = max + ((cursorGlow - max + 1) % (N - max))), cursorGlow;
    }
    for (let k = 0; k < max; k++) {
      const i = (cursorSoft + k) % max;
      if (!P.alive[i]) return (cursorSoft = i + 1), i;
    }
    return (cursorSoft = (cursorSoft + 1) % max), cursorSoft;
  }

  /**
   * Emits `n` particles at (x, y, z). o: { shape, color (hex or array), speed, spread (cone 0..1, up), dir [x,y,z], size [a,b],
   * grow (end size multiplier), life [a,b], gravity, drag, additive, alpha, spin, floor, jitter (start radius), wobble }
   */
  function emit(n, x, y, z, o = {}) {
    const count = Math.max(1, Math.round(n * scale * (reduced ? 0.5 : 1)));
    const colors = Array.isArray(o.color) ? o.color : [o.color ?? '#ffffff'];
    const dir = o.dir ?? [0, 1, 0];
    const spread = o.spread ?? 1;
    const [l0, l1] = o.life ?? [0.6, 1.2];
    const [z0, z1] = o.size ?? [0.08, 0.16];
    const speed = o.speed ?? 1;
    const jit = o.jitter ?? 0;
    for (let k = 0; k < count; k++) {
      const i = slot(!!o.additive);
      P.alive[i] = 1;
      P.x[i] = x + (Math.random() - 0.5) * 2 * jit;
      P.y[i] = y + (Math.random() - 0.5) * 2 * jit * 0.5;
      P.z[i] = z + (Math.random() - 0.5) * 2 * jit;
      // Random direction in a cone around dir.
      let rx = Math.random() * 2 - 1;
      let ry = Math.random() * 2 - 1;
      let rz = Math.random() * 2 - 1;
      const rl = Math.hypot(rx, ry, rz) || 1;
      rx /= rl;
      ry /= rl;
      rz /= rl;
      let dx = dir[0] + rx * spread;
      let dy = dir[1] + ry * spread;
      let dz = dir[2] + rz * spread;
      const dl = Math.hypot(dx, dy, dz) || 1;
      const sp = speed * (0.55 + Math.random() * 0.75);
      P.vx[i] = (dx / dl) * sp;
      P.vy[i] = (dy / dl) * sp;
      P.vz[i] = (dz / dl) * sp;
      P.age[i] = 0;
      P.life[i] = l0 + Math.random() * (l1 - l0);
      P.s0[i] = z0 + Math.random() * (z1 - z0);
      P.s1[i] = P.s0[i] * (o.grow ?? 1);
      col.set(colors[(Math.random() * colors.length) | 0]);
      P.r[i] = col.r;
      P.g[i] = col.g;
      P.b[i] = col.b;
      P.a[i] = o.alpha ?? 1;
      P.rot[i] = Math.random() * Math.PI * 2;
      P.vrot[i] = (Math.random() - 0.5) * (o.spin ?? 2);
      P.shape[i] = o.shape ?? SHAPE.blob;
      P.add[i] = o.additive ? 1 : 0;
      P.grav[i] = o.gravity ?? 0;
      P.drag[i] = o.drag ?? 0.5;
      P.floor[i] = o.floor ?? -1e9;
      P.wob[i] = o.wobble ?? 0;
    }
  }

  function update(dt) {
    let ns = 0;
    let ng = 0;
    for (let i = 0; i < N; i++) {
      if (!P.alive[i]) continue;
      P.age[i] += dt;
      const t = P.age[i] / P.life[i];
      if (t >= 1) {
        P.alive[i] = 0;
        continue;
      }
      const d = Math.max(0, 1 - P.drag[i] * dt);
      P.vx[i] *= d;
      P.vz[i] *= d;
      P.vy[i] = P.vy[i] * d - P.grav[i] * dt;
      if (P.wob[i]) {
        P.vx[i] += Math.sin(P.age[i] * 7 + i) * P.wob[i] * dt;
        P.vz[i] += Math.cos(P.age[i] * 5 + i * 1.3) * P.wob[i] * dt;
      }
      P.x[i] += P.vx[i] * dt;
      P.y[i] += P.vy[i] * dt;
      P.z[i] += P.vz[i] * dt;
      if (P.y[i] < P.floor[i]) {
        P.y[i] = P.floor[i];
        P.vy[i] *= -0.25;
        P.vx[i] *= 0.6;
        P.vz[i] *= 0.6;
        P.vrot[i] *= 0.5;
      }
      P.rot[i] += P.vrot[i] * dt;
      const size = P.s0[i] + (P.s1[i] - P.s0[i]) * t;
      // Fade in fast, out smooth.
      const fade = Math.min(1, t * 8) * (1 - t * t);
      const L = P.add[i] ? glow : soft;
      const j = P.add[i] ? ng++ : ns++;
      L.pos.array[j * 4] = P.x[i];
      L.pos.array[j * 4 + 1] = P.y[i];
      L.pos.array[j * 4 + 2] = P.z[i];
      L.pos.array[j * 4 + 3] = size;
      L.col.array[j * 4] = P.r[i];
      L.col.array[j * 4 + 1] = P.g[i];
      L.col.array[j * 4 + 2] = P.b[i];
      L.col.array[j * 4 + 3] = P.a[i] * fade;
      L.spin.array[j * 2] = P.rot[i];
      L.spin.array[j * 2 + 1] = P.shape[i];
    }
    for (const [L, n] of [
      [soft, ns],
      [glow, ng],
    ]) {
      L.geo.instanceCount = n;
      if (n > 0) {
        L.pos.needsUpdate = true;
        L.col.needsUpdate = true;
        L.spin.needsUpdate = true;
        L.pos.clearUpdateRanges();
        L.pos.addUpdateRange(0, n * 4);
        L.col.clearUpdateRanges();
        L.col.addUpdateRange(0, n * 4);
        L.spin.clearUpdateRanges();
        L.spin.addUpdateRange(0, n * 2);
      }
    }
  }

  function clear() {
    P.alive.fill(0);
  }

  return {
    emit,
    update,
    clear,
    setQuality(q) {
      scale = q === 'low' ? 0.4 : q === 'medium' ? 0.75 : 1;
    },
    set reduced(v) {
      reduced = !!v;
    },
  };
}
