// Just Right on Onceworlds: boot (join first), the screens, input timed from the events themselves, the frame loop, and the glue
// between the room (net.js), the local activities (Before the Bears, the daily, practice, the title's attract mode) and the
// drawing.

import { C, T, SEAT_COLORS, loadFonts, outlined, stampSize } from './kit.js';
import { createFx } from './fx.js';
import { startAudio, setSuspended, sfx, holdSound, musicCtl } from './audio.js';
import { createUi } from './ui.js';
import { hudLayout, stageLayout, clearAreas } from './layout.js';
import { drawPage, sceneState } from './view.js';
import { SCENES } from './scenes.js';
import {
  drawPath,
  drawHeads,
  drawScoreSign,
  drawIntro,
  drawPrompt,
  drawReveal,
  drawCountdown,
  drawLobby,
  lobbyLayout,
  drawPodium,
  drawRunOver,
  drawDailyOver,
  drawShelf,
  drawCard,
  drawTitle,
  commas,
  ordinal,
  REVEAL_DROP,
  REVEAL_FIRST,
} from './screens.js';
import { readPage, inBand, verdictWord, TWIST_CARD, PAGES, PAGE_IDS, pageOf } from './pages.js';
import { createRun, dailyPlan, practicePage, multiplierFor, makePage, DAILY_PAGES, MATCH_LENGTHS } from './plan.js';
import { planHold, AUTOPLAY, FOLK, folkNamed } from './brain.js';
import { createStage } from './stage.js';
import { createOnline, JOIN_OPTIONS, INTRO_MS, pagesSetting } from './net.js';
import { createRng, hash } from './rng.js';

const params = new URLSearchParams(location.search);

async function importHelpers() {
  try {
    const [m, h, b] = await Promise.all([import('/__onceworlds/v1/match.js'), import('/__onceworlds/v1/host.js'), import('/__onceworlds/v1/bots.js')]);
    return { createMatch: m.createMatch, createHost: h.createHost, createBots: b.createBots, t: h.t };
  } catch {
    return null;
  }
}

const withTimeout = (p, ms, fallback = null) => Promise.race([Promise.resolve(p).catch(() => fallback), new Promise((r) => setTimeout(() => r(fallback), ms))]);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function boot() {
  const ow = window.onceworlds || null;
  // ?autoplay=1: the bot brain plays for this player (the platform's pictures and the trailer); ?autoplay-to=lobby stops there.
  const autoplay = params.get('autoplay') === '1';
  // ?clumsy=1: a careless hand instead (it lets go late, so most pages go too far), for footage of the pages going wrong.
  const AUTO = params.get('clumsy') === '1' ? { skill: 0.3, bias: 380, press: [0.3, 0.6], blunder: 0 } : AUTOPLAY;
  const autoTo = params.get('autoplay-to');
  // Join first, before anything is built, so a reload keeps its seat.
  const joinRoom = () => (ow && ow.rooms && ow.rooms.join ? Promise.resolve(ow.rooms.join(JOIN_OPTIONS)).catch(() => null) : Promise.resolve(null));
  const joining = joinRoom();
  const helpersP = importHelpers();

  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const ui = createUi(document.getElementById('ui'));
  const fx = createFx();
  const stage = createStage();
  try {
    ow?.controls?.set?.(null);
    ow?.ui?.setLook?.({ accent: '#D2452B', panel: '#F3E3C3', text: '#1E2747' });
  } catch {}
  const reduced = () => {
    try {
      return !!ow?.settings?.reducedMotion;
    } catch {
      return false;
    }
  };
  fx.reduced = reduced();

  // ---------------------------------------------------------------- sizing
  let W = 1;
  let H = 1;
  let dpr = 1;
  function resize() {
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    let pr = Math.min(2, window.devicePixelRatio || 1);
    try {
      if (ow?.settings?.pixelRatio) pr = ow.settings.pixelRatio(2);
    } catch {}
    dpr = Math.max(0.5, pr);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
  }
  resize();
  window.addEventListener('resize', resize);
  try {
    ow?.settings?.on?.('change', () => {
      fx.reduced = reduced();
      fx.setQuality(ow.settings.quality);
      resize();
    });
    fx.setQuality(ow?.settings?.quality);
  } catch {}
  const reservedNow = () => {
    try {
      return ow?.ui?.reserved ?? null;
    } catch {
      return null;
    }
  };

  // ---------------------------------------------------------------- saved progress
  const profile = {
    met: {},
    stars: {},
    perfects: 0,
    porridgePerfects: 0,
    bestRun: 0,
    bestStreak: 0,
    wins: 0,
    daily: { day: -1, best: 0, streak: 0, lastDay: -1 },
    readied: 0,
    letGo: 0,
  };
  const num = (v, max = 1e9) => (Number.isFinite(v) && v >= 0 ? Math.min(max, Math.floor(v)) : 0);
  function loadProfile(p) {
    if (!p || typeof p !== 'object') return;
    for (const id of PAGE_IDS) {
      profile.met[id] = num(p.met?.[id]);
      profile.stars[id] = num(p.stars?.[id], 3);
    }
    profile.perfects = num(p.perfects);
    profile.porridgePerfects = num(p.porridgePerfects);
    profile.bestRun = num(p.bestRun);
    profile.bestStreak = num(p.bestStreak);
    profile.wins = num(p.wins);
    profile.readied = num(p.readied);
    profile.letGo = num(p.letGo);
    const d = p.daily;
    if (d && typeof d === 'object') profile.daily = { day: Number.isFinite(d.day) ? d.day : -1, best: num(d.best, 1000), streak: num(d.streak), lastDay: Number.isFinite(d.lastDay) ? d.lastDay : -1 };
  }
  let saveTimer = 0;
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        ow?.save?.set?.('profile', profile);
      } catch {}
    }, 1200);
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

  // ---------------------------------------------------------------- faces
  const faces = new Map();
  function faceOf(id, name, bot) {
    if (bot) return { animal: folkNamed(name)?.animal ?? 'owl', name };
    let f = faces.get(id);
    if (!f) {
      f = { name, img: null, color: SEAT_COLORS[hash(String(id)) % SEAT_COLORS.length] };
      faces.set(id, f);
      if (ow?.player?.avatarUrl && id) {
        Promise.resolve(ow.player.avatarUrl(id, 'head'))
          .then((url) => {
            if (!url) return;
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => (f.img = img);
            img.src = url;
          })
          .catch(() => {});
      }
    }
    f.name = name;
    return f;
  }

  // ---------------------------------------------------------------- the room
  let room = null;
  let online = null;
  let helpers = null;
  let closed = null;
  let lastWinner = null;

  // ---------------------------------------------------------------- state
  /** 'title' | 'lobby' | 'local' | 'runOver' | 'dailyOver' | 'shelf' */
  let screen = 'title';
  let screenAt = performance.now();
  let local = null;
  let paused = false;
  let pausedAt = 0;
  let over = null;
  let clock = 0;
  let titleAge = 0;
  let push = 0;
  /** The page on screen: its stage, intro, verdict and the timers that go with it. */
  let pc = null;
  const timers = [];
  let lastPresence = '';
  let reveal = null;
  let results = null;
  let countdownN = 0;
  let hidden = null;
  let lastView = '';
  let pressedSeen = '';
  const headX = new Map();
  let readyHint = 0;
  let autoAt = 0;
  let localSeed = 1;
  const touchish = () => {
    try {
      return !!ow?.controls?.touch || matchMedia('(pointer: coarse)').matches;
    } catch {
      return false;
    }
  };
  let lastInputTouch = touchish();

  const setScreen = (s) => {
    screen = s;
    screenAt = performance.now();
  };
  const after = (ms, fn) => timers.push({ at: performance.now() + ms, fn });

  function view() {
    if (closed) return 'closed';
    if (screen === 'title') return 'title';
    if (online && room && room.match && room.match.phase !== 'lobby' && !local) return 'match';
    return screen;
  }

  // ---------------------------------------------------------------- pages
  function beginPage(kind, P, key, playAt) {
    holdSound.stop();
    musicCtl.duck(false);
    timers.length = 0;
    fx.clearStamps();
    stage.begin(P, key, playAt);
    pc = { kind, P, key, playAt, beganAt: performance.now(), beganClock: clock, result: null, verdictAt: 0, verdictClock: 0, auto: null, metBefore: profile.met[P.g] ?? 0, letGoShown: false, marked: false, lastPump: -1 };
  }

  function playState(now) {
    if (!pc) return null;
    const P = pc.P;
    const released = stage.released;
    const k = pc.result ? pc.result.k : null;
    return {
      v: stage.value(now),
      c: stage.band(now),
      holding: stage.holding,
      pressed: stage.pressAt !== null,
      released,
      k,
      since: pc.result ? Math.max(0, clock - pc.verdictClock) : 0,
      held: stage.held(now),
      t: clock,
      reduced: fx.reduced,
      P,
    };
  }

  function onPress() {
    if (!pc) return;
    lastInputTouch = lastInputTouch || touchish();
    holdSound.start(pc.P.g);
    musicCtl.duck(true);
    sfx.click();
  }

  function stampSpot(L) {
    const b = L.box;
    return { x: b.x + b.w / 2, y: b.y + Math.min(b.h * 0.3, L.u * 2.4), size: L.small ? 30 : 44 };
  }

  function onVerdict(r, now) {
    if (!pc || pc.result) return;
    pc.result = r;
    pc.verdictAt = now;
    pc.verdictClock = clock;
    holdSound.stop();
    musicCtl.duck(false);
    const P = pc.P;
    const L = currentStage();
    const S = sceneState(P, L, playState(now));
    const spot = stampSpot(L);
    const pts = pointsFor(r);
    const word = verdictWord(P, r.k, r.v);
    const color = r.k === 'perfect' ? C.red : r.k === 'good' ? C.green : r.k === 'under' ? C.blue : r.k === 'asleep' ? C.ink : C.red;
    const delay = { jar: 380, bell: 350, swing: 620, bowl: 500, milk: 300 }[P.g] ?? 60;
    after(delay, () => {
      fx.stamp(word, spot.x, spot.y, spot.size, { color, rot: (Math.random() - 0.5) * 0.24, hold: r.k === 'perfect' ? 90 : 60, life: 1.5 });
      if (r.k === 'perfect') {
        sfx.stamp();
        sfx.ding();
        fx.burst('spark', spot.x, spot.y, 14, { speed: L.u * 4 });
      } else if (r.k === 'good') sfx.good();
      else if (r.k === 'asleep') sfx.poof();
      else if (r.d > P.w + 0.08) sfx.trombone();
      else sfx.thud();
      if (r.k !== 'asleep' && pc && pc.kind !== 'attract') fx.float(`+${pts}`, spot.x, spot.y + spot.size * 2.1, { color: r.k === 'perfect' ? C.red : C.ink, size: L.small ? 26 : 34 });
    });
    // The page's own sound and particles.
    const k = r.k;
    switch (P.g) {
      case 'porridge':
        if (k === 'over') sfx.sizzle();
        else if (k === 'under') sfx.frost();
        break;
      case 'chair':
        if (k === 'over') {
          sfx.crack();
          fx.shake(0.65);
        }
        break;
      case 'pillow':
        if (k === 'over') sfx.poof();
        break;
      case 'toast':
        sfx.clink();
        break;
      case 'balloon':
        if (k === 'pop') {
          sfx.pop();
          fx.shake(0.5);
        }
        break;
      case 'cake':
        sfx.chop();
        break;
      case 'spoon':
        if (k === 'under') sfx.frost();
        else if (k === 'over') sfx.sizzle();
        break;
      case 'milk':
        if (k === 'over') after(300, () => sfx.splash());
        break;
      case 'bowl':
        sfx.scrape();
        if (r.v >= 0.985) after(1000, () => {
          sfx.smash();
          fx.shake(0.5);
        });
        break;
      case 'jar':
        after(380, () => {
          if (inBand(k)) sfx.clink();
          else if (k !== 'asleep') {
            sfx.smash();
            fx.shake(0.4);
          }
        });
        break;
      case 'bell':
        if (k !== 'asleep') sfx.boing();
        if (inBand(k)) after(350, () => sfx.bell());
        else if (k === 'over') after(350, () => fx.shake(0.3));
        break;
      case 'swing':
        sfx.whoosh();
        after(620, () => {
          if (k === 'under') {
            sfx.splash();
            fx.shake(0.35);
          } else if (k === 'over') sfx.thud();
          else if (inBand(k)) sfx.step(1);
        });
        break;
      default:
        break;
    }
    try {
      SCENES[P.g].burst?.(fx, { ...S, k, released: true, since: 0, v: r.v });
    } catch {}
    if (pc.kind === 'attract') return;
    // Progress that counts everywhere but the title.
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
    if (pc.kind !== 'practice') {
      streakNow = k === 'perfect' ? streakNow + 1 : 0;
      if (streakNow >= 5) award('perfect-streak');
      if (streakNow > profile.bestStreak) {
        profile.bestStreak = streakNow;
        submit('perfect-streak', streakNow);
      }
    }
    if (pc.kind === 'match') sendMark();
    else localVerdict(r);
    saveSoon();
  }
  let streakNow = 0;

  /** The points a release earns on this page, here and now. */
  function pointsFor(r) {
    if (!pc) return r.s;
    if (pc.kind === 'match') return r.s * (pc.P.x2 ? 2 : 1);
    if (pc.kind === 'run' && local) return r.s * multiplierFor(local.perfects, r.k === 'perfect');
    return r.s;
  }

  function sendMark() {
    if (!online || !pc || pc.marked || stage.h === null) return;
    pc.marked = true;
    try {
      online.mark({ r: online.match.round, h: Math.max(0, Math.min(20000, stage.h)), t: Math.max(0, Math.min(30000, stage.t)) });
    } catch {}
  }

  // ---------------------------------------------------------------- local activities
  function dayNumber() {
    let t = Date.now();
    try {
      if (ow?.now) t = ow.now();
    } catch {}
    return Math.floor(t / 86400000);
  }

  function startLocal(kind, opts = {}) {
    if (room && online) {
      try {
        room.setReady(false);
      } catch {}
    }
    localSeed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    local = { kind, index: 0, score: 0, lives: 3, home: 0, homeAt: -9, perfects: 0, cleared: 0, scores: [], pageId: opts.pageId ?? null, go: 0, run: kind === 'run' ? createRun(localSeed) : null, plan: kind === 'daily' ? dailyPlan(dayNumber()) : null };
    paused = false;
    if (kind !== 'attract') {
      setScreen('local');
      musicCtl.set('play', 112);
    }
    nextLocalPage();
  }

  function nextLocalPage() {
    if (!local) return;
    let raw;
    if (local.kind === 'run') raw = local.run.page(local.index, local.cleared);
    else if (local.kind === 'daily') raw = local.plan[local.index];
    else if (local.kind === 'practice') raw = practicePage(local.pageId, local.go);
    else {
      const order = ['porridge', 'chair', 'balloon', 'toast', 'milk', 'swing'];
      raw = makePage(createRng(`title:${local.index}`), order[local.index % order.length], { sp: 100, w: 75, n: local.index + 1 });
    }
    const P = readPage(raw);
    if (!P) return;
    const intro = local.kind === 'attract' ? 700 : 1000;
    beginPage(local.kind, P, `${local.kind}:${localSeed}:${local.index}:${local.go}`, performance.now() + intro);
    if (local.kind === 'run') musicCtl.tempo(112 + Math.min(28, local.cleared * 1.2));
  }

  function localVerdict(r) {
    if (!local) return;
    if (local.kind === 'run') {
      const pts = r.s * multiplierFor(local.perfects, r.k === 'perfect');
      local.perfects = r.k === 'perfect' ? local.perfects + 1 : 0;
      local.score += pts;
      if (inBand(r.k)) local.cleared++;
      else {
        local.home++;
        local.homeAt = clock;
        const kind = ['papa', 'mama', 'baby'][Math.min(2, local.home - 1)];
        after(250, () => sfx.growl(kind));
        if (local.home >= 3) after(700, () => sfx.growl('papa'));
      }
    } else if (local.kind === 'daily') local.score += r.s;
    else if (local.kind === 'practice') {
      const stars = r.k === 'perfect' ? 3 : r.s >= 90 ? 2 : r.s >= 70 ? 1 : 0;
      if (stars > (profile.stars[local.pageId] ?? 0)) profile.stars[local.pageId] = stars;
      local.score = r.s;
    }
  }

  function localNext(now) {
    if (!local || !pc || !pc.result) return;
    const miss = !inBand(pc.result.k);
    const wait = local.kind === 'attract' ? 1500 : local.kind === 'run' && miss ? 1900 : 1300;
    if (now - pc.verdictAt < wait) return;
    if (local.kind === 'run' && local.home >= 3) return finishRun();
    if (local.kind === 'daily' && local.index + 1 >= DAILY_PAGES) return finishDaily();
    if (local.kind === 'practice') local.go++;
    else local.index++;
    nextLocalPage();
  }

  function finishRun() {
    const score = local.score;
    const best = Math.max(profile.bestRun, score);
    over = { kind: 'run', score, pages: local.index + 1, best, newBest: score > profile.bestRun && score > 0, age0: clock };
    profile.bestRun = best;
    submit('before-the-bears', score);
    if (score >= 2500) award('before-the-bears');
    saveSoon();
    endLocal();
    setScreen('runOver');
    musicCtl.set('menu', 100);
    if (over.newBest) after(500, () => fx.stamp('NEW BEST!', W / 2, H * 0.12 + 40, 30, { rot: 0.08, life: 3 }));
  }

  function finishDaily() {
    const day = dayNumber();
    const d = profile.daily;
    if (d.day !== day) {
      d.streak = d.lastDay === day - 1 ? d.streak + 1 : 1;
      d.day = day;
      d.best = 0;
      d.lastDay = day;
    }
    d.best = Math.max(d.best, local.score);
    const date = new Date(day * 86400000);
    over = { kind: 'daily', score: local.score, best: d.best, streak: d.streak, day: date.getUTCDate(), month: MONTHS[date.getUTCMonth()], age0: clock };
    award('daily-porridge');
    saveSoon();
    endLocal();
    setScreen('dailyOver');
    musicCtl.set('menu', 100);
  }

  function endLocal() {
    local = null;
    pc = null;
    paused = false;
    holdSound.stop();
    musicCtl.duck(false);
    stage.begin(null, '', 0);
  }

  function toLobby() {
    endLocal();
    over = null;
    setScreen('lobby');
    musicCtl.set('menu', 100);
  }

  function pause() {
    if (!local || local.kind === 'attract' || paused) return;
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
  }
  /** When the room paused the story (nobody connected long enough): the page stands still with it. */
  let matchPausedAt = 0;

  // ---------------------------------------------------------------- input
  let keyDown = false;
  let pointerDown = null;

  function canHold() {
    if (paused || !pc || pc.kind === 'attract') return false;
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
      // Let go during the intro: nothing happened.
      holdSound.stop();
      musicCtl.duck(false);
    }
  }

  function tap() {
    // A tap that isn't a hold: through the reveal, or to start the sound on the title.
    if (view() === 'match' && online && online.match.phase === 'roundEnd' && pressedSeen !== online.match.roundId) {
      pressedSeen = online.match.roundId;
      try {
        online.seen();
      } catch {}
    }
  }

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
  // No long-press menu, text selection or magnifier while a finger holds the page.
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
      if (view() === 'title') return startFromTitle();
      if (view() === 'match' && online?.match.phase === 'roundEnd') return tap();
      ui.main()?.onClick?.();
      return;
    }
    if (e.key === 'Escape') {
      const v = view();
      if (v === 'local') {
        if (local?.kind === 'practice') {
          endLocal();
          setScreen('shelf');
        } else if (paused) resume();
        else pause();
      } else if (v === 'shelf' || v === 'runOver' || v === 'dailyOver') toLobby();
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
    if (view() !== 'title') return;
    startAudio();
    sfx.click();
    endLocal();
    setScreen('lobby');
    musicCtl.set('menu', 100);
  }

  // ---------------------------------------------------------------- the room's events
  function attach(r) {
    try {
      online?.dispose();
    } catch {}
    online = null;
    room = r;
    if (!r || !helpers) return;
    try {
      online = createOnline(r, helpers, { now: () => Date.now() });
    } catch (e) {
      console.error('[just-right] room setup failed', e);
      online = null;
      return;
    }
    hidden = null;
    r.on('error', (e) => console.warn('[just-right] room:', e && e.code, e && e.message));
    r.on('close', (reason) => {
      if (reason === 'kicked' || reason === 'disconnected' || reason === 'replaced') {
        closed = reason;
        endLocal();
      }
    });
    r.on('starting', () => {
      // A story is starting: a solo run banks what it scored and the player joins in.
      if (local && local.kind !== 'attract') {
        if (local.kind === 'run' && local.score > profile.bestRun) {
          profile.bestRun = local.score;
          submit('before-the-bears', local.score);
          saveSoon();
        }
        endLocal();
        if (screen !== 'title') setScreen('lobby');
      }
      hidden = null;
    });
    r.on('matchstart', () => {
      hidden = null;
      musicCtl.set('play', 112);
    });
    r.on('matchend', () => {
      hidden = null;
      reveal = null;
      results = null;
      if (screen !== 'title') musicCtl.set('menu', 100);
      stage.begin(null, '', 0);
      pc = null;
    });
    online.match.on('results', (standings, mine) => {
      const seats = online.match.seats.length;
      if (standings && standings[0]) {
        const top = online.match.seats.find((s) => s.id === standings[0].id);
        lastWinner = top ? faceOf(top.id, top.name, top.bot) : null;
      }
      if (mine && mine.place === 1 && seats >= 3) {
        profile.wins++;
        award('happily-ever-after');
        submit('stories-won', profile.wins);
        saveSoon();
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

  // ---------------------------------------------------------------- the frame loop
  let last = performance.now();
  let flow = '';
  function setFlow(f) {
    if (f !== flow) {
      flow = f;
      document.body.dataset.flow = f;
    }
  }

  function currentStage() {
    const hud = hudLayout(W, H, reservedNow());
    const axis = pc ? pc.P.page.axis : 'up';
    const top = pc && pc.kind === 'attract' ? Math.max(H * 0.3, 110) : pc && pc.kind === 'practice' ? Math.max(hud.clear.top + 8, 80) : hud.bottom;
    const L = stageLayout(W, H, top, axis);
    fx.setUnit(L.u);
    return L;
  }

  function wantLobbyHidden(v) {
    return v === 'title' || v === 'local' || v === 'shelf' || v === 'runOver' || v === 'dailyOver' || v === 'closed';
  }

  function update(now) {
    for (let i = timers.length - 1; i >= 0; i--) {
      if (now >= timers[i].at) {
        const t = timers[i];
        timers.splice(i, 1);
        try {
          t.fn();
        } catch {}
      }
    }
    // Seated in a story that is playing (the host started it, or this page reloaded mid-story): straight in.
    if (screen === 'title' && room && online && !closed) {
      try {
        if (room.isParticipant()) setScreen('lobby');
      } catch {}
    }
    const v = view();
    // The platform's Ready strip only where Ready makes sense.
    if (room && online) {
      const want = wantLobbyHidden(v);
      if (want !== hidden) {
        hidden = want;
        try {
          room.hideLobby(want);
        } catch {}
      }
    }
    if (v === 'title' && !local) startLocal('attract');
    if (v !== lastView) {
      lastView = v;
      if (v !== 'title' && local && local.kind === 'attract') endLocal();
    }
    if (v === 'match') updateMatch(now);
    else if ((v === 'local' || v === 'title') && local && !paused) {
      updateLocalPage(now);
      localNext(now);
    }
    // The pillow's pumps: a whump each.
    if (pc && pc.P.g === 'pillow' && stage.holding) {
      const n = Math.floor((stage.held(now) / 1000) * pc.P.sp / 0.4);
      if (n !== pc.lastPump) {
        pc.lastPump = n;
        if (pc.kind !== 'attract') {
          sfx.poof();
          const L = currentStage();
          fx.burst('feather', L.box.x + L.box.w * 0.3, L.floor - L.u * 2.2, 3, { speed: L.u * 2 });
        }
      }
    }
    if (pc && stage.holding) holdSound.update(stage.value(now), Math.abs(stage.value(now) - stage.band(now)) <= pc.P.w, pc.P.sp);
    // Autoplay: go to the lobby, ready up (or start), and let the brain hold for us.
    if ((autoplay || autoTo === 'lobby') && now > autoAt) {
      autoAt = now + 600;
      if (v === 'title' && performance.now() - screenAt > 1200) startFromTitle();
      else if (autoplay && v === 'lobby' && room && online && room.match?.phase === 'lobby') {
        try {
          const want = Number(params.get('pages'));
          if (room.isHost && MATCH_LENGTHS.includes(want) && pagesSetting(room.settings) !== want) room.setSetting('pages', want);
          else if (room.kind === 'public') {
            if (!room.me?.ready) room.setReady(true);
          } else if (room.isHost) {
            if (room.canStart) room.startMatch();
          } else if (!room.me?.ready) room.setReady(true);
        } catch {}
      } else if (autoplay && v === 'lobby' && !online && !local) startLocal('run');
    }
  }

  function driveAuto(now) {
    // The brain holds for this page (the title, and ?autoplay).
    if (!pc || !stage.playing) return;
    if (!pc.auto) {
      let plan = planHold(pc.P, `auto:${pc.key}`, pc.kind === 'attract' ? AUTOPLAY : AUTO);
      if (pc.kind === 'attract' && pc.P.g === 'chair' && plan.h !== null) plan = { ...plan, h: plan.h + 700 };
      if (plan.h === null) plan = { press: plan.press, h: 600 };
      pc.auto = plan;
    }
    const tPlay = now - stage.start;
    if (stage.pressAt === null && tPlay >= pc.auto.press) {
      stage.press(stage.start + pc.auto.press);
      if (pc.kind !== 'attract') onPress();
    }
    if (stage.holding && now - stage.pressAt >= pc.auto.h) {
      const r = stage.release(stage.pressAt + pc.auto.h, 'player');
      if (r) onVerdict(r, now);
    }
  }

  function updateLocalPage(now) {
    if (!pc) return;
    if (pc.kind === 'attract' || autoplay) driveAuto(now);
    const r = stage.update(now);
    if (r) onVerdict(r, now);
  }

  function updateMatch(now) {
    const m = online.match;
    const phase = m.phase;
    if (phase === 'countdown') {
      const n = m.countdown === null ? 0 : Math.ceil(m.countdown);
      if (n !== countdownN && n >= 1 && n <= 3) {
        sfx.growl(n === 3 ? 'papa' : n === 2 ? 'mama' : 'baby');
        startAudio();
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
        beginPage('match', P, key, now - (m.elapsed - INTRO_MS));
        reveal = null;
        if (!m.me || room.spectating) stage.lock();
        else if (m.data.done?.[m.me.id]) {
          stage.lock();
          pc.marked = true;
        }
        musicCtl.tempo(112 + Math.round((28 * Math.max(0, m.round - 1)) / Math.max(1, m.rounds - 1)));
        sfx.whoosh();
      }
      if (autoplay && m.me) driveAuto(now);
      const r = stage.update(now);
      if (r) onVerdict(r, now);
      // Presence: only whether I'm holding, for the heads along the top.
      const s = stage.holding ? 1 : stage.released ? 2 : 0;
      const pres = `${key}|${s}`;
      if (pres !== lastPresence && m.me) {
        lastPresence = pres;
        try {
          room.setPresence({ k: key, s });
        } catch {}
      }
      return;
    }
    if (phase === 'roundEnd') {
      if (stage.holding) {
        stage.lock();
        holdSound.stop();
        musicCtl.duck(false);
      }
      if (!reveal || reveal.key !== m.roundId) {
        reveal = { key: m.roundId, clock, plinks: 0, crowned: false, data: m.data, last: m.last };
        fx.clearStamps();
        sfx.whoosh();
      }
      const age = clock - reveal.clock;
      const n = revealMarks().length;
      while (reveal.plinks < n && age >= REVEAL_FIRST + reveal.plinks * REVEAL_DROP) {
        sfx.plink(reveal.plinks);
        reveal.plinks++;
      }
      if (!reveal.crowned && age >= REVEAL_FIRST + n * REVEAL_DROP + 0.1) {
        reveal.crowned = true;
        sfx.fanfare();
      }
      if (autoplay && age > 2.6 && pressedSeen !== m.roundId) tap();
      return;
    }
    if (phase === 'results') {
      if (!results || results.key !== room.match.id) {
        results = { key: room.match.id, clock };
        sfx.win();
        fx.burst('oat', W / 2, H * 0.25, 40, { speed: Math.min(W, H) * 0.5 });
        fx.shake(0.2);
        after(1200, () => sfx.growl('baby'));
      }
    }
  }

  // ---------------------------------------------------------------- drawing
  function seatHeads(m, hud, now) {
    const seats = m.seats;
    const order = (m.standings.length ? m.standings.map((s) => s.id) : seats.map((s) => s.id)).filter((id) => seats.some((s) => s.id === id));
    for (const s of seats) if (!order.includes(s.id)) order.push(s.id);
    const r = hud.headR;
    const gap = Math.min(r * 2 + 8, (hud.heads.w - 8) / Math.max(1, order.length));
    const x0 = hud.heads.x + r + 4;
    const plans = online.plans();
    const tPlay = m.elapsed - INTRO_MS;
    const P = readPage(m.data);
    const done = m.data?.done ?? {};
    return order.map((id, i) => {
      const seat = seats.find((s) => s.id === id);
      const target = x0 + i * gap;
      const cur = headX.has(id) ? headX.get(id) : target;
      const x = cur + (target - cur) * 0.18;
      headX.set(id, x);
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
      return { id, who: faceOf(id, seat.name, seat.bot), x, holding, done: m.phase === 'round' && !!done[id], me: seat.me, away: seat.away || seat.left };
    });
  }

  function drawHudFor(kind, hud, now) {
    if (kind === 'match') {
      const m = online.match;
      const P = readPage(m.data);
      const prog = m.phase === 'roundEnd' ? 1 : P ? clamp01((m.elapsed - INTRO_MS) / P.win) : 0;
      drawPath(ctx, hud.path, { kind: 'match', pages: m.rounds, current: Math.max(1, m.round), progress: prog, x2: true, t: clock, walking: m.phase === 'round' });
      drawHeads(ctx, hud.heads, seatHeads(m, hud, now), hud.headR, clock, fx.reduced);
      const meRow = m.me ? m.standings.find((s) => s.id === m.me.id) : null;
      if (meRow) drawScoreSign(ctx, hud.sign, commas(meRow.points), ordinal(meRow.place));
      else drawScoreSign(ctx, hud.sign, String(m.round), `/${m.rounds}`);
    } else if (local && local.kind === 'run') {
      drawPath(ctx, hud.path, { kind: 'run', home: local.home, homeAge: clock - local.homeAt, t: clock, open: local.home > 0 ? 1 : 0 });
      drawScoreSign(ctx, hud.sign, commas(local.score), null, Math.min(5, 1 + local.perfects));
    } else if (local && local.kind === 'daily') {
      drawPath(ctx, hud.path, { kind: 'daily', pages: DAILY_PAGES, current: local.index + 1, progress: pc?.result ? 1 : 0, x2: false, t: clock, walking: stage.holding });
      drawScoreSign(ctx, hud.sign, commas(local.score), null);
    } else if (local && local.kind === 'practice') {
      drawScoreSign(ctx, hud.sign, pc?.result ? String(local.score) : '–', null);
    }
  }

  function drawPlay(now, kind) {
    const L = currentStage();
    const hud = hudLayout(W, H, reservedNow());
    const st = playState(now);
    // The camera leans in while you hold.
    const target = st.holding && !fx.reduced ? 1 : 0;
    push += (target - push) * 0.08;
    const sh = fx.offset();
    ctx.save();
    ctx.translate(sh.x, sh.y);
    if (push > 0.001) {
      const cx = L.box.x + L.box.w / 2;
      const cy = L.box.y + L.box.h / 2;
      ctx.translate(cx, cy);
      ctx.scale(1 + push * 0.035, 1 + push * 0.035);
      ctx.rotate(sh.r);
      ctx.translate(-cx, -cy);
    }
    drawPage(ctx, W, H, dpr, pc.P, L, st);
    fx.drawParticles(ctx);
    ctx.restore();
    fx.drawStamps(ctx, dpr);
    fx.drawFloats(ctx);
    if (kind !== 'attract') drawHudFor(kind, hud, now);
    // The page's name (and its twist) as it begins.
    const age = (now - pc.beganAt) / 1000;
    const met = pc.metBefore;
    const hint = pc.P.page.hint && met < 2 ? pc.P.page.hint : '';
    const page =
      kind === 'match'
        ? `Page ${online.match.round} of ${online.match.rounds}`
        : kind === 'run'
          ? `Page ${local.index + 1}`
          : kind === 'daily'
            ? `Daily ${local.index + 1} of ${DAILY_PAGES}`
            : kind === 'practice'
              ? 'Practice'
              : '';
    if (kind !== 'attract') drawIntro(ctx, L, W, { name: pc.P.page.name, page, twist: TWIST_CARD[pc.P.tw] || '', x2: pc.P.x2 && kind === 'match', hint, age, reduced: fx.reduced });
    // Hold, or Let go once, or the watch.
    let label = '';
    const watching = kind === 'match' && (!online.match.me || room.spectating);
    if (watching) label = 'Watching';
    else if (kind !== 'attract' && stage.pressAt === null && !stage.locked && !pc.result) label = met < 2 ? pc.P.page.cue : 'Hold';
    else if (kind !== 'attract' && stage.holding && !profile.letGo && Math.abs(st.v - st.c) <= pc.P.w) label = 'Let go!';
    const left = stage.left(now);
    const watch = !watching && kind !== 'attract' && stage.pressAt === null && left !== null && left <= 3 && now >= stage.start ? left : null;
    if (watching) outlined(ctx, 'Watching', L.prompt.x, L.prompt.y, { size: L.small ? 24 : 30, fill: C.ink, stroke: C.cream });
    else drawPrompt(ctx, L, { label, key: label && label !== 'Let go!' && !lastInputTouch ? 'Space' : null, touch: label && label !== 'Let go!' && lastInputTouch, t: clock, watch, reduced: fx.reduced });
    return L;
  }

  function revealMarks() {
    const m = online.match;
    const data = reveal?.data ?? m.data;
    const P = readPage(data);
    if (!P) return [];
    const marks = data.marks ?? {};
    const last = reveal?.last ?? m.last;
    const out = m.seats.map((s) => {
      const mk = marks[s.id];
      const d = mk ? mk.d / 1000 : 1;
      return { id: s.id, who: faceOf(s.id, s.name, s.bot), name: s.name, v: mk ? Math.max(0, Math.min(1, P.c0 + d)) : 0, d, k: mk ? mk.k : 'asleep', points: last?.points?.[s.id] ?? 0, me: s.me };
    });
    out.sort((a, b) => (a.k === 'asleep' ? -1 : 0) - (b.k === 'asleep' ? -1 : 0) || Math.abs(b.d) - Math.abs(a.d));
    return out;
  }

  function drawMatch(now) {
    const m = online.match;
    const phase = m.phase;
    const clear = clearAreas(W, H, reservedNow());
    if (phase === 'countdown') {
      drawLobbyScreen(now, clear);
      drawCountdown(ctx, W, H, m.countdown, fx.reduced);
      setFlow('countdown');
      return;
    }
    if ((phase === 'round' || phase === 'intro') && pc && pc.kind === 'match') {
      drawPlay(now, 'match');
      setFlow('playing');
      return;
    }
    if (phase === 'roundEnd') {
      const hud = hudLayout(W, H, reservedNow());
      if (pc && pc.kind === 'match') {
        const L = currentStage();
        drawPage(ctx, W, H, dpr, pc.P, L, playState(now));
      } else drawKitchenOnly();
      drawHudFor('match', hud, now);
      const data = reveal?.data ?? m.data;
      const P = readPage(data);
      if (P) {
        const marks = revealMarks();
        const last = reveal?.last ?? m.last;
        const standings = m.standings.map((s) => {
          const seat = m.seats.find((x) => x.id === s.id);
          return { id: s.id, who: faceOf(s.id, s.name, s.bot), name: s.name, points: s.points, gain: last?.points?.[s.id] ?? 0, me: !!seat?.me };
        });
        const age = reveal ? clock - reveal.clock : 0;
        const best = drawReveal(ctx, W, H, hud.bottom, { name: P.page.name, axis: P.page.axis, c: P.c0, w: P.w, marks, standings, age });
        if (best && reveal && !reveal.stamped && age > REVEAL_FIRST + marks.length * REVEAL_DROP + 0.1) {
          reveal.stamped = true;
          const top = marks[marks.length - 1];
          const sz = Math.min(W, H) < 500 ? 20 : 28;
          // Beside the closest mark, where there's room for it (the crown and the red points say it otherwise).
          const half = stampSize('JUST RIGHT!', sz).w / 2;
          if (top && top.k === 'perfect' && best.end + half * 2 + 16 < best.limit) fx.stamp('JUST RIGHT!', best.end + half + 16, best.y, sz, { life: 2.2, rot: -0.12 });
        }
      }
      fx.drawStamps(ctx, dpr);
      setFlow('roundEnd');
      return;
    }
    if (phase === 'results') {
      const hud = hudLayout(W, H, reservedNow());
      const rows = (m.results ?? m.standings).map((s) => {
        const seat = m.seats.find((x) => x.id === s.id);
        return { id: s.id, who: faceOf(s.id, s.name, s.bot), name: s.name, points: s.points, place: s.place, me: !!seat?.me, color: seat?.bot ? T.brownMid : faceOf(s.id, s.name, false).color };
      });
      const age = results ? clock - results.clock : 0;
      const sh = fx.offset();
      ctx.save();
      ctx.translate(sh.x, sh.y);
      drawPodium(ctx, W, H, dpr, Math.max(hud.clear.top + 10, 20), { rows, age });
      fx.drawParticles(ctx);
      ctx.restore();
      if (results && !results.stamped && age > 1.0 && rows[0]) {
        results.stamped = true;
        fx.stamp('JUST RIGHT', W / 2, Math.max(hud.clear.top + 40, H * 0.12), Math.min(W, H) < 500 ? 30 : 44, { life: 10, rot: -0.08, hold: 100 });
      }
      fx.drawStamps(ctx, dpr);
      setFlow('results');
      return;
    }
    drawKitchenOnly();
    setFlow('playing');
  }

  function drawKitchenOnly() {
    const L = stageLayout(W, H, 100, 'up');
    drawPage(ctx, W, H, dpr, readPage({ g: 'porridge', c: 600, w: 75, sp: 100 }), L, { v: 0, c: 0.6, t: clock }, { gauge: false });
  }

  function lobbySeats() {
    const seats = [];
    let botsN = 5;
    if (room && online) {
      const lob = online.match.lobby;
      const isPrivate = room.kind === 'private' || room.kind === 'named';
      for (const p of lob.players) {
        if (seats.length >= 8) break;
        const who = faceOf(p.id, p.name, false);
        seats.push({ who, name: p.name, ready: !!p.ready && !(p.host && isPrivate), host: p.host && isPrivate, me: p.me, color: who.color });
      }
      botsN = lob.bots;
    } else seats.push({ who: faceOf('me', 'You', false), name: 'You', me: true, color: C.blue });
    for (let i = 0; i < botsN && seats.length < 8; i++) seats.push({ who: { animal: FOLK[i].animal, name: FOLK[i].name }, name: FOLK[i].name, bot: true, color: T.brownMid });
    const invite = room && room.kind === 'private';
    while (seats.length < 8) seats.push({ empty: true, invite });
    return seats;
  }

  function soloOk() {
    if (!room || !online) return true;
    // In a private server with friends waiting, the host doesn't wander off.
    return !(room.kind === 'private' && room.isHost && room.online.length > 1);
  }

  function drawLobbyScreen(now, clear) {
    const day = dayNumber();
    const date = new Date(day * 86400000);
    const LL = drawLobby(ctx, W, H, dpr, clear, {
      seats: lobbySeats(),
      pages: room && online ? pagesSetting(room.settings) : 12,
      best: profile.bestRun,
      daily: { day: date.getUTCDate(), month: MONTHS[date.getUTCMonth()], best: profile.daily.day === day ? profile.daily.best : 0 },
      soloOk: soloOk(),
      t: clock,
      winner: lastWinner,
    });
    return LL;
  }

  function lobbyButtons(LL) {
    const specs = [];
    const O = LL.objects;
    const ok = soloOk();
    const hot = (id, o, aria, onClick, disabled) => specs.push({ id, kind: 'hot', x: o.x, y: o.y, w: o.w, h: o.h + 30, aria, onClick, disabled });
    hot('clock', O.clock, 'Before the Bears', () => ok && startLocal('run'), !ok);
    hot('calendar', O.calendar, 'Daily', () => ok && startLocal('daily'), !ok);
    hot('shelf', O.shelf, 'Practice', () => ok && setScreen('shelf'), !ok);
    const isHost = !!(room && online && room.isHost && room.match?.phase === 'lobby');
    [8, 12, 16].forEach((n, i) => {
      const o = O.bowls;
      const bx = o.x + o.w * (0.2 + i * 0.3);
      const bw = Math.max(44, o.w * 0.28);
      specs.push({
        id: `bowl${n}`,
        kind: 'hot',
        x: bx - bw / 2,
        y: o.y + o.h * 0.3,
        w: bw,
        h: Math.max(44, o.h * 0.7),
        aria: `${n} pages`,
        disabled: !isHost,
        onClick: () => {
          if (!isHost) return;
          try {
            room.setSetting('pages', n);
            sfx.click();
          } catch {}
        },
      });
    });
    if (room && room.kind === 'private') {
      const seats = lobbySeats();
      LL.seats.forEach((s, i) => {
        if (seats[i]?.empty) specs.push({ id: `invite${i}`, kind: 'hot', x: s.x - s.w / 2 + 4, y: s.y, w: s.w - 8, h: Math.max(44, s.h * 0.6), aria: 'Invite', onClick: () => ow?.ui?.showInvite?.() });
      });
    }
    return specs;
  }

  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = T.wall;
    ctx.fillRect(0, 0, W, H);
    const v = view();
    const clear = clearAreas(W, H, reservedNow());
    const small = Math.min(W, H) < 500;
    let specs = [];
    if (v === 'title') {
      if (pc) drawPlay(now, 'attract');
      drawTitle(ctx, W, H, { best: profile.bestRun, age: titleAge, reduced: fx.reduced, dpr });
      const L = currentStage();
      specs.push({ id: 'play', label: 'Play', kind: 'main', cx: W / 2, cy: L.prompt.y - (small ? 6 : 10), key: lastInputTouch ? null : 'Enter', onClick: startFromTitle });
      setFlow('title');
    } else if (v === 'lobby') {
      const LL = drawLobbyScreen(now, clear);
      specs = lobbyButtons(LL);
      // First visits: where Ready is.
      // (A private server's host starts it instead: no hint there.)
      if (room && online && profile.readied < 2 && !room.me?.ready && (room.kind === 'public' || !room.isHost)) {
        readyHint += 1;
        const y = H - Math.max(clear.bottom, 88) - (small ? 18 : 26);
        const bob = fx.reduced ? 0 : Math.sin(clock * 4) * 4;
        outlined(ctx, 'Ready to play ↓', W / 2, y + bob, { size: small ? 20 : 26, fill: C.red, stroke: C.cream });
      }
      if (room?.me?.ready && profile.readied < 2 && !lobbyReadyCounted) {
        lobbyReadyCounted = true;
        profile.readied++;
        saveSoon();
      }
      setFlow('lobby');
    } else if (v === 'match') {
      drawMatch(now);
    } else if (v === 'local') {
      if (pc) drawPlay(now, local.kind);
      if (paused) {
        const card = drawCard(ctx, W, H, 'Paused');
        specs.push({ id: 'resume', label: 'Resume', kind: 'main', cx: W / 2, cy: card.y + card.h * 0.58, key: lastInputTouch ? null : 'Esc', onClick: resume });
        specs.push({ id: 'lobby', label: 'Lobby', kind: 'alt', cx: W / 2, cy: card.y + card.h * 0.84, onClick: toLobby });
      } else if (local.kind === 'practice') specs.push({ id: 'back', label: 'Back', kind: 'alt', cx: Math.max(clear.left, 10) + 56, cy: Math.max(clear.top, 0) + 36, onClick: () => (endLocal(), setScreen('shelf')) });
      setFlow('solo');
    } else if (v === 'runOver' && over) {
      const top = Math.max(clear.top + 10, 24);
      const at = drawRunOver(ctx, W, H, dpr, top, { score: over.score, pages: over.pages, best: over.best, age: clock - over.age0 });
      specs.push({ id: 'again', label: 'Again', kind: 'main', cx: at.cx, cy: at.y + (small ? 18 : 24), key: lastInputTouch ? null : 'Enter', onClick: () => startLocal('run') });
      specs.push({ id: 'lobby', label: 'Lobby', kind: 'alt', cx: at.cx, cy: at.y + (small ? 84 : 104), onClick: toLobby });
      fx.drawStamps(ctx, dpr);
      setFlow('solo');
    } else if (v === 'dailyOver' && over) {
      const top = Math.max(clear.top + 10, 24);
      const at = drawDailyOver(ctx, W, H, dpr, top, { ...over, age: clock - over.age0 });
      const side = small && H < W ? 120 : 0;
      specs.push({ id: 'again', label: 'Again', kind: 'main', cx: W / 2 - (side ? 90 : 0), cy: Math.min(H - 40, at.y) - (side ? 0 : 0), key: lastInputTouch ? null : 'Enter', onClick: () => startLocal('daily') });
      specs.push({ id: 'lobby', label: 'Lobby', kind: 'alt', cx: W / 2 + (side ? 90 : 0), cy: Math.min(H - 40, at.y) + (side ? 0 : small ? 64 : 76), onClick: toLobby });
      setFlow('solo');
    } else if (v === 'shelf') {
      const top = Math.max(clear.top + 8, 70);
      const books = drawShelf(ctx, W, H, dpr, top, { met: profile.met, stars: profile.stars, t: clock });
      for (const b of books) if (b.met) specs.push({ id: `book-${b.id}`, kind: 'hot', x: b.x, y: b.y, w: b.w, h: b.h, aria: pageOf(b.id).name, onClick: () => startLocal('practice', { pageId: b.id }) });
      specs.push({ id: 'back', label: 'Lobby', kind: 'main', cx: W / 2, cy: H - (small ? 40 : 50), key: lastInputTouch ? null : 'Esc', onClick: toLobby });
      setFlow('solo');
    } else if (v === 'closed') {
      drawKitchenOnly();
      const msg = closed === 'kicked' ? ['You were removed', 'Play'] : closed === 'replaced' ? ['Playing in another tab', 'Play here'] : ['Lost the connection', 'Rejoin'];
      const card = drawCard(ctx, W, H, msg[0]);
      specs.push({ id: 'rejoin', label: msg[1], kind: 'main', cx: W / 2, cy: card.y + card.h * 0.68, onClick: rejoin });
      setFlow('closed');
    }
    ui.set(specs);
  }
  let lobbyReadyCounted = false;

  function frame(now) {
    requestAnimationFrame(frame);
    const raw = Math.max(0, (now - last) / 1000);
    const dt = Math.min(0.05, raw);
    last = now;
    fx.update(dt);
    if (!fx.stopped && !paused) clock += dt;
    // The title's slam keeps to the wall clock, so a slow first second never hides the name.
    if (view() === 'title') titleAge += Math.min(0.5, raw);
    try {
      update(performance.now());
      draw(performance.now());
    } catch (e) {
      console.error('[just-right] frame', e);
    }
  }

  // Start drawing now (the title is alive while the room is joined and the saves load).
  await withTimeout(loadFonts(1500), 1600);
  requestAnimationFrame(frame);
  const savedProfile = await withTimeout(ow?.save?.get?.('profile'), 2500);
  loadProfile(savedProfile);
  const r = await joining;
  helpers = r ? await helpersP : null;
  attach(r);
}

// Start, once every declaration above is in place.
const posterName = params.get('poster');
if (posterName) {
  import('./poster.js')
    .then((m) => m.runPoster(posterName, params))
    .catch((e) => {
      document.body.dataset.error = String((e && e.stack) || e);
      document.body.dataset.ready = 'error';
    });
} else boot().catch((e) => console.error('[just-right] boot failed', e));
