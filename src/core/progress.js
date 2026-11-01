// What carries over between visits: honey (spent in the Wardrobe), a rank from every point ever scored, the Storybook's stars,
// bests, the daily streak and what you wear. Saved with ow.save and cleaned on the way in, whatever the save holds. Pure.

import { PAGE_IDS } from './pages.js';

/** Ranks by lifetime points. */
export const RANKS = [
  { xp: 0, name: 'Lost in the Woods' },
  { xp: 2000, name: 'Porridge Taster' },
  { xp: 6000, name: 'Chair Tester' },
  { xp: 14000, name: 'Pillow Fluffer' },
  { xp: 28000, name: 'Honey Finder' },
  { xp: 50000, name: 'Bear Friend' },
  { xp: 80000, name: 'Cottage Regular' },
  { xp: 125000, name: 'Just Right' },
];

/** → { i, name, xp, floor, next (null at the top), k (0-1 to the next) } */
export function rankOf(xp) {
  const x = Math.max(0, Number(xp) || 0);
  let i = 0;
  while (i + 1 < RANKS.length && x >= RANKS[i + 1].xp) i++;
  const floor = RANKS[i].xp;
  const next = i + 1 < RANKS.length ? RANKS[i + 1].xp : null;
  return { i, name: RANKS[i].name, xp: x, floor, next, k: next === null ? 1 : (x - floor) / (next - floor) };
}

/** The Wardrobe: characters, hats and stamp inks, priced in honey (some open with a rank, the crown with ten stories won). */
export const SHOP = {
  char: [
    { id: 'goldi', name: 'Goldi', price: 0 },
    { id: 'rosie', name: 'Rosie', price: 150 },
    { id: 'bramble', name: 'Bramble', price: 250 },
    { id: 'sky', name: 'Sky', price: 400 },
    { id: 'pepper', name: 'Pepper', price: 600 },
    { id: 'cub', name: 'Cub', price: 900, rank: 3 },
    { id: 'bao', name: 'Bao', price: 1400, rank: 5 },
  ],
  hat: [
    { id: '', name: 'No hat', price: 0 },
    { id: 'bow', name: 'Bow', price: 80 },
    { id: 'party', name: 'Party Hat', price: 120 },
    { id: 'beret', name: 'Beret', price: 200 },
    { id: 'acorn', name: 'Acorn Cap', price: 260 },
    { id: 'chef', name: 'Chef Hat', price: 350, rank: 2 },
    { id: 'straw', name: 'Sun Hat', price: 450, rank: 3 },
    { id: 'crown', name: 'Crown', price: 0, wins: 10 },
  ],
  ink: [
    { id: 'red', name: 'Cherry', price: 0, color: '#C8442F' },
    { id: 'navy', name: 'Ink Blue', price: 100, color: '#2B3F86' },
    { id: 'moss', name: 'Moss', price: 160, color: '#3E7A34' },
    { id: 'plum', name: 'Plum', price: 220, color: '#7B3A78' },
    { id: 'honey', name: 'Honey', price: 400, rank: 2, color: '#D98E12' },
    { id: 'gold', name: 'Gold Leaf', price: 900, rank: 4, color: '#B8892B', shine: true },
  ],
};
const KINDS = Object.keys(SHOP);
export const itemOf = (kind, id) => (SHOP[kind] ?? []).find((x) => x.id === id) ?? null;

/** Honey for points scored: a drop per 40, two more for a perfect. */
export const honeyFor = (points, perfects = 0) => Math.max(0, Math.floor(Math.max(0, points) / 40) + 2 * Math.max(0, perfects));

export function defaultProfile() {
  return {
    v: 2,
    honey: 0,
    xp: 0,
    met: Object.fromEntries(PAGE_IDS.map((id) => [id, 0])),
    stars: Object.fromEntries(PAGE_IDS.map((id) => [id, 0])),
    perfects: 0,
    porridgePerfects: 0,
    bestRun: 0,
    bestPages: 0,
    bestStreak: 0,
    bosses: 0,
    wins: 0,
    stories: 0,
    daily: { day: -1, best: 0, streak: 0, lastDay: -1 },
    owned: { char: ['goldi'], hat: [''], ink: ['red'] },
    wear: { char: 'goldi', hat: '', ink: 'red' },
    tasks: { day: -1, done: {}, n: {} },
    readied: 0,
    letGo: 0,
    seenCharms: [],
  };
}

const num = (v, max = 1e9) => (Number.isFinite(v) && v >= 0 ? Math.min(max, Math.floor(v)) : 0);
const int = (v, def = -1) => (Number.isInteger(v) ? v : def);

/** A saved profile, made safe: unknown keys dropped, numbers clamped, owned items real, the old save format read. */
export function cleanProfile(raw) {
  const p = defaultProfile();
  if (!raw || typeof raw !== 'object') return p;
  p.honey = num(raw.honey, 1e7);
  p.xp = num(raw.xp, 1e9);
  for (const id of PAGE_IDS) {
    p.met[id] = num(raw.met?.[id]);
    p.stars[id] = num(raw.stars?.[id], 3);
  }
  for (const k of ['perfects', 'porridgePerfects', 'bestRun', 'bestPages', 'bestStreak', 'bosses', 'wins', 'stories', 'readied', 'letGo']) p[k] = num(raw[k]);
  const d = raw.daily;
  if (d && typeof d === 'object') p.daily = { day: int(d.day), best: num(d.best, 2000), streak: num(d.streak, 9999), lastDay: int(d.lastDay) };
  for (const kind of KINDS) {
    const list = Array.isArray(raw.owned?.[kind]) ? raw.owned[kind] : [];
    for (const id of list) if (typeof id === 'string' && itemOf(kind, id) && !p.owned[kind].includes(id)) p.owned[kind].push(id);
    const w = raw.wear?.[kind];
    if (typeof w === 'string' && p.owned[kind].includes(w)) p.wear[kind] = w;
  }
  const t = raw.tasks;
  if (t && typeof t === 'object' && Number.isInteger(t.day)) {
    p.tasks.day = t.day;
    for (const k of ['0', '1', '2']) {
      if (t.done?.[k] === 1) p.tasks.done[k] = 1;
      p.tasks.n[k] = num(t.n?.[k], 1000);
    }
  }
  if (Array.isArray(raw.seenCharms)) p.seenCharms = raw.seenCharms.filter((x) => typeof x === 'string').slice(0, 40);
  return p;
}

/** Can this be had? → 'owned' | 'ok' | 'honey' (not enough) | 'rank' | 'wins' */
export function canBuy(p, kind, id) {
  const it = itemOf(kind, id);
  if (!it) return 'none';
  if (p.owned[kind].includes(id)) return 'owned';
  if (it.rank && rankOf(p.xp).i < it.rank) return 'rank';
  if (it.wins && p.wins < it.wins) return 'wins';
  if (p.honey < it.price) return 'honey';
  return 'ok';
}

/** Buy (and wear) an item. Returns true when bought. */
export function buy(p, kind, id) {
  if (canBuy(p, kind, id) !== 'ok') return false;
  const it = itemOf(kind, id);
  p.honey -= it.price;
  p.owned[kind].push(id);
  p.wear[kind] = id;
  return true;
}

export function wear(p, kind, id) {
  if (!p.owned[kind]?.includes(id)) return false;
  p.wear[kind] = id;
  return true;
}

/** Points scored anywhere: experience. Returns the rank before and after (to celebrate a new one). */
export function addXp(p, points) {
  const before = rankOf(p.xp).i;
  p.xp = Math.min(1e9, p.xp + Math.max(0, Math.floor(points)));
  return { before, after: rankOf(p.xp).i };
}

/** Stars for a practice go: 3 for a perfect, 2 for 90+, 1 for 70+. */
export const starsFor = (k, s) => (k === 'perfect' ? 3 : s >= 90 ? 2 : s >= 70 ? 1 : 0);

/** The daily: a new day starts (or continues) the streak. Returns the streak. */
export function dailyPlayed(p, day, score) {
  const d = p.daily;
  if (d.day !== day) {
    d.streak = d.lastDay === day - 1 ? d.streak + 1 : 1;
    d.day = day;
    d.best = 0;
    d.lastDay = day;
  }
  d.best = Math.max(d.best, Math.max(0, Math.floor(score)));
  return d.streak;
}
