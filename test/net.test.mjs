import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { Hub, haveSdk, loadHelpers } from './hub.mjs';
import { createOnline, INTRO_MS, validData, validMark, BOT_FILL } from '../game/net.js';
import { readPage, evaluate } from '../game/pages.js';
import { planHold } from '../game/brain.js';

const skip = !haveSdk && 'the SDK helpers (OW_SDK_DIST) are not available';
const flush = () => new Promise((r) => setImmediate(r));

async function run(ms) {
  for (let t = 0; t < ms; t += 50) {
    mock.timers.tick(50);
    await flush();
    await flush();
  }
}

async function until(fn, ms = 120000) {
  for (let t = 0; t < ms; t += 50) {
    if (fn()) return true;
    await run(50);
  }
  return fn();
}

async function setup(settings) {
  mock.timers.enable({ apis: ['setInterval', 'setTimeout', 'Date'], now: 1_000_000 });
  const h = await loadHelpers();
  return { hub: new Hub(settings), h };
}

function page(hub, h, id) {
  const room = hub.join(id);
  const game = createOnline(room, h, { now: () => Date.now() });
  return { room, game, id, marked: '' };
}

/** A player who holds like a person: once per page, after their own press and hold. */
function player(p, skill = 0.7) {
  return () => {
    const m = p.game.match;
    if (m.phase !== 'round' || !m.me || !m.data) return;
    const P = readPage(m.data);
    if (!P || p.marked === m.roundId) return;
    const plan = planHold(P, `${p.id}:${m.roundId}`, { skill });
    if (plan.h === null || m.elapsed - INTRO_MS < plan.press + plan.h) return;
    p.marked = m.roundId;
    p.game.mark({ r: m.round, h: plan.h, t: plan.press + plan.h });
  };
}

test('the data and marks the room carries are checked', () => {
  assert.equal(validData(null), true);
  const page = { g: 'porridge', c: 600, w: 75, sp: 100, tw: 0, ph: 0, n: 1, x2: 0, marks: {}, done: {}, seen: {} };
  assert.equal(validData(page), true);
  assert.notEqual(validData({ ...page, g: 'nope' }), true);
  assert.notEqual(validData({ ...page, marks: { a: { v: 5000, d: 0, s: 10, k: 'good' } } }), true);
  assert.notEqual(validData({ ...page, done: { a: 2 } }), true);
  assert.notEqual(validData({ ...page, marks: [] }), true);
  assert.equal(validMark({ v: 500, d: -20, s: 88, k: 'good' }), true);
  assert.equal(validMark({ v: 500, d: -20, s: 88, k: 'hacked' }), false);
});

test('alone with the woodland folk: a whole story plays through, scored, the last page double', { skip }, async (t) => {
  const { hub, h } = await setup({ pages: 8 });
  t.after(() => mock.timers.reset());
  const me = page(hub, h, 'p1');
  me.room.startMatch();
  const play = player(me);
  const seenRounds = new Set();
  const lastPoints = [];
  const ok = await until(() => {
    play();
    const m = me.game.match;
    if (m.phase === 'round') seenRounds.add(m.round);
    if (m.phase === 'roundEnd' && m.last && lastPoints.length < m.round) lastPoints.push({ round: m.round, points: m.last.points, data: m.data });
    return m.phase === 'results';
  });
  assert.ok(ok, 'the story ends');
  const m = me.game.match;
  assert.equal(seenRounds.size, 8);
  assert.equal(m.seats.length, BOT_FILL);
  assert.equal(m.seats.filter((s) => s.bot).length, BOT_FILL - 1);
  assert.equal(m.results.length, BOT_FILL);
  for (const s of m.results) assert.ok(Number.isFinite(s.points) && s.points >= 0 && s.points <= 900, `${s.name}: ${s.points}`);
  // Every seat has a mark on most pages, and the host's scores are the rules' scores.
  for (const { points, data } of lastPoints) {
    const P = readPage(data);
    for (const [id, pts] of Object.entries(points)) {
      const mk = data.marks[id];
      assert.equal(pts, (mk?.s ?? 0) * (P.x2 ? 2 : 1));
    }
  }
  const marks = lastPoints.reduce((n, x) => n + Object.keys(x.data.marks).length, 0);
  assert.ok(marks >= BOT_FILL * 8 * 0.85, `the folk and the player let go on nearly every page (${marks})`);
  assert.ok(lastPoints.every((x) => x.data.marks.p1), 'the player\'s own release counts every time');
  const last = lastPoints.find((x) => x.round === 8);
  assert.ok(last && readPage(last.data).x2, 'the last page is worth double');
  await until(() => me.room.match.phase === 'lobby', 20000);
  assert.equal(me.room.match.phase, 'lobby', 'back to the lobby after the podium');
});

test('a mark is taken once, for this page only, with sane timings', { skip }, async (t) => {
  const { hub, h } = await setup({ pages: 8 });
  t.after(() => mock.timers.reset());
  const me = page(hub, h, 'p1');
  me.room.startMatch();
  await until(() => me.game.match.phase === 'round' && me.game.match.elapsed > INTRO_MS + 1500);
  const m = me.game.match;
  const P = readPage(m.data);
  me.game.mark({ r: m.round + 1, h: 1000, t: 1200 });
  me.game.mark({ r: m.round, h: P.win + 900, t: P.win + 900 });
  me.game.mark({ r: m.round, h: 900, t: 100 });
  me.game.mark({ r: m.round, h: 900, t: 60000 });
  me.game.mark({ r: m.round, h: 'x', t: 3 });
  await run(300);
  assert.equal(m.data.marks.p1, undefined, 'bad marks are refused');
  me.game.mark({ r: m.round, h: 1000, t: 1200 });
  await run(300);
  const mk = m.data.marks.p1;
  assert.ok(mk, 'a good mark is taken');
  assert.equal(mk.s, evaluate(P, 1000, 1200).s);
  me.game.mark({ r: m.round, h: 2000, t: 1300 });
  await run(300);
  assert.deepEqual(m.data.marks.p1, mk, 'one mark a page');
});

test('the host reloads and a player drops mid-page: the story carries on', { skip }, async (t) => {
  const { hub, h } = await setup({ pages: 8 });
  t.after(() => mock.timers.reset());
  let a = page(hub, h, 'a');
  const b = page(hub, h, 'b');
  b.room.setReady(true);
  a.room.startMatch();
  const playB = player(b, 0.6);
  await until(() => {
    playB();
    return a.game.match.phase === 'round' && a.game.match.round === 3;
  });
  // The host reloads: a new page, the role moves to b, then a comes back as a player.
  a.game.dispose();
  hub.drop('a');
  await run(400);
  assert.equal(hub.host, 'b');
  a = { ...page(hub, h, 'a'), marked: '' };
  hub.back('a');
  const playA = player(a, 0.6);
  const ok = await until(() => {
    playA();
    playB();
    return b.game.match.phase === 'results';
  });
  assert.ok(ok, 'the story ends after the host changed');
  assert.equal(b.game.match.results.length, BOT_FILL);
  assert.ok(b.game.match.results.some((s) => s.id === 'a'));
  // The reloaded page sees the same results.
  assert.deepEqual(a.game.match.results, b.game.match.results);
});

test('a latecomer watches the story and plays the next one', { skip }, async (t) => {
  const { hub, h } = await setup({ pages: 8 });
  t.after(() => mock.timers.reset());
  const a = page(hub, h, 'a');
  a.room.startMatch();
  const playA = player(a);
  await until(() => {
    playA();
    return a.game.match.round === 2;
  });
  const late = page(hub, h, 'late');
  await run(200);
  assert.equal(late.room.spectating, true);
  assert.equal(late.game.match.me, null);
  late.game.mark({ r: late.game.match.round, h: 1000, t: 1200 });
  await run(300);
  assert.equal(a.game.match.data?.marks?.late, undefined, 'a watcher cannot mark');
  await until(() => {
    playA();
    return a.room.match.phase === 'lobby';
  });
  late.room.setReady(true);
  a.room.startMatch();
  await run(300);
  assert.ok(late.game.match.seats.some((s) => s.id === 'late'), 'seated in the next story');
});

test('the reveal turns early once everyone has tapped through it', { skip }, async (t) => {
  const { hub, h } = await setup({ pages: 8 });
  t.after(() => mock.timers.reset());
  const me = page(hub, h, 'p1');
  me.room.startMatch();
  const play = player(me);
  await until(() => {
    play();
    return me.game.match.phase === 'roundEnd';
  });
  const round = me.game.match.round;
  me.game.seen();
  await run(150);
  assert.equal(me.game.match.phase, 'roundEnd', 'not before a moment of the reveal');
  await until(() => me.game.match.phase !== 'roundEnd', 5000);
  assert.equal(me.game.match.round, round + 1);
});
