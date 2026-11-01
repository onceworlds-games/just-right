import test from 'node:test';
import assert from 'node:assert/strict';
import { readPage, evaluate, inBand, pageOf } from '../game/pages.js';
import { matchPlan, dailyPlan, createRun, practicePage, soloLevel, levelOf, multiplierFor, matchTier, EASY } from '../game/plan.js';
import { FOLK, planHold, botPlan, sigmaFor, AUTOPLAY } from '../game/brain.js';

const score = (P, plan) => evaluate(P, plan.h, plan.h === null ? P.win : plan.press + plan.h);

test('a match plan: deterministic, gentle porridge first, no late page early, no repeats back to back, the last page double', () => {
  for (const N of [8, 12, 16]) {
    for (let seed = 0; seed < 200; seed++) {
      const plan = matchPlan(seed, N);
      assert.deepEqual(plan, matchPlan(seed, N));
      assert.equal(plan.length, N);
      assert.equal(plan[0].g, 'porridge');
      assert.equal(plan[0].sp, 85);
      assert.equal(plan[0].tw, 0);
      for (let i = 0; i < N; i++) {
        const P = readPage(plan[i]);
        assert.ok(P, `page ${i} reads`);
        assert.equal(P.n, i + 1);
        if (i < 3) assert.ok(EASY.includes(plan[i].g), `page ${i + 1} is easy`);
        if (i > 0) assert.notEqual(plan[i].g, plan[i - 1].g);
        if (matchTier(i + 1, N) === 0) assert.equal(plan[i].tw, 0, 'no twists in the first third');
        assert.equal(plan[i].x2, i === N - 1 ? 1 : 0);
      }
      if (N >= 12) assert.equal(new Set(plan.slice(0, 12).map((p) => p.g)).size, 12, 'every page once before any comes back');
    }
  }
  assert.notDeepEqual(matchPlan(1, 12), matchPlan(2, 12));
});

test('the daily is the same for everyone today and different tomorrow', () => {
  const day = 20393;
  assert.deepEqual(dailyPlan(day), dailyPlan(day));
  assert.notDeepEqual(dailyPlan(day), dailyPlan(day + 1));
  assert.equal(dailyPlan(day).length, 10);
  assert.equal(dailyPlan(day)[0].g, 'porridge');
  for (const raw of dailyPlan(day)) assert.ok(readPage(raw));
});

test('Before the Bears speeds up and narrows, and its pages are seeded', () => {
  assert.deepEqual(soloLevel(0), { sp: 100, w: 75, twist: 0 });
  assert.equal(soloLevel(50).sp, 200);
  assert.equal(soloLevel(50).w, 35);
  assert.ok(soloLevel(2).twist > 0 && soloLevel(30).twist <= 0.7);
  assert.equal(levelOf(4), 0);
  assert.equal(levelOf(5), 1);
  const run = createRun(7);
  assert.deepEqual(run.page(9, 6), createRun(7).page(9, 6));
  assert.equal(run.page(0, 0).g, 'porridge');
  for (let i = 0; i < 3; i++) assert.equal(pageOf(run.order[i]).set === 'late', false);
  assert.equal(multiplierFor(0, true), 1);
  assert.equal(multiplierFor(3, true), 4);
  assert.equal(multiplierFor(9, true), 5);
  assert.equal(multiplierFor(4, false), 1);
  assert.equal(practicePage('cake', 3).g, 'cake');
});

test('bots: always a legal hold inside the window, never NaN, and better with skill', () => {
  const by = new Map();
  for (let seed = 0; seed < 120; seed++) {
    for (const raw of matchPlan(seed, 12)) {
      const P = readPage(raw);
      for (const f of FOLK) {
        const plan = botPlan(P, seed, `m${seed}.${raw.n}`, `bot:${f.name}`, f.name);
        assert.deepEqual(plan, botPlan(P, seed, `m${seed}.${raw.n}`, `bot:${f.name}`, f.name), 'the same on every page');
        assert.ok(plan.press >= 0 && plan.press < P.win);
        if (plan.h !== null) {
          assert.ok(Number.isFinite(plan.h) && plan.h >= 0);
          assert.ok(plan.press + plan.h <= P.win, `${P.g}: ${plan.press}+${plan.h} > ${P.win}`);
        }
        const r = score(P, plan);
        assert.ok(Number.isFinite(r.s));
        const row = by.get(f.name) ?? { sum: 0, n: 0, perfect: 0 };
        row.sum += r.s;
        row.n++;
        if (r.k === 'perfect') row.perfect++;
        by.set(f.name, row);
      }
    }
  }
  const mean = (name) => by.get(name).sum / by.get(name).n;
  assert.ok(mean('Ottoline') > 82 && mean('Ottoline') < 95, `Ottoline ${mean('Ottoline')}`);
  assert.ok(mean('Moss') > 55 && mean('Moss') < 75, `Moss ${mean('Moss')}`);
  assert.ok(mean('Ottoline') > mean('Corvin') && mean('Corvin') > mean('Moss'));
  for (const [name, row] of by) assert.ok(row.perfect / row.n < 0.7, `${name} isn't perfect every time`);
  assert.ok(sigmaFor(1) < sigmaFor(0));
});

test('matches: no runaway leader among the woodland folk, and pages end in the time designed', () => {
  let leaderHeld = 0;
  const matches = 300;
  for (let seed = 0; seed < matches; seed++) {
    const plan = matchPlan(seed, 12);
    const folk = FOLK.slice(seed % 3, (seed % 3) + 6);
    const total = Object.fromEntries(folk.map((f) => [f.name, 0]));
    let atHalf = '';
    let seconds = 3; // the countdown
    plan.forEach((raw, i) => {
      const P = readPage(raw);
      let last = 0;
      for (const f of folk) {
        const p = planHold(P, `${seed}:${i}:${f.name}`, f);
        total[f.name] += score(P, p).s * (P.x2 ? 2 : 1);
        last = Math.max(last, p.h === null ? P.win + 800 : p.press + p.h);
      }
      seconds += 1.5 + last / 1000 + 0.3 + 3.4; // intro, play until the last lets go, the host's word, the reveal
      if (i === 5) atHalf = Object.entries(total).sort((a, b) => b[1] - a[1])[0][0];
    });
    seconds += 12; // the podium
    assert.ok(seconds > 90 && seconds < 165, `a 12-page match takes ${seconds.toFixed(0)} s`);
    const winner = Object.entries(total).sort((a, b) => b[1] - a[1])[0][0];
    if (winner === atHalf) leaderHeld++;
  }
  assert.ok(leaderHeld / matches < 0.8, `the leader at half time won ${leaderHeld} of ${matches}`);
});

test('Before the Bears: a run ends, and 2,500 takes skill', () => {
  const runs = (sigma) => {
    const skill = (170 - sigma) / 130;
    const lengths = [];
    const scores = [];
    for (let s = 0; s < 150; s++) {
      const run = createRun(`sim${s}`);
      let bears = 0;
      let cleared = 0;
      let total = 0;
      let streak = 0;
      let i = 0;
      while (bears < 3) {
        assert.ok(i < 400, 'a run ends');
        const P = readPage(run.page(i, cleared));
        const r = score(P, planHold(P, `p${sigma}:${s}:${i}`, { skill, bias: 0, press: [0.3, 0.7], blunder: 0.5 }));
        if (inBand(r.k)) cleared++;
        else bears++;
        total += r.s * multiplierFor(streak, r.k === 'perfect');
        streak = r.k === 'perfect' ? streak + 1 : 0;
        i++;
      }
      lengths.push(i);
      scores.push(total);
    }
    lengths.sort((a, b) => a - b);
    scores.sort((a, b) => a - b);
    return { pages: lengths[75], score: scores[75], badge: scores.filter((x) => x >= 2500).length / scores.length };
  };
  const decent = runs(100);
  const sharp = runs(60);
  assert.ok(decent.pages >= 12 && decent.pages <= 25, `σ 100: ${decent.pages} pages`);
  assert.ok(decent.badge < 0.35, `σ 100 reaches 2,500 in ${decent.badge}`);
  assert.ok(sharp.pages >= 22, `σ 60: ${sharp.pages} pages`);
  assert.ok(sharp.badge > 0.6, `σ 60 reaches 2,500 in ${sharp.badge}`);
  assert.ok(AUTOPLAY.skill > 0.7);
});
