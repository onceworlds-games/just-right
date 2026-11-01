import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { RANKS, SHOP } from '../src/core/progress.js';
import { CHARACTERS } from '../src/gfx/palette.js';
import { HATS } from '../src/world/hats.js';

const root = new URL('..', import.meta.url);
const config = JSON.parse(readFileSync(new URL('onceworlds.json', root), 'utf8'));
const app = readFileSync(new URL('src/app.js', root), 'utf8');

/** Width and height from a PNG's header. */
function pngSize(rel) {
  const b = readFileSync(new URL(rel, root));
  assert.equal(b.toString('latin1', 1, 4), 'PNG', `${rel} is a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('badges: every one the game awards is declared, every declared one is awarded and has its picture', () => {
  const declared = new Set(config.badges.map((b) => b.id));
  const awarded = new Set([...app.matchAll(/award\('([a-z-]+)'\)/g)].map((m) => m[1]));
  for (const id of awarded) assert.ok(declared.has(id), `${id} is in onceworlds.json`);
  for (const id of declared) {
    assert.ok(awarded.has(id), `${id} is awarded somewhere`);
    assert.deepEqual(pngSize(`store/badge-${id}.png`), [256, 256]);
  }
  for (const b of config.badges) assert.ok(b.name && b.description && b.description.length <= 120, b.id);
});

test('store art: thumbnails at 1280x720, the icon at 512, a trailer', () => {
  assert.ok(config.thumbnails.length >= 3);
  for (const t of config.thumbnails) assert.deepEqual(pngSize(t), [1280, 720], t);
  assert.deepEqual(pngSize('store/icon.png'), [512, 512]);
  assert.ok(existsSync(new URL('store/trailer.mp4', root)));
});

test('shared data: every key the game writes is declared', () => {
  const keys = new Set([...app.matchAll(/gd\.(?:add|push|get|list)\?\.\('([a-z-]+)'/g)].map((m) => m[1]));
  assert.ok(keys.size >= 1);
  for (const k of keys) assert.ok(config.data?.[k], `${k} is declared under "data"`);
});

test('the Cottage Regular badge names a real rank, reached by the rank index that awards it', () => {
  const i = RANKS.findIndex((r) => r.name === 'Cottage Regular');
  assert.ok(i > 0);
  assert.match(app, new RegExp(`now >= ${i}\\) award\\('cottage-regular'\\)`));
  assert.match(config.badges.find((b) => b.id === 'cottage-regular').description, /Cottage Regular/);
});

test('the Wardrobe sells only looks and hats that exist, inks as colours', () => {
  for (const c of SHOP.char) assert.ok(CHARACTERS[c.id], `character ${c.id}`);
  for (const h of SHOP.hat) if (h.id) assert.ok(HATS[h.id], `hat ${h.id}`);
  for (const k of SHOP.ink) assert.match(k.color, /^#[0-9A-Fa-f]{6}$/);
  for (const list of Object.values(SHOP)) assert.equal(new Set(list.map((x) => x.id)).size, list.length);
});
