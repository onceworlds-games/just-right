// Development pictures: ?poster=dev-cast lines up the whole cast; dev-house is the cottage from the front; dev-bears the bears'
// faces; dev-cam_<x>_<y>_<z>_<tx>_<ty>_<tz> any camera in the house (m for minus).
import * as THREE from 'three';
import { Character, ANIM, LIFE } from '../gfx/cast.js';
import { CHARACTERS, BEARS, FOLK_LOOKS } from '../gfx/palette.js';
import { buildCottage } from '../world/cottage.js';
import { createWorld } from '../play/world.js';
import { readPage, PAGES } from '../core/pages.js';
import { practicePage } from '../core/plan.js';

export const CH = 0.36;

async function settle(gfx, chars, frames = 40) {
  for (let i = 0; i < frames; i++) for (const c of chars) c.update(1 / 30);
  await document.fonts.ready;
  gfx.render(1 / 60);
  gfx.render(1 / 60);
  document.body.dataset.ready = '1';
}

export async function devScene(name, gfx, assets) {
  LIFE.blink = new URLSearchParams(location.search).get('blink') === '1';
  LIFE.closed = new URLSearchParams(location.search).get('closed') === '1';
  LIFE.feel = new URLSearchParams(location.search).get('feel') ?? '';
  const { scene, camera } = gfx;
  const params = new URLSearchParams(location.search);
  if (name === 'dev-cast') {
    scene.background = new THREE.Color('#9cc7e0');
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: '#d9b98a', roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const chars = [];
    const list = [...Object.values(CHARACTERS), ...Object.values(BEARS), ...Object.values(FOLK_LOOKS).slice(0, 4)];
    list.forEach((c, i) => {
      const ch = new Character(assets, c.kind, c.look, { scale: c.scale ?? 1 });
      ch.group.position.set((i - (list.length - 1) / 2) * 1.25, 0, 0);
      ch.play(i % 3 === 0 ? ANIM.wave : i % 3 === 1 ? ANIM.idle : ANIM.yes);
      scene.add(ch.group);
      chars.push(ch);
    });
    camera.position.set(0, 3.2, 13);
    camera.lookAt(0, 1.0, -1);
    gfx.focusShadow(new THREE.Vector3(0, 0, -1), 12);
    return settle(gfx, chars);
  }
  if (name.startsWith('dev-anim-')) {
    // dev-anim-<clip,clip,...>-<fraction×100>: Goldi in each clip, side by side, seen from the side.
    const [, , list, fr] = name.split('-');
    scene.background = new THREE.Color('#9cc7e0');
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: '#d9b98a', roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const clips = list.split('.');
    const chars = [];
    clips.forEach((c, i) => {
      const ch = new Character(assets, CHARACTERS.goldi.kind, CHARACTERS.goldi.look, { scale: CH });
      ch.group.position.set((i - (clips.length - 1) / 2) * 1.0, 0, 0);
      ch.group.rotation.y = Math.PI / 2;
      const m = /^(.*)_(\d+)$/.exec(c);
      ch.scrub(m ? m[1] : c, Number(m ? m[2] : fr ?? 50) / 100, 0);
      scene.add(ch.group);
      chars.push(ch);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: '#c98a4e' }));
      box.position.set(ch.group.position.x - 0.25, 0.15, 0);
      scene.add(box);
    });
    camera.position.set(0, 0.8, 5);
    camera.lookAt(0, 0.55, 0);
    gfx.focusShadow(new THREE.Vector3(0, 0, 0), 4);
    for (const c of chars) c.update(0.016);
    await document.fonts.ready;
    gfx.render(1 / 60);
    gfx.render(1 / 60);
    document.body.dataset.ready = '1';
    return;
  }
  if (name.startsWith('dev-page-')) {
    // dev-page-<id>-<v×100>[-<verdict>][-hat]: a station mid-hold, or just after its verdict.
    const debug = name.includes('.dbg');
    const side = name.includes('.side');
    const bearsN = Number(/\.b(\d)/.exec(name)?.[1] ?? 0);
    const [, , id, vs, k, hat] = name.replace(/\.(dbg|side|b\d)/g, '').split('-');
    const world = createWorld(gfx, assets, {});
    world.setBearsHome(bearsN);
    world.setQuality(gfx.quality);
    if (hat) world.setLook('goldi', hat);
    const raw = id.startsWith('bowls') ? { ...practicePage('porridge', 0), bo: Number(id.slice(5)) || 2 } : practicePage(id, 0);
    const P = readPage(raw);
    world.showPage(P, { glide: 0 });
    const v = Number(vs) / 100;
    const st = { v: 0, c: P.c0, w: P.w, holding: true, pressed: true, released: false, k: null, since: -1, sp: 1, P, hold: 0 };
    const frames = 45;
    for (let i = 0; i < frames; i++) {
      st.v = (v * (i + 1)) / frames;
      st.hold = ((i + 1) / frames) * 2500;
      world.update(1 / 30, st);
    }
    if (k) {
      st.holding = false;
      st.released = true;
      st.k = k;
      st.since = 0;
      world.stationFor(P).verdict({ k, v, s: 0 }, st);
      for (let i = 0; i < Number(params.get('after') ?? 24); i++) {
        st.since += 1 / 30;
        world.update(1 / 30, st);
      }
    }
    if (side) {
      // The same moment seen from the right, level.
      const f = world.stationFor(P).frame;
      camera.position.set(f.target[0] + f.radius * 3, f.target[1] + 0.1, f.target[2]);
      camera.lookAt(f.target[0], f.target[1], f.target[2]);
    }
    if (debug) {
      const me = world.me;
      const pre = document.createElement('pre');
      pre.style.cssText = 'position:fixed;left:0;top:0;margin:0;padding:8px;background:#fff;color:#000;font:14px monospace;z-index:9';
      pre.textContent = JSON.stringify({ c: st.c, w: st.w, v: st.v, cur: me.currentName, scrub: me.scrubbing, t: me.current?.time, en: me.current?.enabled, wt: me.current?.getEffectiveWeight(), paused: me.current?.paused, acts: [...me.actions.entries()].map(([n, a]) => [n, a.enabled, a.isRunning(), +a.getEffectiveWeight().toFixed(2), +a.time.toFixed(2)]) }, null, 0);
      document.body.appendChild(pre);
    }
    await document.fonts.ready;
    gfx.render(1 / 60);
    gfx.render(1 / 60);
    document.body.dataset.ready = '1';
    return;
  }
  if (name.startsWith('dev-faces-')) {
    // Five faces in a row (256 px cells at 1280×336, under the capture's menu strip): row 0 and 1 the playable cast, then
    // the folk. Cut into public/faces/.
    const row = Number(name.slice(10)) || 0;
    scene.background = new THREE.Color('#f2d6a2');
    const list = [...Object.keys(CHARACTERS).map((k) => [k, CHARACTERS[k]]), ...Object.keys(FOLK_LOOKS).map((k) => [k, FOLK_LOOKS[k]])];
    const cols = 5;
    const cell = 1.0;
    const chars = [];
    const head = new THREE.Vector3();
    list.forEach(([key, def], i) => {
      if (Math.floor(i / cols) !== row) return;
      const ch = new Character(assets, def.kind, def.look, { scale: CH * 1.15 * (def.scale ?? 1) });
      ch.play(ANIM.idle);
      ch.update(0.4 + (i % 3) * 0.3);
      ch.group.rotation.y = 0.32;
      scene.add(ch.group);
      ch.group.updateMatrixWorld(true);
      ch.headAt(head);
      const cx = (i % cols) * cell;
      ch.group.position.set(cx - head.x, -head.y - 0.12, -head.z);
      chars.push(ch);
    });
    // A long lens from far away: near-orthographic, every head the same size in its cell; the cells fill the bottom 256 px.
    const rows = 336 / 256;
    const dist = 80;
    const midY = (rows - 1) / 2;
    camera.fov = (2 * Math.atan((rows * cell) / 2 / dist) * 180) / Math.PI;
    camera.position.set(((cols - 1) * cell) / 2, midY, dist);
    camera.lookAt(((cols - 1) * cell) / 2, midY, 0);
    camera.near = 40;
    camera.far = 120;
    camera.updateProjectionMatrix();
    gfx.focusShadow(new THREE.Vector3(2, 0, 0), 6);
    await document.fonts.ready;
    gfx.render(1 / 60);
    gfx.render(1 / 60);
    document.body.dataset.ready = '1';
    return;
  }
  if (name === 'dev-measure') {
    // Sizes of the cast at CH, written on the page.
    const lines = [];
    for (const [k, def] of Object.entries({ ...CHARACTERS, papa: BEARS.papa, mama: BEARS.mama, baby: BEARS.baby })) {
      const ch = new Character(assets, def.kind, def.look, { scale: CH * (def.scale ?? 1) });
      scene.add(ch.group);
      ch.play(ANIM.idle);
      ch.update(0.01);
      ch.group.updateMatrixWorld(true);
      const box = new THREE.Box3();
      ch.model.traverse((m) => {
        if (m.isSkinnedMesh) {
          m.computeBoundingBox();
          const b = m.boundingBox.clone().applyMatrix4(m.matrixWorld);
          box.union(b);
        }
      });
      let head = null;
      ch.model.traverse((o) => {
        if (o.isBone && o.name === 'Head') head = o;
        if (o.isBone && o.name === 'LowerArm.R') ch._arm = o;
      });
      const hp = head ? head.getWorldPosition(new THREE.Vector3()) : null;
      const ap = ch._arm ? ch._arm.getWorldPosition(new THREE.Vector3()) : null;
      lines.push(`${k}: y ${box.min.y.toFixed(2)}..${box.max.y.toFixed(2)} x ${box.min.x.toFixed(2)}..${box.max.x.toFixed(2)} z ${box.min.z.toFixed(2)}..${box.max.z.toFixed(2)} head ${hp ? hp.y.toFixed(2) : '-'} arm ${ap ? ap.toArray().map((v) => v.toFixed(2)).join(',') : '-'}`);
      scene.remove(ch.group);
    }
    const pre = document.createElement('pre');
    pre.style.cssText = 'position:fixed;inset:0;margin:0;padding:20px;background:#fff;color:#000;font:16px monospace;z-index:9';
    pre.textContent = lines.join('\n');
    document.body.appendChild(pre);
    document.body.dataset.ready = '1';
    return;
  }
  const house = buildCottage(gfx, assets);
  const chars = [];
  const put = (def, x, z, ry = 0, anim = ANIM.idle) => {
    const ch = new Character(assets, def.kind, def.look, { scale: CH * (def.scale ?? 1) });
    ch.group.position.set(x, 0, z);
    ch.group.rotation.y = ry;
    ch.play(anim);
    scene.add(ch.group);
    chars.push(ch);
    return ch;
  };
  if (name === 'dev-bears') {
    put(BEARS.papa, -3.4, -0.1, 0.2, ANIM.idle);
    put(BEARS.mama, -2.6, 0.0, 0, ANIM.wave);
    put(BEARS.baby, -1.9, 0.1, -0.2, ANIM.yes);
    put(CHARACTERS.goldi, -1.3, 0.2, -0.3, ANIM.idle);
    camera.fov = 30;
    camera.position.set(-2.3, 1.0, 3.6);
    camera.lookAt(-2.5, 0.6, 0);
    camera.updateProjectionMatrix();
    gfx.focusShadow(new THREE.Vector3(-2.5, 0, 0), 4);
  } else {
    put(CHARACTERS.goldi, -7.4, -0.6, 0.4, ANIM.idle);
    put(BEARS.papa, -3.2, 0.4, 0, ANIM.wave);
    put(BEARS.mama, 1.2, 0.4, 0, ANIM.idle);
    put(BEARS.baby, 6.2, 0.4, 0, ANIM.yes);
    const v = name.startsWith('dev-cam_') ? name.slice(8).split('_').map((x) => Number(x.replace('m', '-'))) : [];
    if (v.length === 6 && v.every(Number.isFinite)) {
      camera.position.set(v[0], v[1], v[2]);
      camera.lookAt(v[3], v[4], v[5]);
    } else {
      camera.fov = 34;
      camera.position.set(0.5, 5.5, 19);
      camera.lookAt(0.5, 1.0, -1);
      camera.updateProjectionMatrix();
    }
    gfx.focusShadow(new THREE.Vector3(0, 0, -1), 13);
  }
  house.setQuality(gfx.quality);
  for (let i = 0; i < 3; i++) house.update(1 / 30, i / 30, camera);
  if (params.get('golden')) gfx.setGolden(Number(params.get('golden')));
  return settle(gfx, chars);
}
