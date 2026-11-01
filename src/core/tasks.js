// Three small jobs a day (the same three for everyone on the same UTC day), paid in honey. They count what you do anywhere:
// perfects, a page done just right, a long run, a streak, the daily, a story, the boss, and the odd mishap. Pure.

import { createRng } from './rng.js';
import { pageOf } from './pages.js';

const PAGES_FOR_TASKS = ['porridge', 'chair', 'pillow', 'toast', 'balloon', 'cake', 'spoon', 'milk', 'bowl', 'jar', 'bell', 'swing'];
const OOPS = [
  { what: 'chair', text: "Break Baby Bear's chair" },
  { what: 'pop', text: 'Pop the balloon' },
  { what: 'splash', text: 'Splash in the pond' },
  { what: 'smash', text: 'Smash a bowl or jar' },
];

/** The kinds of task: how to make one from the day's rng. */
const KINDS = {
  perfects: (rng) => {
    const n = rng.pick([6, 8, 10]);
    return { n, honey: n * 10, text: `${n} perfects` };
  },
  page: (rng) => {
    const g = rng.pick(PAGES_FOR_TASKS);
    const n = rng.pick([1, 2]);
    return { g, n, honey: 40 + n * 25, text: `Perfect ${pageOf(g).name}${n > 1 ? ` ×${n}` : ''}` };
  },
  run: (rng) => {
    const n = rng.pick([8, 12, 15]);
    return { n, honey: 40 + n * 6, text: `${n} pages in one run` };
  },
  streak: (rng) => {
    const n = rng.pick([3, 4, 5]);
    return { n, honey: n * 25, text: `${n} perfects in a row` };
  },
  daily: () => ({ n: 1, honey: 50, text: 'Play the Daily' }),
  story: () => ({ n: 1, honey: 60, text: 'Finish a story' }),
  boss: () => ({ n: 1, honey: 120, text: 'Beat the Three Bowls' }),
  oops: (rng) => {
    const o = rng.pick(OOPS);
    return { what: o.what, n: 1, honey: 40, text: o.text };
  },
};
export const TASK_KINDS = Object.keys(KINDS);

/** The day's three tasks: three different kinds. */
export function tasksFor(day) {
  const rng = createRng(`tasks:${Math.floor(day)}`);
  const kinds = rng.shuffle(TASK_KINDS).slice(0, 3);
  return kinds.map((kind, i) => ({ i, kind, ...KINDS[kind](rng) }));
}

/** The mishap a verdict was, if any. */
export function oopsOf(g, k, v = 0) {
  if (g === 'chair' && k === 'over') return 'chair';
  if (g === 'balloon' && k === 'pop') return 'pop';
  if (g === 'swing' && k === 'under') return 'splash';
  if ((g === 'bowl' && k === 'over' && v >= 0.985) || (g === 'jar' && (k === 'under' || k === 'over'))) return 'smash';
  return null;
}

/**
 * How far an event takes a task. count: what it had. Events:
 *   { e: 'verdict', g, k, v }   { e: 'streak', n }   { e: 'run', pages }   { e: 'daily' }   { e: 'story' }   { e: 'boss' }
 * → the new count (never past task.n).
 */
export function advance(task, count, ev) {
  const c = Math.max(0, count | 0);
  if (c >= task.n || !ev) return Math.min(task.n, c);
  let next = c;
  switch (task.kind) {
    case 'perfects':
      if (ev.e === 'verdict' && ev.k === 'perfect') next = c + 1;
      break;
    case 'page':
      if (ev.e === 'verdict' && ev.k === 'perfect' && ev.g === task.g) next = c + 1;
      break;
    case 'run':
      if (ev.e === 'run') next = Math.max(c, ev.pages | 0);
      break;
    case 'streak':
      if (ev.e === 'streak') next = Math.max(c, ev.n | 0);
      break;
    case 'daily':
    case 'story':
    case 'boss':
      if (ev.e === task.kind) next = c + 1;
      break;
    case 'oops':
      if (ev.e === 'verdict' && oopsOf(ev.g, ev.k, ev.v) === task.what) next = c + 1;
      break;
    default:
      break;
  }
  return Math.min(task.n, next);
}
