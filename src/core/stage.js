// One page being played on this screen: the press, the hold (timed from the input events' own timestamps, never from frames),
// the release (by the player, at the end of the travel, a burst balloon, or the window closing) and the local verdict. Pure: the
// clock is whatever the caller passes (performance.now() and event.timeStamp share one).

import { shownValue, finalValue, autoReleaseAt, evaluate, bandAt } from './pages.js';

/** How long the "keeps going" pages take to settle after letting go (ms): milk still in the air, a gliding bowl. */
const SETTLE = { milk: 380, bowl: 650 };

export function createStage() {
  const s = {
    P: null,
    key: '',
    /** Local clock ms when play begins (the intro is before it). */
    start: 0,
    pressAt: null,
    releaseAt: null,
    /** ms held, once let go. */
    h: null,
    /** ms after play began when it was let go. */
    t: null,
    result: null,
    /** 'player' | 'end' (end of the travel or a burst) | 'window' (time ran out) */
    how: '',
    locked: false,
    auto: Infinity,

    /** A new page: play begins at local time `start`. */
    begin(P, key, start) {
      s.P = P;
      s.key = key;
      s.start = start;
      s.pressAt = null;
      s.releaseAt = null;
      s.h = null;
      s.t = null;
      s.result = null;
      s.how = '';
      s.locked = false;
      s.auto = P ? autoReleaseAt(P) : Infinity;
    },
    /** Nothing more on this page (watching, or the page is over). */
    lock() {
      s.locked = true;
    },
    get playing() {
      return !!s.P && !s.locked && s.result === null;
    },
    get holding() {
      return s.pressAt !== null && s.releaseAt === null && !s.locked;
    },
    get released() {
      return s.result !== null;
    },
    /** The finger (or key) goes down at `ts`. A hold that began before play counts from play's start. Returns true if taken. */
    press(ts) {
      if (!s.P || s.locked || s.pressAt !== null) return false;
      s.pressAt = Math.max(ts, s.start);
      return true;
    },
    /** It comes up at `ts`. Returns the result, or null if there was nothing to let go. */
    release(ts, how = 'player') {
      if (!s.P || s.pressAt === null || s.releaseAt !== null) return null;
      // Let go again before play began (a tap through the intro): nothing happened, press again.
      if (ts < s.start && how === 'player') {
        s.pressAt = null;
        return null;
      }
      const end = Math.max(ts, s.start);
      let h = Math.max(0, end - s.pressAt);
      h = Math.min(h, s.auto, Math.max(0, s.start + s.P.win - s.pressAt));
      s.releaseAt = s.pressAt + h;
      s.h = Math.round(h);
      s.t = Math.round(s.releaseAt - s.start);
      s.how = how;
      s.result = evaluate(s.P, s.h, s.t);
      return s.result;
    },
    /** Called every frame: lets go by itself at the end of the travel or when the window closes; an unpressed page sleeps. */
    update(now) {
      if (!s.P || s.locked || s.result) return null;
      if (s.pressAt !== null) {
        if (now - s.pressAt >= s.auto) return s.release(s.pressAt + s.auto, 'end');
        if (now >= s.start + s.P.win) return s.release(s.start + s.P.win, 'window');
        return null;
      }
      if (now >= s.start + s.P.win) {
        s.result = evaluate(s.P, null, s.P.win);
        s.how = 'window';
        s.t = s.P.win;
        return s.result;
      }
      return null;
    },
    /** ms held so far (or in all, once let go). */
    held(now) {
      if (s.pressAt === null) return 0;
      if (s.releaseAt !== null) return s.releaseAt - s.pressAt;
      return Math.max(0, Math.min(now - s.pressAt, s.auto));
    },
    /** What the gauge shows now: the live value while holding, then (for milk and the bowl) easing to where it ends up. */
    value(now) {
      if (!s.P) return 0;
      if (s.result && s.result.k === 'asleep') return s.result.v;
      const h = s.held(now);
      if (s.releaseAt === null) return shownValue(s.P, h);
      const settle = SETTLE[s.P.g] ?? 0;
      const from = shownValue(s.P, h);
      const to = finalValue(s.P, h);
      if (!settle) return to;
      const k = Math.min(1, Math.max(0, (now - s.releaseAt) / settle));
      const ease = s.P.g === 'bowl' ? 1 - (1 - k) ** 3 : k;
      return from + (to - from) * ease;
    },
    /** The band's centre now (it drifts with the Moving twist). */
    band(now) {
      if (!s.P) return 0.5;
      return bandAt(s.P, s.releaseAt !== null ? s.releaseAt - s.start : Math.max(0, now - s.start));
    },
    /** Seconds left in the window (null before play or after letting go). */
    left(now) {
      if (!s.P || s.result) return null;
      return Math.max(0, (s.start + s.P.win - now) / 1000);
    },
  };
  return s;
}
