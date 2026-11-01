// The twelve pages of the story: how each thing moves while it's held, where the band is, and how a release is scored.
// Pure (no page, no SDK): every player's page and the host run the same numbers, and the tests run them in Node.
//
// A page's value v runs from 0 to 1 along its gauge. Holding drives it; letting go stops it (milk still in the air lands, a
// pushed bowl glides on). The band is centred on c with half-width w; the closer to c, the more points.

export const TWISTS = ['', 'moving', 'foggy', 'wobbly'];
export const TWIST_CARD = ['', 'It moves!', 'Foggy!', 'Wobbly!'];
export const MOVING = 1;
export const FOGGY = 2;
export const WOBBLY = 3;

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeOutCubic = (x) => 1 - (1 - x) ** 3;

/**
 * id, name, cue (the 2-3 word verb), axis ('up' | 'down' | 'right': where v = 0 sits on the gauge), set ('easy' | 'mid' | 'late'),
 * band (the range of band centres), under/over (the words for too little / too much), full (seconds of hold at speed 1 to the end
 * of the travel; 0 for the swinging pages), twists (which twists suit it), lag (it keeps going after letting go), falls (v goes down).
 */
export const PAGES = [
  { id: 'porridge', name: 'Porridge', cue: 'Hold to heat', axis: 'up', set: 'easy', band: [0.5, 0.72], under: 'TOO COLD', over: 'TOO HOT', full: 3.2, twists: [MOVING, FOGGY, WOBBLY] },
  { id: 'chair', name: 'Little Chair', cue: 'Hold to sit', axis: 'down', set: 'easy', band: [0.55, 0.75], under: 'TOO HIGH', over: 'CRACK!', full: 3.0, twists: [FOGGY, WOBBLY] },
  { id: 'pillow', name: 'Pillow', cue: 'Hold to fluff', axis: 'up', set: 'easy', band: [0.4, 0.7], under: 'TOO FLAT', over: 'TOO FLUFFY', full: 3.9, twists: [FOGGY], steps: 0.1 },
  { id: 'toast', name: 'Toast', cue: 'Hold to toast', axis: 'up', set: 'easy', band: [0.45, 0.7], under: 'TOO PALE', over: 'BURNT!', full: 4.4, twists: [MOVING, FOGGY, WOBBLY] },
  { id: 'balloon', name: 'Balloon', cue: 'Hold to pump', axis: 'up', set: 'easy', band: [0.5, 0.7], under: 'TOO SMALL', over: 'TOO BIG', full: 3.0, twists: [], pops: true },
  { id: 'cake', name: 'Cake', cue: 'Hold to slice', axis: 'right', set: 'mid', band: [0.4, 0.6], under: 'TOO SHORT', over: 'TOO FAR', full: 2.2, twists: [MOVING, WOBBLY] },
  { id: 'spoon', name: 'Cool the Spoon', cue: 'Hold to blow', axis: 'up', set: 'mid', band: [0.28, 0.5], under: 'TOO COLD', over: 'TOO HOT', full: 3.0, twists: [MOVING, FOGGY, WOBBLY], falls: true },
  { id: 'milk', name: 'Milk', cue: 'Hold to pour', axis: 'up', set: 'late', band: [0.45, 0.75], under: 'TOO LITTLE', over: 'SPILLED!', full: 3.25, twists: [MOVING, FOGGY, WOBBLY], lag: true, hint: 'It keeps pouring!' },
  { id: 'bowl', name: 'Bowl Slide', cue: 'Hold to push', axis: 'right', set: 'late', band: [0.45, 0.8], under: 'TOO SHORT', over: 'TOO FAR', full: 3.1, twists: [MOVING], lag: true, hint: 'It keeps sliding!' },
  { id: 'jar', name: 'Honey Jar', cue: 'Hold to swing', axis: 'right', set: 'late', band: [0.24, 0.76], under: 'TOO LEFT', over: 'TOO RIGHT', full: 0, twists: [MOVING] },
  { id: 'bell', name: 'Bell', cue: 'Hold to swing', axis: 'up', set: 'late', band: [0.7, 0.86], under: 'TOO WEAK', over: 'TOO HARD', full: 0, twists: [MOVING] },
  { id: 'swing', name: 'Rope Swing', cue: 'Hold to swing', axis: 'right', set: 'late', band: [0.36, 0.9], under: 'SPLASH!', over: 'TOO FAR', full: 0, twists: [], tops: true },
];

export const PAGE_IDS = PAGES.map((p) => p.id);
const BY_ID = new Map(PAGES.map((p) => [p.id, p]));
export const pageOf = (id) => BY_ID.get(id) ?? null;

/** The longest window, the shortest, and the window of the swinging pages (ms). */
export const WINDOW = { min: 4500, max: 8000, swinging: 6000, extra: 2000 };

/**
 * A page as the room carries it (small integers) → the numbers the rules use. Returns null for anything malformed, so a bad
 * record from another page never reaches the drawing.
 *   { g: page id, c: centre ×1000, w: half-width ×1000, sp: speed ×100, tw: twist, ph: twist phase ×1000, n: page number, x2: 0|1 }
 */
export function readPage(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const page = pageOf(raw.g);
  if (!page) return null;
  const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  if (!num(raw.c, 0, 1000) || !num(raw.w, 10, 200) || !num(raw.sp, 40, 300) || !num(raw.tw ?? 0, 0, 3) || !num(raw.ph ?? 0, 0, 1000)) return null;
  const P = {
    page,
    g: page.id,
    c0: raw.c / 1000,
    w: raw.w / 1000,
    sp: raw.sp / 100,
    tw: Math.floor(raw.tw ?? 0),
    ph: (raw.ph ?? 0) / 1000,
    n: num(raw.n, 0, 999) ? Math.floor(raw.n) : 0,
    x2: raw.x2 === 1 || raw.x2 === true,
    pr: num(raw.pr, 10, 40) ? raw.pr / 1000 : 0.02,
    bo: num(raw.bo, 1, 3) ? Math.floor(raw.bo) : 0,
  };
  if (!page.twists.includes(P.tw)) P.tw = 0;
  P.win = windowOf(P);
  return P;
}

/** The ms a player has to play the page (from the page's start). */
export function windowOf(P) {
  // The rope swing's third top comes 5 s (at speed 1) into the hold: room to reach it.
  if (P.page.tops) return Math.round(Math.max(WINDOW.swinging, (5 / P.sp) * 1000 + 1700));
  if (!P.page.full) return WINDOW.swinging;
  const ms = (P.page.full / P.sp) * 1000 + WINDOW.extra;
  return Math.round(Math.min(WINDOW.max, Math.max(WINDOW.min, ms)));
}

// ---------------------------------------------------------------- motion

/** The value before twists and lag, at e seconds of effective hold (held seconds × speed). */
function motion(P, e) {
  switch (P.g) {
    case 'porridge':
      return clamp01((e / 3.2) ** 1.6);
    case 'chair': {
      // Like gravity, (e / 2.6)², but at half speed through the band (the cushion).
      const fall = (x) => clamp01((x / 2.6) ** 2);
      const at = (v) => 2.6 * Math.sqrt(clamp01(v));
      const a = at(P.c0 - P.w);
      const b = at(P.c0 + P.w);
      if (e <= a) return fall(e);
      if (e <= a + 2 * (b - a)) return fall(a + (e - a) / 2);
      return fall(e - (b - a));
    }
    case 'pillow': {
      // Pumps: every 0.4 s one more tenth, eased over 0.28 s.
      const n = Math.floor(e / 0.4);
      const f = Math.min(1, (e - n * 0.4) / 0.28);
      return clamp01(0.1 * n + 0.1 * easeOutCubic(f));
    }
    case 'toast':
      return clamp01(e / 4.4);
    case 'balloon':
      return clamp01(1 - (1 - Math.min(1, e / 3)) ** 2);
    case 'cake':
      return clamp01(e / 2.2);
    case 'spoon':
      return clamp01((1 - Math.min(1, e / 3)) ** 2);
    case 'milk':
      return clamp01((e - 0.25) / 3.0);
    case 'bowl':
      return clamp01(0.06 * e * e);
    case 'jar':
      // A steady pendulum, 4 s there and back, starting at the left end.
      return 0.5 - 0.42 * Math.cos((2 * Math.PI * e) / 4);
    case 'bell': {
      // Strength rises for 2 s, falls for 2 s, and again.
      const q = (e / 2) % 2;
      return q <= 1 ? q : 2 - q;
    }
    case 'swing':
      // Swings 2 s long that grow: their tops reach 0.4, 0.65 and 0.9.
      return swingValue(e);
    default:
      return 0;
  }
}

/** The rope swing: the distance she'd fly, highest at the top of each forward swing (e = 1, 3, 5 s). */
export function swingValue(e) {
  const amp = Math.min(1, 0.275 + 0.125 * e);
  return clamp01(amp * (0.5 - 0.5 * Math.cos(Math.PI * e)));
}
/** The tops of the rope swing's first three swings. */
export const SWING_TOPS = [swingValue(1), swingValue(3), swingValue(5)];

const wobble = (e) => 0.025 * Math.sin((2 * Math.PI * e) / 0.33) * Math.min(1, e / 0.3);

/** What the gauge shows while the page is held for h ms. */
export function shownValue(P, h) {
  const e = (Math.max(0, h) / 1000) * P.sp;
  let v = motion(P, e);
  if (P.tw === WOBBLY) v = clamp01(v + wobble(e));
  return v;
}

/** Where it ends up after a hold of h ms: the milk in the air lands, the bowl glides on. */
export function finalValue(P, h) {
  const e = (Math.max(0, h) / 1000) * P.sp;
  let v;
  if (P.g === 'milk') {
    const pour = (e - 0.25) / 3.0;
    v = pour <= 0 ? 0 : clamp01(pour + 0.06 * Math.min(1, (e - 0.25) / 0.4));
  } else if (P.g === 'bowl') {
    v = clamp01(0.105 * e * e);
  } else v = motion(P, e);
  if (P.tw === WOBBLY) v = clamp01(v + wobble(e));
  return v;
}

/** The band's centre t ms after the page began (it drifts only with the Moving twist). */
export function bandAt(P, t) {
  if (P.tw !== MOVING) return P.c0;
  const room = Math.min(0.1, P.c0 - P.w - 0.06, 0.94 - P.w - P.c0);
  const amp = Math.max(0.04, room);
  return P.c0 + amp * Math.sin(((2 * Math.PI * Math.max(0, t)) / 1000) * (P.sp / 2.6) + P.ph * 2 * Math.PI);
}

/** The balloon bursts above this. */
export const popLine = (P) => Math.min(0.985, P.c0 + P.w + 0.03);

/**
 * How long a hold can last before it lets go by itself (ms): the end of the travel (the pot boils over, the chair hits the floor,
 * the spoon is ice), the balloon bursting, or never for the swinging pages.
 */
export function autoReleaseAt(P) {
  if (!P.page.full) return Infinity;
  const done = (h) => {
    const e = (h / 1000) * P.sp;
    const v = motion(P, e);
    if (P.page.pops && v >= popLine(P)) return true;
    return P.page.falls ? v <= 0 : v >= 1;
  };
  let lo = 0;
  let hi = 30000;
  if (!done(hi)) return Infinity;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (done(mid)) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi);
}

// ---------------------------------------------------------------- scoring

/** The perfect radius: ±0.02 of the gauge (or a charm's wider notch), at most half the band. */
export const perfectRadius = (w, pr = 0.02) => Math.min(pr || 0.02, w / 2);

/**
 * Score a release: h ms held (null: never pressed), t ms after the page began when it was let go.
 * → { v, c, d, s (0-100 points), k ('perfect' | 'good' | 'under' | 'over' | 'pop' | 'asleep') }
 */
export function evaluate(P, h, t) {
  const c = bandAt(P, t ?? 0);
  if (h === null || h === undefined || !Number.isFinite(h)) return { v: P.page.falls ? 1 : 0, c, d: 1, s: 0, k: 'asleep' };
  const v = finalValue(P, h);
  if (P.page.pops && motion(P, (h / 1000) * P.sp) >= popLine(P)) return { v, c, d: Math.abs(v - c), s: 0, k: 'pop' };
  const d = Math.abs(v - c);
  const w = P.w;
  const pr = perfectRadius(w, P.pr);
  let s;
  let k;
  if (d <= pr + 1e-9) {
    s = 100;
    k = 'perfect';
  } else if (d <= w) {
    s = Math.round(100 - (30 * (d - pr)) / (w - pr));
    k = 'good';
  } else {
    s = Math.max(0, Math.round(60 - (60 * (d - w)) / 0.2));
    k = v < c ? 'under' : 'over';
  }
  return { v, c, d, s, k };
}

/** In the band (what keeps the bears away in Before the Bears). */
export const inBand = (k) => k === 'perfect' || k === 'good';

/** The word a verdict is stamped with (v: where it ended up, for the bowl that slid off the table). */
export function verdictWord(P, k, v = 0) {
  if (k === 'over' && P.g === 'bowl' && v >= 0.985) return 'OFF THE EDGE!';
  switch (k) {
    case 'perfect':
      return 'JUST RIGHT!';
    case 'good':
      return 'ALMOST!';
    case 'under':
      return P.page.under;
    case 'over':
      return P.page.over;
    case 'pop':
      return 'POP!';
    default:
      return 'ASLEEP';
  }
}
