// Charms from the bears' cupboard: Before the Bears offers three every five pages and after every boss. Some bend the page
// (a wider green, a slower clock), some bend the score, some save you from a miss. Rarer ones open up as your rank rises. Pure.

import { createRng } from './rng.js';

/**
 * id, name, text (a label, not a sentence), rank (the rank that opens it), and what it does:
 *   raw(page) → page (the small integers the rules read), shield (misses forgiven), honey (×), ghost (shows the landing),
 *   streakCap, points (×, risky ones), perfectBonus, instant ('bearOut': a bear goes back out), stack (can be taken again).
 */
export const CHARMS = [
  { id: 'bigspoon', name: 'Big Spoon', text: 'Wider green', rank: 0, raw: (r) => ({ ...r, w: Math.min(200, Math.round(r.w * 1.3)) }) },
  { id: 'slowclock', name: 'Slow Clock', text: 'Slower pages', rank: 0, raw: (r) => ({ ...r, sp: Math.max(40, Math.round(r.sp * 0.85)) }) },
  { id: 'goldnotch', name: 'Golden Notch', text: 'Bigger perfect', rank: 0, raw: (r) => ({ ...r, pr: 30 }) },
  { id: 'pillow', name: 'Spare Pillow', text: 'Forgive a miss', rank: 0, stack: true, shield: 1 },
  { id: 'honeypot', name: 'Honey Pot', text: 'Honey ×2', rank: 0, honey: 2 },
  { id: 'steady', name: 'Steady Paws', text: 'No twists', rank: 1, raw: (r) => ({ ...r, tw: 0 }) },
  { id: 'crystal', name: 'Crystal Ball', text: 'See the landing', rank: 2, ghost: true },
  { id: 'hotstreak', name: 'Hot Streak', text: 'Streak to ×8', rank: 3, streakCap: 8 },
  { id: 'honeytrail', name: 'Honey Trail', text: 'A bear goes out', rank: 4, stack: true, instant: 'bearOut' },
  { id: 'tinyspoon', name: 'Tiny Spoon', text: 'Thin green ×1.5', rank: 5, risky: true, points: 1.5, raw: (r) => ({ ...r, w: Math.max(25, Math.round(r.w * 0.7)) }) },
  { id: 'quickpaws', name: 'Quick Paws', text: 'Faster ×1.4', rank: 6, risky: true, points: 1.4, raw: (r) => ({ ...r, sp: Math.min(300, Math.round(r.sp * 1.2)) }) },
  { id: 'luckystar', name: 'Lucky Star', text: 'Perfects +50', rank: 7, perfectBonus: 50 },
];
export const CHARM_IDS = CHARMS.map((c) => c.id);
const BY_ID = new Map(CHARMS.map((c) => [c.id, c]));
export const charmOf = (id) => BY_ID.get(id) ?? null;

/** The charms a rank has opened. */
export const charmsForRank = (rank) => CHARMS.filter((c) => c.rank <= Math.max(0, rank)).map((c) => c.id);

/**
 * Three to choose from (fewer only if fewer are left): never one already held unless it stacks, Honey Trail only with a bear
 * home, the same three for the same run and pick.
 */
export function offerCharms(seed, pick, held = [], { rank = 0, home = 0 } = {}) {
  const rng = createRng(`charms:${seed}:${pick}`);
  const open = charmsForRank(rank).filter((id) => {
    const c = BY_ID.get(id);
    if (c.instant === 'bearOut' && home <= 0) return false;
    return c.stack || !held.includes(id);
  });
  return rng.shuffle(open).slice(0, 3);
}

/** A page with the held charms applied (in the order they were taken). */
export function applyCharms(raw, held = []) {
  let r = { ...raw };
  for (const id of held) {
    const c = BY_ID.get(id);
    if (c && c.raw) r = c.raw(r);
  }
  return r;
}

/** What the held charms add up to for scoring. */
export function charmEffects(held = []) {
  const e = { honey: 1, ghost: false, streakCap: 5, points: 1, perfectBonus: 0 };
  for (const id of held) {
    const c = BY_ID.get(id);
    if (!c) continue;
    if (c.honey) e.honey *= c.honey;
    if (c.ghost) e.ghost = true;
    if (c.streakCap) e.streakCap = Math.max(e.streakCap, c.streakCap);
    if (c.points) e.points *= c.points;
    if (c.perfectBonus) e.perfectBonus += c.perfectBonus;
  }
  return e;
}
