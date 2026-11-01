// Hats from the Wardrobe (and Mama Bear's flower, the winner's crown): small models made in code, sized in metres for a head
// of the cast at its usual size. attachHat() puts one on a character's head bone, whatever that bone's own scale.
import * as THREE from 'three';
import { PAL } from '../gfx/palette.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.6, metalness: o.m ?? 0 });

export const HATS = {
  crown: { name: 'Crown' },
  party: { name: 'Party Hat' },
  chef: { name: 'Chef Hat' },
  beret: { name: 'Beret' },
  straw: { name: 'Sun Hat' },
  bow: { name: 'Bow' },
  acorn: { name: 'Acorn Cap' },
  flower: { name: 'Flower' },
};

export function makeHat(id) {
  const g = new THREE.Group();
  g.name = `hat:${id}`;
  if (id === 'crown') {
    const gold = std('#f2c14e', { r: 0.25, m: 0.9 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 20, 1, true), gold);
    band.material.side = THREE.DoubleSide;
    g.add(band);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 4), gold);
      p.position.set(Math.cos(a) * 0.095, 0.06, Math.sin(a) * 0.095);
      g.add(p);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), std(i % 2 ? '#d8323a' : '#3f6fd8', { r: 0.2, m: 0.3 }));
      gem.position.set(Math.cos(a) * 0.1, 0.0, Math.sin(a) * 0.1);
      g.add(gem);
    }
  } else if (id === 'party') {
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 64;
    const c = cv.getContext('2d');
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#F2B33D' : '#5FA8D8';
      c.fillRect(0, i * 8, 64, 8);
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 20), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
    cone.position.y = 0.1;
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), std(PAL.red, { r: 0.9 }));
    pom.position.y = 0.21;
    g.add(cone, pom);
    g.rotation.z = 0.15;
  } else if (id === 'chef') {
    const white = std('#fbf8f2', { r: 0.9 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 20), white);
    band.position.y = 0.03;
    g.add(band);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), white);
      puff.position.set(Math.cos(a) * 0.05, 0.12, Math.sin(a) * 0.05);
      g.add(puff);
    }
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), white);
    top.position.y = 0.15;
    g.add(top);
  } else if (id === 'beret') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 10), std('#C8442F', { r: 0.95 }));
    b.scale.set(1, 0.3, 1);
    b.position.set(0.02, 0.02, 0);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.025, 6), std('#C8442F'));
    stalk.position.set(0.02, 0.055, 0);
    g.add(b, stalk);
    g.rotation.z = -0.25;
  } else if (id === 'straw') {
    const straw = std('#e8c87a', { r: 0.95 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 28), straw);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.08, 20), straw);
    crown.position.y = 0.045;
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.097, 0.097, 0.022, 20, 1, true), std(PAL.red));
    ribbon.position.y = 0.018;
    g.add(brim, crown, ribbon);
  } else if (id === 'bow') {
    const red = std('#e2577a', { r: 0.5 });
    for (const s of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.09, 12), red);
      loop.rotation.z = (s * Math.PI) / 2;
      loop.position.x = s * 0.045;
      g.add(loop);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), red);
    g.add(knot);
    g.position.y = 0.02;
  } else if (id === 'acorn') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#8a5530', { r: 0.95 }));
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.05, 6), std('#5a3620'));
    stem.position.y = 0.11;
    g.add(cap, stem);
  } else if (id === 'flower') {
    const petal = std('#f4a6c0', { r: 0.6 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), petal);
      p.scale.set(1, 0.4, 1.4);
      p.position.set(Math.cos(a) * 0.035, 0, Math.sin(a) * 0.035);
      p.rotation.y = -a;
      g.add(p);
    }
    const mid = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), std(PAL.honey));
    mid.position.y = 0.01;
    g.add(mid);
    g.rotation.set(0.3, 0, 0.5);
    g.position.x = 0.09;
  }
  g.traverse((m) => {
    if (m.isMesh) m.castShadow = true;
  });
  return g;
}

/**
 * Puts a hat on a character's head bone. The bone may carry any scale and point any way; the holder cancels its world scale
 * and sits the hat `up` metres above the bone, scaled with the character.
 */
export function attachHat(ch, hat, { up = 0.4 } = {}) {
  if (!ch.head) return null;
  ch.group.updateMatrixWorld(true);
  const s = new THREE.Vector3();
  ch.head.getWorldScale(s);
  const holder = new THREE.Group();
  const k = ch.group.scale.x / 0.36;
  holder.scale.set(k / s.x, k / s.y, k / s.z);
  holder.position.set(0, up / s.y * k, 0);
  holder.add(hat);
  ch.head.add(holder);
  return holder;
}
