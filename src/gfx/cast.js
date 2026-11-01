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
const ONCE = new Set(['Jump', 'Jump_Land', 'HitReact', 'Death', 'Yes', 'No', 'Wave', 'Punch', 'Sitting_Start', 'Sitting_End', 'Pan_Start', 'Pan_End', 'Chop_Start', 'Chop_End', 'Assembly_Start', 'Assembly_End', 'Duck']);

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
    this.model.traverse((o) => {
      if (o.isBone && o.name === 'Head') this.head = o;
    });
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

  /** Crossfades to a clip. opts: { fade (s), speed, then: name to play after a one-shot, restart } */
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
    // Head look, added after the mixer wrote the pose.
    this.lookYaw += (this.lookTarget - this.lookYaw) * Math.min(1, dt * 6);
    if (this.head && Math.abs(this.lookYaw) > 0.001) this.head.rotateY(this.lookYaw);
  }
}
