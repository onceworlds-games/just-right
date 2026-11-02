// Just Right: boot (join the room first), then the flow between the title, the bears' table (the lobby), Before the Bears,
// the daily, the Storybook, the Wardrobe and a story played together; input timed from the events themselves; the frame loop.
import { createGfx } from './gfx/renderer.js';
import { loadAssets } from './gfx/assets.js';
import { createWorld } from './play/world.js';
import { createUi, commas, ordinal } from './ui/ui.js';
import { startAudio, setSuspended, play as sfx, holdSound, musicCtl } from './audio/audio.js';
import { readPage, inBand, verdictWord, TWIST_CARD, PAGES, PAGE_IDS, pageOf, finalValue } from './core/pages.js';
import { dailyPlan, practicePage, DAILY_PAGES, MATCH_LENGTHS } from './core/plan.js';
import { planHold, AUTOPLAY, FOLK } from './core/brain.js';
import { createStage } from './core/stage.js';
import { createOnline, JOIN_OPTIONS, INTRO_MS, pagesSetting } from './core/net.js';
import { createRunState, BOSS_BOWLS } from './core/run.js';
import { charmOf } from './core/charms.js';
import { cleanProfile, rankOf, RANKS, SHOP, itemOf, canBuy, buy, wear, addXp, honeyFor, starsFor, dailyPlayed } from './core/progress.js';
import { tasksFor, advance as advanceTask } from './core/tasks.js';
import { hash } from './core/rng.js';
import { CHARACTERS, FOLK_LOOKS } from './gfx/palette.js';
import { HATS } from './world/hats.js';

const params = new URLSearchParams(location.search);

async function importHelpers() {
  try {
    const at = (f) => `/__onceworlds/v1/${f}.js`;
    const [m, h, b] = await Promise.all([import(/* @vite-ignore */ at('match')), import(/* @vite-ignore */ at('host')), import(/* @vite-ignore */ at('bots'))]);
    return { createMatch: m.createMatch, createHost: h.createHost, createBots: b.createBots, t: h.t };
  } catch {
    return null;
  }
}
const withTimeout = (p, ms, fallback = null) => Promise.race([Promise.resolve(p).catch(() => fallback), new Promise((r) => setTimeout(() => r(fallback), ms))]);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

/** Stamp inks for the verdicts (a perfect wears the player's own ink). */
const INK = { good: '#3E7A34', under: '#2B5FA8', over: '#C8442F', pop: '#C8442F', asleep: '#1D2440' };
/** Seat colours for faces that have no picture yet. */
const SEAT_COLORS = ['#C8442F', '#2f4f8f', '#3E7A34', '#7B3A78', '#D98E12', '#2b6f74', '#6E4127', '#5FA8D8'];
/** How long after the verdict the page's own moment lands (the jar on the stack, the bell, the splash) (ms). */
const LAND = { jar: 380, bell: 350, swing: 620, bowl: 500, milk: 300 };

export async function boot() {
  const posterName = params.get('poster');
  const ow = posterName ? null : window.onceworlds || null;
  // Join first, before anything is built, so a reload keeps its seat.
  const joinRoom = () => {
    try {
      return ow && ow.rooms && ow.rooms.join ? Promise.resolve(ow.rooms.join(JOIN_OPTIONS)).catch(() => null) : Promise.resolve(null);
    } catch {
      return Promise.resolve(null);
    }
  };
  const joining = joinRoom();
  const helpersP = ow ? importHelpers() : Promise.resolve(null);

  const cv = document.getElementById('cv');
  const gfx = createGfx(cv, { poster: !!posterName });
  const pixelRatio = () => {
    if (posterName) return 1;
    try {
      if (ow?.settings?.pixelRatio) return Math.max(0.5, ow.settings.pixelRatio(2));
    } catch {}
    return Math.min(2, window.devicePixelRatio || 1);
  };
  const size = () => gfx.resize(window.innerWidth, window.innerHeight, pixelRatio());
  size();
  const qualityNow = () => {
    let q = params.get('quality');
    if (!q) {
      try {
        q = ow?.settings?.quality;
      } catch {}
    }
    return q || 'high';
  };
  gfx.setQuality(qualityNow());

  if (posterName) {
    window.addEventListener('resize', size);
    const assets = await loadAssets('./models/');
    if (posterName.startsWith('dev')) {
      const { devScene } = await import('./dev/dev.js');
      await devScene(posterName, gfx, assets);
      return;
    }
    const { storePoster } = await import('./dev/posters.js');
    await storePoster(posterName, gfx, assets);
    return;
  }
  await game({ ow, gfx, size, joinRoom, joining, helpersP, qualityNow });
}

async function game({ ow, gfx, size, joinRoom, joining, helpersP, qualityNow }) {
  // Capture aids, only on a local platform (never on onceworlds.com, where they would play for a leaderboard):
  // ?autoplay=1: a skilled hand plays for this player (pictures and the trailer); ?solo=run|daily plays that instead of a
  // story; ?clumsy=1 a careless hand; ?autoplay-to=lobby stops at the table; ?from=<page> starts a run there; ?short=<n> a
  // story of n pages.
  const localDev = /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/.test(location.hostname);
  const dev = (k) => (localDev ? params.get(k) : null);
  const autoplay = dev('autoplay') === '1';
  const autoSolo = dev('solo');
  const AUTO = dev('clumsy') === '1' ? { skill: 0.3, bias: 380, press: [0.3, 0.6], blunder: 0 } : AUTOPLAY;
  const autoTo = dev('autoplay-to');
  const runFrom = Math.max(1, Math.min(60, Math.floor(Number(dev('from')) || 1)));
  const shortStory = Math.max(0, Math.min(16, Math.floor(Number(dev('short')) || 0)));

  const reduced = () => {
    try {
      return !!ow?.settings?.reducedMotion;
    } catch {
      return false;
    }
  };
  const touchish = () => {
    try {
      return !!ow?.controls?.touch || matchMedia('(pointer: coarse)').matches;
    } catch {
      return false;
    }
  };
  let lastInputTouch = touchish();
  const ui = createUi(document.getElementById('ui'), { reduced, sound: (n) => sfx(n) });
  ui.title({ loading: 0 });
  ui.show('title');
  try {
    ow?.controls?.set?.(null);
    ow?.ui?.setLook?.({ accent: '#C8442F', panel: '#F3E3C3', text: '#1D2440' });
  } catch {}

  const assets = await loadAssets('./models/', (k) => ui.title({ loading: Math.min(0.95, k) }));
  const world = createWorld(gfx, assets, { sound: (n, o) => sfx(n, o), reduced });
  world.setQuality(gfx.quality);
  const stage = createStage();

  // ---------------------------------------------------------------- saved progress
  let profile = cleanProfile(null);
  let saveTimer = 0;
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        ow?.save?.set?.('profile', profile)?.catch?.(() => {});
      } catch {}
    }, 1000);
  }
  const awarded = new Set();
  function award(id) {
    if (awarded.has(id)) return;
    awarded.add(id);
    try {
      ow?.badges?.award?.(id)?.catch?.(() => {});
    } catch {}
  }
  function submit(board, value) {
    if (!(value > 0)) return;
    try {
      ow?.leaderboards?.submit?.(board, value)?.catch?.(() => {});
    } catch {}
  }
  const gameData = () => {
    try {
      return ow?.data?.game ?? null;
    } catch {
      return null;
    }
  };
  function dayNumber() {
    let t = Date.now();
    try {
      if (ow?.now) t = ow.now();
    } catch {}
    return Math.floor(t / 86400000);
  }
  const inkColor = () => itemOf('ink', profile.wear.ink)?.color ?? '#C8442F';

  // Honey and points, banked into the profile with the toasts that go with them.
  function bank(points, honey) {
    profile.honey = Math.min(1e7, profile.honey + Math.max(0, Math.round(honey)));
    const { before, after: now } = addXp(profile, points);
    if (now > before) {
      later(900, () => {
        sfx('rankUp');
        ui.toast({ icon: ui.icons.medal(now), text: RANKS[now].name, sub: 'New rank' });
      });
      if (now >= 6) award('cottage-regular');
    }
    saveSoon();
  }

  // ---------------------------------------------------------------- the day's honey jobs
  let tasks = [];
  function ensureTasks() {
    const day = dayNumber();
    if (profile.tasks.day !== day) profile.tasks = { day, done: {}, n: {} };
    if (!tasks.length || tasks.day !== day) {
      tasks = tasksFor(day);
      tasks.day = day;
    }
  }
  function taskEvent(ev) {
    ensureTasks();
    tasks.forEach((t, i) => {
      const k = String(i);
      if (profile.tasks.done[k]) return;
      const n = advanceTask(t, profile.tasks.n[k] ?? 0, ev);
      profile.tasks.n[k] = n;
      if (n >= t.n) {
        profile.tasks.done[k] = 1;
        profile.honey += t.honey;
        later(600 + i * 400, () => {
          sfx('charm');
          ui.toast({ icon: ui.icons.drop(), text: t.text, sub: `+${t.honey} honey` });
        });
      }
    });
    saveSoon();
  }

  // ---------------------------------------------------------------- faces
  const faceUrl = (key) => `./faces/${key}.jpg`;
  const avatars = new Map();
  function avatarOf(id) {
    if (!id || !ow?.player?.avatarUrl) return null;
    if (!avatars.has(id)) {
      avatars.set(id, null);
      try {
        Promise.resolve(ow.player.avatarUrl(id, 'head'))
          .then((u) => typeof u === 'string' && avatars.set(id, u))
          .catch(() => {});
      } catch {}
    }
    return avatars.get(id);
  }
  /** A player's look from their presence (untrusted: only known characters and hats). */
  function lookOf(id) {
    const pr = room?.players?.get?.(id)?.presence;
    const c = pr && typeof pr === 'object' && typeof pr.c === 'string' && Object.hasOwn(CHARACTERS, pr.c) ? pr.c : 'goldi';
    const h = pr && typeof pr === 'object' && typeof pr.h === 'string' && Object.hasOwn(HATS, pr.h) && pr.h !== 'flower' ? pr.h : '';
    return { char: c, hat: h };
  }
  const charDef = (id) => ({ ...(CHARACTERS[id] ?? CHARACTERS.goldi), key: id });
  const folkDef = (name) => ({ ...(FOLK_LOOKS[name] ?? FOLK_LOOKS.Ottoline), key: name });
  /** A seat's face for the HUD's heads and the standings: the platform's avatar for people, the portrait for the folk. */
  function seatFace(seat) {
    if (seat.bot) return { img: faceUrl(seat.name), color: '#8a6a4a' };
    if (seat.me) return { img: avatarOf(seat.id) ?? faceUrl(profile.wear.char), color: '#C8442F' };
    return { img: avatarOf(seat.id) ?? faceUrl(lookOf(seat.id).char), color: SEAT_COLORS[hash(String(seat.id)) % SEAT_COLORS.length] };
  }
  const seatPortrait = (seat) => (seat.bot ? faceUrl(seat.name) : seat.me ? faceUrl(profile.wear.char) : faceUrl(lookOf(seat.id).char));

  // ---------------------------------------------------------------- the room
  let room = null;
  let online = null;
  let helpers = null;
  let closed = null;

  // ---------------------------------------------------------------- state
  /** 'title' | 'lobby' | 'local' | 'pick' | 'runOver' | 'dailyOver' | 'book' | 'wardrobe' */
  let screen = 'title';
  let screenAt = performance.now();
  let local = null;
  let paused = false;
  let pausedAt = 0;
  /** The page on screen. */
  let pc = null;
  const timers = [];
  const later = (ms, fn) => timers.push({ at: performance.now() + ms, fn });
  const setScreen = (s) => {
    screen = s;
    screenAt = performance.now();
  };
  let streakNow = 0;
  let golden = 0;
  let wardTab = 'char';
  let tryOn = null;

  // ---------------------------------------------------------------- pages
  function beginPage(kind, P, key, playAt, { glide = 1.0 } = {}) {
    holdSound.stop();
    musicCtl.duck(false);
    stage.begin(P, key, playAt);
    pc = { kind, P, key, playAt, beganAt: performance.now(), result: null, verdictAt: 0, verdictV: 0, auto: null, metBefore: profile.met[P.g] ?? 0, marked: false, info: null, ticked: false };
    world.showPage(P, { glide });
    ui.clearStamps();
    sfx('whoosh', { pitch: 0.8 });
    if (P.bo === 1) later(250, () => sfx('boss'));
  }

  function playState(now) {
    if (!pc) return null;
    const P = pc.P;
    let ghost = null;
    if (local?.kind === 'run' && local.run.effects().ghost && P.page.lag && stage.holding) ghost = finalValue(P, stage.held(now));
    return {
      v: stage.value(now),
      c: stage.band(now),
      w: P.w,
      holding: stage.holding,
      pressed: stage.pressAt !== null,
      released: stage.released,
      k: pc.result ? pc.result.k : null,
      since: pc.result ? Math.max(0, world.vclock - pc.verdictV) : -1,
      sp: P.sp,
      P,
      ghost,
      hold: stage.held(now),
    };
  }

  function onPress() {
    if (!pc) return;
    holdSound.start(pc.P.g);
    musicCtl.duck(true);
    sfx('click');
  }

  function onVerdict(r, now) {
    if (!pc || pc.result) return;
    pc.result = r;
    pc.verdictAt = now;
    pc.verdictV = world.vclock;
    holdSound.stop();
    musicCtl.duck(false);
    const P = pc.P;
    const kind = pc.kind;
    try {
      world.stationFor(P).verdict(r, playState(now));
      // Her face says it too: smiling eyes for the green, screwed shut for a miss, asleep if she never pressed.
      world.me.feel(r.k === 'perfect' ? 'happy' : inBand(r.k) ? 'happy' : r.k === 'asleep' ? 'shut' : 'ouch', r.k === 'perfect' ? 1.6 : inBand(r.k) ? 0.8 : 1.2);
    } catch (e) {
      console.error(e);
    }
    const k = r.k;
    const streakBefore = streakNow;
    if (kind !== 'practice') {
      streakNow = k === 'perfect' ? streakNow + 1 : 0;
      if (streakNow >= 5) award('perfect-streak');
      if (streakNow > profile.bestStreak) {
        profile.bestStreak = streakNow;
        submit('perfect-streak', streakNow);
      }
      if (streakNow >= 2) taskEvent({ e: 'streak', n: streakNow });
    }
    // What it's worth here.
    let info = { pts: r.s, mult: 1 };
    if (kind === 'match') info = { pts: r.s * (P.x2 ? 2 : 1), mult: P.x2 ? 2 : 1 };
    else if (kind === 'run' && local) info = local.run.verdict(r) ?? info;
    else if (kind === 'daily' && local) local.score += r.s;
    pc.info = info;
    if (local && kind !== 'practice') local.marks.push(k === 'perfect' ? 'p' : inBand(k) ? 'g' : 'm');
    if (kind === 'match') {
      matchMarks[online.match.round - 1] = k === 'perfect' ? 'p' : inBand(k) ? 'g' : 'm';
      if (k === 'perfect') matchPerfects++;
    }
    // The stamp, when the page's own moment lands.
    later(LAND[P.g] ?? 60, () => stampVerdict(P, r, info, streakBefore, kind));
    // Progress that counts everywhere.
    profile.met[P.g] = (profile.met[P.g] ?? 0) + 1;
    if (PAGE_IDS.every((id) => profile.met[id] > 0)) award('every-story');
    if (k === 'perfect') {
      profile.perfects++;
      award('just-right');
      if (P.g === 'porridge') {
        profile.porridgePerfects++;
        if (profile.porridgePerfects >= 10) award('porridge-pro');
      }
    }
    if (P.g === 'porridge' && k === 'over') award('too-hot');
    if (P.g === 'chair' && k === 'over') award('broke-the-chair');
    if (inBand(k) && !profile.letGo) profile.letGo = 1;
    taskEvent({ e: 'verdict', g: P.g, k, v: r.v });
    if (kind === 'match') sendMark();
    else localVerdict(r, info);
    saveSoon();
  }

  function stampVerdict(P, r, info, streakBefore, kind) {
    const k = r.k;
    const perfect = k === 'perfect';
    const word = verdictWord(P, k, r.v);
    const color = perfect ? inkColor() : INK[k] ?? INK.over;
    const far = !inBand(k) && k !== 'asleep' && r.d > P.w + 0.08;
    ui.stamp(word, {
      color,
      y: 0.27,
      size: word.length > 10 ? 'mid' : 'big',
      onLand: () => {
        if (perfect) {
          sfx('stamp');
          sfx('ding');
          if (streakNow >= 2) sfx('streak', { n: streakNow });
          world.hitstop(streakNow >= 3 ? 130 : 90);
          world.punch(streakNow >= 3 ? 0.07 : 0.045);
          if (streakNow >= 3) world.slowmo(0.45, 0.55);
        } else if (k === 'good') {
          sfx('stamp');
          sfx('good');
          world.hitstop(50);
        } else if (k === 'asleep') sfx('poof');
        else {
          sfx('stamp');
          sfx(far ? 'trombone' : 'miss');
          world.shake(far ? 0.3 : 0.18);
        }
      },
    });
    const pts = info?.pts ?? r.s;
    if (k !== 'asleep' && pts > 0) later(160, () => ui.float(`+${commas(pts)}`, { y: 0.4, perfect, sub: info?.mult > 1 ? `×${info.mult}` : '' }));
    if (kind === 'run' && info?.honey > 0) later(380, () => ui.honeyFly(info.honey, { x: 0.5, y: 0.4 }, (i) => i % 2 === 0 && sfx('honey', { n: i })));
    // A perfect streak washes the picture in honey.
    golden = perfect ? Math.min(1, (streakBefore + 1) / 5) : 0;
    if (kind === 'run' && local) {
      const st = local.run.state;
      musicCtl.intensity(st.bowl ? 3 : streakNow >= 5 ? 3 : streakNow >= 3 ? 2 : st.n > 3 ? 1 : 0);
    }
  }

  function sendMark() {
    if (!online || !pc || pc.marked || stage.h === null) return;
    pc.marked = true;
    try {
      online.mark({ r: online.match.round, h: clamp(stage.h, 0, 20000), t: clamp(stage.t, 0, 30000) });
    } catch {}
  }

  // ---------------------------------------------------------------- local activities
  function startLocal(kind, opts = {}) {
    if (room && online) {
      try {
        room.setReady(false);
      } catch {}
    }
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    ensureTasks();
    local = {
      kind,
      seed,
      index: 0,
      go: 0,
      score: 0,
      marks: [],
      pageId: opts.pageId ?? null,
      run: kind === 'run' ? createRunState(seed, { rank: rankOf(profile.xp).i, from: autoplay ? runFrom : 1 }) : null,
      plan: kind === 'daily' ? dailyPlan(dayNumber()) : null,
      lastScore: null,
    };
    streakNow = 0;
    golden = 0;
    paused = false;
    world.setBearsHome(0);
    setScreen('local');
    musicCtl.set('play', 112);
    musicCtl.intensity(0);
    sfx('pageTurn');
    nextLocalPage(true);
  }

  function nextLocalPage(first = false) {
    if (!local) return;
    let raw;
    if (local.kind === 'run') raw = local.run.page();
    else if (local.kind === 'daily') raw = local.plan[local.index];
    else if (local.kind === 'practice') raw = practicePage(local.pageId, local.go);
    const P = readPage(raw);
    if (!P) return;
    const intro = P.bo > 1 ? 650 : local.kind === 'practice' && local.go > 0 ? 650 : 1150;
    beginPage(local.kind, P, `${local.kind}:${local.seed}:${local.index}:${local.go}:${P.bo}`, performance.now() + intro, { glide: first ? 1.3 : P.bo > 1 ? 0.4 : 1.0 });
    if (local.kind === 'run') {
      const st = local.run.state;
      musicCtl.tempo(112 + Math.min(30, st.cleared * 1.1));
      if (P.bo === 1) musicCtl.intensity(3);
    }
  }

  function localVerdict(r, info) {
    if (!local) return;
    if (local.kind === 'run') {
      const st = local.run.state;
      const land = LAND[pc.P.g] ?? 60;
      if (info.bear) later(land + 500, () => world.setBearsHome(st.home, { burst: true }));
      if (info.shieldUsed)
        later(land + 450, () => {
          sfx('cushion');
          ui.stamp('PILLOW SAVE', { color: '#2B5FA8', size: 'mid', y: 0.52, rot: 4, life: 1200 });
        });
      if (info.bossDone === true) {
        profile.bosses++;
        later(900, () => {
          sfx('fanfare');
          ui.stamp('BOWLS BEATEN!', { color: '#B8892B', size: 'mid', y: 0.52, rot: -3, life: 1800 });
          world.punch(0.06);
        });
        award('three-bowls');
        taskEvent({ e: 'boss' });
      }
      if (info.over) later(1100, () => ui.stamp('BEARS HOME!', { color: '#6E4127', size: 'mid', y: 0.52, rot: 3, life: 1500, onLand: () => sfx('growl', { kind: 'papa' }) }));
    } else if (local.kind === 'practice') {
      const stars = starsFor(r.k, r.s);
      const had = profile.stars[local.pageId] ?? 0;
      if (stars > had) {
        profile.stars[local.pageId] = stars;
        const honey = (stars - had) * 10;
        profile.honey += honey;
        later(700, () => {
          sfx('newBest');
          ui.toast({ icon: ui.icons.star(true), text: `${pageOf(local.pageId).name}: ${stars} star${stars > 1 ? 's' : ''}`, sub: `+${honey} honey` });
        });
      }
      local.lastScore = r.s;
    }
  }

  function localNext(now) {
    if (!local || !pc || !pc.result) return;
    const miss = !inBand(pc.result.k);
    let wait = 1350;
    if (local.kind === 'run') {
      const st = local.run.state;
      if (st.over) wait = 2700;
      else if (pc.P.bo && st.bowl > 1) wait = miss ? 1500 : 950;
      else if (pc.info?.bossDone !== null && pc.info?.bossDone !== undefined) wait = 2300;
      else if (miss) wait = 2000;
    }
    if (pc.P.g === 'swing' || pc.P.g === 'bowl') wait += 300;
    if (now - pc.verdictAt < wait) return;
    if (local.kind === 'run') {
      const st = local.run.state;
      if (st.over) return finishRun();
      if (st.offer) return openPick();
    }
    if (local.kind === 'daily' && local.index + 1 >= DAILY_PAGES) return finishDaily();
    if (local.kind === 'practice') local.go++;
    else local.index++;
    nextLocalPage();
  }

  // The bears' cupboard: three charms every five pages.
  function openPick() {
    const st = local.run.state;
    const offer = st.offer.map((id) => {
      const c = charmOf(id);
      return { id, name: c.name, text: c.text, risky: !!c.risky, fresh: !profile.seenCharms.includes(id) };
    });
    for (const o of offer) if (o.fresh) profile.seenCharms.push(o.id);
    setScreen('pick');
    pc = null;
    stage.begin(null, '', 0);
    sfx('pageTurn');
    later(200, () => sfx('charm'));
    ui.reset('pick');
    ui.pick({ offer, sub: `Page ${st.n - 1} cleared`, onPick: takeCharm });
  }
  function takeCharm(id) {
    if (screen !== 'pick' || !local) return;
    local.run.pick(id);
    sfx('buy');
    world.setBearsHome(local.run.state.home);
    setScreen('local');
    local.index++;
    nextLocalPage();
  }

  let lastOver = null;
  function finishRun() {
    const st = local.run.state;
    const score = st.score;
    const newBest = score > profile.bestRun && score > 0;
    profile.bestRun = Math.max(profile.bestRun, score);
    profile.bestPages = Math.max(profile.bestPages, st.played);
    submit('before-the-bears', score);
    if (score >= 2500) award('before-the-bears');
    taskEvent({ e: 'run', pages: st.played });
    woodsAdd(st.perfects);
    bank(score, st.honey);
    const r = rankOf(profile.xp);
    lastOver = {
      kind: 'run',
      title: 'The bears are home',
      score,
      stats: [
        [String(st.played), 'Pages'],
        [`×${Math.min(8, 1 + st.bestStreak)}`, 'Best streak'],
        [commas(profile.bestRun), 'Best'],
      ],
      honey: st.honey,
      rank: { name: r.name, xp: r.xp, next: r.next, k: r.k },
      newBest,
      board: [],
      touch: lastInputTouch,
      onAgain: () => startLocal('run'),
      onLobby: toLobby,
    };
    endLocal();
    setScreen('runOver');
    musicCtl.set('menu', 100);
    later(300, () => sfx(newBest ? 'newBest' : 'pageTurn'));
    ui.over(lastOver);
    fetchBoard('before-the-bears');
  }

  function finishDaily() {
    const day = dayNumber();
    const score = local.score;
    const perfects = local.marks.filter((m) => m === 'p').length;
    const streak = dailyPlayed(profile, day, score);
    award('daily-porridge');
    taskEvent({ e: 'daily' });
    woodsAdd(perfects);
    const honey = honeyFor(score, perfects);
    bank(score, honey);
    const r = rankOf(profile.xp);
    lastOver = {
      kind: 'daily',
      title: 'Daily Porridge',
      score,
      stats: [
        [String(perfects), 'Perfects'],
        [commas(profile.daily.best), 'Today’s best'],
        [String(streak), 'Day streak'],
      ],
      honey,
      rank: { name: r.name, xp: r.xp, next: r.next, k: r.k },
      newBest: false,
      board: [],
      touch: lastInputTouch,
      onAgain: () => startLocal('daily'),
      onLobby: toLobby,
    };
    endLocal();
    setScreen('dailyOver');
    musicCtl.set('menu', 100);
    ui.over(lastOver);
    // Today's board: every daily score in the woods.
    const gd = gameData();
    if (!gd) return;
    Promise.resolve()
      .then(() => gd.push?.('daily', { d: day, s: score }))
      .catch(() => null)
      .then(() => gd.get?.('daily'))
      .then((list) => {
        if (!Array.isArray(list) || !lastOver || lastOver.kind !== 'daily' || screen !== 'dailyOver') return;
        const best = new Map();
        for (const it of list) {
          const v = it?.value;
          if (!v || typeof v !== 'object' || v.d !== day || !Number.isFinite(v.s)) continue;
          const who = String(it.by?.id ?? it.by?.name ?? '?');
          const prev = best.get(who);
          if (!prev || v.s > prev.score) best.set(who, { name: String(it.by?.name ?? 'Someone').slice(0, 24), score: clamp(Math.round(v.s), 0, 2000), me: !!(room?.me && it.by?.id === room.me.id) });
        }
        const rows = [...best.values()].sort((a, b) => b.score - a.score).slice(0, 5).map((x, i) => ({ ...x, n: i + 1 }));
        if (rows.length) ui.over({ ...lastOver, board: rows });
      })
      .catch(() => {});
  }

  function fetchBoard(id) {
    try {
      Promise.resolve(ow?.leaderboards?.top?.(id, { limit: 5 }))
        .then((res) => {
          const list = Array.isArray(res?.entries) ? res.entries : [];
          if (!list.length || !lastOver || screen !== 'runOver') return;
          const rows = list.slice(0, 5).map((e, i) => ({
            n: Number.isFinite(e.rank) ? e.rank : i + 1,
            name: String(e.name ?? e.player?.name ?? 'Someone').slice(0, 24),
            score: Number(e.value ?? e.score ?? 0) || 0,
            me: !!(e.me || (res.me && e.rank === res.me.rank && e.value === res.me.value)),
          }));
          ui.over({ ...lastOver, board: rows });
        })
        .catch(() => {});
    } catch {}
  }

  // Perfects in the woods today: everyone's, on one shared counter.
  let woods = 0;
  let woodsAt = -1e9;
  function woodsAdd(n) {
    const gd = gameData();
    if (!gd || !(n > 0)) return;
    try {
      Promise.resolve(gd.add?.('woods', clamp(Math.round(n), 1, 20)))
        .then((v) => Number.isFinite(v) && (woods = v))
        .catch(() => {});
    } catch {}
  }
  function woodsRefresh() {
    const gd = gameData();
    if (!gd || performance.now() - woodsAt < 30000) return;
    woodsAt = performance.now();
    try {
      Promise.resolve(gd.get?.('woods'))
        .then((v) => Number.isFinite(v) && (woods = v))
        .catch(() => {});
    } catch {}
  }

  function endLocal() {
    local = null;
    pc = null;
    paused = false;
    holdSound.stop();
    musicCtl.duck(false);
    musicCtl.intensity(0);
    stage.begin(null, '', 0);
    golden = 0;
  }

  function toLobby() {
    // A run left half way keeps what it earned.
    if (local?.kind === 'run') {
      const st = local.run.state;
      if (st.score > profile.bestRun) profile.bestRun = st.score;
      submit('before-the-bears', st.score);
      bank(st.score, st.honey);
    }
    endLocal();
    setScreen('lobby');
    musicCtl.set('menu', 100);
    sfx('back');
  }

  function pause() {
    if (!local || paused) return;
    const now = performance.now();
    if (stage.holding) release(now, 'player');
    paused = true;
    pausedAt = now;
    holdSound.stop();
  }
  /** Everything on this page waits out a pause of d ms. */
  function shiftPage(d) {
    if (pc) {
      stage.start += d;
      if (stage.pressAt !== null) stage.pressAt += d;
      if (stage.releaseAt !== null) stage.releaseAt += d;
      pc.playAt += d;
      pc.beganAt += d;
      if (pc.verdictAt) pc.verdictAt += d;
    }
    for (const t of timers) t.at += d;
  }
  function resume() {
    if (!paused) return;
    paused = false;
    shiftPage(performance.now() - pausedAt);
    sfx('click');
  }
  let matchPausedAt = 0;

  // ---------------------------------------------------------------- the Storybook and the Wardrobe
  function openBook() {
    setScreen('book');
    sfx('pageTurn');
  }
  function bookData() {
    const stars = PAGE_IDS.reduce((a, id) => a + (profile.stars[id] ?? 0), 0);
    return {
      pages: PAGES.map((p) => ({ id: p.id, name: p.name, stars: profile.stars[p.id] ?? 0, met: (profile.met[p.id] ?? 0) > 0, img: `./pages/${p.id}.jpg` })),
      stars,
      touch: lastInputTouch,
      onPage: (id) => {
        if (!pageOf(id) || !(profile.met[id] > 0)) return;
        startLocal('practice', { pageId: id });
      },
      onBack: toLobby,
    };
  }
  function openWardrobe() {
    setScreen('wardrobe');
    sfx('pageTurn');
  }
  function wardrobeData() {
    const items = SHOP[wardTab].map((it) => {
      const why = canBuy(profile, wardTab, it.id);
      const base = { id: it.id, name: it.name, owned: why === 'owned', wearing: profile.wear[wardTab] === it.id, price: it.price, why, need: it.rank ? it.rank + 1 : it.wins ?? 0 };
      if (wardTab === 'char') return { ...base, img: faceUrl(it.id) };
      if (wardTab === 'hat') return { ...base, svg: ui.icons.hatIcon(it.id) };
      return { ...base, svg: ui.icons.inkIcon(it.color) };
    });
    return {
      wide: window.innerWidth >= window.innerHeight * 1.05,
      tab: wardTab,
      honey: profile.honey,
      items,
      touch: lastInputTouch,
      onTab: (t) => {
        if (!Object.hasOwn(SHOP, t)) return;
        wardTab = t;
        sfx('click');
      },
      onItem: (id) => wardrobeItem(id),
      onBack: toLobby,
    };
  }
  function wardrobeItem(id) {
    const kind = wardTab;
    const it = itemOf(kind, id);
    if (!it) return;
    const why = canBuy(profile, kind, id);
    const wideNow = window.innerWidth >= window.innerHeight * 1.05;
    if (why === 'owned') {
      wear(profile, kind, id);
      sfx('click');
    } else if (why === 'ok') {
      buy(profile, kind, id);
      sfx('buy');
      award('all-dressed-up');
      ui.toast({ icon: kind === 'hat' ? ui.icons.hatIcon(id) : kind === 'ink' ? ui.icons.inkIcon(it.color) : ui.icons.drop(), text: it.name, sub: `−${commas(it.price)} honey` });
    } else {
      sfx('nope');
      // Try it on for a moment.
      if (kind !== 'ink') {
        tryOn = { kind, id, until: performance.now() + 1600 };
        world.admire();
      } else ui.stamp('JUST RIGHT!', { color: it.color, size: 'mid', x: wideNow ? 0.3 : 0.5, y: wideNow ? 0.3 : 0.22, life: 1100 });
      return;
    }
    tryOn = null;
    if (kind === 'ink') ui.stamp('JUST RIGHT!', { color: it.color, size: 'mid', x: wideNow ? 0.3 : 0.5, y: wideNow ? 0.3 : 0.22, life: 1300, onLand: () => sfx('stamp') });
    else world.admire();
    saveSoon();
  }
  function applyLook() {
    let c = profile.wear.char;
    let h = profile.wear.hat;
    if (tryOn && performance.now() < tryOn.until) {
      if (tryOn.kind === 'char') c = tryOn.id;
      if (tryOn.kind === 'hat') h = tryOn.id;
    } else tryOn = null;
    world.setLook(c, h);
  }

  // ---------------------------------------------------------------- input
  let keyDown = false;
  let pointerDown = null;
  function canHold() {
    if (paused || !pc) return false;
    const v = view();
    return v === 'local' || (v === 'match' && online && (online.match.phase === 'round' || online.match.phase === 'intro'));
  }
  function press(ts) {
    if (!canHold()) return false;
    if (stage.press(ts)) {
      onPress();
      return true;
    }
    return false;
  }
  function release(ts, how = 'player') {
    if (!stage.holding) return;
    const r = stage.release(ts, how);
    if (r) onVerdict(r, performance.now());
    else {
      holdSound.stop();
      musicCtl.duck(false);
    }
  }
  let pressedSeen = '';
  function tap() {
    if (view() === 'match' && online && online.match.phase === 'roundEnd' && pressedSeen !== online.match.roundId) {
      pressedSeen = online.match.roundId;
      try {
        online.seen();
      } catch {}
    }
  }
  const cv = gfx.renderer.domElement;
  cv.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    lastInputTouch = e.pointerType === 'touch';
    startAudio();
    if (pointerDown !== null) return;
    pointerDown = e.pointerId;
    try {
      cv.setPointerCapture(e.pointerId);
    } catch {}
    if (!press(e.timeStamp)) tap();
  });
  const up = (e) => {
    if (pointerDown === null || e.pointerId !== pointerDown) return;
    pointerDown = null;
    if (!keyDown) release(e.timeStamp);
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  window.addEventListener('pointerup', up);
  document.getElementById('ui').addEventListener('pointerdown', (e) => {
    lastInputTouch = e.pointerType === 'touch';
    startAudio();
  });
  cv.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  cv.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    const isSpace = e.code === 'Space' || e.key === ' ';
    if (isSpace) {
      e.preventDefault();
      if (e.repeat) return;
      lastInputTouch = false;
      startAudio();
      if (canHold()) {
        keyDown = true;
        press(e.timeStamp);
        return;
      }
      if (view() === 'title') return startFromTitle();
      if (view() === 'match' && online?.match.phase === 'roundEnd') return tap();
      return;
    }
    if (e.key === 'Enter') {
      if (e.repeat) return;
      startAudio();
      if (e.target && e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      const v = view();
      if (v === 'title') return startFromTitle();
      if (v === 'match' && online?.match.phase === 'roundEnd') return tap();
      if (v === 'runOver') return startLocal('run');
      if (v === 'dailyOver') return startLocal('daily');
      if (v === 'local' && paused) return resume();
      return;
    }
    if (e.key === 'Escape') {
      const v = view();
      if (v === 'local') {
        if (local?.kind === 'practice') {
          endLocal();
          openBook();
        } else if (paused) resume();
        else pause();
      } else if (v === 'book' || v === 'wardrobe' || v === 'runOver' || v === 'dailyOver') toLobby();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!keyDown) return;
      keyDown = false;
      if (pointerDown === null) release(e.timeStamp);
    }
  });
  const letGoNow = () => {
    keyDown = false;
    pointerDown = null;
    release(performance.now());
  };
  window.addEventListener('blur', letGoNow);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      letGoNow();
      pause();
      setSuspended(true);
    } else setSuspended(false);
  });
  try {
    ow?.on?.('pause', () => {
      letGoNow();
      pause();
    });
  } catch {}

  function startFromTitle() {
    if (view() !== 'title' || !ready) return;
    startAudio();
    sfx('click');
    endLocal();
    setScreen('lobby');
    musicCtl.set('menu', 100);
  }

  // ---------------------------------------------------------------- the room's events
  let lastWinner = '';
  let matchMarks = [];
  let matchPerfects = 0;
  function attach(r) {
    try {
      online?.dispose();
    } catch {}
    online = null;
    room = r;
    if (!r || !helpers) return;
    try {
      online = createOnline(r, helpers, { now: () => Date.now(), rounds: autoplay && shortStory >= 2 ? shortStory : null });
    } catch (e) {
      console.error('[just-right] room setup failed', e);
      online = null;
      return;
    }
    lobbyHidden = null;
    lastPresence = '';
    r.on('error', (e) => console.warn('[just-right] room:', e && e.code, e && e.message));
    r.on('close', (reason) => {
      if (reason === 'kicked' || reason === 'disconnected' || reason === 'replaced') {
        closed = reason;
        endLocal();
      }
    });
    r.on('starting', () => {
      // A story is starting: a solo run banks what it scored and the player joins in.
      if (local) {
        if (local.kind === 'run') {
          const st = local.run.state;
          if (st.score > profile.bestRun) profile.bestRun = st.score;
          submit('before-the-bears', st.score);
          bank(st.score, st.honey);
        }
        endLocal();
      }
      if (screen !== 'title') setScreen('lobby');
      lobbyHidden = null;
    });
    r.on('matchstart', () => {
      lobbyHidden = null;
      matchMarks = [];
      matchPerfects = 0;
      streakNow = 0;
      musicCtl.set('play', 112);
    });
    r.on('matchend', () => {
      lobbyHidden = null;
      revealState = null;
      results = null;
      if (screen !== 'title') musicCtl.set('menu', 100);
      musicCtl.intensity(0);
      stage.begin(null, '', 0);
      pc = null;
      golden = 0;
    });
    online.match.on('results', (standings, mine) => {
      const seats = online.match.seats.length;
      if (standings && standings[0]) {
        const top = online.match.seats.find((s) => s.id === standings[0].id);
        lastWinner = top ? top.name : '';
      }
      if (mine) {
        const pts = Math.max(0, Number(mine.points) || 0);
        const won = mine.place === 1 && seats >= 3;
        if (won) {
          profile.wins++;
          award('happily-ever-after');
          submit('stories-won', profile.wins);
        }
        profile.stories++;
        taskEvent({ e: 'story' });
        woodsAdd(matchPerfects);
        bank(pts, honeyFor(pts, matchPerfects) + (won ? 40 : 0));
      }
    });
  }
  try {
    ow?.rooms?.on?.('moved', (r) => attach(r));
  } catch {}
  async function rejoin() {
    closed = null;
    attach(await joinRoom());
  }

  // ---------------------------------------------------------------- views
  function view() {
    if (closed) return 'closed';
    if (screen === 'title') return 'title';
    if (online && room && room.match && room.match.phase !== 'lobby' && !local) return 'match';
    return screen;
  }
  let lobbyHidden = null;
  const wantLobbyHidden = (v) => v !== 'lobby' && v !== 'match';

  function soloOk() {
    if (!room || !online) return true;
    // In a private server with friends waiting, the host doesn't wander off.
    return !(room.kind === 'private' && room.isHost && (room.online?.length ?? 0) > 1);
  }

  function lobbyPeople() {
    const out = [];
    let bots = 5;
    if (room && online) {
      const lob = online.match.lobby;
      const isPrivate = room.kind === 'private' || room.kind === 'named';
      for (const p of lob.players) {
        if (out.length >= 8) break;
        const look = p.me ? { char: profile.wear.char, hat: profile.wear.hat } : lookOf(p.id);
        out.push({ key: p.id, def: charDef(look.char), hat: look.hat, name: p.name, ready: !!p.ready && !(p.host && isPrivate), host: !!p.host && isPrivate, me: !!p.me });
      }
      bots = lob.bots;
    } else out.push({ key: 'me', def: charDef(profile.wear.char), hat: profile.wear.hat, name: 'You', me: true });
    for (let i = 0; i < bots && out.length < 8; i++) out.push({ key: FOLK[i].name, def: folkDef(FOLK[i].name), hat: '', name: FOLK[i].name, bot: true });
    return out;
  }

  // The part of the screen the 3D picture is framed in, per view (beside the Wardrobe, above a phone's lobby cards).
  const winNow = { x: 0, y: 0, w: 1, h: 1 };
  let winTarget = { x: 0, y: 0, w: 1, h: 1 };
  let insets = { top: 0, right: 0, bottom: 0, left: 0 };
  function windowFor(v, phase) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const wide = W >= H * 1.05;
    if (v === 'title' || v === 'closed') return { x: 0, y: 0.14, w: 1, h: 0.64 };
    if (v === 'lobby' || v === 'book' || (v === 'match' && (phase === 'countdown' || phase === 'lobby'))) {
      if (wide) {
        const side = clamp(W * 0.24, 200, 300) + 24;
        const top = insets.top + 70;
        const bottom = insets.bottom + 80;
        return { x: side / W, y: top / H, w: Math.max(0.2, 1 - (2 * side) / W), h: Math.max(0.3, 1 - (top + bottom) / H) };
      }
      const top = insets.top + 96;
      const bottom = insets.bottom + 300 + (room && online ? 56 : 0);
      return { x: 0, y: top / H, w: 1, h: Math.max(0.22, 1 - (top + bottom) / H) };
    }
    if (v === 'wardrobe') {
      if (wide) {
        const panel = Math.min(W * 0.46, 430) + 28;
        return { x: 0, y: 0.04, w: 1 - panel / W, h: 0.92 };
      }
      return { x: 0, y: (insets.top + 8) / H, w: 1, h: 0.46 - (insets.top + 8) / H };
    }
    if (v === 'match' && phase === 'roundEnd') return { x: 0, y: (insets.top + 60) / H, w: 1, h: Math.max(0.3, 1 - (insets.top + 60 + insets.bottom + 110) / H) };
    if (v === 'match' && phase === 'results') return { x: 0, y: 0.2, w: 1, h: 0.6 };
    return { x: 0, y: 0, w: 1, h: 1 };
  }
  function setWindowTarget(r) {
    const same = Math.abs(r.x - winTarget.x) < 1e-4 && Math.abs(r.y - winTarget.y) < 1e-4 && Math.abs(r.w - winTarget.w) < 1e-4 && Math.abs(r.h - winTarget.h) < 1e-4;
    winTarget = r;
    world.setAspect((r.w * window.innerWidth) / Math.max(1, r.h * window.innerHeight));
    return !same;
  }

  // The platform's own UI: the edges and corners it covers.
  function applyInsets() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    let list = null;
    try {
      list = ow?.ui?.reserved ?? null;
    } catch {}
    if (!Array.isArray(list)) {
      list = [];
      if (ow) {
        list.push({ kind: 'menu', x: 0, y: 0, w: 150, h: 70 });
        if (lobbyHidden === false) list.push({ kind: 'lobby', x: 0, y: H - 88, w: W, h: 88 });
      }
    }
    const v = { top: 0, right: 0, bottom: 0, left: 0, tlx: 0, tly: 0, trx: 0, try: 0, blx: 0, bly: 0, brx: 0, bry: 0 };
    const wide = W >= H * 1.05;
    for (const a of list) {
      if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(a.w) || !Number.isFinite(a.h)) continue;
      const top = a.y <= 8;
      const bottom = a.y + a.h >= H - 8;
      if (a.w >= W * 0.6) {
        if (bottom) v.bottom = Math.max(v.bottom, H - a.y);
        else if (top) v.top = Math.max(v.top, a.y + a.h);
        continue;
      }
      if (a.h >= H * 0.6) {
        if (a.x <= 8) v.left = Math.max(v.left, a.x + a.w);
        else v.right = Math.max(v.right, W - a.x);
        continue;
      }
      const left = a.x + a.w / 2 < W / 2;
      const upper = a.y + a.h / 2 < H / 2;
      const c = `${upper ? 't' : 'b'}${left ? 'l' : 'r'}`;
      if (wide) v[`${c}x`] = Math.max(v[`${c}x`], left ? a.x + a.w : W - a.x);
      else v[`${c}y`] = Math.max(v[`${c}y`], upper ? a.y + a.h : H - a.y);
    }
    insets = v;
    ui.setInsets(v);
  }
  try {
    ow?.on?.('reserved', () => {
      applyInsets();
      setWindowTarget(windowFor(lastViewKey.v, lastViewKey.phase));
    });
  } catch {}

  function onResize() {
    size();
    applyInsets();
    setWindowTarget(windowFor(lastViewKey.v, lastViewKey.phase));
    Object.assign(winNow, winTarget);
    gfx.setWindow(winNow);
    world.refit(0.3);
  }
  window.addEventListener('resize', onResize);
  try {
    ow?.settings?.on?.('change', () => {
      gfx.setQuality(qualityNow());
      world.setQuality(gfx.quality);
      onResize();
    });
  } catch {}

  // ---------------------------------------------------------------- the frame
  let lastViewKey = { v: '', phase: '' };
  let worldShows = '';
  let lobbyKey = '';
  let lobbyPeopleNow = [];
  let revealState = null;
  let results = null;
  let countdownN = 0;
  let lastPresence = '';
  let autoAt = 0;
  let ready = false;

  function presence(extra) {
    if (!room || !online) return;
    const p = { c: profile.wear.char, h: profile.wear.hat, ...extra };
    const key = JSON.stringify(p);
    if (key === lastPresence) return;
    lastPresence = key;
    try {
      room.setPresence(p);
    } catch {}
  }

  function update(now, dt) {
    if (!paused) {
      for (let i = timers.length - 1; i >= 0; i--) {
        if (now >= timers[i].at) {
          const t = timers[i];
          timers.splice(i, 1);
          try {
            t.fn();
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
    // Seated in a story that is playing (this page reloaded mid-story): straight in.
    if (screen === 'title' && room && online && !closed) {
      try {
        if (room.isParticipant()) setScreen('lobby');
      } catch {}
    }
    const v = view();
    const phase = v === 'match' ? online.match.phase : '';
    if (room && online) {
      const want = wantLobbyHidden(v);
      if (want !== lobbyHidden) {
        lobbyHidden = want;
        try {
          room.hideLobby(want);
        } catch {}
        applyInsets();
      }
    }
    if (v !== lastViewKey.v || phase !== lastViewKey.phase) {
      lastViewKey = { v, phase };
      if (setWindowTarget(windowFor(v, phase)) && worldShowsFor(v, phase) === worldShows) world.refit(0.6);
    }
    syncWorld(v, phase);
    if (v === 'match') updateMatch(now);
    else if (v === 'local' && local && !paused) {
      if (pc && autoplay) driveAuto(now);
      if (pc) {
        const r = stage.update(now);
        if (r) onVerdict(r, now);
      }
      localNext(now);
    }
    if (pc && stage.holding) {
      const val = stage.value(now);
      holdSound.update(val, Math.abs(val - stage.band(now)) <= pc.P.w, pc.P.sp, val >= 0.995);
    }
    // The tick as play begins.
    if (pc && !pc.ticked && now >= pc.playAt) {
      pc.ticked = true;
      if (stage.pressAt === null && !stage.locked) sfx('tick');
    }
    if (v === 'lobby' || v === 'match') presence(v === 'match' && pc && pc.kind === 'match' && (phase === 'round' || phase === 'intro') ? { k: pc.key, s: stage.holding ? 1 : stage.released ? 2 : 0 } : {});
    if (v === 'lobby') woodsRefresh();
    applyLook();
    if ((autoplay || autoTo === 'lobby') && now > autoAt) {
      autoAt = now + 600;
      driveScreens(v, now);
    }
    // The picture.
    const k = 1 - Math.exp(-dt * 5);
    winNow.x += (winTarget.x - winNow.x) * k;
    winNow.y += (winTarget.y - winNow.y) * k;
    winNow.w += (winTarget.w - winNow.w) * k;
    winNow.h += (winTarget.h - winNow.h) * k;
    gfx.setWindow(winNow);
    gfx.setGolden?.(golden * (reduced() ? 0.5 : 1));
    world.update(paused ? 0 : dt, pc ? playState(now) : null);
    drawUi(v, phase, now);
  }

  /** What the 3D world should be showing for this view. */
  function worldShowsFor(v, phase) {
    if (v === 'title' || v === 'closed') return 'title';
    if (v === 'lobby' || v === 'book') return 'lobby';
    if (v === 'wardrobe') return 'wardrobe';
    if (v === 'match') return phase === 'roundEnd' ? 'reveal' : phase === 'results' ? 'podium' : phase === 'countdown' || phase === 'lobby' ? 'lobby' : 'page';
    return 'page';
  }
  function syncWorld(v, phase) {
    const want = worldShowsFor(v, phase);
    if (want === 'title') {
      if (worldShows !== 'title') {
        world.showTitle({ glide: worldShows ? 1.2 : 0 });
        musicCtl.set('title', 92);
      }
    } else if (want === 'lobby') {
      const people = lobbyPeople();
      const key = JSON.stringify(people.map((p) => [p.key, p.def.key, p.hat, p.ready, p.me]));
      if (worldShows !== 'lobby' || key !== lobbyKey) {
        world.showLobby(people, { glide: worldShows === 'lobby' ? 0 : worldShows ? 1.3 : 0 });
        if (worldShows !== 'lobby' && worldShows !== '') sfx('whoosh', { pitch: 0.7 });
        lobbyKey = key;
      }
      lobbyPeopleNow = people;
    } else if (want === 'wardrobe') {
      if (worldShows !== 'wardrobe') world.showWardrobe({ glide: 1.0 });
    }
    // Pages, the reveal and the podium are shown by the flow itself (they need the page or the marks).
    if (want === 'title' || want === 'lobby' || want === 'wardrobe') worldShows = want;
    if (want !== 'lobby') lobbyKey = '';
  }

  function driveScreens(v, now) {
    if (v === 'title' && now - screenAt > 1200) return startFromTitle();
    if (autoTo === 'lobby' || !autoplay) return;
    if (v === 'lobby' && now - screenAt > 900) {
      if (autoSolo === 'run' || autoSolo === 'daily') return startLocal(autoSolo);
      if (room && online && room.match?.phase === 'lobby') {
        try {
          const want = Number(params.get('pages'));
          if (room.isHost && MATCH_LENGTHS.includes(want) && pagesSetting(room.settings) !== want) room.setSetting('pages', want);
          else if (room.kind === 'public') {
            if (!room.me?.ready) room.setReady(true);
          } else if (room.isHost) {
            if (room.canStart) room.startMatch();
          } else if (!room.me?.ready) room.setReady(true);
        } catch {}
      } else if (!online) startLocal('run');
    } else if (v === 'pick' && local && now - screenAt > 1600) {
      const offer = local.run.state.offer ?? [];
      if (offer[0]) takeCharm(offer[0]);
    } else if ((v === 'runOver' || v === 'dailyOver') && now - screenAt > 5000) startLocal(v === 'runOver' ? 'run' : 'daily');
  }

  function driveAuto(now) {
    if (!pc || !stage.playing) return;
    if (!pc.auto) {
      let plan = planHold(pc.P, `auto:${pc.key}`, AUTO);
      if (plan.h === null) plan = { press: plan.press, h: 600 };
      pc.auto = plan;
    }
    const tPlay = now - stage.start;
    if (stage.pressAt === null && tPlay >= pc.auto.press) {
      stage.press(stage.start + pc.auto.press);
      onPress();
    }
    if (stage.holding && now - stage.pressAt >= pc.auto.h) {
      const r = stage.release(stage.pressAt + pc.auto.h, 'player');
      if (r) onVerdict(r, now);
    }
  }

  function updateMatch(now) {
    const m = online.match;
    const phase = m.phase;
    if (phase === 'countdown') {
      const n = m.countdown === null ? 0 : Math.ceil(m.countdown);
      if (n !== countdownN && n >= 1 && n <= 3) {
        startAudio();
        sfx('count', { n });
        sfx('growl', { kind: n === 3 ? 'papa' : n === 2 ? 'mama' : 'baby' });
      }
      countdownN = n;
      return;
    }
    countdownN = 0;
    if (m.paused) {
      if (!matchPausedAt) {
        matchPausedAt = now;
        if (stage.holding) release(now, 'player');
        holdSound.stop();
      }
      return;
    }
    if (matchPausedAt) {
      shiftPage(now - matchPausedAt);
      matchPausedAt = 0;
    }
    if (phase === 'round' || phase === 'intro') {
      const P = readPage(m.data);
      if (!P) return;
      const key = m.roundId;
      if (!pc || pc.key !== key) {
        beginPage('match', P, key, now - (m.elapsed - INTRO_MS), { glide: m.round === 1 ? 1.3 : 1.0 });
        revealState = null;
        worldShows = 'page';
        if (!m.me || room.spectating) stage.lock();
        else if (m.data.done?.[m.me.id]) {
          stage.lock();
          pc.marked = true;
        }
        musicCtl.tempo(112 + Math.round((28 * Math.max(0, m.round - 1)) / Math.max(1, m.rounds - 1)));
        musicCtl.intensity(m.round === m.rounds ? 3 : m.round > m.rounds * 0.6 ? 2 : m.round > 1 ? 1 : 0);
      }
      if (autoplay && m.me) driveAuto(now);
      const r = stage.update(now);
      if (r) onVerdict(r, now);
      return;
    }
    if (phase === 'roundEnd') {
      if (stage.holding) {
        stage.lock();
        holdSound.stop();
        musicCtl.duck(false);
      }
      if (!revealState || revealState.key !== m.roundId) {
        const marks = revealMarks();
        const P = readPage(m.data);
        revealState = { key: m.roundId, v0: world.vclock, plinks: 0, crowned: false, n: marks.length, P, best: marks[marks.length - 1] ?? null };
        // The page's stamp goes as the reveal comes (it gets its own).
        ui.clearStamps();
        if (P) world.showReveal(P, marks.map((mk) => ({ v: mk.v, k: mk.k, color: mk.color, me: mk.me })), { faces: marks.map((mk) => world.faceTexture(mk.portrait)) });
        worldShows = 'reveal';
        sfx('whoosh');
      }
      const age = world.vclock - revealState.v0;
      while (revealState.plinks < revealState.n && age >= 0.45 + revealState.plinks * 0.32) {
        sfx('plink', { rank: revealState.plinks });
        revealState.plinks++;
      }
      if (!revealState.crowned && age >= 0.45 + revealState.n * 0.32 + 0.1) {
        revealState.crowned = true;
        const best = revealState.best;
        if (best && inBand(best.k)) {
          sfx('fanfare');
          ui.stamp(best.k === 'perfect' ? 'JUST RIGHT!' : 'CLOSEST!', { color: best.me ? inkColor() : '#C8442F', size: 'mid', y: 0.2, life: 1800, onLand: () => world.punch(0.04) });
        }
      }
      if (autoplay && age > 2.6 && pressedSeen !== m.roundId) tap();
      return;
    }
    if (phase === 'results') {
      if (!results || results.key !== room.match.id) {
        results = { key: room.match.id };
        ui.clearStamps();
        const rows = podiumRows();
        world.showPodium(rows.map((r) => ({ def: r.def, hat: r.hat, me: r.me })));
        worldShows = 'podium';
        sfx('win');
        later(1200, () => sfx('growl', { kind: 'baby' }));
        musicCtl.intensity(3);
      }
    }
  }

  function revealMarks() {
    const m = online.match;
    const P = readPage(m.data);
    if (!P) return [];
    const marks = m.data.marks ?? {};
    const out = m.seats.map((s, i) => {
      const mk = marks[s.id];
      const d = mk ? mk.d / 1000 : 1;
      return { id: s.id, name: s.name, v: mk ? clamp(P.c0 + d, 0, 1) : 0, d, k: mk ? mk.k : 'asleep', me: !!s.me, color: SEAT_COLORS[i % SEAT_COLORS.length], portrait: seatPortrait(s) };
    });
    out.sort((a, b) => (a.k === 'asleep' ? -1 : 0) - (b.k === 'asleep' ? -1 : 0) || Math.abs(b.d) - Math.abs(a.d));
    return out;
  }
  function podiumRows() {
    const m = online.match;
    return (m.results ?? m.standings).map((s) => {
      const seat = m.seats.find((x) => x.id === s.id) ?? { id: s.id, name: s.name };
      const look = seat.bot ? null : seat.me ? { char: profile.wear.char, hat: profile.wear.hat } : lookOf(s.id);
      return { id: s.id, name: s.name, points: s.points, place: s.place, me: !!seat.me, def: seat.bot ? folkDef(s.name) : charDef(look.char), hat: look ? look.hat : '', face: seatFace(seat) };
    });
  }

  // ---------------------------------------------------------------- the UI each frame
  function introFor(kind, now) {
    if (!pc) return null;
    if (now > pc.playAt + 350 || stage.pressAt !== null) return null;
    const P = pc.P;
    let pg = '';
    if (kind === 'match') pg = `Page ${online.match.round} of ${online.match.rounds}`;
    else if (kind === 'run') pg = P.bo ? `Bowl ${P.bo} of ${BOSS_BOWLS}` : `Page ${local.run.state.n}`;
    else if (kind === 'daily') pg = `Daily ${local.index + 1} of ${DAILY_PAGES}`;
    else if (kind === 'practice') pg = 'Practice';
    const tw = [TWIST_CARD[P.tw] || '', P.x2 && kind === 'match' ? 'Double points' : ''].filter(Boolean).join(' · ');
    return { pg, name: P.bo ? 'The Three Bowls' : P.page.name, twist: tw, x2: P.x2 && kind === 'match', hint: P.page.hint && pc.metBefore < 2 ? P.page.hint : '', boss: !!P.bo };
  }

  function promptFor(kind, now) {
    if (!pc) return null;
    if (kind === 'match' && (!online.match.me || room.spectating)) return { label: 'Watching' };
    const touch = lastInputTouch;
    if (stage.pressAt === null && !stage.locked && !pc.result) {
      const left = stage.left(now);
      const watch = left !== null && left <= 3 && now >= stage.start ? left : null;
      return { label: pc.metBefore < 2 ? pc.P.page.cue : 'Hold', key: touch ? null : 'Space', touch, watch, go: now >= stage.start };
    }
    if (stage.holding && !profile.letGo) {
      if (Math.abs(stage.value(now) - stage.band(now)) <= pc.P.w) return { label: 'Let go!', letgo: true };
    }
    return null;
  }

  function hudFor(kind) {
    if (kind === 'match') {
      const m = online.match;
      const meRow = m.me ? m.standings.find((s) => s.id === m.me.id) : null;
      return {
        path: { label: `Page ${Math.max(1, m.round)}/${m.rounds}`, marks: matchMarks, now: m.round - 1, total: m.rounds, x2: true },
        score: meRow ? meRow.points : 0,
        sub: meRow ? ordinal(meRow.place) : '',
        mult: 1,
        honey: null,
        bears: null,
        shields: 0,
        charms: [],
        heads: seatHeads(m),
      };
    }
    if (!local) return { path: null, score: 0, honey: null, bears: null, heads: null };
    if (local.kind === 'run') {
      const st = local.run.state;
      const ch = Math.floor((st.n - 1) / 10) * 10;
      const fx = local.run.effects();
      return {
        path: { label: `Page ${st.n}`, marks: local.marks.slice(ch, ch + 10), now: (st.n - 1) % 10, total: 10, x2: true },
        score: st.score,
        sub: profile.bestRun > 0 ? `Best ${commas(Math.max(profile.bestRun, st.score))}` : '',
        mult: streakNow > 0 ? Math.min(fx.streakCap, 1 + streakNow) : 1,
        hot: streakNow >= 3,
        honey: profile.honey + st.honey,
        bears: st.home,
        shields: st.shields,
        charms: st.charms,
        heads: null,
      };
    }
    if (local.kind === 'daily') {
      return { path: { label: 'Daily', marks: local.marks, now: local.index, total: DAILY_PAGES }, score: local.score, sub: profile.daily.day === dayNumber() ? `Today ${commas(profile.daily.best)}` : '', mult: 1, honey: null, bears: null, shields: 0, charms: [], heads: null };
    }
    const stars = profile.stars[local.pageId] ?? 0;
    return {
      path: { label: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, marks: [], total: 0 },
      score: local.lastScore ?? 0,
      sub: pageOf(local.pageId)?.name ?? '',
      mult: 1,
      honey: null,
      bears: null,
      shields: 0,
      charms: [],
      heads: null,
      onBack: () => {
        endLocal();
        openBook();
      },
    };
  }

  function seatHeads(m) {
    const seats = m.seats;
    const order = (m.standings.length ? m.standings.map((s) => s.id) : seats.map((s) => s.id)).filter((id) => seats.some((s) => s.id === id));
    for (const s of seats) if (!order.includes(s.id)) order.push(s.id);
    const plans = online.plans();
    const tPlay = m.elapsed - INTRO_MS;
    const P = readPage(m.data);
    const done = m.data?.done ?? {};
    return order.map((id) => {
      const seat = seats.find((s) => s.id === id);
      let holding = false;
      if (m.phase === 'round' && P && !done[id]) {
        if (seat.me) holding = stage.holding;
        else if (seat.bot) {
          const p = plans[id];
          holding = !!p && p.h !== null && tPlay >= p.press && tPlay < p.press + p.h;
        } else {
          const pr = room.players.get(id)?.presence;
          holding = !!pr && typeof pr === 'object' && pr.k === m.roundId && pr.s === 1;
        }
      }
      const f = seatFace(seat);
      return { id, name: seat.name, img: f.img, color: f.color, me: !!seat.me, hold: holding, done: m.phase === 'round' && !!done[id], away: !!(seat.away || seat.left) };
    });
  }

  function lobbyData() {
    ensureTasks();
    const r = rankOf(profile.xp);
    const day = dayNumber();
    const isHost = !!(room && online && room.isHost && room.match?.phase === 'lobby');
    return {
      wide: window.innerWidth >= window.innerHeight * 1.05,
      rank: { i: r.i, name: r.name, k: r.k },
      honey: profile.honey,
      woods,
      tasks: tasks.map((t, i) => ({ text: t.text, n: t.n, honey: t.honey, count: profile.tasks.n[String(i)] ?? 0, done: !!profile.tasks.done[String(i)] })),
      best: profile.bestRun,
      daily: { played: profile.daily.day === day, best: profile.daily.day === day ? profile.daily.best : 0, streak: profile.daily.lastDay === day - 1 ? profile.daily.streak : 0 },
      stars: PAGE_IDS.reduce((a, id) => a + (profile.stars[id] ?? 0), 0),
      soloOk: soloOk(),
      bossNew: profile.bosses === 0 && profile.bestPages >= 5,
      colors: { run: '#e9b44c', daily: '#7fb2d6', book: '#c9a46a', wardrobe: '#d98e9a' },
      pages: room && online ? { n: pagesSetting(room.settings), host: isHost } : null,
      onMode: (id) => {
        if (id === 'wardrobe') return openWardrobe();
        if (id === 'book') return openBook();
        if (!soloOk()) return sfx('nope');
        if (id === 'run' || id === 'daily') startLocal(id);
      },
      onPages: (n) => {
        if (!isHost || !MATCH_LENGTHS.includes(n)) return;
        try {
          room.setSetting('pages', n);
          sfx('click');
        } catch {}
      },
    };
  }

  function tagsNow() {
    const pos = world.lobbyTags();
    return lobbyPeopleNow.map((p, i) => (pos[i] && pos[i].on ? { name: p.name, me: p.me, ready: p.ready, host: p.host, x: pos[i].x, y: pos[i].y } : null)).filter(Boolean);
  }

  function drawUi(v, phase, now) {
    if (v === 'title') {
      ui.title({ best: profile.bestRun, touch: lastInputTouch, onPlay: startFromTitle, loading: ready ? 1 : 0.97 });
      ui.show('title');
      return;
    }
    if (v === 'closed') {
      const msg = closed === 'kicked' ? ['You were removed', 'Play'] : closed === 'replaced' ? ['Playing in another tab', 'Play here'] : ['Lost the connection', 'Rejoin'];
      ui.closed({ msg: msg[0], label: msg[1], onClick: rejoin });
      ui.show('closed');
      return;
    }
    if (v === 'lobby') {
      ui.lobby(lobbyData());
      ui.nametags(tagsNow());
      ui.show('lobby', 'tags');
      return;
    }
    if (v === 'book') {
      ui.book(bookData());
      ui.show('book');
      return;
    }
    if (v === 'wardrobe') {
      ui.wardrobe(wardrobeData());
      ui.show('wardrobe');
      return;
    }
    if (v === 'runOver' || v === 'dailyOver') {
      ui.show('over');
      return;
    }
    if (v === 'pick') {
      if (local) ui.hud(hudFor('run'));
      ui.prompt(null);
      ui.intro(null);
      ui.show('hud', 'pick');
      return;
    }
    if (v === 'local') {
      ui.hud(hudFor(local?.kind));
      ui.prompt(paused ? null : promptFor(local?.kind, now));
      ui.intro(paused ? null : introFor(local?.kind, now));
      if (paused) ui.pause({ onResume: resume, onLobby: toLobby, touch: lastInputTouch });
      ui.show(...(paused ? ['hud', 'pause'] : ['hud']));
      return;
    }
    if (v === 'match') {
      const m = online.match;
      if (phase === 'countdown' || phase === 'lobby') {
        ui.nametags(tagsNow());
        ui.count(phase === 'countdown' && m.countdown !== null ? Math.ceil(m.countdown) : 0);
        ui.show('tags', 'count');
        return;
      }
      ui.count(0);
      if (phase === 'round' || phase === 'intro') {
        ui.hud(hudFor('match'));
        ui.prompt(promptFor('match', now));
        ui.intro(introFor('match', now));
        ui.show('hud');
        return;
      }
      if (phase === 'roundEnd') {
        const P = revealState?.P;
        const last = m.last;
        const rows = m.standings.map((s) => {
          const seat = m.seats.find((x) => x.id === s.id) ?? { id: s.id, name: s.name };
          const f = seatFace(seat);
          return { id: s.id, name: s.name, img: f.img, color: f.color, place: s.place, points: s.points, gain: last?.points?.[s.id] ?? 0, me: !!seat.me };
        });
        ui.reveal({ title: P ? P.page.name : '', rows, tap: pressedSeen !== m.roundId && !!m.me, touch: lastInputTouch });
        ui.show('reveal');
        return;
      }
      if (phase === 'results') {
        const rows = podiumRows().map((r) => ({ id: r.id, name: r.name, img: r.face.img, color: r.face.color, place: r.place, points: r.points, me: r.me }));
        ui.podium({ winner: lastWinner || rows[0]?.name || '', rows });
        ui.show('podium');
        return;
      }
      ui.show();
    }
  }

  // ?debug=1: the numbers behind the picture, on screen.
  let dbg = null;
  let dbgDumped = null;
  if (params.get('debug') === '1') {
    dbg = document.createElement('pre');
    dbg.style.cssText = 'position:fixed;left:4px;bottom:4px;margin:0;padding:6px;background:rgba(255,255,255,.85);color:#000;font:11px monospace;z-index:99;pointer-events:none;max-width:60vw;white-space:pre-wrap';
    document.body.appendChild(dbg);
  }
  function debugLine(now) {
    if (!dbg) return;
    const c = gfx.camera;
    const st = pc ? playState(now) : null;
    const gl = gfx.renderer.getContext();
    const px = new Uint8Array(4);
    gl.readPixels(Math.floor(gl.drawingBufferWidth / 2), Math.floor(gl.drawingBufferHeight / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    if (px[0] + px[1] + px[2] < 200 && !dbgDumped) {
      dbgDumped = [];
      const bad = (a) => a.some((x) => !Number.isFinite(x));
      gfx.scene.traverse((o) => {
        if (!o.visible) return;
        if (o.isLight) dbgDumped.push(`L ${o.type} ${o.name} i=${o.intensity} p=${o.position.toArray().map((x) => x.toFixed(1))} ${bad(o.matrixWorld.elements) ? 'NaNM' : ''}`);
        else if (bad(o.matrixWorld.elements) && !(o.parent && bad(o.parent.matrixWorld.elements))) {
          const chain = [];
          for (let q = o; q; q = q.parent) chain.push(`${q.type}:${q.name}`);
          dbgDumped.push(`NaNroot ${chain.join('<')} pos=${o.position.toArray().map((x) => x.toFixed(2))} sc=${o.scale.toArray().map((x) => x.toFixed(2))} q=${o.quaternion.toArray().map((x) => x.toFixed(2))} kids=${o.children.length} ${o.children.slice(0, 4).map((c) => `${c.type}:${c.name}`).join(',')}`);
        }
        const m = o.material;
        if (m && !Array.isArray(m)) {
          if (m.color && bad(m.color.toArray())) dbgDumped.push(`NaNcolor ${o.name}`);
          if (m.emissive && bad(m.emissive.toArray())) dbgDumped.push(`NaNemis ${o.name}`);
          if (m.opacity !== undefined && !Number.isFinite(m.opacity)) dbgDumped.push(`NaNop ${o.name}`);
          if (m.emissiveIntensity !== undefined && (!Number.isFinite(m.emissiveIntensity) || m.emissiveIntensity > 50)) dbgDumped.push(`emisI ${o.name} ${m.emissiveIntensity}`);
          if (m.uniforms) for (const [k, u] of Object.entries(m.uniforms)) if (typeof u.value === 'number' && !Number.isFinite(u.value)) dbgDumped.push(`NaNuni ${o.name} ${k}`);
        }
        if (o.isInstancedMesh && o.instanceMatrix && bad(Array.from(o.instanceMatrix.array))) dbgDumped.push(`NaNinst ${o.name}`);
        if (o.isPoints || o.isInstancedMesh) {
          for (const [k, at] of Object.entries(o.geometry.attributes)) if (bad(Array.from(at.array))) dbgDumped.push(`NaNattr ${o.name} ${k}`);
        }
      });
      dbgDumped.push(`shadowM ${bad(gfx.sun.shadow.matrix.elements)} sunP ${gfx.sun.position.toArray().map((x) => x.toFixed(1))}`);
      dbgDumped.push(`info calls=${gfx.renderer.info.render.calls} tri=${gfx.renderer.info.render.triangles} progs=${gfx.renderer.info.programs?.length}`);
    }
    dbg.textContent = (lastFrameError ? `ERR ${lastFrameError}\n` : '') + (dbgDumped ? dbgDumped.slice(0, 30).join('\n') + '\n' : '') + JSON.stringify({ px: [...px], stamps: document.querySelectorAll('#ui .stamp').length, cam: c.position.toArray().map((x) => +x.toFixed(2)), fov: +c.fov.toFixed(1), asp: +c.aspect.toFixed(3), pm0: +c.projectionMatrix.elements[0].toFixed(3), view: c.view && c.view.enabled ? [c.view.fullWidth, c.view.fullHeight, c.view.offsetX, c.view.offsetY, c.view.width, c.view.height].map((x) => Math.round(x)) : null, win: Object.values(winNow).map((x) => +x.toFixed(3)), golden, mode: world.mode, scr: view(), room: room && { ph: room.match.phase, id: room.match.id, p: !!room.match.paused, host: room.isHost, mp: online?.match.phase, r: online?.match.round, el: Math.round(online?.match.elapsed ?? -1), rid: online?.match.roundId }, st: st && { v: +st.v.toFixed(3), c: +st.c.toFixed(3), w: st.w, k: st.k, since: +st.since.toFixed(2), h: st.holding } });
  }

  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
    last = t;
    try {
      update(performance.now(), dt);
    } catch (e) {
      frameError(e);
    }
    // Always draw, even after a bad update: a page that skips a frame's draw can stall the browser's frame clock.
    try {
      gfx.render(dt);
      debugLine(performance.now());
    } catch (e) {
      frameError(e);
    }
  }
  let lastFrameError = '';
  function frameError(e) {
    const msg = String((e && (e.stack || e.message)) || e).slice(0, 400);
    if (msg !== lastFrameError) console.error('[just-right] frame', e);
    lastFrameError = msg;
  }

  // Start drawing now (the title is alive while the room is joined and the save loads).
  applyInsets();
  setWindowTarget(windowFor('title', ''));
  Object.assign(winNow, winTarget);
  gfx.setWindow(winNow);
  world.setLook(profile.wear.char, profile.wear.hat);
  world.warm();
  requestAnimationFrame(frame);
  const saved = await withTimeout(ow?.save?.get?.('profile'), 2500);
  profile = cleanProfile(saved);
  ensureTasks();
  ready = true;
  const r = await joining;
  helpers = r ? await helpersP : null;
  attach(r);
}
