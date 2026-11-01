// Development pictures: ?poster=dev-cast lines up the whole cast.
import * as THREE from 'three';
import { Character, ANIM } from '../gfx/cast.js';
import { CHARACTERS, BEARS, FOLK_LOOKS } from '../gfx/palette.js';

export async function devScene(name, gfx, assets) {
  const { scene, camera } = gfx;
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
  const props = ['stove', 'toaster', 'chairCushion', 'honey', 'cake', 'bedSingle', 'tree1', 'bush1', 'bell', 'armchair'];
  props.forEach((k, i) => {
    const p = assets.prop(k);
    p.position.set((i - 4.5) * 2.0, 0, -3);
    scene.add(p);
  });
  camera.position.set(0, 3.2, 13);
  camera.lookAt(0, 1.0, -1);
  gfx.focusShadow(new THREE.Vector3(0, 0, -1), 12);
  for (let i = 0; i < 40; i++) for (const c of chars) c.update(1 / 30);
  await document.fonts.ready;
  gfx.render(1 / 60);
  gfx.render(1 / 60);
  document.body.dataset.ready = '1';
}
