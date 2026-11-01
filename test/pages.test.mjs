import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGES, readPage, shownValue, finalValue, evaluate, bandAt, autoReleaseAt, popLine, perfectRadius, verdictWord, inBand, MOVING, FOGGY, WOBBLY, SWING_TOPS } from '../src/core/pages.js';
import { makePage } from '../src/core/plan.js';
import { createRng } from '../src/core/rng.js';
import { solveHold } from '../src/core/brain.js';
import { createStage } from '../src/core/stage.js';

const page = (g, extra = {}) => readPage({ g, c: 600, w: 75, sp: 100, tw: 0, ph: 0, ...extra });

test('twelve pages, each with a name, a short cue and words for both misses', () => {
  assert.equal(PAGES.length, 12);
  for (const p of PAGES) {
    assert.ok(p.cue.split(' ').length <= 3, `${p.id} cue is short`);
    assert.ok(p.under && p.over && p.name);
    assert.ok(p.band[0] < p.band[1]);
  }
});

test('readPage refuses garbage and drops twists a page cannot have', () => {
  assert.equal(readPage(null), null);
  assert.equal(readPage({ g: 'nope', c: 500, w: 70, sp: 100 }), null);
  assert.equal(readPage({ g: 'porridge', c: 5000, w: 70, sp: 100 }), null);
  assert.equal(readPage({ g: 'porridge', c: 500, w: 70, sp: Infinity }), null);
  assert.equal(readPage({ g: 'porridge', c: '500', w: 70, sp: 100 }), null);
  assert.equal(page('balloon', { tw: MOVING }).tw, 0);
  assert.equal(page('porridge', { tw: FOGGY }).tw, FOGGY);
});

test('values stay in 0..1 with no NaN, for every page, speed and twist', () => {
  for (const p of PAGES) {
    for (const sp of [85, 100, 130, 200]) {
      for (const tw of [0, 1, 2, 3]) {
        const P = page(p.id, { sp, tw });
        for (let h = 0; h <= 9000; h += 37) {
          for (const v of [shownValue(P, h), finalValue(P, h), bandAt(P, h)]) {
            assert.ok(Number.isFinite(v) && v >= 0 && v <= 1, `${p.id} sp${sp} tw${tw} h${h}: ${v}`);
          }
        }
      }
    }
  }
});

test('the filling pages only ever go one way while held (no twist)', () => {
  for (const p of PAGES.filter((x) => x.full)) {
    const P = page(p.id);
    let prev = shownValue(P, 0);
    for (let h = 10; h <= 6000; h += 10) {
      const v = shownValue(P, h);
      if (p.falls) assert.ok(v <= prev + 1e-12, `${p.id} falls`);
      else assert.ok(v >= prev - 1e-12, `${p.id} rises at ${h}`);
      prev = v;
    }
  }
});

test('the keeps-going pages end further than they showed at the release', () => {
  for (const g of ['milk', 'bowl']) {
    const P = page(g);
    assert.ok(finalValue(P, 1500) > shownValue(P, 1500) + 0.04, g);
  }
});

test('every band is reachable inside the window with time to spare, at every tier', () => {
  for (const p of PAGES) {
    for (let s = 0; s < 60; s++) {
      for (const tier of [{ sp: 85, w: 80 }, { sp: 100, w: 75 }, { sp: 130, w: 50 }, { sp: 200, w: 35 }]) {
        const raw = makePage(createRng(`reach:${p.id}:${s}:${tier.sp}`), p.id, { ...tier, twist: 1 });
        const P = readPage(raw);
        const press = 400;
        const shot = solveHold(P, bandAt(P, press), { press });
        const r = evaluate(P, shot.h, press + shot.h);
        assert.ok(r.k === 'perfect', `${p.id} seed ${s} sp ${tier.sp}: ${r.k} d=${r.d.toFixed(3)}`);
        assert.ok(press + shot.h <= P.win - 1000 || !p.full, `${p.id}: ${press + shot.h} of ${P.win}`);
      }
    }
  }
});

test('scoring: perfect, the band edge, outside, asleep', () => {
  const P = page('toast', { c: 500, w: 60 });
  const at = (v) => evaluate(P, (v * 4.4) * 1000, 0);
  assert.equal(at(0.5).s, 100);
  assert.equal(at(0.5).k, 'perfect');
  assert.equal(at(0.5 + perfectRadius(0.06)).k, 'perfect');
  assert.equal(at(0.5 + 0.0599).s, 70);
  assert.equal(at(0.5 + 0.0599).k, 'good');
  const out = at(0.5 + 0.0605);
  assert.equal(out.k, 'over');
  assert.ok(out.s <= 60 && out.s >= 59);
  assert.equal(at(0.2).k, 'under');
  assert.equal(at(0.2).s, 0);
  assert.equal(evaluate(P, null, 0).k, 'asleep');
  assert.equal(evaluate(P, null, 0).s, 0);
  assert.equal(verdictWord(P, 'over'), 'BURNT!');
  assert.equal(verdictWord(P, 'perfect'), 'JUST RIGHT!');
  assert.ok(inBand('good') && inBand('perfect') && !inBand('over'));
});

test('the balloon pops just past its band, and a pop scores nothing', () => {
  const P = page('balloon', { c: 600, w: 60 });
  const line = popLine(P);
  assert.ok(Math.abs(line - 0.69) < 1e-9);
  const auto = autoReleaseAt(P);
  assert.ok(Math.abs(shownValue(P, auto) - line) < 0.005);
  const r = evaluate(P, auto + 5, auto + 5);
  assert.equal(r.k, 'pop');
  assert.equal(r.s, 0);
  assert.notEqual(evaluate(P, auto - 80, auto).k, 'pop');
});

test('the spoon falls: too long is too cold', () => {
  const P = page('spoon', { c: 400, w: 60 });
  assert.equal(shownValue(P, 0), 1);
  assert.equal(evaluate(P, 2800, 2800).k, 'under');
  assert.equal(verdictWord(P, 'under'), 'TOO COLD');
  assert.equal(evaluate(P, 200, 200).k, 'over');
});

test('the chair slows down in the cushion', () => {
  const P = page('chair', { c: 650, w: 75 });
  const speed = (h) => shownValue(P, h + 20) - shownValue(P, h);
  const into = 2.6 * Math.sqrt(0.575) * 1000;
  assert.ok(speed(into + 30) < speed(into - 60), 'slower inside the band');
});

test('the pillow comes in pumps, and its band sits on one', () => {
  const P = page('pillow', { c: 500 });
  assert.ok(Math.abs(shownValue(P, 1900) - 0.5) < 1e-6);
  assert.ok(Math.abs(shownValue(P, 1990) - 0.5) < 1e-6, 'flat on top of a pump');
  for (let s = 0; s < 40; s++) {
    const raw = makePage(createRng(`p${s}`), 'pillow', { sp: 100, w: 60 });
    assert.ok(Math.abs((raw.c / 100) - Math.round(raw.c / 100)) < 1e-9);
  }
});

test('the rope swing peaks at its tops, and the ledge sits just short of one', () => {
  assert.deepEqual(SWING_TOPS.map((v) => Math.round(v * 100)), [40, 65, 90]);
  for (let s = 0; s < 40; s++) {
    const raw = makePage(createRng(`s${s}`), 'swing', { sp: 100, w: 60 });
    assert.ok(SWING_TOPS.some((top) => raw.c / 1000 <= top + 1e-9 && raw.c / 1000 >= top - 0.041));
  }
});

test('the moving band stays on the gauge and keeps its room', () => {
  for (const g of ['porridge', 'cake', 'jar', 'bell', 'milk', 'bowl', 'spoon', 'toast']) {
    const P = page(g, { tw: MOVING, c: 300, w: 60, ph: 250 });
    for (let t = 0; t < 9000; t += 50) {
      const c = bandAt(P, t);
      assert.ok(c - P.w >= 0.05 && c + P.w <= 0.95, `${g} ${c}`);
    }
  }
});

test('wobbly shivers around the plain motion', () => {
  const plain = page('porridge');
  const wob = page('porridge', { tw: WOBBLY });
  let differs = false;
  for (let h = 300; h < 3000; h += 50) if (Math.abs(shownValue(plain, h) - shownValue(wob, h)) > 0.01) differs = true;
  assert.ok(differs);
  for (let h = 0; h < 3000; h += 10) assert.ok(Math.abs(shownValue(plain, h) - shownValue(wob, h)) <= 0.0251);
});

test('stage: a hold timed from the events, capped by the window and the travel', () => {
  const st = createStage();
  const P = page('toast', { c: 500, w: 60 });
  st.begin(P, 'k1', 1000);
  assert.equal(st.press(700), true);
  assert.equal(st.release(800), null, 'a tap during the intro is forgiven');
  assert.equal(st.pressAt, null);
  assert.equal(st.press(900), true, 'a hold from the intro counts from the start');
  assert.equal(st.pressAt, 1000);
  assert.equal(st.press(1200), false, 'one hold per page');
  const r = st.release(1000 + 2200);
  assert.equal(st.h, 2200);
  assert.equal(st.t, 2200);
  assert.equal(r.k, 'perfect');
  assert.equal(st.release(5000), null);
  assert.equal(st.press(5000), false);
});

test('stage: holding to the end of the travel lets go by itself; nobody pressing sleeps', () => {
  const st = createStage();
  const P = page('porridge');
  st.begin(P, 'a', 0);
  st.press(100);
  assert.equal(st.update(1000), null);
  const r = st.update(100 + autoReleaseAt(P) + 5);
  assert.ok(r && r.k === 'over');
  assert.equal(st.how, 'end');
  const sleepy = createStage();
  sleepy.begin(P, 'b', 0);
  assert.equal(sleepy.update(P.win - 1), null);
  assert.equal(sleepy.update(P.win + 1).k, 'asleep');
});

test('stage: the swinging pages let go when the window closes', () => {
  const st = createStage();
  const P = page('jar');
  st.begin(P, 'a', 0);
  st.press(500);
  const r = st.update(P.win + 10);
  assert.ok(r);
  assert.equal(st.how, 'window');
  assert.equal(st.h, P.win - 500);
});

test('stage: milk settles after letting go', () => {
  const st = createStage();
  const P = page('milk');
  st.begin(P, 'a', 0);
  st.press(0);
  st.release(1500);
  const early = st.value(1500);
  const late = st.value(3000);
  assert.ok(late > early + 0.04);
  assert.ok(Math.abs(late - finalValue(P, 1500)) < 1e-9);
});
