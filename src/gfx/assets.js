// Loads the three model bundles (cast, props, nature) and hands out recoloured copies. Every material is rebuilt in the game's
// palette: props by their material names, the cast by vertex colours sampled from the kit's colour atlas and remapped per look.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { PAL } from './palette.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const lin = (hex) => new THREE.Color(hex);

/** Material names in the kits → the palette. Anything not listed keeps its colour, slightly warmed. */
const PROP_COLORS = {
  wood: PAL.wood,
  Wood: PAL.wood,
  woodDark: PAL.woodDark,
  DarkWood: PAL.woodDark,
  carpet: PAL.red,
  carpetWhite: PAL.linen,
  metal: '#b9c3c4',
  metalMedium: '#5c6669',
  metalDark: '#2d3436',
  glass: '#9cc9d6',
  brownLight: '#e8b27a',
  brownDark: '#8a4b2a',
  brownDarkest: '#3a2014',
  yellow: PAL.honey,
  red: PAL.red,
  white: PAL.linen,
  _defaultMat: PAL.linen,
  Main: PAL.red,
  Bell: '#d9a441',
  Windows: '#6aa3c7',
};

const matCache = new Map();
function paletteMaterial(src, overrides) {
  const name = src.name || '';
  const key = `${name}|${overrides?.[name] ?? ''}|${src.map ? src.map.uuid : ''}`;
  let m = matCache.get(key);
  if (m) return m;
  const hex = overrides?.[name] ?? PROP_COLORS[name];
  const params = { roughness: 0.82, metalness: 0, name };
  if (src.map) {
    params.map = src.map;
    params.alphaTest = src.alphaTest || (src.transparent || src.alphaMap ? 0.5 : 0);
    if (src.alphaTest || /Leaves|Flowers|Leaf/i.test(name)) params.alphaTest = 0.5;
    params.side = /Leaves|Flowers|Leaf|Grass/i.test(name) ? THREE.DoubleSide : THREE.FrontSide;
    params.color = src.color?.clone?.() ?? new THREE.Color(1, 1, 1);
  } else params.color = hex ? lin(hex) : (src.color?.clone?.() ?? new THREE.Color(0.8, 0.8, 0.8));
  if (/metal/i.test(name)) {
    params.metalness = 0.55;
    params.roughness = 0.38;
  }
  if (/glass|Windows/i.test(name)) params.roughness = 0.15;
  m = new THREE.MeshStandardMaterial(params);
  matCache.set(key, m);
  return m;
}

export async function loadAssets(base = './models/', onProgress = () => {}) {
  const files = ['cast', 'props', 'nature'];
  let done = 0;
  const got = await Promise.all(
    files.map((f) =>
      loader.loadAsync(`${base}${f}.glb`).then((g) => {
        done++;
        onProgress(done / files.length);
        return g;
      }),
    ),
  );
  const [cast, props, nature] = got;
  const byKey = (g) => {
    const m = new Map();
    for (const child of g.scene.children) m.set(child.name, child);
    return m;
  };
  const castNodes = byKey(cast);
  const propNodes = byKey(props);
  const natureNodes = byKey(nature);
  // Bone names were made unique across the cast at load (Body, Body_1 …): give every character its plain names back, so the
  // one set of clips drives them all.
  for (const node of castNodes.values()) {
    node.traverse((o) => {
      if (o.isBone) o.name = o.name.replace(/_\d+$/, '');
    });
  }
  const clips = new Map(cast.animations.map((a) => [a.name, a]));
  const atlas = makeAtlasReader(cast.scene);

  function prop(key, overrides = null, { shadows = true } = {}) {
    const src = propNodes.get(key) ?? natureNodes.get(key);
    if (!src) {
      console.warn('[just-right] no model', key);
      return new THREE.Group();
    }
    const o = src.clone(true);
    o.traverse((m) => {
      if (m.isMesh) {
        m.material = Array.isArray(m.material) ? m.material.map((x) => paletteMaterial(x, overrides)) : paletteMaterial(m.material, overrides);
        m.castShadow = shadows;
        m.receiveShadow = true;
      }
    });
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    o.scale.set(1, 1, 1);
    return o;
  }

  /** A character: a skinned copy of the cast member `kind`, coloured by `look` ({ '#rrggbb': '#rrggbb', face, … }). */
  function character(kind, look = {}) {
    const src = castNodes.get(kind);
    const root = SkeletonUtils.clone(src);
    root.position.set(0, 0, 0);
    root.traverse((m) => {
      if (!m.isSkinnedMesh && !m.isMesh) return;
      m.geometry = m.geometry.clone();
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      paintVertices(m, atlas, mat, look);
      m.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: /Hair/i.test(m.name) ? 0.55 : 0.78, metalness: 0, name: m.name });
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      if (look.noBand && /Headband/i.test(m.name)) m.visible = false;
    });
    return root;
  }

  return { prop, character, clips, castNodes, propNodes, natureNodes, has: (k) => propNodes.has(k) || natureNodes.has(k) };
}

/** Reads the colour atlas's pixels once (the cast and some props share one 512×512 swatch sheet). */
function makeAtlasReader(scene) {
  const cache = new Map();
  return (texture) => {
    if (!texture?.image) return null;
    let got = cache.get(texture.uuid);
    if (got) return got;
    const img = texture.image;
    const w = img.width;
    const h = img.height;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    got = { w, h, data, flipY: texture.flipY };
    cache.set(texture.uuid, got);
    return got;
  };
}

const hex2 = (r, g, b) => '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');

/** Bakes the atlas into vertex colours, remapped by the look. */
function paintVertices(mesh, atlas, mat, look) {
  const g = mesh.geometry;
  const uv = g.getAttribute('uv');
  const pos = g.getAttribute('position');
  const n = pos.count;
  const colors = new Float32Array(n * 3);
  const px = atlas(mat?.map);
  const skinIndex = g.getAttribute('skinIndex');
  const skinWeight = g.getAttribute('skinWeight');
  const bones = mesh.skeleton?.bones ?? [];
  const c = new THREE.Color();
  // Which vertices ride the head (by their strongest bone), and the head's box, for looks that paint the face apart.
  const onHead = new Uint8Array(n);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  if ((look.head || look.bear) && skinIndex && bones.length) {
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bw = -1;
      for (let k = 0; k < 4; k++) {
        const w = skinWeight.getComponent(i, k);
        if (w > bw) (bw = w), (best = skinIndex.getComponent(i, k));
      }
      if (/^(Head|Neck)/.test(bones[best]?.name ?? '')) {
        onHead[i] = 1;
        const p = [pos.getX(i), pos.getY(i), pos.getZ(i)];
        for (let k = 0; k < 3; k++) {
          if (p[k] < lo[k]) lo[k] = p[k];
          if (p[k] > hi[k]) hi[k] = p[k];
        }
      }
    }
  }
  const frac = (i, k) => (([pos.getX(i), pos.getY(i), pos.getZ(i)][k] - lo[k]) / Math.max(1e-9, hi[k] - lo[k]));
  for (let i = 0; i < n; i++) {
    let hex = '#cccccc';
    if (px && uv) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      const x = Math.min(px.w - 1, Math.max(0, Math.floor(u * px.w)));
      const y = Math.min(px.h - 1, Math.max(0, Math.floor((px.flipY ? 1 - v : v) * px.h)));
      const o = (y * px.w + x) * 4;
      hex = hex2(px.data[o], px.data[o + 1], px.data[o + 2]);
    } else if (mat?.color) hex = '#' + mat.color.getHexString();
    let out = look[hex] ?? hex;
    if (onHead[i] && look.bear) {
      // A bear from the panda: the whole head in fur, a light muzzle round a dark nose, no eye patches. In the head's box
      // (x across, y back to front with the face at low y, z up).
      const fx = frac(i, 0);
      const fy = frac(i, 1);
      const fz = frac(i, 2);
      const centre = Math.abs(fx - 0.5) < 0.17;
      if (hex === '#403c57') out = fy < 0.38 && centre && fz > 0.2 && fz < 0.72 ? look.bear.nose : fz > 0.78 ? look.bear.ears : look.bear.fur;
      else if (hex === '#e9e9e9') out = fy < 0.24 && Math.abs(fx - 0.5) < 0.19 && fz > 0.06 && fz < 0.6 ? look.bear.face : look.bear.fur;
    } else if (onHead[i] && look.head?.[hex]) out = look.head[hex];
    c.set(out);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}
