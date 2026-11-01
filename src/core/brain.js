// How a woodland rival (or the title's Goldilocks, or the trailer's autoplay) plays a page: when it presses, and how long it
// holds. It aims at the band like a person does, with a timing error, a habit and the odd blunder. Pure and seeded, so every page
// can tell when a bot is holding without a word from the host.

import { finalValue, bandAt, autoReleaseAt, FOGGY } from './pages.js';
import { createRng } from './rng.js';

/** The woodland folk: name, animal, skill (0-1), bias (ms: early < 0 < late), press delay range (s), blunder factor. */
export const FOLK = [
  { name: 'Ottoline', animal: 'owl', skill: 0.82, bias: 0, press: [0.45, 0.85], blunder: 1 },
  { name: 'Fen', animal: 'fox', skill: 0.72, bias: -20, press: [0.3, 0.6], blunder: 1 },
  { name: 'Corvin', animal: 'crow', skill: 0.65, bias: 5, press: [0.4, 0.8], blunder: 1 },
  { name: 'Hazel', animal: 'hare', skill: 0.55, bias: -15, press: [0.15, 0.35], blunder: 1.2 },
  { name: 'Sorrel', animal: 'squirrel', skill: 0.5, bias: 0, press: [0.25, 0.6], blunder: 1.3 },
  { name: 'Prickle', animal: 'hedgehog', skill: 0.45, bias: -50, press: [0.3, 0.55], blunder: 1 },
  { name: 'Burdock', animal: 'badger', skill: 0.4, bias: 60, press: [0.9, 1.4], blunder: 1 },
  { name: 'Moss', animal: 'mole', skill: 0.3, bias: 20, press: [0.5, 1.1], blunder: 2 },
];
export const FOLK_NAMES = FOLK.map((f) => f.name);
export const folkNamed = (name) => FOLK.find((f) => f.name === name) ?? null;

/** Timing spread (ms, one standard deviation) for a skill. */
export const sigmaFor = (skill) => 170 - 130 * Math.max(0, Math.min(1, skill));

/**
 * The hold (ms) that lands on `target` when let go at about `press + h` (the band may move, so it's re-aimed twice).
 * `pickSlow`: on the swinging pages, take the crossing where the motion is slowest (a skilled player's choice) instead of the first.
 */
export function solveHold(P, target, { press = 0, pickSlow = true, aimMoving = true } = {}) {
  const limit = Math.min(P.win - press - 150, autoReleaseAt(P) - 1);
  const step = 4;
  // Where it lands minus where the band will be at that moment (or the fixed target).
  const gap = (h) => finalValue(P, h) - (aimMoving ? bandAt(P, press + h) : target);
  const crossings = [];
  let prev = gap(0);
  for (let h = step; h <= limit && crossings.length < 16; h += step) {
    const cur = gap(h);
    if ((prev <= 0 && cur >= 0) || (prev >= 0 && cur <= 0)) {
      let lo = h - step;
      let hi = h;
      for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2;
        if (Math.sign(gap(mid)) === Math.sign(gap(lo))) lo = mid;
        else hi = mid;
      }
      const at = (lo + hi) / 2;
      // The motion's own slope here: how forgiving this moment is.
      const slope = Math.abs(finalValue(P, at + step) - finalValue(P, at - step)) / (2 * step);
      crossings.push({ h: at, slope });
    }
    prev = cur;
  }
  if (crossings.length === 0) {
    // Out of reach (never for a page the plan makes): stop at the closest point.
    let best = { h: 0, slope: 0 };
    let bd = Infinity;
    for (let h = 0; h <= limit; h += step) {
      const d = Math.abs(gap(h));
      if (d < bd) (bd = d), (best = { h, slope: 0 });
    }
    return best;
  }
  if (P.page.steps) {
    // A pump: aim at the middle of its flat top, not its first edge.
    const first = crossings[0].h;
    let end = first;
    while (end < limit && Math.abs(gap(end + step)) < 0.012) end += step;
    return { h: (first + end) / 2, slope: crossings[0].slope };
  }
  if (pickSlow && !P.page.full) return crossings.reduce((a, b) => (b.slope < a.slope - 1e-5 ? b : a));
  return crossings[0];
}

/**
 * A plan for one page: { press (ms after the page began), h (ms held, or null for asleep) }. The same for the same seed.
 * `who`: a FOLK entry, or { skill, bias, press, blunder }.
 */
export function planHold(P, seed, who) {
  const rng = createRng(seed);
  const skill = Math.max(0, Math.min(1, who.skill ?? 0.5));
  const [p0, p1] = who.press ?? [0.35, 1.2];
  const press = Math.round(rng.range(p0, p1) * 1000);
  // The less skilled aim at where the band is now, the skilled at where it will be.
  const target = bandAt(P, press);
  const shot = solveHold(P, target, { press, pickSlow: skill > 0.55, aimMoving: skill > 0.45 });
  let h = shot.h;
  let sigma = sigmaFor(skill);
  if (P.tw === FOGGY) sigma *= 1.5;
  h += rng.normal(who.bias ?? 0, sigma);
  // The pages that keep going fool the less skilled: they let go too late.
  if (P.page.lag && shot.slope > 0) h += ((1 - skill) * 0.04) / shot.slope;
  if (rng.chance(0.05 * (1 - skill) * (who.blunder ?? 1))) {
    if (rng.chance(0.25)) return { press, h: null };
    h += (rng.chance(0.5) ? 1 : -1) * rng.range(300, 700);
  }
  const most = Math.min(P.win - press - 50, autoReleaseAt(P));
  h = Math.round(Math.max(30, Math.min(most, h)));
  return { press, h };
}

/** A bot's plan for a page in a match, the same on every page: the seed is the match's, the round's and the seat's. */
export function botPlan(P, matchSeed, roundId, seat, name) {
  const who = folkNamed(name) ?? { skill: 0.5 };
  return planHold(P, `bot:${matchSeed}:${roundId}:${seat}`, who);
}

/** The local player driven by a skilled hand (the title's attract mode and ?autoplay). */
export const AUTOPLAY = { skill: 0.8, bias: 0, press: [0.35, 0.7], blunder: 0.6 };
