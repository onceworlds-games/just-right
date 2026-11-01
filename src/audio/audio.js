// Every sound is made here with Web Audio: the holding tone (its pitch is the gauge; it chimes inside the band), each station's
// own noises (layered: a body, a transient and a tail through a small room), the verdicts, the bears, and a folk band that builds
// with the run (bass and plucks, then the fiddle, then claps and a glockenspiel, then the whole band on a streak). The platform
// applies its volume and mute to the AudioContext by itself. Nothing here throws into the game.

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let verb = null;
let noiseBuf = null;
let started = false;

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);

function safe(fn) {
  return (...args) => {
    try {
      if (ctx && started) return fn(...args);
    } catch {
      // A sound that can't play is never worth an error.
    }
    return undefined;
  };
}

/** A short warm room: decaying stereo noise. */
function roomImpulse(seconds = 1.1) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3.2 * (i < 40 ? i / 40 : 1);
  }
  return buf;
}

/** From a tap or key in the game (iOS only lets sound start that way). */
export function startAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3.5;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;
      master.connect(comp).connect(ctx.destination);
      verb = ctx.createConvolver();
      verb.buffer = roomImpulse();
      const verbOut = ctx.createGain();
      verbOut.gain.value = 0.32;
      verb.connect(verbOut).connect(master);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.8;
      sfxBus.connect(master);
      const send = ctx.createGain();
      send.gain.value = 0.35;
      sfxBus.connect(send).connect(verb);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(master);
      const mSend = ctx.createGain();
      mSend.gain.value = 0.18;
      musicBus.connect(mSend).connect(verb);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    started = true;
  } catch {
    ctx = null;
  }
}

/** The page is hidden (or the game paused): quiet. */
export function setSuspended(on) {
  try {
    if (!ctx) return;
    if (on) ctx.suspend();
    else if (started) ctx.resume();
  } catch {}
}

export const audioReady = () => !!(ctx && started);

// ---------------------------------------------------------------- building blocks

function out(dest, pan) {
  if (!pan || !ctx.createStereoPanner) return dest;
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(dest);
  return p;
}

function tone(type, freq, at, dur, gain, { attack = 0.005, to = null, dest = sfxBus, detune = 0, pan = 0, curve = 'exp' } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (to) {
    if (curve === 'lin') o.frequency.linearRampToValueAtTime(Math.max(20, to), at + dur);
    else o.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + dur);
  }
  o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out(dest, pan));
  o.start(at);
  o.stop(at + dur + 0.05);
  return o;
}

function noise(at, dur, gain, { type = 'bandpass', freq = 1000, q = 1, to = null, attack = 0.003, dest = sfxBus, pan = 0 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, at);
  if (to) f.frequency.exponentialRampToValueAtTime(Math.max(30, to), at + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(out(dest, pan));
  src.start(at, Math.random() * Math.max(0, 1.9 - dur));
  src.stop(at + dur + 0.05);
}

/** A plucked string: triangle and a little square through a closing filter. */
function pluck(freq, at, gain, { dest = sfxBus, decay = 0.45, bright = 6, pan = 0 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = freq;
  const o2 = ctx.createOscillator();
  o2.type = 'square';
  o2.frequency.value = freq;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(freq * bright, at);
  f.frequency.exponentialRampToValueAtTime(freq * 1.5, at + decay * 0.55);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  o.connect(f);
  o2.connect(g2).connect(f);
  f.connect(g).connect(out(dest, pan));
  o.start(at);
  o2.start(at);
  o.stop(at + decay + 0.05);
  o2.stop(at + decay + 0.05);
}

/** A bell/glockenspiel partial stack. */
function chime(freq, at, gain, { dest = sfxBus, decay = 1.2, pan = 0 } = {}) {
  [1, 2.76, 5.4].forEach((m, i) => tone('sine', freq * m, at, decay / (i + 1), gain / (i * 1.6 + 1), { dest, pan }));
}

const now = () => ctx.currentTime + 0.005;

// ---------------------------------------------------------------- one-shots

const S = {
  click: () => {
    const t = now();
    tone('sine', 1500, t, 0.05, 0.12, { to: 900 });
    noise(t, 0.012, 0.08, { freq: 4000, q: 2 });
  },
  hover: () => tone('sine', 2100, now(), 0.03, 0.04, { to: 1800 }),
  back: () => tone('sine', 900, now(), 0.07, 0.1, { to: 600 }),
  tick: () => noise(now(), 0.03, 0.18, { freq: 3200, q: 4 }),
  /** The stamp coming down: a thump, paper and a little ink squelch. */
  stamp: () => {
    const t = now();
    tone('sine', 160, t, 0.2, 0.6, { to: 52 });
    noise(t, 0.05, 0.45, { type: 'lowpass', freq: 2200 });
    noise(t + 0.02, 0.12, 0.12, { freq: 700, q: 3, to: 300 });
  },
  /** A perfect: a bright two-bell chime over a warm triad. */
  ding: () => {
    const t = now();
    chime(midi(88), t, 0.2, { decay: 1.4 });
    chime(midi(95), t + 0.07, 0.12, { decay: 1.1 });
    [76, 79, 83].forEach((n) => tone('triangle', midi(n), t, 0.5, 0.05));
  },
  /** In the band. */
  good: () => {
    const t = now();
    pluck(midi(74), t, 0.3);
    pluck(midi(79), t + 0.07, 0.25);
  },
  /** A big miss: the sad trombone. */
  trombone: () => {
    const t = now();
    [58, 57, 56, 55].forEach((n, i) => {
      const at = t + i * 0.26;
      const dur = i === 3 ? 0.7 : 0.24;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(midi(n), at);
      if (i === 3) o.frequency.linearRampToValueAtTime(midi(n) * 0.97, at + dur);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6;
      const lg = ctx.createGain();
      lg.gain.value = i === 3 ? 12 : 0;
      lfo.connect(lg).connect(o.detune);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(500, at);
      f.frequency.linearRampToValueAtTime(1300, at + 0.08);
      f.frequency.linearRampToValueAtTime(600, at + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.14, at + 0.04);
      g.gain.setValueAtTime(0.14, at + dur - 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(f).connect(g).connect(sfxBus);
      o.start(at);
      lfo.start(at);
      o.stop(at + dur + 0.05);
      lfo.stop(at + dur + 0.05);
    });
  },
  miss: () => {
    const t = now();
    tone('triangle', midi(62), t, 0.18, 0.12, { to: midi(57) });
    tone('triangle', midi(57), t + 0.12, 0.3, 0.1, { to: midi(52) });
  },
  pop: () => {
    const t = now();
    noise(t, 0.14, 1.0, { type: 'highpass', freq: 800 });
    tone('sine', 480, t, 0.12, 0.45, { to: 60 });
    noise(t + 0.03, 0.5, 0.15, { freq: 2600, q: 0.8, to: 800 });
  },
  crack: () => {
    const t = now();
    noise(t, 0.07, 0.9, { freq: 2600, q: 0.7 });
    noise(t + 0.04, 0.3, 0.55, { freq: 1100, q: 2.5, to: 280 });
    tone('sine', 120, t, 0.35, 0.6, { to: 38 });
    for (let i = 0; i < 4; i++) noise(t + 0.12 + i * rnd(0.05, 0.09), 0.05, 0.25, { freq: rnd(1200, 3000), q: 3 });
  },
  creak: ({ pitch = 1 } = {}) => {
    const t = now();
    const o = tone('sawtooth', 160 * pitch, t, 0.28, 0.05, { to: 230 * pitch, attack: 0.05 });
    void o;
    noise(t, 0.26, 0.09, { freq: 700 * pitch, q: 14, to: 950 * pitch, attack: 0.05 });
  },
  cushion: () => {
    const t = now();
    noise(t, 0.3, 0.4, { type: 'lowpass', freq: 900, to: 200, attack: 0.02 });
    tone('sine', 95, t, 0.2, 0.3, { to: 60 });
  },
  thud: () => {
    const t = now();
    tone('sine', 120, t, 0.24, 0.65, { to: 42 });
    noise(t, 0.08, 0.32, { type: 'lowpass', freq: 600 });
  },
  whump: () => {
    const t = now();
    tone('sine', 90, t, 0.18, 0.4, { to: 52 });
    noise(t, 0.14, 0.2, { type: 'lowpass', freq: 520 });
  },
  flop: () => {
    const t = now();
    noise(t, 0.45, 0.45, { type: 'lowpass', freq: 1200, to: 180, attack: 0.03 });
    tone('sine', 75, t + 0.05, 0.3, 0.35, { to: 45 });
  },
  splash: () => {
    const t = now();
    noise(t, 0.7, 0.7, { freq: 1900, q: 0.6, to: 380 });
    noise(t + 0.04, 0.35, 0.35, { type: 'highpass', freq: 3200 });
    tone('sine', 140, t, 0.25, 0.4, { to: 50 });
    for (let i = 0; i < 6; i++) tone('sine', rnd(900, 2200), t + 0.25 + i * rnd(0.05, 0.11), 0.06, 0.05, { to: rnd(1400, 3000) });
  },
  clink: ({ pitch = 1 } = {}) => {
    const t = now();
    tone('sine', 2093 * pitch, t, 0.3, 0.18);
    tone('sine', 3136 * pitch, t + 0.01, 0.2, 0.08);
    tone('sine', 5274 * pitch, t, 0.08, 0.04);
  },
  plate: () => {
    const t = now();
    tone('sine', 1650, t, 0.35, 0.12);
    tone('sine', 2380, t + 0.004, 0.25, 0.06);
    noise(t, 0.03, 0.15, { freq: 3500, q: 2 });
  },
  smash: () => {
    const t = now();
    noise(t, 0.5, 0.75, { type: 'highpass', freq: 2300 });
    tone('sine', 150, t, 0.2, 0.35, { to: 60 });
    for (let i = 0; i < 9; i++) tone('sine', rnd(1700, 4600), t + 0.03 + i * rnd(0.025, 0.06), 0.14, 0.07);
  },
  /** The fair's bell. */
  bell: () => {
    const t = now();
    chime(523, t, 0.3, { decay: 2.2 });
    chime(523 * 1.5, t + 0.002, 0.08, { decay: 1.4 });
  },
  clang: () => {
    const t = now();
    [1, 2.4, 3.9, 6.2].forEach((m, i) => tone('square', 180 * m, t, 0.35 / (i + 1), 0.06 / (i + 1)));
    noise(t, 0.2, 0.3, { freq: 1500, q: 1 });
  },
  thwack: () => {
    const t = now();
    noise(t, 0.04, 0.8, { freq: 1800, q: 1 });
    tone('sine', 210, t, 0.12, 0.5, { to: 80 });
  },
  boing: () => {
    const t = now();
    const o = tone('sine', 220, t, 0.45, 0.35);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 18;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(260, t);
    lg.gain.exponentialRampToValueAtTime(5, t + 0.45);
    lfo.connect(lg).connect(o.detune);
    lfo.start(t);
    lfo.stop(t + 0.5);
  },
  poof: () => noise(now(), 0.38, 0.5, { type: 'lowpass', freq: 1500, to: 300 }),
  sizzle: () => {
    const t = now();
    noise(t, 0.9, 0.38, { type: 'highpass', freq: 4200, attack: 0.02 });
    for (let i = 0; i < 8; i++) noise(t + i * rnd(0.04, 0.1), 0.02, 0.15, { freq: rnd(3000, 7000), q: 6 });
  },
  boilover: () => {
    const t = now();
    for (let i = 0; i < 10; i++) tone('sine', rnd(180, 420), t + i * 0.05, 0.08, 0.12, { to: rnd(500, 900) });
    noise(t, 0.6, 0.25, { type: 'lowpass', freq: 900, attack: 0.05 });
  },
  frost: () => {
    const t = now();
    for (let i = 0; i < 7; i++) tone('sine', midi(96 + ((i * 5) % 12)), t + i * 0.045, 0.3, 0.05, { pan: rnd(-0.6, 0.6) });
    noise(t, 0.3, 0.08, { type: 'highpass', freq: 6000 });
  },
  slurp: () => {
    const t = now();
    noise(t, 0.35, 0.25, { freq: 500, q: 4, to: 1600, attack: 0.04 });
    tone('sine', 300, t + 0.3, 0.12, 0.15, { to: 700 });
  },
  blow: () => {
    const t = now();
    noise(t, 0.35, 0.18, { freq: 1100, q: 0.9, to: 700, attack: 0.08 });
  },
  yelp: () => {
    const t = now();
    tone('triangle', 700, t, 0.25, 0.18, { to: 1400 });
    tone('sine', 1400, t + 0.1, 0.2, 0.08, { to: 1900 });
  },
  scrape: () => noise(now(), 0.25, 0.25, { freq: 3000, q: 3, to: 1500 }),
  chop: () => {
    const t = now();
    tone('sine', 190, t, 0.13, 0.55, { to: 75 });
    noise(t, 0.05, 0.45, { freq: 1600 });
    noise(t + 0.01, 0.15, 0.08, { freq: 5000, q: 4 });
  },
  whoosh: ({ pitch = 1 } = {}) => noise(now(), 0.42, 0.4, { freq: 550 * pitch, q: 1.5, to: 2400 * pitch, attack: 0.09 }),
  step: () => {
    const t = now();
    tone('sine', 88, t, 0.12, 0.35, { to: 50 });
    noise(t, 0.05, 0.12, { type: 'lowpass', freq: 400 });
  },
  rope: () => {
    const t = now();
    noise(t, 0.2, 0.2, { freq: 900, q: 3, to: 400 });
    tone('sine', 220, t + 0.12, 0.1, 0.1, { to: 160 });
  },
  pump: ({ pitch = 1 } = {}) => {
    const t = now();
    noise(t, 0.22, 0.25, { freq: 800 * pitch, q: 2, to: 2000 * pitch, attack: 0.03 });
    tone('sine', 120, t, 0.08, 0.15, { to: 80 });
  },
  squeak: ({ pitch = 1 } = {}) => {
    const t = now();
    tone('sine', 900 * pitch, t, 0.2, 0.12, { to: 1500 * pitch, curve: 'lin' });
    tone('sine', 1500 * pitch, t + 0.18, 0.12, 0.08, { to: 1100 * pitch });
  },
  toastPop: () => {
    const t = now();
    tone('sine', 300, t, 0.08, 0.4, { to: 700 });
    noise(t, 0.04, 0.4, { freq: 2500, q: 2 });
    noise(t + 0.05, 0.05, 0.2, { freq: 1800, q: 3 });
  },
  cough: () => {
    const t = now();
    for (let i = 0; i < 3; i++) noise(t + i * 0.18, 0.12, 0.35, { freq: 700, q: 1.4, to: 400 });
  },
  /** A bear: 'papa' low, 'mama' middle, 'baby' high. */
  growl: ({ kind = 'papa' } = {}) => {
    const t = now();
    const base = kind === 'baby' ? 190 : kind === 'mama' ? 120 : 72;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(base * 0.9, t);
    o.frequency.linearRampToValueAtTime(base * 1.15, t + 0.12);
    o.frequency.linearRampToValueAtTime(base * 0.78, t + 0.55);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 26;
    const lg = ctx.createGain();
    lg.gain.value = 0.38;
    const am = ctx.createGain();
    am.gain.value = 0.62;
    lfo.connect(lg).connect(am.gain);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = base * 6;
    f.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(f).connect(am).connect(g).connect(sfxBus);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.65);
    lfo.stop(t + 0.65);
    noise(t, 0.45, 0.14, { freq: base * 4, q: 1.5 });
    // Footfalls coming in.
    for (let i = 0; i < 2; i++) tone('sine', 70, t + 0.55 + i * 0.22, 0.15, 0.35, { to: 40 });
  },
  /** A marker landing in the reveal (higher for the closer). */
  plink: ({ rank = 0 } = {}) => {
    const t = now();
    tone('triangle', midi(67 + Math.min(14, rank * 2)), t, 0.2, 0.16);
    tone('sine', 140, t, 0.1, 0.2, { to: 60 });
  },
  fanfare: () => {
    const t = now();
    [67, 71, 74, 79].forEach((n, i) => {
      pluck(midi(n), t + i * 0.08, 0.3);
      tone('square', midi(n + 12), t + i * 0.08, 0.22, 0.035);
    });
    chime(midi(91), t + 0.34, 0.12);
  },
  win: () => {
    const t = now();
    [55, 59, 62, 67, 71, 74, 79].forEach((n, i) => pluck(midi(n), t + i * 0.06, 0.3));
    chime(midi(91), t + 0.45, 0.14, { decay: 1.8 });
    for (let i = 0; i < 6; i++) noise(t + 0.5 + i * 0.07, 0.04, 0.15, { type: 'highpass', freq: 5000 });
  },
  /** Honey into the jar: drips that rise. */
  honey: ({ n = 1 } = {}) => {
    const t = now();
    for (let i = 0; i < Math.min(6, n); i++) {
      const at = t + i * 0.06;
      tone('sine', midi(79 + i * 2), at, 0.09, 0.08, { to: midi(86 + i * 2) });
    }
  },
  buy: () => {
    const t = now();
    [72, 76, 79, 84].forEach((n, i) => chime(midi(n), t + i * 0.06, 0.08, { decay: 0.6 }));
  },
  nope: () => {
    const t = now();
    tone('square', 180, t, 0.09, 0.05);
    tone('square', 150, t + 0.1, 0.12, 0.05);
  },
  charm: () => {
    const t = now();
    for (let i = 0; i < 8; i++) chime(midi(84 + [0, 4, 7, 12, 7, 12, 16, 19][i]), t + i * 0.045, 0.05, { decay: 0.8, pan: rnd(-0.5, 0.5) });
    noise(t, 0.6, 0.06, { type: 'highpass', freq: 7000, attack: 0.1 });
  },
  rankUp: () => {
    const t = now();
    [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => pluck(midi(n), t + i * 0.05, 0.25));
    chime(midi(96), t + 0.4, 0.12, { decay: 2 });
  },
  newBest: () => {
    const t = now();
    [72, 79, 84, 88].forEach((n, i) => chime(midi(n), t + i * 0.09, 0.12, { decay: 1.2 }));
  },
  /** The boss is coming: a drum roll and a low horn. */
  boss: () => {
    const t = now();
    for (let i = 0; i < 18; i++) noise(t + i * 0.045, 0.05, 0.08 + i * 0.012, { freq: 300, q: 1 });
    tone('sawtooth', midi(43), t + 0.8, 0.9, 0.12, { attack: 0.06 });
    tone('sawtooth', midi(50), t + 0.8, 0.9, 0.08, { attack: 0.06 });
    tone('sine', 55, t + 0.8, 0.6, 0.5, { to: 40 });
  },
  count: ({ n = 3 } = {}) => {
    const t = now();
    tone('sine', n === 0 ? 880 : 440, t, n === 0 ? 0.5 : 0.18, 0.2);
    tone('sine', 110, t, 0.15, 0.3, { to: 60 });
  },
  pageTurn: () => {
    const t = now();
    noise(t, 0.22, 0.18, { freq: 2400, q: 0.8, to: 1200, attack: 0.05 });
  },
  streak: ({ n = 2 } = {}) => {
    const t = now();
    for (let i = 0; i < Math.min(5, n); i++) chime(midi(84 + i * 3), t + i * 0.04, 0.05, { decay: 0.5 });
  },
};

/** play('name', { pitch, kind, n, rank }) */
export const play = safe((name, opts = {}) => {
  const f = S[name];
  if (f) f(opts || {});
});

// ---------------------------------------------------------------- the hold

const hold = { on: false, page: '', osc: null, chime: null, gain: null, chimeGain: null, bed: null, bedGain: null, bedFilter: null, rumble: null, rumbleGain: null, next: 0, lastV: 0 };

/** Each page's sound while it's held: a noise bed (pour, breath, scrape) or events at a rate (bubbles, ticks, creaks). */
const BEDS = { milk: [700, 2, 0.16], spoon: [900, 0.7, 0.16], bowl: [380, 2.5, 0.14], cake: [3000, 4, 0.06], swing: [900, 1.2, 0.0], porridge: [300, 0.8, 0.05] };

export const holdSound = {
  start: safe((page) => {
    holdSound.stop();
    const t = now();
    hold.on = true;
    hold.page = page;
    hold.next = t;
    hold.lastV = 0;
    hold.osc = ctx.createOscillator();
    hold.osc.type = 'triangle';
    hold.gain = ctx.createGain();
    hold.gain.gain.setValueAtTime(0.0001, t);
    hold.gain.gain.exponentialRampToValueAtTime(0.06, t + 0.04);
    hold.osc.connect(hold.gain).connect(sfxBus);
    hold.chime = ctx.createOscillator();
    hold.chime.type = 'sine';
    hold.chimeGain = ctx.createGain();
    hold.chimeGain.gain.value = 0;
    hold.chime.connect(hold.chimeGain).connect(sfxBus);
    // A low rumble that grows with the gauge: the world straining.
    hold.rumble = ctx.createOscillator();
    hold.rumble.type = 'sine';
    hold.rumble.frequency.value = 48;
    hold.rumbleGain = ctx.createGain();
    hold.rumbleGain.gain.value = 0;
    hold.rumble.connect(hold.rumbleGain).connect(sfxBus);
    hold.osc.start(t);
    hold.chime.start(t);
    hold.rumble.start(t);
    const bed = BEDS[page];
    if (bed) {
      hold.bed = ctx.createBufferSource();
      hold.bed.buffer = noiseBuf;
      hold.bed.loop = true;
      hold.bedFilter = ctx.createBiquadFilter();
      hold.bedFilter.type = 'bandpass';
      hold.bedFilter.frequency.value = bed[0];
      hold.bedFilter.Q.value = bed[1];
      hold.bedGain = ctx.createGain();
      hold.bedGain.gain.setValueAtTime(0.0001, t);
      hold.bedGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, bed[2]), t + 0.08);
      hold.bed.connect(hold.bedFilter).connect(hold.bedGain).connect(sfxBus);
      hold.bed.start(t);
    }
  }),
  /** Every frame while held: v is what the gauge shows (the pitch is the gauge, even under fog). */
  update: safe((v, inBand, sp = 1, over = 0) => {
    if (!hold.on || !hold.osc) return;
    const t = ctx.currentTime;
    const f = 196 * 2 ** (2 * Math.max(0, Math.min(1, v)));
    hold.osc.frequency.setTargetAtTime(f, t, 0.012);
    hold.chime.frequency.setTargetAtTime(f * 2, t, 0.012);
    hold.chimeGain.gain.setTargetAtTime(inBand ? 0.05 : 0, t, 0.03);
    hold.rumbleGain.gain.setTargetAtTime(0.02 + 0.12 * v * v + over * 0.15, t, 0.05);
    hold.rumble.frequency.setTargetAtTime(44 + 30 * v, t, 0.05);
    const dv = Math.abs(v - hold.lastV);
    hold.lastV = v;
    if (hold.page === 'swing' && hold.bedGain) hold.bedGain.gain.setTargetAtTime(Math.min(0.3, dv * 12), t, 0.05);
    if (hold.page === 'milk' && hold.bedGain) hold.bedGain.gain.setTargetAtTime(0.1 + 0.08 * Math.sin(t * 44), t, 0.01);
    if (hold.page === 'porridge' && hold.bedFilter) hold.bedFilter.frequency.setTargetAtTime(300 + 900 * v, t, 0.05);
    if (t < hold.next) return;
    switch (hold.page) {
      case 'porridge':
        tone('sine', rnd(260, 640), t, 0.05, 0.05 + 0.1 * v, { to: rnd(600, 900), pan: rnd(-0.3, 0.3) });
        hold.next = t + 1 / (3 + 18 * v);
        break;
      case 'toast':
        noise(t, 0.025, 0.12, { freq: 3800, q: 5 });
        hold.next = t + 0.25 / sp;
        break;
      case 'chair':
        noise(t, 0.18, 0.06 + over * 0.2, { freq: 500 + 400 * v, q: 9 });
        hold.next = t + 0.42 / sp;
        break;
      case 'balloon':
        tone('sawtooth', 300 + 500 * v, t, 0.12, 0.03, { to: 330 + 520 * v });
        hold.next = t + 0.38 / sp;
        break;
      case 'jar':
        noise(t, 0.2, 0.06, { freq: 420, q: 12 });
        tone('square', 900, t, 0.02, 0.02);
        hold.next = t + 0.25 / sp;
        break;
      case 'bell':
        noise(t, 0.02, 0.15, { freq: 2600, q: 6 });
        hold.next = t + 0.06 + 0.12 * (1 - v);
        break;
      case 'bowls':
        tone('sine', rnd(300, 600), t, 0.05, 0.06, { to: rnd(700, 900) });
        hold.next = t + 1 / (4 + 14 * v);
        break;
      default:
        hold.next = t + 1;
    }
  }),
  stop: safe(() => {
    if (!hold.on) return;
    const t = ctx.currentTime;
    hold.on = false;
    for (const [node, g] of [
      [hold.osc, hold.gain],
      [hold.chime, hold.chimeGain],
      [hold.bed, hold.bedGain],
      [hold.rumble, hold.rumbleGain],
    ]) {
      if (!node || !g) continue;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0.0001, t, 0.02);
      node.stop(t + 0.15);
    }
    hold.osc = hold.chime = hold.bed = hold.rumble = null;
  }),
};

// ---------------------------------------------------------------- the music: a folk band in G that builds

// 8 bars of 2/4, sixteenth-note steps (8 a bar). Chords per bar, the bass's root and fifth, the melody in eighths (0 = rest),
// and a B section that comes in at intensity 2+.
const CHORDS_A = ['G', 'D', 'D', 'G', 'G', 'C', 'D', 'G'];
const CHORDS_B = ['C', 'G', 'D', 'G', 'C', 'G', 'D', 'G'];
const BASS = { G: [43, 50], D: [38, 45], C: [36, 43], Em: [40, 47] };
const STAB = { G: [55, 59, 62], D: [54, 57, 62], C: [55, 60, 64], Em: [55, 59, 64] };
const MEL_A = [67, 71, 74, 71, 72, 69, 66, 69, 72, 74, 76, 74, 71, 67, 67, 0, 71, 74, 79, 74, 76, 72, 69, 72, 74, 72, 71, 69, 67, 0, 67, 0];
const MEL_B = [76, 74, 72, 76, 79, 76, 74, 71, 74, 72, 71, 69, 71, 67, 71, 74, 76, 74, 72, 76, 79, 81, 79, 76, 74, 72, 71, 69, 67, 0, 67, 0];
const GLOCK = [79, 83, 86, 83, 81, 78, 74, 78, 83, 86, 88, 86, 83, 79, 83, 86];
const music = { mode: 'off', bpm: 104, step: 0, nextAt: 0, timer: 0, duck: false, level: 0, intensity: 0, section: 0 };

function scheduleStep(step, at) {
  const bar = Math.floor(step / 8) % 8;
  const s = step % 8;
  const B = music.section === 1;
  const chord = (B ? CHORDS_B : CHORDS_A)[bar];
  const play = music.mode === 'play';
  const I = play ? music.intensity : music.mode === 'title' ? 1 : 0;
  const spb = 60 / music.bpm / 4;
  // Bass: root and fifth.
  if (s === 0 || s === 4) {
    const n = BASS[chord][s === 0 ? 0 : 1];
    tone('square', midi(n), at, spb * 3, play ? 0.08 : 0.06, { dest: musicBus });
    tone('sine', midi(n), at, spb * 3.2, 0.18, { dest: musicBus });
    if (I >= 2) tone('sine', 60, at, 0.12, 0.22, { to: 40, dest: musicBus });
  }
  // The off-beat chord.
  if (s === 2 || s === 6) {
    for (const n of STAB[chord]) pluck(midi(n), at, play ? 0.065 : 0.055, { dest: musicBus, pan: -0.25 });
    if (I >= 1) noise(at, 0.04, 0.1, { freq: 2200, q: 3, dest: musicBus });
  }
  // Hats and claps.
  if (I >= 2) {
    if (s % 2 === 1) noise(at, 0.02, 0.035, { type: 'highpass', freq: 6000, dest: musicBus, pan: 0.3 });
    if (s === 4) noise(at, 0.06, 0.14, { freq: 1500, q: 1.2, dest: musicBus });
  }
  // The fiddle.
  if (I >= 1 && s % 2 === 0) {
    const mel = B ? MEL_B : MEL_A;
    const n = mel[((step % 64) / 2) | 0];
    if (n) {
      const o = tone('sawtooth', midi(n + 12), at, spb * 1.9, play ? 0.04 : 0.03, { attack: 0.02, dest: musicBus, pan: 0.15 });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.5;
      const lg = ctx.createGain();
      lg.gain.value = 9;
      lfo.connect(lg).connect(o.detune);
      lfo.start(at);
      lfo.stop(at + spb * 2);
      // Fever: the melody doubled an octave down on a reedy voice.
      if (I >= 3) tone('square', midi(n), at, spb * 1.8, 0.018, { attack: 0.02, dest: musicBus, pan: -0.2 });
    }
  }
  // The glockenspiel.
  if (I >= 2 && s % 4 === 0) {
    const n = GLOCK[((step % 64) / 4) | 0];
    chime(midi(n), at, I >= 3 ? 0.05 : 0.035, { dest: musicBus, decay: 0.7, pan: 0.4 });
  }
}

function pump() {
  try {
    if (!ctx || !started || music.mode === 'off') return;
    const ahead = ctx.currentTime + 0.15;
    if (music.nextAt < ctx.currentTime) music.nextAt = ctx.currentTime + 0.02;
    while (music.nextAt < ahead) {
      scheduleStep(music.step, music.nextAt);
      music.step = (music.step + 1) % 64;
      if (music.step === 0) music.section = music.intensity >= 2 && music.mode === 'play' ? 1 - music.section : 0;
      music.nextAt += 60 / music.bpm / 4;
    }
  } catch {}
}

function applyMusicLevel() {
  if (!ctx || !musicBus) return;
  const base = music.mode === 'play' ? 0.5 : music.mode === 'menu' || music.mode === 'title' ? 0.36 : 0;
  const level = base * (music.duck ? 0.4 : 1);
  musicBus.gain.setTargetAtTime(level, ctx.currentTime, music.duck ? 0.05 : 0.25);
}

export const musicCtl = {
  /** 'off' | 'title' | 'menu' (bass and plucks) | 'play' (the band) */
  set: safe((mode, bpm) => {
    if (bpm) music.bpm = Math.max(80, Math.min(170, bpm));
    if (mode === music.mode) return applyMusicLevel();
    music.mode = mode;
    if (!music.timer) music.timer = setInterval(pump, 25);
    applyMusicLevel();
  }),
  tempo: safe((bpm) => {
    music.bpm = Math.max(80, Math.min(170, bpm));
  }),
  /** 0 bass and plucks; 1 + fiddle; 2 + claps, glockenspiel and the B tune; 3 the whole band (a perfect streak). */
  intensity: safe((n) => {
    music.intensity = Math.max(0, Math.min(3, n | 0));
  }),
  /** Quieter while a page is held. */
  duck: safe((on) => {
    if (music.duck === on) return;
    music.duck = on;
    applyMusicLevel();
  }),
};
