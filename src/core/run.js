// Before the Bears as a run: pages until the three bears are home. Every miss brings a bear through the door (a Spare Pillow
// takes one instead); perfects in a row multiply; every fifth page you pick a charm; every tenth page is the boss, The Three
// Bowls: three quick holds in a row while Papa Bear watches. Pure and seeded.

import { createRun as createOrder, makePage, soloLevel, levelOf } from './plan.js';
import { inBand } from './pages.js';
import { offerCharms, applyCharms, charmEffects, charmOf } from './charms.js';
import { createRng } from './rng.js';

export const PICK_EVERY = 5;
export const BOSS_EVERY = 10;
export const BOSS_BOWLS = 3;
/** Honey for beating the boss. */
export const BOSS_HONEY = 60;

/** Points for one release: the page's score × the streak multiplier × the risky charms, plus a perfect bonus. */
export function runPoints(s, k, streakBefore, fx) {
  const perfect = k === 'perfect';
  const mult = perfect ? Math.min(fx.streakCap, 1 + Math.max(0, streakBefore)) : 1;
  const base = Math.round(s * mult * fx.points);
  return { pts: base + (perfect ? fx.perfectBonus : 0), mult };
}

/** from: the page a run starts on (1; later only for capturing a trailer, as if the pages before were cleared). */
export function createRunState(seed, { rank = 0, from = 1 } = {}) {
  const order = createOrder(seed);
  const st = {
    seed,
    rank,
    /** Page number about to be played (1-based); a boss keeps its number for all three bowls. */
    n: 1,
    /** Which bowl of the boss (1-3), or 0. */
    bowl: 0,
    played: 0,
    cleared: 0,
    score: 0,
    home: 0,
    streak: 0,
    bestStreak: 0,
    shields: 0,
    charms: [],
    picks: 0,
    honey: 0,
    perfects: 0,
    bosses: 0,
    bossMisses: 0,
    /** A pick is waiting before the next page: the three on offer. */
    offer: null,
    over: false,
  };
  if (from > 1) {
    st.n = Math.floor(from);
    st.played = st.cleared = st.n - 1;
  }

  function isBoss(n) {
    return n % BOSS_EVERY === 0;
  }

  /** The next page (the small integers the rules read), charms applied. */
  function page() {
    const n = st.n;
    let raw;
    if (isBoss(n)) {
      if (st.bowl === 0) {
        st.bowl = 1;
        st.bossMisses = 0;
      }
      const lv = soloLevel(levelOf(st.cleared) + 1);
      raw = makePage(createRng(`boss:${seed}:${n}:${st.bowl}`), 'porridge', { sp: Math.round(lv.sp * 1.1), w: Math.max(40, lv.w - 5), n });
      raw.bo = st.bowl;
      raw.tw = 0;
    } else {
      // Skip the boss pages in the order so every page still comes round.
      raw = order.page(n - 1 - Math.floor(n / BOSS_EVERY), st.cleared);
      raw.n = n;
    }
    return applyCharms(raw, st.charms);
  }

  /**
   * A verdict on the page just played. → { pts, mult, bear (a bear came home), shieldUsed, over, bossDone (true beaten,
   * false lost, null not a boss end), pick (an offer is waiting), honey (earned on this page) }
   */
  function verdict(r) {
    if (st.over) return null;
    const fx = charmEffects(st.charms);
    const good = inBand(r.k);
    const { pts, mult } = runPoints(r.s, r.k, st.streak, fx);
    st.score += pts;
    st.played++;
    if (r.k === 'perfect') {
      st.streak++;
      st.perfects++;
      st.bestStreak = Math.max(st.bestStreak, st.streak);
    } else st.streak = 0;
    let honey = Math.round((Math.floor(pts / 40) + (r.k === 'perfect' ? 2 : 0)) * fx.honey);
    let bear = false;
    let shieldUsed = false;
    if (good) st.cleared++;
    else if (st.shields > 0) {
      st.shields--;
      shieldUsed = true;
    } else {
      st.home++;
      bear = true;
    }
    if (st.bowl && !good) st.bossMisses++;
    let bossDone = null;
    if (st.home >= 3) st.over = true;
    // Move on: the next bowl, or the next page.
    if (st.bowl && st.bowl < BOSS_BOWLS && !st.over) st.bowl++;
    else {
      if (st.bowl) {
        bossDone = st.bossMisses === 0;
        if (bossDone) {
          st.bosses++;
          honey += Math.round(BOSS_HONEY * fx.honey);
        }
        st.bowl = 0;
      }
      if (!st.over && st.n % PICK_EVERY === 0) {
        st.offer = offerCharms(seed, st.picks, st.charms, { rank: st.rank, home: st.home });
        if (st.offer.length === 0) st.offer = null;
      }
      st.n++;
    }
    st.honey += honey;
    return { pts, mult, bear, shieldUsed, over: st.over, bossDone, pick: !!st.offer, honey };
  }

  /** Take one of the charms on offer (or pass with null). */
  function pick(id) {
    if (!st.offer) return false;
    const ok = id && st.offer.includes(id);
    st.offer = null;
    st.picks++;
    if (!ok) return false;
    const c = charmOf(id);
    if (c.instant === 'bearOut') st.home = Math.max(0, st.home - 1);
    else st.charms.push(id);
    if (c.shield) st.shields += c.shield;
    return true;
  }

  return {
    state: st,
    page,
    verdict,
    pick,
    isBoss: () => isBoss(st.n),
    effects: () => charmEffects(st.charms),
  };
}
