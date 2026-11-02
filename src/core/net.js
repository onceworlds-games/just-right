// A story played in a room. The host's page runs it (createMatch): it deals each page from the match's seed, takes every
// player's release (what they did: how long they held and when they let go, never a score), scores it with the same rules every
// page runs, and writes the marks for the reveal. Bots are the woodland folk; their plans come from the seed, so every page can show
// them holding. The helpers (match, host, bots) are passed in, so this runs in Node with a fake room.

import { readPage, evaluate } from './pages.js';
import { matchPlan, MATCH_LENGTHS } from './plan.js';
import { FOLK_NAMES, botPlan } from './brain.js';

/** The page's name card before play (ms of the round). */
export const INTRO_MS = 1500;
/** The reveal (s), skippable once everyone has tapped; the podium (s). */
export const REVEAL_S = 3.4;
export const REVEAL_MIN_S = 1.4;
export const RESULTS_S = 12;
export const BOT_FILL = 6;
/** After the window closes, how long the host waits for a late word before the page ends (ms). */
export const GRACE_MS = 800;

export const JOIN_OPTIONS = {
  maxPlayers: 8,
  minPlayers: 1,
  lobby: 'bar',
  ownCountdown: true,
  settings: [{ id: 'pages', label: 'Pages', options: MATCH_LENGTHS, default: 12 }],
};

const KINDS = ['perfect', 'good', 'under', 'over', 'pop', 'asleep'];
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

/** A mark as the room carries it: { v: where it landed ×1000, d: landed minus the band ×1000, s: points, k: verdict }. */
export function validMark(m) {
  return isObj(m) && int(m.v, 0, 1000) && int(m.d, -1000, 1000) && int(m.s, 0, 100) && KINDS.includes(m.k);
}

/** The round's data, read back from the room: a page, its marks, who let go, who has seen the reveal. */
export function validData(d) {
  if (d === null || d === undefined) return true;
  if (!isObj(d) || !readPage(d)) return 'not a page';
  for (const key of ['marks', 'done', 'seen']) {
    const rec = d[key];
    if (!isObj(rec) || Object.keys(rec).length > 40) return `bad ${key}`;
    for (const [id, value] of Object.entries(rec)) {
      if (id.length > 128) return `bad ${key} id`;
      if (key === 'marks' ? !validMark(value) : value !== 1) return `bad ${key} value`;
    }
  }
  return true;
}

/** The pages setting, whatever the room says. */
export const pagesSetting = (settings) => (MATCH_LENGTHS.includes(Number(settings?.pages)) ? Number(settings.pages) : 12);

/**
 * room: the joined room; helpers: { createMatch, createHost, createBots, t }.
 * Returns { match, mark(args), seen(), plans(), dispose() }.
 */
export function createOnline(room, helpers, options = {}) {
  const { createMatch, createHost, createBots, t: T } = helpers;
  const host = createHost(room);
  /** When the reveal began on the host's page (to let it be skipped only after a moment). */
  let revealSince = 0;
  let revealKey = '';

  const match = createMatch(room, {
    rounds: options.rounds ?? 'pages',
    roundSeconds: (INTRO_MS + 8000 + GRACE_MS + 1700) / 1000,
    introSeconds: 0,
    roundEndSeconds: REVEAL_S,
    resultsSeconds: RESULTS_S,
    admit: 'next',
    data: (d) => validData(d),
    tick: 100,
    startRound: (m) => {
      const plan = matchPlan(room.match.seed ?? 0, m.rounds || pagesSetting(room.settings));
      const page = plan[Math.max(0, Math.min(plan.length - 1, m.round - 1))];
      return { ...page, marks: {}, done: {}, seen: {} };
    },
    onTick: (m) => {
      const P = readPage(m.data);
      if (!P) return m.endRound();
      const done = m.data.done ?? {};
      const waiting = m.present.filter((s) => !done[s.id]);
      if (waiting.length === 0 && m.present.length > 0) m.endRound();
      else if (m.elapsed >= INTRO_MS + P.win + GRACE_MS) m.endRound();
    },
    score: (m) => {
      const P = readPage(m.data);
      const marks = m.data?.marks ?? {};
      const out = {};
      for (const seat of m.seats) out[seat.id] = (marks[seat.id]?.s ?? 0) * (P?.x2 ? 2 : 1);
      return out;
    },
  });

  /** A release: { r: round, h: ms held, t: ms after play began }. Any page calls it; the host runs it. */
  const mark = host.rpc('mark', {
    args: { r: T.int(1, 100), h: T.int(0, 20000), t: T.int(0, 30000) },
    rate: 4,
    validate: (from, a) => {
      if (match.phase !== 'round' || a.r !== match.round) return 'not now';
      const P = readPage(match.data);
      if (!P) return 'no page';
      if (!match.seats.some((s) => s.id === from.id)) return 'no seat';
      if (match.data.marks?.[from.id]) return 'already';
      if (a.h > P.win + 500) return 'too long';
      if (a.t < a.h - 300 || a.t > match.elapsed - INTRO_MS + 1500) return 'bad time';
      return true;
    },
    run: (from, a) => {
      const P = readPage(match.data);
      if (!P) return;
      const r = evaluate(P, a.h, a.t);
      match.setData((d) => {
        d.marks[from.id] = { v: Math.round(r.v * 1000), d: Math.round((r.v - r.c) * 1000), s: r.s, k: r.k };
        d.done[from.id] = 1;
      });
    },
  });

  /** "I've seen the reveal": once every player here has, the host turns the page. */
  const seen = host.rpc('seen', {
    args: { r: T.int(1, 100) },
    rate: 3,
    validate: (from, a) => (match.phase === 'roundEnd' && a.r === match.round && match.data && !match.data.seen?.[from.id] ? true : 'not now'),
    run: (from) => match.setData((d) => void (d.seen[from.id] = 1)),
  });

  const bots = createBots(match, {
    host,
    fill: BOT_FILL,
    every: 120,
    names: FOLK_NAMES,
    skill: [0.3, 0.8],
    think(view) {
      if (match.phase !== 'round' || match.paused) return null;
      const P = readPage(view.data);
      if (!P || view.data.done?.[view.bot.id]) return null;
      const plan = botPlan(P, room.match.seed ?? 0, match.roundId, view.bot.id, view.bot.name);
      if (plan.h === null) return null;
      const t = plan.press + plan.h;
      if (match.elapsed - INTRO_MS < t) return null;
      return { call: 'mark', args: { r: match.round, h: plan.h, t } };
    },
  });

  // The host turns the page early when every player here has tapped through the reveal.
  const timer = setInterval(() => {
    if (!match.isHost || match.phase !== 'roundEnd' || !match.data) {
      revealKey = '';
      return;
    }
    const now = options.now ? options.now() : Date.now();
    if (revealKey !== match.roundId) {
      revealKey = match.roundId;
      revealSince = now;
    }
    const people = match.present.filter((s) => !s.bot);
    const all = people.length > 0 && people.every((s) => match.data.seen?.[s.id]);
    if (all && now - revealSince >= REVEAL_MIN_S * 1000) match.skip();
  }, 100);

  /** Every seat's plan for this page (bots only): when they press and let go, for the heads along the top. */
  const planCache = new Map();
  function plans() {
    const P = readPage(match.data);
    if (!P || match.phase !== 'round') return {};
    const key = match.roundId;
    let got = planCache.get(key);
    if (!got) {
      got = {};
      for (const seat of match.seats) if (seat.bot) got[seat.id] = botPlan(P, room.match.seed ?? 0, key, seat.id, seat.name);
      planCache.clear();
      planCache.set(key, got);
    }
    return got;
  }

  return {
    match,
    host,
    bots,
    mark: (args) => mark(args),
    seen: () => seen({ r: match.round }),
    plans,
    dispose() {
      clearInterval(timer);
      bots.dispose();
      match.dispose();
      host.dispose();
    },
  };
}
