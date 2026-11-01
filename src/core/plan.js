// Which pages come in which order, how fast and how narrow: a match (from the match's seed), a solo run (Before the Bears),
// the daily (from the date) and practice. Pure.

import { PAGES, pageOf, SWING_TOPS } from './pages.js';
import { createRng } from './rng.js';

export const EASY = PAGES.filter((p) => p.set === 'easy').map((p) => p.id);
const ALL = PAGES.map((p) => p.id);

/** Match pages by third: speed ×100, half-width ×1000, twist chance. */
export const MATCH_TIERS = [
  { sp: 100, w: 75, twist: 0 },
  { sp: 115, w: 60, twist: 0.3 },
  { sp: 130, w: 50, twist: 1 },
];
/** Page 1 of every match: gentle porridge. */
export const FIRST_PAGE = { sp: 85, w: 80 };
export const MATCH_LENGTHS = [8, 12, 16];
export const DAILY_PAGES = 10;
export const DAILY_LEVELS = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];

/** Before the Bears: a level every five pages cleared. */
export function soloLevel(level) {
  const L = Math.max(0, Math.floor(level));
  return {
    sp: Math.round(Math.min(2, 1 + 0.12 * L) * 100),
    w: Math.round(Math.max(0.035, 0.075 - 0.005 * L) * 1000),
    twist: L < 2 ? 0 : Math.min(0.7, 0.25 + 0.1 * (L - 2)),
  };
}
export const levelOf = (cleared) => Math.floor(Math.max(0, cleared) / 5);

/**
 * An endless order of pages: the first three from the easy set, the rest shuffled in bags of all twelve, with the late pages
 * (the ones that keep going or swing) never before the fourth and no page twice in a row. `first` forces page 1.
 */
export function pageOrder(rng, count, first = null) {
  const out = [];
  let bag = [];
  const late = (id) => pageOf(id).set === 'late';
  if (first) out.push(first);
  const opening = rng.shuffle(EASY.filter((id) => id !== first));
  while (out.length < Math.min(3, count)) out.push(opening.shift());
  bag = rng.shuffle(ALL.filter((id) => !out.includes(id)));
  while (out.length < count) {
    if (bag.length === 0) bag = rng.shuffle(ALL);
    let i = 0;
    // No repeat back to back, and no late page in the first three.
    while (i < bag.length - 1 && (bag[i] === out[out.length - 1] || (out.length < 3 && late(bag[i])))) i++;
    out.push(bag.splice(i, 1)[0]);
  }
  return out;
}

/** One page's data (the small integers the room carries). */
export function makePage(rng, id, { sp, w, twist = 0, n = 0, x2 = false }) {
  const page = pageOf(id);
  const [lo, hi] = page.band;
  let c;
  if (page.tops) {
    // The ledge sits just short of the top of one of the swings: let go at the right top.
    c = rng.pick(SWING_TOPS) - rng.range(0, 0.04);
  } else if (page.steps) {
    // The pillow's band sits on a pump: count them.
    const k = rng.int(Math.round(lo / page.steps), Math.round(hi / page.steps));
    c = k * page.steps;
  } else c = rng.range(lo, hi);
  let tw = 0;
  if (twist > 0 && page.twists.length > 0 && rng.chance(twist)) tw = rng.pick(page.twists);
  return { g: id, c: Math.round(c * 1000), w: Math.round(w), sp: Math.round(sp), tw, ph: rng.int(0, 999), n, x2: x2 ? 1 : 0 };
}

/** The tier of page n (1-based) in a match of `total`. */
export function matchTier(n, total) {
  const third = Math.ceil(total / 3);
  return n <= third ? 0 : n <= 2 * third ? 1 : 2;
}

/** A whole match's pages, the same on every page and for every host. */
export function matchPlan(seed, total) {
  const N = Math.max(1, Math.min(30, Math.floor(total) || 12));
  const rng = createRng(`match:${seed}`);
  const order = pageOrder(rng, N, 'porridge');
  return order.map((id, i) => {
    const n = i + 1;
    const tier = MATCH_TIERS[matchTier(n, N)];
    const base = n === 1 ? { ...FIRST_PAGE, twist: 0 } : tier;
    return makePage(rng, id, { ...base, n, x2: n === N && N > 1 });
  });
}

/** The daily: ten pages from the UTC day number, rising through the levels. */
export function dailyPlan(day) {
  const rng = createRng(`daily:${Math.floor(day)}`);
  const order = pageOrder(rng, DAILY_PAGES, 'porridge');
  return order.map((id, i) => makePage(rng, id, { ...soloLevel(DAILY_LEVELS[i]), n: i + 1 }));
}

/** A Before the Bears run: its order of pages (as long as anyone will last) and each page by how many were cleared. */
export function createRun(seed) {
  const rng = createRng(`run:${seed}`);
  const order = pageOrder(rng, 400, 'porridge');
  return {
    order,
    page(index, cleared) {
      const id = order[index % order.length];
      const lv = soloLevel(levelOf(cleared));
      const gentle = index === 0 ? { sp: 90, w: 80 } : {};
      return makePage(createRng(`run:${seed}:${index}`), id, { ...lv, ...gentle, n: index + 1 });
    },
  };
}

/** Practice: the page at speed 1 with a fresh band each go. */
export function practicePage(id, go) {
  return makePage(createRng(`practice:${id}:${go}`), id, { sp: 100, w: 75, n: go + 1 });
}

/** Before the Bears: a perfect scores ×(perfects in a row, this one included, at most 5); anything else ×1. */
export const multiplierFor = (streakBefore, perfect) => (perfect ? Math.min(5, 1 + Math.max(0, streakBefore)) : 1);
