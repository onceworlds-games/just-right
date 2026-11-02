// A character on the stage: a skinned cast member with an AnimationMixer, crossfaded clips, scrubbed poses (a sit-down driven
// by the gauge), a little procedural life on top (breathing, a head that turns to look) and squash and stretch on its root.
import * as THREE from 'three';

/** The kit's clip names, by what we use them for. */
export const ANIM = {
  idle: 'Idle',
  hold: 'Idle_Holding',
  walk: 'Walk',
  walkHold: 'Walk_Holding',
  run: 'Run',
  jump: 'Jump',
  jumpIdle: 'Jump_Idle',
  land: 'Jump_Land',
  hit: 'HitReact',
  fall: 'Death',
  duck: 'Duck',
  yes: 'Yes',
  no: 'No',
  wave: 'Wave',
  punch: 'Punch',
  sitStart: 'Sitting_Start',
  sit: 'Sitting_Idle',
  sitEat: 'Sitting_Eating',
  sitEnd: 'Sitting_End',
  sword: 'Sword',
  runHold: 'Run_Holding',
  panStart: 'Pan_Start',
  pan: 'Pan_Loop',
  panEnd: 'Pan_End',
  chopStart: 'Chop_Start',
  chop: 'Chop_Loop',
  chopEnd: 'Chop_End',
  buildStart: 'Assembly_Start',
  build: 'Assembly_Loop',
  buildEnd: 'Assembly_End',
};
const _va = new THREE.Vector3();
const _vb = new THREE.Vector3();
const ONCE = new Set(['Sword', 'Jump', 'Jump_Land', 'HitReact', 'Death', 'Yes', 'No', 'Wave', 'Punch', 'Sitting_Start', 'Sitting_End', 'Pan_Start', 'Pan_End', 'Chop_Start', 'Chop_End', 'Assembly_Start', 'Assembly_End', 'Duck']);

/** Blinking on (the store art and dev pictures turn it off, so a still never catches closed eyes). */
export const LIFE = { blink: true, closed: false };

export class Character {
  constructor(assets, kind, look, { scale = 1, name = '' } = {}) {
    this.assets = assets;
    this.kind = kind;
    this.name = name;
    this.group = new THREE.Group();
    this.body = new THREE.Group(); // squash and stretch, hops
    this.group.add(this.body);
    this.model = assets.character(kind, look);
    this.body.add(this.model);
    this.baseScale = scale;
    this.group.scale.setScalar(scale);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = new Map();
    this.current = null;
    this.currentName = '';
    this.queue = null;
    this.squash = 0; // >0 squashes, <0 stretches, springs back
    this.squashV = 0;
    this.hop = 0;
    this.hopV = 0;
    this.head = null;
    this.bones = {};
    this.eyes = [];
    this.model.traverse((o) => {
      if (o.isBone) this.bones[o.name] = o;
      if (o.isBone && o.name === 'Head') this.head = o;
      if (o.isMesh && /^Eyes/.test(o.name)) this.eyes.push(o);
    });
    // Blinks: the eyes close for a few frames every few seconds (now and then twice).
    this.blinkIn = 1 + Math.random() * 3;
    this.blinkFor = 0;
    // Three's loader drops the dots: Middle1.R is Middle1R.
    this.handL = this.bones.Middle1L ?? this.bones.LowerArmL ?? null;
    this.handR = this.bones.Middle1R ?? this.bones.LowerArmR ?? null;
    this.headRest = this.head ? this.head.quaternion.clone() : null;
    this.lookYaw = 0;
    this.lookTarget = 0;
    this.time = Math.random() * 10;
    this.scrubbing = null;
    this.mixer.addEventListener('finished', (e) => {
      if (this.queue && e.action === this.current) {
        const q = this.queue;
        this.queue = null;
        this.play(q.name, q.opts);
      }
    });
  }

  action(name) {
    let a = this.actions.get(name);
    if (!a) {
      const clip = this.assets.clips.get(name);
      if (!clip) return null;
      a = this.mixer.clipAction(clip);
      if (ONCE.has(name)) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      this.actions.set(name, a);
    }
    return a;
  }

  /** Crossfades to a clip. opts: { fade (s), speed, then: name to play after a one-shot, restart, at: start 0-1 in } */
  play(name, opts = {}) {
    const a = this.action(name);
    if (!a) return;
    const fade = opts.fade ?? 0.22;
    this.scrubbing = null;
    if (this.current === a && !opts.restart) {
      a.timeScale = opts.speed ?? 1;
      a.paused = false;
      return;
    }
    a.reset();
    a.enabled = true;
    a.paused = false;
    a.timeScale = opts.speed ?? 1;
    a.setEffectiveWeight(1);
    if (this.current && this.current !== a) a.crossFadeFrom(this.current, fade, true);
    a.play();
    if (opts.at > 0) a.time = Math.min(0.999, opts.at) * a.getClip().duration;
    this.current = a;
    this.currentName = name;
    this.queue = opts.then ? { name: opts.then, opts: { fade: opts.thenFade ?? 0.25 } } : null;
  }

  /** Holds a clip at a fraction of its length (0-1), for poses driven by the game (sitting down by the gauge). */
  scrub(name, k, fade = 0.15) {
    const a = this.action(name);
    if (!a) return;
    if (this.current !== a) {
      a.reset();
      a.enabled = true;
      a.setEffectiveWeight(1);
      if (this.current) a.crossFadeFrom(this.current, fade, true);
      a.play();
      this.current = a;
      this.currentName = name;
      this.queue = null;
    }
    a.paused = true;
    a.time = Math.max(0, Math.min(1, k)) * a.getClip().duration * 0.999;
    this.scrubbing = name;
  }

  /** World position between the two hands (where a held thing goes). */
  hands(out = new THREE.Vector3()) {
    if (!this.handL || !this.handR) return this.group.getWorldPosition(out);
    const a = this.handL.getWorldPosition(_va);
    const b = this.handR.getWorldPosition(_vb);
    return out.addVectors(a, b).multiplyScalar(0.5);
  }
  /** World position of one hand ('L' or 'R'). */
  hand(side = 'R', out = new THREE.Vector3()) {
    const b = side === 'L' ? this.handL : this.handR;
    return b ? b.getWorldPosition(out) : this.group.getWorldPosition(out);
  }
  /** World position of the head bone (for breath, steam from the ears, a hat). */
  headAt(out = new THREE.Vector3()) {
    return this.head ? this.head.getWorldPosition(out) : this.group.getWorldPosition(out);
  }
  /** Puts it somewhere, facing ry. */
  place(x, y, z, ry = 0) {
    this.group.position.set(x, y, z);
    this.group.rotation.set(0, ry, 0);
    this.group.visible = true;
    return this;
  }
  /** A springy squash (positive) or stretch (negative). */
  kick(amount) {
    this.squashV += amount * 9;
  }
  jumpUp(v = 2.4) {
    this.hopV = v;
  }
  /** Turns the head toward a yaw (radians) on top of the clip. */
  look(yaw) {
    this.lookTarget = Math.max(-0.7, Math.min(0.7, yaw));
  }

  update(dt) {
    this.time += dt;
    if (this.head) this.head.quaternion.copy(this.headRest);
    this.mixer.update(dt);
    // Spring for squash: x'' = -k x - c x'
    const k = 220;
    const c = 16;
    this.squashV += (-k * this.squash - c * this.squashV) * dt;
    this.squash += this.squashV * dt;
    const s = Math.max(-0.35, Math.min(0.35, this.squash));
    this.body.scale.set(1 + s * 0.6, 1 - s, 1 + s * 0.6);
    // Hop: simple gravity.
    if (this.hop > 0 || this.hopV !== 0) {
      this.hopV -= 14 * dt;
      this.hop += this.hopV * dt;
      if (this.hop <= 0) {
        this.hop = 0;
        if (this.hopV < -1) this.kick(Math.min(0.25, -this.hopV * 0.05));
        this.hopV = 0;
      }
    }
    this.body.position.y = this.hop;
    if (this.eyes.length) {
      this.blinkIn -= dt;
      if (this.blinkIn <= 0 && LIFE.blink) {
        this.blinkFor = 0.11;
        this.blinkIn = Math.random() < 0.2 ? 0.22 : 2.2 + Math.random() * 3.5;
      }
      this.blinkFor -= dt;
      const open = (this.blinkFor <= 0 || !LIFE.blink) && !LIFE.closed;
      if (this.eyes[0].visible !== open) for (const e of this.eyes) e.visible = open;
    }
    // Head look, added after the mixer wrote the pose.
    this.lookYaw += (this.lookTarget - this.lookYaw) * Math.min(1, dt * 6);
    if (this.head && Math.abs(this.lookYaw) > 0.001) this.head.rotateY(this.lookYaw);
  }
}
