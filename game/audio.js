// Every sound is made here with Web Audio: the holding tone (its pitch is the gauge, and it chimes inside the band), each page's
// own noises, the verdicts, the bears, and a folk-band polka from a small sequencer. The platform applies its volume and mute to
// the AudioContext by itself. Nothing here throws into the game.

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let noiseBuf = null;
let started = false;

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

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
      comp.threshold.value = -14;
      comp.ratio.value = 3;
      master.connect(comp).connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.8;
      sfxBus.connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(master);
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

// ---------------------------------------------------------------- building blocks

function tone(type, freq, at, dur, gain, { attack = 0.005, to = null, dest = sfxBus, detune = 0 } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + dur);
  o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + dur + 0.05);
  return o;
}

function noise(at, dur, gain, { type = 'bandpass', freq = 1000, q = 1, to = null, attack = 0.003, dest = sfxBus } = {}) {
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
  src.connect(f).connect(g).connect(dest);
  src.start(at, Math.random() * 1.5);
  src.stop(at + dur + 0.05);
}

/** A plucked string (Karplus-Strong-ish: a short noise burst through a comb). */
function pluckAt(freq, at, gain, dest = sfxBus) {
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = freq;
  const o2 = ctx.createOscillator();
  o2.type = 'square';
  o2.frequency.value = freq;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(freq * 6, at);
  f.frequency.exponentialRampToValueAtTime(freq * 1.5, at + 0.25);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  o.connect(f);
  o2.connect(g2).connect(f);
  f.connect(g).connect(dest);
  o.start(at);
  o2.start(at);
  o.stop(at + 0.5);
  o2.stop(at + 0.5);
}

const now = () => ctx.currentTime + 0.005;

// ---------------------------------------------------------------- one-shots

export const sfx = {
  click: safe(() => tone('sine', 1400, now(), 0.05, 0.12, { to: 900 })),
  tick: safe(() => noise(now(), 0.03, 0.18, { freq: 3200, q: 4 })),
  /** The stamp coming down. */
  stamp: safe(() => {
    const t = now();
    tone('sine', 150, t, 0.18, 0.55, { to: 55 });
    noise(t, 0.06, 0.4, { type: 'lowpass', freq: 1800 });
  }),
  /** A perfect. */
  ding: safe(() => {
    const t = now();
    tone('sine', midi(88), t, 0.9, 0.22);
    tone('sine', midi(95), t + 0.002, 0.7, 0.1);
    tone('triangle', midi(76), t, 0.4, 0.08);
  }),
  /** In the band. */
  good: safe(() => {
    const t = now();
    pluckAt(midi(74), t, 0.3);
    pluckAt(midi(79), t + 0.07, 0.25);
  }),
  /** A big miss: the sad trombone. */
  trombone: safe(() => {
    const t = now();
    const notes = [58, 57, 56, 55];
    notes.forEach((n, i) => {
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
      g.gain.exponentialRampToValueAtTime(0.16, at + 0.04);
      g.gain.setValueAtTime(0.16, at + dur - 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(f).connect(g).connect(sfxBus);
      o.start(at);
      lfo.start(at);
      o.stop(at + dur + 0.05);
      lfo.stop(at + dur + 0.05);
    });
  }),
  pop: safe(() => {
    const t = now();
    noise(t, 0.12, 0.9, { type: 'highpass', freq: 900 });
    tone('sine', 420, t, 0.12, 0.4, { to: 70 });
  }),
  crack: safe(() => {
    const t = now();
    noise(t, 0.09, 0.8, { type: 'bandpass', freq: 2400, q: 0.7 });
    noise(t + 0.05, 0.25, 0.5, { type: 'bandpass', freq: 900, q: 2, to: 300 });
    tone('sine', 110, t, 0.3, 0.5, { to: 40 });
  }),
  thud: safe(() => {
    const t = now();
    tone('sine', 120, t, 0.22, 0.6, { to: 45 });
    noise(t, 0.08, 0.3, { type: 'lowpass', freq: 600 });
  }),
  splash: safe(() => {
    const t = now();
    noise(t, 0.6, 0.6, { type: 'bandpass', freq: 1800, q: 0.6, to: 400 });
    noise(t + 0.05, 0.3, 0.3, { type: 'highpass', freq: 3000 });
  }),
  clink: safe(() => {
    const t = now();
    tone('sine', 2093, t, 0.25, 0.18);
    tone('sine', 3136, t + 0.01, 0.18, 0.08);
  }),
  smash: safe(() => {
    const t = now();
    noise(t, 0.4, 0.7, { type: 'highpass', freq: 2500 });
    for (let i = 0; i < 5; i++) tone('sine', 1800 + Math.random() * 2600, t + 0.03 + i * 0.04, 0.12, 0.08);
  }),
  /** The fair's bell. */
  bell: safe(() => {
    const t = now();
    [1, 2.76, 5.4, 8.93].forEach((m, i) => tone('sine', 523 * m, t, 1.6 / (i + 1), 0.22 / (i + 1)));
  }),
  boing: safe(() => {
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
  }),
  poof: safe(() => noise(now(), 0.35, 0.5, { type: 'lowpass', freq: 1400, to: 300 })),
  sizzle: safe(() => noise(now(), 0.7, 0.35, { type: 'highpass', freq: 4000, attack: 0.02 })),
  frost: safe(() => {
    const t = now();
    for (let i = 0; i < 6; i++) tone('sine', midi(96 + ((i * 5) % 12)), t + i * 0.05, 0.25, 0.06);
  }),
  scrape: safe(() => noise(now(), 0.25, 0.25, { freq: 3000, q: 3, to: 1500 })),
  chop: safe(() => {
    const t = now();
    tone('sine', 180, t, 0.12, 0.5, { to: 80 });
    noise(t, 0.05, 0.4, { freq: 1500 });
  }),
  whoosh: safe(() => noise(now(), 0.4, 0.4, { freq: 600, q: 1.5, to: 2400, attack: 0.08 })),
  step: safe((soft = 1) => {
    const t = now();
    tone('sine', 85, t, 0.12, 0.35 * soft, { to: 50 });
    noise(t, 0.05, 0.12 * soft, { type: 'lowpass', freq: 400 });
  }),
  /** A bear: 'papa' low, 'mama' middle, 'baby' high. */
  growl: safe((kind = 'papa') => {
    const t = now();
    const base = kind === 'baby' ? 190 : kind === 'mama' ? 120 : 75;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(base * 0.9, t);
    o.frequency.linearRampToValueAtTime(base * 1.15, t + 0.12);
    o.frequency.linearRampToValueAtTime(base * 0.8, t + 0.45);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 28;
    const lg = ctx.createGain();
    lg.gain.value = 0.35;
    const am = ctx.createGain();
    am.gain.value = 0.65;
    lfo.connect(lg).connect(am.gain);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = base * 6;
    f.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(f).connect(am).connect(g).connect(sfxBus);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.55);
    lfo.stop(t + 0.55);
    noise(t, 0.4, 0.12, { type: 'bandpass', freq: base * 4, q: 1.5 });
  }),
  /** A marker landing in the reveal (higher for the closer). */
  plink: safe((rank = 0) => tone('triangle', midi(67 + Math.min(12, rank * 2)), now(), 0.18, 0.16)),
  fanfare: safe(() => {
    const t = now();
    [67, 71, 74, 79].forEach((n, i) => {
      pluckAt(midi(n), t + i * 0.08, 0.3);
      tone('square', midi(n + 12), t + i * 0.08, 0.2, 0.04);
    });
  }),
  win: safe(() => {
    const t = now();
    [55, 59, 62, 67, 71, 74, 79].forEach((n, i) => pluckAt(midi(n), t + i * 0.06, 0.3));
    tone('sine', midi(91), t + 0.45, 1.2, 0.12);
  }),
};

// ---------------------------------------------------------------- the hold

const hold = { on: false, page: '', osc: null, chime: null, gain: null, chimeGain: null, bed: null, bedGain: null, bedFilter: null, next: 0, last: 0, lastV: 0 };

/** Each page's sound while it's held: a noise bed (pour, breath, scrape) or events at a rate (bubbles, ticks, creaks). */
const BEDS = { milk: [700, 2, 0.16], spoon: [900, 0.7, 0.18], bowl: [380, 2.5, 0.14], cake: [3000, 4, 0.06], swing: [900, 1.2, 0.0] };

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
    hold.gain.gain.exponentialRampToValueAtTime(0.07, t + 0.04);
    hold.osc.connect(hold.gain).connect(sfxBus);
    hold.chime = ctx.createOscillator();
    hold.chime.type = 'sine';
    hold.chimeGain = ctx.createGain();
    hold.chimeGain.gain.value = 0;
    hold.chime.connect(hold.chimeGain).connect(sfxBus);
    hold.osc.start(t);
    hold.chime.start(t);
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
  update: safe((v, inBand, sp = 1) => {
    if (!hold.on || !hold.osc) return;
    const t = ctx.currentTime;
    const f = 196 * 2 ** (2 * Math.max(0, Math.min(1, v)));
    hold.osc.frequency.setTargetAtTime(f, t, 0.012);
    hold.chime.frequency.setTargetAtTime(f * 2, t, 0.012);
    hold.chimeGain.gain.setTargetAtTime(inBand ? 0.05 : 0, t, 0.03);
    const dv = Math.abs(v - hold.lastV);
    hold.lastV = v;
    if (hold.page === 'swing' && hold.bedGain) hold.bedGain.gain.setTargetAtTime(Math.min(0.3, dv * 12), t, 0.05);
    if (hold.page === 'milk' && hold.bedGain) hold.bedGain.gain.setTargetAtTime(0.1 + 0.08 * Math.sin(t * 44), t, 0.01);
    if (t < hold.next) return;
    switch (hold.page) {
      case 'porridge': {
        tone('sine', 260 + Math.random() * 380, t, 0.05, 0.05 + 0.1 * v, { to: 600 + Math.random() * 300 });
        hold.next = t + 1 / (3 + 16 * v);
        break;
      }
      case 'toast':
        noise(t, 0.025, 0.12, { freq: 3800, q: 5 });
        hold.next = t + 0.25 / sp;
        break;
      case 'chair':
        noise(t, 0.18, 0.08, { freq: 500 + 400 * v, q: 9 });
        hold.next = t + 0.42 / sp;
        break;
      case 'pillow':
        tone('sine', 90, t, 0.16, 0.3, { to: 55 });
        noise(t, 0.12, 0.15, { type: 'lowpass', freq: 500 });
        hold.next = t + 0.4 / sp;
        break;
      case 'balloon':
        tone('sawtooth', 300 + 500 * v, t, 0.12, 0.03, { to: 330 + 520 * v });
        hold.next = t + 0.3 / sp;
        break;
      case 'jar':
        noise(t, 0.25, 0.05, { freq: 420, q: 12 });
        hold.next = t + 1 / sp;
        break;
      case 'bell':
        noise(t, 0.02, 0.15, { freq: 2600, q: 6 });
        hold.next = t + 0.06 + 0.12 * (1 - v);
        break;
      default:
        hold.next = t + 1;
    }
  }),
  stop: safe(() => {
    if (!hold.on) return;
    const t = ctx.currentTime;
    hold.on = false;
    for (const [node, g] of [[hold.osc, hold.gain], [hold.chime, hold.chimeGain], [hold.bed, hold.bedGain]]) {
      if (!node || !g) continue;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0.0001, t, 0.02);
      node.stop(t + 0.15);
    }
    hold.osc = hold.chime = hold.bed = null;
  }),
};

// ---------------------------------------------------------------- the music: a folk polka in G

// 8 bars of 2/4, sixteenth-note steps (8 a bar). Chords per bar, the bass's root and fifth, the melody in eighths (0 = rest).
const CHORDS = ['G', 'D', 'D', 'G', 'G', 'C', 'D', 'G'];
const BASS = { G: [43, 50], D: [38, 45], C: [36, 43] };
const STAB = { G: [55, 59, 62], D: [54, 57, 62], C: [55, 60, 64] };
const MELODY = [67, 71, 74, 71, 72, 69, 66, 69, 72, 74, 76, 74, 71, 67, 67, 0, 71, 74, 79, 74, 76, 72, 69, 72, 74, 72, 71, 69, 67, 0, 67, 0];
const music = { mode: 'off', bpm: 104, step: 0, nextAt: 0, timer: 0, duck: false, level: 0 };

function scheduleStep(step, at) {
  const bar = Math.floor(step / 8) % 8;
  const s = step % 8;
  const chord = CHORDS[bar];
  const play = music.mode === 'play';
  const spb = 60 / music.bpm / 4;
  if (s === 0 || s === 4) {
    const n = BASS[chord][s === 0 ? 0 : 1];
    tone('square', midi(n), at, spb * 3, play ? 0.09 : 0.07, { dest: musicBus });
    tone('sine', midi(n), at, spb * 3.2, 0.18, { dest: musicBus });
  }
  if (s === 2 || s === 6) {
    for (const n of STAB[chord]) pluckAt(midi(n), at, play ? 0.07 : 0.06, musicBus);
    if (play) noise(at, 0.04, 0.12, { freq: 2200, q: 3, dest: musicBus });
  }
  if (play) {
    if (s % 2 === 1) noise(at, 0.02, 0.035, { type: 'highpass', freq: 6000, dest: musicBus });
    if (s % 2 === 0) {
      const n = MELODY[((step % 64) / 2) | 0];
      if (n) {
        const o = tone('sawtooth', midi(n + 12), at, spb * 1.9, 0.045, { attack: 0.02, dest: musicBus });
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.5;
        const lg = ctx.createGain();
        lg.gain.value = 9;
        lfo.connect(lg).connect(o.detune);
        lfo.start(at);
        lfo.stop(at + spb * 2);
      }
    }
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
      music.nextAt += 60 / music.bpm / 4;
    }
  } catch {}
}

function applyMusicLevel() {
  if (!ctx || !musicBus) return;
  const base = music.mode === 'play' ? 0.55 : music.mode === 'menu' ? 0.38 : 0;
  const level = base * (music.duck ? 0.35 : 1);
  musicBus.gain.setTargetAtTime(level, ctx.currentTime, music.duck ? 0.05 : 0.25);
}

export const musicCtl = {
  /** 'off' | 'menu' (bass and plucks) | 'play' (the band) */
  set: safe((mode, bpm) => {
    if (bpm) music.bpm = Math.max(80, Math.min(160, bpm));
    if (mode === music.mode) return applyMusicLevel();
    music.mode = mode;
    if (!music.timer) music.timer = setInterval(pump, 25);
    applyMusicLevel();
  }),
  tempo: safe((bpm) => {
    music.bpm = Math.max(80, Math.min(160, bpm));
  }),
  /** Quieter while a page is held. */
  duck: safe((on) => {
    if (music.duck === on) return;
    music.duck = on;
    applyMusicLevel();
  }),
};
