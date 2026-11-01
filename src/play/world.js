// The 3D world: the cottage, the stations, the cast (the player's character, the bears, the rivals at the table), the meter,
// particles and the camera. The flow tells it what to show (a page, the title, the lobby table, the reveal, the podium); it
// keeps the time of the pictures (hit-stop and slow motion bend it, never the page's own clock).
import * as THREE from 'three';
import { buildCottage, BACK, FRONT, ROOM } from '../world/cottage.js';
import { createStations } from '../world/stations.js';
import { createMeter } from '../world/meter.js';
import { createParticles, SHAPE } from '../gfx/particles.js';
import { createCamRig } from '../gfx/camrig.js';
import { Character, ANIM } from '../gfx/cast.js';
import { BEARS, CHARACTERS, FOLK_LOOKS, PAL } from '../gfx/palette.js';
import { perfectRadius } from '../core/pages.js';
import { makeHat, attachHat } from '../world/hats.js';

export const CH = 0.36;

export function createWorld(gfx, assets, { sound = () => {}, reduced = () => false } = {}) {
  const { scene, camera } = gfx;
  const house = buildCottage(gfx, assets);
  const fx = createParticles(scene, { max: 900 });
  const rig = createCamRig(camera);
  const meter = createMeter();
  scene.add(meter.group);
  const timers = [];
  let vclock = 0; // picture time
  let hit = 0; // hit-stop (s left)
  let slow = 1;
  let slowLeft = 0;

  // ---------------------------------------------------------------- the cast
  const cast = [];
  const make = (def, scale = 1) => {
    const ch = new Character(assets, def.kind, def.look, { scale: CH * (def.scale ?? 1) * scale });
    scene.add(ch.group);
    cast.push(ch);
    return ch;
  };
  let me = make(CHARACTERS.goldi);
  let meLook = { char: 'goldi', hat: '' };
  const bears = { papa: make(BEARS.papa), mama: make(BEARS.mama), baby: make(BEARS.baby) };
  // Mama Bear's flower.
  try {
    attachHat(bears.mama, makeHat('flower'), { up: 0.42 });
  } catch {}
  for (const b of Object.values(bears)) b.group.visible = false;
  /** Rivals and other players, by seat (lobby, reveal, podium). */
  const seats = [];

  const ctx = {
    scene,
    fx,
    house,
    assets,
    meter,
    goldi: () => me,
    sound: (n, o) => sound(n, o),
    shake: (a, dx, dy) => {
      if (!reduced()) rig.shake(a, dx, dy);
    },
    punch: (a) => {
      if (!reduced()) rig.punch(a);
    },
    hitstop: (ms) => {
      if (!reduced()) hit = Math.max(hit, ms / 1000);
    },
    later: (ms, fn) => timers.push({ at: vclock + ms / 1000, fn }),
  };
  const stations = createStations(ctx);
  let active = null;
  let activeId = '';

  function setActive(id) {
    if (active) active.group.visible = false;
    if (active && active.idle) active.idle();
    active = id ? stations[id] : null;
    activeId = id || '';
    if (active) active.group.visible = true;
    stations.bowls.table.visible = !(active && active.clearsTable);
    meter.group.visible = !!active;
  }

  /** Puts the meter where the station wants it. */
  function placeMeter(m) {
    const s = m.s ?? 0.6;
    meter.setAxis(m.axis ?? 'up');
    meter.group.scale.setScalar(s);
    const [x, y, z] = m.at;
    if ((m.axis ?? 'up') === 'right') meter.group.position.set(x, (m.ground !== undefined ? Math.max(y, m.ground + 0.35) : y) - 0.28 * s, z);
    else meter.group.position.set(x, y + 0.33 * s, z);
    meter.group.rotation.set(0, m.ry ?? 0, 0);
  }

  /** The aspect framings fit (the director's window on the screen, where it's heading). */
  let fitAspect = null;
  function framing(f, aspect) {
    return rig.frame({ target: f.target, from: f.from, radius: f.radius, fov: f.fov ?? 32, aspect: aspect ?? fitAspect ?? undefined });
  }
  /** The framing on show (re-fitted when the screen or its window changes). */
  let shot = null;
  function goFrame(f, glide) {
    shot = f;
    rig.go(framing(f), glide);
  }

  // ---------------------------------------------------------------- what to show
  let mode = 'none';
  let pageP = null;
  let lastFrame = null;

  /** A page: its station, Goldi and the meter set up, the camera on its way. */
  function showPage(P, { glide = 1.0, stationId = null } = {}) {
    const id = stationId ?? (P.bo ? 'bowls' : P.g);
    mode = 'page';
    pageP = P;
    hideSeats();
    reveal.leave();
    for (const b of Object.values(bears)) b.group.visible = false;
    setActive(id);
    me.group.visible = true;
    me.body.position.set(0, 0, 0);
    me.group.rotation.set(0, 0, 0);
    active.enter(P);
    placeMeter(active.meter);
    meter.setBand(P.c0, P.w, perfectRadius(P.w, P.pr));
    meter.snap(P.page.falls ? 1 : 0);
    meter.setGhost(null);
    lastFrame = active.frame;
    goFrame(active.frame, glide);
    rig.sway = 1;
    gfx.focusShadow(new THREE.Vector3(...active.frame.target), Math.max(2.5, active.frame.radius * 2.2));
    gfx.setTilt(0);
    return active;
  }

  /** The cottage from the front (the title), drifting. */
  function showTitle({ glide = 0 } = {}) {
    mode = 'title';
    setActive(null);
    hideSeats();
    for (const b of Object.values(bears)) b.group.visible = false;
    reveal.hide();
    // Goldi on the path to the front door, looking at the cottage.
    me.group.visible = true;
    me.place(-1.4, -0.3, 3.1, 0.25);
    me.play(ANIM.wave, { then: ANIM.idle });
    goFrame({ target: [0.2, 1.05, -0.3], from: [0.02, 0.2, 1], radius: 6.2, fov: 30 }, glide);
    rig.sway = 2.5;
    gfx.focusShadow(new THREE.Vector3(0, 0, -0.5), 11);
  }

  // ---------------------------------------------------------------- seats: the table in the lobby, the reveal's crowd, the podium
  const seatPool = new Map();
  function seatChar(key, def) {
    let ch = seatPool.get(key);
    if (!ch || ch.defKey !== def.key) {
      if (ch) {
        scene.remove(ch.group);
        cast.splice(cast.indexOf(ch), 1);
      }
      ch = make(def);
      ch.defKey = def.key;
      seatPool.set(key, ch);
    }
    return ch;
  }
  function hideSeats() {
    for (const ch of seatPool.values()) ch.group.visible = false;
  }
  function seatHat(ch, id) {
    if ((ch.hatId ?? '') === id) return;
    if (ch.hatMesh) ch.hatMesh.parent?.remove(ch.hatMesh);
    ch.hatMesh = null;
    ch.hatId = id;
    if (id) {
      try {
        ch.hatMesh = attachHat(ch, makeHat(id), { up: 0.4 });
      } catch {}
    }
  }
  let lobbyChars = [];
  const _p = new THREE.Vector3();
  /** Where the lobby's people's heads are on the screen (px), for their name tags. */
  function lobbyTags() {
    if (mode !== 'lobby') return [];
    const el = gfx.renderer.domElement;
    const W = el.clientWidth || window.innerWidth;
    const H = el.clientHeight || window.innerHeight;
    return lobbyChars.map((ch) => {
      ch.headAt(_p);
      _p.y += 0.2;
      _p.project(camera);
      return { x: (_p.x * 0.5 + 0.5) * W, y: (-_p.y * 0.5 + 0.5) * H, on: _p.z < 1 };
    });
  }

  // The lobby: around the bears' table. Behind it (seated), at its ends, in front corners (standing).
  const TABLE = { x: -2.65, z: -0.75, top: 0.55 };
  const LOBBY_SPOTS = [
    { x: -3.25, z: -1.55, ry: 0, sit: true },
    { x: -2.65, z: -1.55, ry: 0, sit: true },
    { x: -2.05, z: -1.55, ry: 0, sit: true },
    { x: -3.95, z: -0.55, ry: Math.PI / 2 - 0.3, sit: false },
    { x: -1.35, z: -0.55, ry: -Math.PI / 2 + 0.3, sit: false },
    { x: -3.6, z: 0.35, ry: 0.35, sit: false },
    { x: -1.7, z: 0.35, ry: -0.35, sit: false },
    { x: -2.65, z: 0.55, ry: 0, sit: false },
  ];
  /**
   * The lobby: people = [{ key, def (a CHARACTERS/FOLK look with key), name, ready, me }]; up to 8.
   */
  function showLobby(people, { glide = 1.0 } = {}) {
    mode = 'lobby';
    setActive(null);
    hideSeats();
    me.group.visible = false;
    for (const b of Object.values(bears)) b.group.visible = false;
    reveal.hide();
    lobbyChars = [];
    people.slice(0, 8).forEach((p, i) => {
      const spot = LOBBY_SPOTS[i];
      const ch = p.me ? me : seatChar(`seat${i}`, p.def);
      if (!p.me) seatHat(ch, p.hat ?? '');
      lobbyChars.push(ch);
      ch.place(spot.x, 0, spot.z, spot.ry);
      ch.group.visible = true;
      const want = p.ready ? ANIM.yes : spot.sit ? ANIM.sit : ANIM.idle;
      if (spot.sit) {
        if (ch.currentName !== ANIM.sit && ch.currentName !== ANIM.sitEat) ch.play(ANIM.sit, { fade: 0 });
      } else if (p.ready && ch.lastReady !== true) ch.play(ANIM.wave, { then: ANIM.idle });
      else if (ch.currentName === '' || (!p.ready && ch.currentName === ANIM.yes)) ch.play(ANIM.idle);
      ch.lastReady = !!p.ready;
      void want;
    });
    goFrame({ target: [TABLE.x, 0.72, TABLE.z - 0.2], from: [0, 0.42, 1], radius: 1.65, fov: 32 }, glide);
    rig.sway = 1.5;
    gfx.focusShadow(new THREE.Vector3(TABLE.x, 0, TABLE.z), 4);
  }

  // ---------------------------------------------------------------- the reveal: everyone's spoon on one giant meter
  const reveal = createReveal(scene, gfx);
  function showReveal(P, marks, opts = {}) {
    mode = 'reveal';
    setActive(null);
    meter.group.visible = false;
    reveal.set(P, marks, opts);
    hideSeats();
    me.group.visible = false;
    goFrame({ target: [reveal.at.x, reveal.at.y + 0.1, reveal.at.z], from: [0, 0.1, 1], radius: 1.35, fov: 30 }, 0.7);
    rig.sway = 0.5;
  }

  // ---------------------------------------------------------------- the podium: the winner in the just-right chair, the bears come home
  function showPodium(rows) {
    mode = 'podium';
    setActive(null);
    hideSeats();
    reveal.hide();
    me.group.visible = false;
    // The winner in the little chair, front and centre; the rest stand behind and beside it, like a photograph.
    const chairSt = stations.chair;
    const seat = chairSt?.rest?.(0.35) ?? { x: 2.03, z: -0.72, ry: 0.35 };
    const spots = [
      { x: seat.x, z: seat.z, ry: seat.ry },
      { x: 1.4, z: -1.15, ry: 0.25 },
      { x: 2.65, z: -1.15, ry: -0.25 },
      { x: 0.9, z: -0.85, ry: 0.45 },
      { x: 3.2, z: -0.85, ry: -0.45 },
      { x: 0.6, z: -0.35, ry: 0.6 },
      { x: 3.5, z: -0.35, ry: -0.6 },
      { x: 0.45, z: 0.15, ry: 0.7 },
    ];
    rows.slice(0, 8).forEach((r, i) => {
      const ch = r.me ? me : seatChar(`seat${i}`, r.def);
      if (!r.me) seatHat(ch, r.hat ?? '');
      const sp = spots[i];
      ch.place(sp.x, 0, sp.z, sp.ry);
      ch.group.visible = true;
      if (i === 0) ch.play(ANIM.sit, { fade: 0 }); else ch.play(i < 3 ? ANIM.wave : ANIM.yes, { then: ANIM.idle });
    });
    // The bears walk in from the dining room.
    bears.papa.place(-0.2, 0, -0.55, Math.PI / 2);
    bears.mama.place(-0.8, 0, -0.35, Math.PI / 2);
    bears.baby.place(-1.4, 0, -0.75, Math.PI / 2);
    for (const b of Object.values(bears)) b.play(ANIM.walk);
    podiumT = 0;
    goFrame({ target: [1.9, 0.8, -0.25], from: [0, 0.32, 1], radius: 1.9, fov: 32 }, 1.1);
    rig.sway = 1.2;
    gfx.focusShadow(new THREE.Vector3(1.9, 0, -0.3), 4.5);
  }
  let podiumT = 0;

  // ---------------------------------------------------------------- the bears coming home (Before the Bears)
  /** How many bears are home (0-3): they stand in the doorway of the room on show, watching. */
  let bearsHome = 0;
  function setBearsHome(n, { burst = false } = {}) {
    const prev = bearsHome;
    bearsHome = Math.max(0, Math.min(3, n));
    house.door(bearsHome > 0 ? 0.85 : 0);
    if (burst && bearsHome > prev) bearArrives(bearsHome - 1);
  }
  let bearScare = null;
  function bearArrives(i) {
    const b = [bears.papa, bears.mama, bears.baby][i];
    bearScare = { b, t: 0, i };
    house.door(0.85, { bang: true });
    sound('growl', { kind: ['papa', 'mama', 'baby'][i] });
    ctx.shake(0.4, 1, 0.6);
  }
  let spotsKey = '';
  let spotsNow = [];
  function placeHomeBears() {
    if (mode !== 'page' || !active) {
      return;
    }
    const list = [bears.papa, bears.mama, bears.baby];
    const key = `${activeId}|${bearScare ? bearScare.i : -1}|${fitAspect ?? camera.aspect}`;
    if (key !== spotsKey) {
      spotsKey = key;
      spotsNow = bearSpots(activeId, active.frame, bearScare ? bearScare.i : -1);
    }
    const spots = spotsNow;
    for (let i = 0; i < 3; i++) {
      const b = list[i];
      if (i >= bearsHome && !(bearScare && bearScare.i === i)) {
        b.group.visible = false;
        continue;
      }
      // One that came in on this page stays where it landed.
      if (b.group.visible && b.homeFor === activeId) continue;
      if (!spots[i]) {
        b.group.visible = false;
        b.homeFor = null;
        continue;
      }
      {
        const [x, y, z, ry] = spots[i];
        b.place(x, y, z, ry);
        b.homeFor = activeId;
        b.play(ANIM.idle);
      }
    }
  }
  /** Where the bears stand when they're home: at the edges of the page's picture, looking on. */
  const OUTDOOR_BEARS = {
    jar: [[-10.95, -0.3, 1.65, -0.9], [-10.45, -0.3, 2.45, -0.7], [-10.75, -0.3, 3.2, -0.5]],
    bell: [[23.05, -0.3, 1.0, -0.8], [23.55, -0.3, 0.2, -0.9], [22.75, -0.3, 1.85, -0.6]],
    swing: [[10.9, -0.3, 0.2, 0.9], [10.35, -0.3, 0.95, 0.8], [11.15, -0.3, 1.6, 0.6]],
  };
  /**
   * Indoors: searched against the page's own framing, so the bears loom at the edges of the picture, never between the
   * camera and the page: Papa at one edge, Mama at the other, Baby a little deeper in. A bear with no such place on this
   * page stays out of the picture (null), except the one arriving, which takes the nearest place there is.
   */
  const BEAR_WANT = [
    { sx: -0.95, deeper: 0.15 },
    { sx: 0.95, deeper: 0.15 },
    { sx: 0.7, deeper: 0.5 },
  ];
  const _bf = new THREE.Vector3();
  const _br = new THREE.Vector3();
  const _bv = new THREE.Vector3();
  function bearSpots(id, f, arriving = -1) {
    if (OUTDOOR_BEARS[id]) return OUTDOOR_BEARS[id];
    const aspect = fitAspect ?? camera.aspect ?? 16 / 9;
    const fr = framing(f, aspect);
    _bf.subVectors(fr.look, fr.pos);
    _bf.y = 0;
    _bf.normalize();
    _br.set(-_bf.z, 0, _bf.x);
    const tanH = Math.tan(THREE.MathUtils.degToRad(fr.fov ?? 32) / 2) * aspect;
    const [tx, , tz] = f.target;
    const tDepth = (tx - fr.pos.x) * _bf.x + (tz - fr.pos.z) * _bf.z;
    const room = Object.values(ROOM).find(([a, b2]) => tx >= a && tx <= b2) ?? [-9.4, 9.0];
    const out = [];
    BEAR_WANT.forEach((want, i) => {
      let best = null;
      let bestScore = Infinity;
      const strict = i !== arriving;
      for (let x = room[0] + 0.45; x <= room[1] - 0.45; x += 0.12) {
        for (let z = BACK + 0.4; z <= FRONT - 0.4; z += 0.12) {
          _bv.set(x - fr.pos.x, 0, z - fr.pos.z);
          const depth = _bv.dot(_bf);
          if (depth < 1) continue;
          const sx = _bv.dot(_br) / (depth * tanH);
          const near = Math.hypot(x - tx, z - tz);
          if (strict && (depth < tDepth + want.deeper || Math.abs(sx) < 0.6 || Math.abs(sx) > 1.2 || near < 0.8)) continue;
          let score = Math.abs(sx - want.sx) * 3 + Math.max(0, tDepth + want.deeper - depth) * 4 + Math.max(0, 0.9 - near) * 6;
          for (const o of out) if (o) score += Math.max(0, 0.75 - Math.hypot(x - o[0], z - o[2])) * 8;
          if (score < bestScore) {
            bestScore = score;
            best = [x, z];
          }
        }
      }
      if (!best && !strict) best = [Math.max(room[0] + 0.4, Math.min(room[1] - 0.4, tx + (i === 0 ? -1.2 : 1.2))), BACK + 0.45];
      // Turned to watch Goldi.
      out.push(best ? [best[0], 0, best[1], Math.atan2(tx - best[0], tz - best[1])] : null);
    });
    return out;
  }

  // ---------------------------------------------------------------- the player's look (Wardrobe)
  let hat = null;
  function setLook(charId, hatId) {
    if (meLook.char !== charId) {
      const def = CHARACTERS[charId] ?? CHARACTERS.goldi;
      const old = me;
      scene.remove(old.group);
      cast.splice(cast.indexOf(old), 1);
      me = make(def);
      // The new one stands where the old one stood, doing what it did.
      me.group.position.copy(old.group.position);
      me.group.rotation.copy(old.group.rotation);
      me.group.visible = old.group.visible;
      if (old.currentName) me.play(old.currentName, { fade: 0 });
      const i = lobbyChars.indexOf(old);
      if (i >= 0) lobbyChars[i] = me;
      hat = null;
    }
    if (meLook.hat !== hatId || !hat) {
      if (hat) hat.parent?.remove(hat);
      hat = hatId ? attachHat(me, makeHat(hatId), { up: 0.4 }) : null;
    }
    meLook = { char: charId, hat: hatId };
  }

  // ---------------------------------------------------------------- the Wardrobe: Goldi by the parlour fire, turning to show off
  let wardT = 0;
  function showWardrobe({ glide = 0.9 } = {}) {
    mode = 'wardrobe';
    setActive(null);
    hideSeats();
    reveal.hide();
    for (const b of Object.values(bears)) b.group.visible = false;
    me.group.visible = true;
    me.body.position.set(0, 0, 0);
    me.place(2.15, 0, -0.55, 0);
    me.play(ANIM.wave, { then: ANIM.idle });
    wardT = 0;
    goFrame({ target: [2.15, 0.36, -0.55], from: [0, 0.18, 1], radius: 0.62, fov: 30 }, glide);
    rig.sway = 0.6;
    gfx.focusShadow(new THREE.Vector3(2.15, 0, -0.6), 2.5);
  }
  /** The player tried something on: a little hop and a turn. */
  function admire() {
    if (mode !== 'wardrobe') return;
    me.play(ANIM.yes, { then: ANIM.idle });
    me.jumpUp(1.6);
    fx.emit(14, 2.15, 0.75, -0.5, { shape: SHAPE.spark, color: [PAL.gold, '#fff6d0'], speed: 1.2, spread: 1.2, size: [0.04, 0.08], life: [0.5, 0.9], drag: 2.5, additive: true, gravity: -0.3 });
  }

  // ---------------------------------------------------------------- faces (portraits as textures, for the reveal's tokens)
  const faceCache = new Map();
  const loader = new THREE.TextureLoader();
  function faceTexture(url) {
    if (!url) return null;
    let t = faceCache.get(url);
    if (!t) {
      t = loader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      faceCache.set(url, t);
    }
    return t;
  }

  // ---------------------------------------------------------------- frame
  let quality = 'high';
  function update(realDt, st) {
    // Hit-stop freezes the pictures; slow motion stretches them.
    let dt = realDt;
    if (hit > 0) {
      hit -= realDt;
      dt = 0;
    } else if (slowLeft > 0) {
      slowLeft -= realDt;
      dt = realDt * slow;
    }
    vclock += dt;
    for (let i = timers.length - 1; i >= 0; i--) {
      if (vclock >= timers[i].at) {
        const t = timers[i];
        timers.splice(i, 1);
        try {
          t.fn();
        } catch (e) {
          console.error(e);
        }
      }
    }
    if (mode === 'page' && active && st) {
      const s2 = { ...st, t: vclock };
      active.update(dt, s2);
      meter.setValue(st.v);
      meter.setBand(st.c, st.w, perfectRadius(st.w, st.P?.pr));
      meter.setHolding(st.holding);
      if (st.ghost !== undefined && st.ghost !== null) meter.setGhost(st.ghost);
      // Push in while holding.
      rig.push = st.holding ? Math.min(1, 0.4 + st.v) : 0;
      // Follow a flying Goldi.
      const fol = active.follow?.();
      if (fol && lastFrame) {
        const f = rig.frame({ target: [fol.x * 0.6 + lastFrame.target[0] * 0.4, Math.max(0.6, fol.y * 0.5 + 0.8), lastFrame.target[2]], from: lastFrame.from, radius: lastFrame.radius * 0.8, fov: 32 });
        if (!rig.moving) rig.go(f, 0.35);
      }
      placeHomeBears();
    } else rig.push = 0;
    if (bearScare) {
      bearScare.t += dt;
      const b = bearScare.b;
      if (bearScare.t < dt * 1.5) {
        b.group.visible = true;
        b.play(ANIM.hit, { then: ANIM.idle });
        b.jumpUp(2.2);
      }
      if (bearScare.t > 1.2) bearScare = null;
    }
    if (mode === 'wardrobe') {
      wardT += dt;
      if (!reduced()) me.group.rotation.y = Math.sin(wardT * 0.55) * 0.55;
    }
    if (mode === 'podium') {
      podiumT += dt;
      const list = [bears.papa, bears.mama, bears.baby];
      list.forEach((b, i) => {
        const k = Math.min(1, Math.max(0, (podiumT - 0.6 - i * 0.25) / 2.2));
        const x0 = -0.2 - i * 0.6;
        // Papa out in the room, Mama just through the arch, Baby peeking from the doorway.
        b.group.position.x = x0 + k * (0.65 + i * 0.2);
        if (k >= 1 && b.currentName === ANIM.walk) {
          b.group.rotation.y = 0.6;
          b.play(i === 0 ? ANIM.no : i === 1 ? ANIM.wave : ANIM.yes, { then: ANIM.idle });
        }
      });
      if (podiumT > 1 && podiumT < 1 + dt * 1.5) fx.emit(60, 2.25, 2.2, -0.4, { shape: SHAPE.confetti, color: [PAL.red, PAL.honey, PAL.green, PAL.cold, PAL.cream], speed: 2, spread: 1.4, size: [0.04, 0.07], life: [2, 3], gravity: 1.5, drag: 1.5, spin: 8, wobble: 2, floor: 0.01 });
    }
    reveal.update(dt, vclock);
    for (const c of cast) if (c.group.visible) c.update(dt);
    fx.update(dt);
    house.update(dt, vclock, camera);
    meter.update(dt, vclock);
    rig.reduced = reduced();
    rig.update(dt);
  }

  function setQuality(q) {
    quality = q;
    fx.setQuality(q);
    house.setQuality(q);
  }

  return {
    house,
    fx,
    rig,
    meter,
    bears,
    stations,
    ctx,
    get me() {
      return me;
    },
    get mode() {
      return mode;
    },
    get activeId() {
      return activeId;
    },
    get vclock() {
      return vclock;
    },
    showPage,
    showTitle,
    showLobby,
    showReveal,
    showPodium,
    setBearsHome,
    setLook,
    setQuality,
    /** Slow motion: `scale` of real time for `seconds`. */
    slowmo(scale, seconds) {
      if (reduced()) return;
      slow = scale;
      slowLeft = seconds;
    },
    hitstop: ctx.hitstop,
    shake: ctx.shake,
    punch: ctx.punch,
    later: ctx.later,
    stationFor: (P) => stations[P.bo ? 'bowls' : P.g],
    update,
    frameFor: (f, aspect) => framing(f, aspect),
    /** Fit the framing on show again (the screen or its window changed). */
    refit(glide = 0.3) {
      if (shot) rig.go(framing(shot), glide);
    },
    /** Compile every material the pages will need (hidden stations too), so nothing pops in on the first visit. */
    warm() {
      const hidden = [];
      const show = (o) => {
        if (o && !o.visible) {
          o.visible = true;
          hidden.push(o);
        }
      };
      for (const st of Object.values(stations)) if (st && st.group) show(st.group);
      for (const b of Object.values(bears)) show(b.group);
      show(meter.group);
      show(reveal.group);
      try {
        gfx.renderer.compile(scene, camera);
      } catch {}
      for (const o of hidden) o.visible = false;
    },
    setAspect(a) {
      fitAspect = a;
    },
    showWardrobe,
    admire,
    lobbyTags,
    faceTexture,
  };
}

/** The reveal: a giant meter lying across the parlour with everyone's spoon on it, dropping in from the worst to the best. */
function createReveal(scene, gfx) {
  const group = new THREE.Group();
  scene.add(group);
  group.visible = false;
  const at = new THREE.Vector3(2.1, 1.1, -1.2);
  group.position.copy(at);
  const meter = createMeter();
  meter.setAxis('right');
  meter.group.scale.setScalar(1.55);
  meter.group.position.set(0, -0.32, 0);
  group.add(meter.group);
  const L = 1.3 * 1.55;
  const tokens = [];
  const tokenGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.025, 28);
  const rimMat = new THREE.MeshStandardMaterial({ color: '#d4a24c', metalness: 0.8, roughness: 0.3 });
  const crown = makeHat('crown');
  crown.scale.setScalar(2.2);
  crown.visible = false;
  group.add(crown);
  let list = [];
  let t0 = 0;
  let now = 0;
  let leftAt = -1;
  const DROP = 0.32;
  const FIRST = 0.45;
  return {
    at,
    group,
    DROP,
    FIRST,
    /** marks: [{ v, k, face (image|null), color, me }] sorted worst first. */
    set(P, marks, { faces = [] } = {}) {
      group.visible = true;
      leftAt = -1;
      group.scale.setScalar(1);
      group.position.copy(at);
      meter.setBand(P.c0, P.w, Math.min(0.02, P.w / 2));
      meter.snap(P.c0);
      meter.setValue(P.c0);
      for (const t of tokens) t.visible = false;
      list = marks.map((m, i) => {
        let tok = tokens[i];
        if (!tok) {
          tok = new THREE.Group();
          const rim = new THREE.Mesh(tokenGeo, rimMat);
          rim.rotation.x = Math.PI / 2;
          const faceMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
          const face = new THREE.Mesh(new THREE.CircleGeometry(0.064, 28), faceMat);
          face.position.z = 0.014;
          const ring = new THREE.Mesh(new THREE.RingGeometry(0.064, 0.075, 28), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
          ring.position.z = 0.0145;
          const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 6), rimMat);
          stick.position.y = -0.13;
          tok.add(rim, face, ring, stick);
          tok.userData = { face, faceMat, ring };
          group.add(tok);
          tokens[i] = tok;
        }
        tok.visible = true;
        const tex = faces[i] ?? null;
        tok.userData.faceMat.map = tex;
        tok.userData.faceMat.color.set(tex ? '#ffffff' : m.color ?? '#cccccc');
        tok.userData.faceMat.needsUpdate = true;
        tok.userData.ring.material.color.set(m.me ? PAL.red : m.k === 'perfect' ? PAL.gold : '#ffffff');
        const x = -L / 2 + Math.max(0, Math.min(1, m.v)) * L;
        // Stack tokens that land close together.
        let lift = 0;
        for (let j = 0; j < i; j++) if (Math.abs(list[j]?.x - x) < 0.13) lift = Math.max(lift, list[j].lift + 0.15);
        return { tok, x, lift, k: m.k, me: m.me };
      });
      t0 = now;
      crown.visible = false;
    },
    hide() {
      group.visible = false;
      leftAt = -1;
    },
    /** Folds away (up and small) while the camera glides off to the next page. */
    leave() {
      if (group.visible && leftAt < 0) leftAt = now;
    },
    /** Seconds since it began. */
    get age() {
      return now - t0;
    },
    update(dt, clock) {
      now = clock;
      if (!group.visible) return;
      if (leftAt >= 0) {
        const k = Math.min(1, (now - leftAt) / 0.45);
        const e = k * k * (3 - 2 * k);
        group.scale.setScalar(Math.max(0.001, 1 - e));
        group.position.set(at.x, at.y + e * 0.5, at.z);
        if (k >= 1) {
          group.visible = false;
          leftAt = -1;
          return;
        }
      }
      meter.update(dt, clock);
      const age = now - t0;
      list.forEach((m, i) => {
        const k = Math.max(0, Math.min(1, (age - FIRST - i * DROP) / 0.35));
        const y = 0.28 + m.lift + (1 - k) * 0.9 - Math.sin(Math.min(1, k * 1.2) * Math.PI) * 0.0;
        m.tok.position.set(m.x, y + (k >= 1 ? Math.sin(clock * 2 + i) * 0.006 : 0), m.k === 'asleep' ? 0.12 : 0.02 + i * 0.002);
        m.tok.scale.setScalar(k <= 0 ? 0.001 : 0.6 + 0.4 * Math.min(1, k * 1.3) + (k > 0.8 && k < 1 ? 0.15 : 0));
        m.tok.visible = k > 0;
      });
      const last = list[list.length - 1];
      if (last && age > FIRST + list.length * DROP + 0.1 && (last.k === 'perfect' || last.k === 'good')) {
        crown.visible = true;
        crown.position.set(last.x, 0.28 + last.lift + 0.12, 0.03);
        crown.rotation.y = Math.sin(clock * 2) * 0.3;
      }
    },
  };
}
