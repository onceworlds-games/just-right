import test from 'node:test';
import assert from 'node:assert/strict';
import { readPage, evaluate, PAGE_IDS } from '../src/core/pages.js';
import { CHARMS, CHARM_IDS, offerCharms, applyCharms, charmEffects, charmsForRank, charmOf } from '../src/core/charms.js';
import { createRunState, runPoints, PICK_EVERY, BOSS_EVERY, BOSS_BOWLS, BOSS_HONEY } from '../src/core/run.js';
import { rankOf, RANKS, SHOP, defaultProfile, cleanProfile, canBuy, buy, wear, addXp, honeyFor, starsFor, dailyPlayed, itemOf } from '../src/core/progress.js';
import { tasksFor, advance, oopsOf, TASK_KINDS } from '../src/core/tasks.js';
import { practicePage } from '../src/core/plan.js';

const perfect = { k: 'perfect', s: 100 };
const good = { k: 'good', s: 85 };
const miss = { k: 'over', s: 20 };

// ---------------------------------------------------------------- charms

test('charms: ids unique, every page they bend still reads as a page', () => {
  assert.equal(new Set(CHARM_IDS).size, CHARMS.length);
  for (const id of PAGE_IDS) {
    for (let go = 0; go < 20; go++) {
      const raw = practicePage(id, go);
      for (const c of CHARMS) {
        const P = readPage(applyCharms(raw, [c.id]));
        assert.ok(P, `${c.id} on ${id}`);
      }
      // All of them at once, twice over.
      assert.ok(readPage(applyCharms(raw, [...CHARM_IDS, ...CHARM_IDS])));
    }
  }
});

test('charms: Big Spoon widens, Slow Clock slows, Golden Notch widens the perfect, Steady Paws removes twists', () => {
  const raw = { g: 'porridge', c: 600, w: 60, sp: 120, tw: 1, ph: 0, n: 1 };
  assert.equal(applyCharms(raw, ['bigspoon']).w, 78);
  assert.equal(applyCharms(raw, ['slowclock']).sp, 102);
  assert.equal(readPage(applyCharms(raw, ['goldnotch'])).pr, 0.03);
  assert.equal(applyCharms(raw, ['steady']).tw, 0);
  // A wider perfect really scores: 0.025 off the centre is a perfect only with the notch.
  const still = { ...raw, tw: 0 };
  const P = readPage(still);
  const Pn = readPage(applyCharms(still, ['goldnotch']));
  const at = (PP, d) => {
    // Find a hold that lands near c + d.
    for (let h = 0; h < 8000; h += 1) {
      const r = evaluate(PP, h, h + 300);
      if (r.v >= PP.c0 + d) return r;
    }
    return null;
  };
  assert.notEqual(at(P, 0.025).k, 'perfect');
  assert.equal(at(Pn, 0.025).k, 'perfect');
});

test('charms: offers are three, seeded, open by rank, never a held one unless it stacks, Honey Trail only with a bear home', () => {
  assert.deepEqual(offerCharms(7, 0, [], { rank: 7 }), offerCharms(7, 0, [], { rank: 7 }));
  for (let seed = 0; seed < 200; seed++) {
    const o = offerCharms(seed, seed % 4, ['bigspoon', 'pillow'], { rank: 7, home: 0 });
    assert.equal(o.length, 3);
    assert.equal(new Set(o).size, 3);
    assert.ok(!o.includes('bigspoon'));
    assert.ok(!o.includes('honeytrail'));
    const r0 = offerCharms(seed, 0, [], { rank: 0, home: 2 });
    for (const id of r0) assert.equal(charmOf(id).rank, 0);
  }
  assert.ok(charmsForRank(0).length >= 5);
  assert.equal(charmsForRank(99).length, CHARMS.length);
  // Honey Trail shows up with a bear home and the rank for it.
  let seen = false;
  for (let s = 0; s < 100 && !seen; s++) seen = offerCharms(s, 0, [], { rank: 7, home: 1 }).includes('honeytrail');
  assert.ok(seen);
});

test('charm effects add up', () => {
  const e = charmEffects(['honeypot', 'tinyspoon', 'quickpaws', 'luckystar', 'hotstreak', 'crystal']);
  assert.equal(e.honey, 2);
  assert.ok(Math.abs(e.points - 2.1) < 1e-9);
  assert.equal(e.perfectBonus, 50);
  assert.equal(e.streakCap, 8);
  assert.equal(e.ghost, true);
  assert.deepEqual(charmEffects([]), { honey: 1, ghost: false, streakCap: 5, points: 1, perfectBonus: 0 });
});

// ---------------------------------------------------------------- the run

test('run points: perfect streaks multiply to the cap; risky charms and Lucky Star', () => {
  const fx = charmEffects([]);
  assert.deepEqual(runPoints(100, 'perfect', 0, fx), { pts: 100, mult: 1 });
  assert.deepEqual(runPoints(100, 'perfect', 3, fx), { pts: 400, mult: 4 });
  assert.deepEqual(runPoints(100, 'perfect', 9, fx), { pts: 500, mult: 5 });
  assert.deepEqual(runPoints(85, 'good', 9, fx), { pts: 85, mult: 1 });
  assert.equal(runPoints(100, 'perfect', 9, charmEffects(['hotstreak'])).mult, 8);
  assert.equal(runPoints(100, 'perfect', 0, charmEffects(['luckystar'])).pts, 150);
  assert.equal(runPoints(80, 'good', 0, charmEffects(['tinyspoon'])).pts, 120);
});

test('a run: three misses bring the bears home and end it; good pages clear', () => {
  const run = createRunState(42);
  assert.ok(readPage(run.page()));
  run.verdict(good);
  assert.equal(run.state.cleared, 1);
  assert.equal(run.verdict(miss).bear, true);
  assert.equal(run.state.home, 1);
  run.page();
  run.verdict(miss);
  run.page();
  const last = run.verdict(miss);
  assert.equal(last.over, true);
  assert.equal(run.state.over, true);
  assert.equal(run.verdict(good), null);
});

test('a run: a pick every fifth page, a Spare Pillow takes a miss, Honey Trail sends a bear out', () => {
  const run = createRunState(3, { rank: 7 });
  for (let i = 1; i < PICK_EVERY; i++) {
    run.page();
    assert.equal(run.verdict(good).pick, false);
  }
  run.page();
  const v = run.verdict(miss);
  assert.equal(v.pick, true);
  assert.equal(run.state.offer.length, 3);
  assert.equal(run.state.home, 1);
  // Take a pillow and a trail whatever was offered (the director only offers what's on the list; this tests the effect).
  run.state.offer = ['pillow', 'honeytrail', 'bigspoon'];
  assert.equal(run.pick('honeytrail'), true);
  assert.equal(run.state.home, 0);
  assert.ok(!run.state.charms.includes('honeytrail'));
  run.state.offer = ['pillow'];
  run.pick('pillow');
  assert.equal(run.state.shields, 1);
  run.page();
  const saved = run.verdict(miss);
  assert.equal(saved.shieldUsed, true);
  assert.equal(saved.bear, false);
  assert.equal(run.state.home, 0);
  // Picking something not offered does nothing.
  run.state.offer = ['bigspoon'];
  assert.equal(run.pick('crystal'), false);
  assert.equal(run.state.offer, null);
});

test('a run: every tenth page is the Three Bowls, three bowls in a row with one page number, honey for a clean boss', () => {
  const run = createRunState(11, { rank: 0 });
  let pages = 0;
  while (run.state.n < BOSS_EVERY) {
    run.page();
    run.verdict(perfect);
    if (run.state.offer) run.pick(run.state.offer[0]);
    pages++;
  }
  assert.equal(pages, BOSS_EVERY - 1);
  const honeyBefore = run.state.honey;
  for (let b = 1; b <= BOSS_BOWLS; b++) {
    const P = readPage(run.page());
    assert.equal(P.bo, b);
    assert.equal(P.g, 'porridge');
    assert.equal(P.n, BOSS_EVERY);
    const v = run.verdict(perfect);
    if (b < BOSS_BOWLS) assert.equal(v.bossDone, null);
    else {
      assert.equal(v.bossDone, true);
      assert.ok(v.honey >= BOSS_HONEY);
      assert.equal(v.pick, true);
    }
  }
  assert.ok(run.state.honey > honeyBefore);
  assert.equal(run.state.bosses, 1);
  assert.equal(run.state.n, BOSS_EVERY + 1);
  run.pick(null);
  assert.equal(readPage(run.page()).bo, 0);
});

test('a run: a missed bowl loses the boss but the run goes on', () => {
  const run = createRunState(5);
  run.state.n = BOSS_EVERY;
  run.page();
  run.verdict(perfect);
  run.page();
  run.verdict(miss);
  run.page();
  const v = run.verdict(perfect);
  assert.equal(v.bossDone, false);
  assert.equal(run.state.bosses, 0);
  assert.equal(run.state.over, false);
});

test('a run: pages are deterministic for a seed and every page comes round', () => {
  const ids = (seed) => {
    const run = createRunState(seed);
    const out = [];
    for (let i = 0; i < 40; i++) {
      out.push(readPage(run.page()).g);
      run.verdict(good);
      if (run.state.offer) run.pick(null);
    }
    return out;
  };
  assert.deepEqual(ids(9), ids(9));
  const seen = new Set(ids(9));
  for (const id of PAGE_IDS) assert.ok(seen.has(id), id);
});

// ---------------------------------------------------------------- progress

test('ranks: thresholds in order, progress within a rank', () => {
  for (let i = 1; i < RANKS.length; i++) assert.ok(RANKS[i].xp > RANKS[i - 1].xp);
  assert.equal(rankOf(0).i, 0);
  assert.equal(rankOf(RANKS[2].xp).i, 2);
  assert.equal(rankOf(RANKS[2].xp - 1).i, 1);
  assert.equal(rankOf(1e9).next, null);
  assert.equal(rankOf(1e9).k, 1);
  const r = rankOf((RANKS[1].xp + RANKS[2].xp) / 2);
  assert.ok(Math.abs(r.k - 0.5) < 1e-9);
  assert.equal(rankOf(-5).i, 0);
  assert.equal(rankOf('x').i, 0);
});

test('profiles: anything saved comes back clean', () => {
  const junk = [null, 5, 'x', [], { honey: -4, xp: NaN, owned: { char: ['goldi', 'nobody', 7], hat: ['crown'] }, wear: { char: 'nobody', hat: 'crown' } }];
  for (const j of junk) {
    const p = cleanProfile(j);
    assert.ok(p.honey >= 0 && Number.isFinite(p.xp));
    assert.ok(p.owned.char.every((id) => itemOf('char', id)));
    assert.ok(p.owned.char.includes(p.wear.char));
    assert.ok(p.owned.hat.includes(p.wear.hat));
  }
  // The crown counts as owned only if saved as owned (it was), and it can be worn then.
  const p = cleanProfile({ owned: { hat: ['crown'] }, wear: { hat: 'crown' } });
  assert.equal(p.wear.hat, 'crown');
  // The first version's save still reads.
  const old = cleanProfile({ met: { porridge: 3 }, stars: { chair: 9 }, perfects: 12, bestRun: 4000, daily: { day: 20000, best: 700, streak: 3, lastDay: 20000 } });
  assert.equal(old.met.porridge, 3);
  assert.equal(old.stars.chair, 3);
  assert.equal(old.bestRun, 4000);
  assert.equal(old.daily.streak, 3);
});

test('the Wardrobe: buying costs honey, wears it, respects rank and wins', () => {
  const p = defaultProfile();
  assert.equal(canBuy(p, 'char', 'rosie'), 'honey');
  p.honey = 1000;
  assert.equal(buy(p, 'char', 'rosie'), true);
  assert.equal(p.honey, 850);
  assert.equal(p.wear.char, 'rosie');
  assert.equal(canBuy(p, 'char', 'rosie'), 'owned');
  assert.equal(buy(p, 'char', 'rosie'), false);
  assert.equal(canBuy(p, 'char', 'cub'), 'rank');
  addXp(p, RANKS[3].xp);
  p.honey = 5000;
  assert.equal(canBuy(p, 'char', 'cub'), 'ok');
  assert.equal(canBuy(p, 'hat', 'crown'), 'wins');
  p.wins = 10;
  assert.equal(buy(p, 'hat', 'crown'), true);
  assert.equal(wear(p, 'char', 'goldi'), true);
  assert.equal(wear(p, 'char', 'bao'), false);
  for (const kind of Object.keys(SHOP)) assert.equal(new Set(SHOP[kind].map((x) => x.id)).size, SHOP[kind].length);
});

test('honey, stars, xp and the daily streak', () => {
  assert.equal(honeyFor(400, 2), 14);
  assert.equal(honeyFor(-5, -1), 0);
  assert.equal(starsFor('perfect', 100), 3);
  assert.equal(starsFor('good', 92), 2);
  assert.equal(starsFor('good', 75), 1);
  assert.equal(starsFor('over', 40), 0);
  const p = defaultProfile();
  const up = addXp(p, RANKS[1].xp);
  assert.deepEqual(up, { before: 0, after: 1 });
  assert.equal(dailyPlayed(p, 100, 500), 1);
  assert.equal(dailyPlayed(p, 100, 300), 1);
  assert.equal(p.daily.best, 500);
  assert.equal(dailyPlayed(p, 101, 200), 2);
  assert.equal(p.daily.best, 200);
  assert.equal(dailyPlayed(p, 105, 200), 1);
});

// ---------------------------------------------------------------- daily tasks

test('daily tasks: three different kinds, the same for everyone on a day, honest text', () => {
  for (let day = 19000; day < 19400; day++) {
    const t = tasksFor(day);
    assert.equal(t.length, 3);
    assert.equal(new Set(t.map((x) => x.kind)).size, 3);
    for (const x of t) {
      assert.ok(TASK_KINDS.includes(x.kind));
      assert.ok(x.n >= 1 && x.honey > 0 && x.text.length > 3 && x.text.length < 32, x.text);
    }
    assert.deepEqual(tasksFor(day), t);
  }
});

test('daily tasks: events move them on, never past done', () => {
  const T = (kind, extra = {}) => ({ kind, n: 3, ...extra });
  assert.equal(advance(T('perfects'), 0, { e: 'verdict', g: 'cake', k: 'perfect' }), 1);
  assert.equal(advance(T('perfects'), 0, { e: 'verdict', g: 'cake', k: 'good' }), 0);
  assert.equal(advance(T('perfects'), 3, { e: 'verdict', g: 'cake', k: 'perfect' }), 3);
  assert.equal(advance(T('page', { g: 'toast' }), 0, { e: 'verdict', g: 'cake', k: 'perfect' }), 0);
  assert.equal(advance(T('page', { g: 'toast' }), 0, { e: 'verdict', g: 'toast', k: 'perfect' }), 1);
  assert.equal(advance({ kind: 'run', n: 12 }, 4, { e: 'run', pages: 9 }), 9);
  assert.equal(advance({ kind: 'run', n: 12 }, 9, { e: 'run', pages: 3 }), 9);
  assert.equal(advance({ kind: 'run', n: 12 }, 9, { e: 'run', pages: 30 }), 12);
  assert.equal(advance({ kind: 'streak', n: 4 }, 0, { e: 'streak', n: 2 }), 2);
  assert.equal(advance({ kind: 'daily', n: 1 }, 0, { e: 'daily' }), 1);
  assert.equal(advance({ kind: 'story', n: 1 }, 0, { e: 'daily' }), 0);
  assert.equal(advance({ kind: 'boss', n: 1 }, 0, { e: 'boss' }), 1);
  assert.equal(advance({ kind: 'oops', what: 'chair', n: 1 }, 0, { e: 'verdict', g: 'chair', k: 'over' }), 1);
  assert.equal(advance({ kind: 'oops', what: 'pop', n: 1 }, 0, { e: 'verdict', g: 'chair', k: 'over' }), 0);
  assert.equal(oopsOf('bowl', 'over', 0.99), 'smash');
  assert.equal(oopsOf('bowl', 'over', 0.9), null);
  assert.equal(oopsOf('swing', 'under'), 'splash');
  assert.equal(oopsOf('balloon', 'pop'), 'pop');
  assert.equal(oopsOf('jar', 'over'), 'smash');
});
