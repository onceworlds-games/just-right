// The camera: it glides between framings (eased, with a little settle), pushes in while a hold builds, punches in on big
// moments, and shakes from a decaying trauma (shake = trauma², smooth noise, never fresh random jitter). Framings fit a
// box of interest to any aspect, so phones held upright and wide screens both see the whole page.
import * as THREE from 'three';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Smooth 1D noise from a few sines (deterministic, cheap). */
const noise = (t, seed) => Math.sin(t * 1.7 + seed) * 0.5 + Math.sin(t * 3.1 + seed * 2.3) * 0.3 + Math.sin(t * 5.9 + seed * 0.7) * 0.2;

export function createCamRig(camera) {
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const from = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 32 };
  const to = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 32 };
  let t = 1;
  let dur = 1;
  let fov = 32;
  let trauma = 0;
  let push = 0; // 0..1 slow push-in while holding
  let pushNow = 0;
  let punch = 0; // quick punch-in, decays
  let clock = 0;
  let reduced = false;
  let sway = 1;
  const tmp = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const shakeDir = new THREE.Vector2(1, 0.6);

  /**
   * A framing: look at `target`, from direction `dir` (unit-ish, from the target toward the camera), far enough to fit a
   * sphere of `radius` (and `height`/`width` boxes) at this aspect.
   */
  function frame({ target, from: fromDir, radius = 2, fov: f = 32, lift = 0, aspect }) {
    const a = aspect ?? camera.aspect;
    const vf = THREE.MathUtils.degToRad(f);
    const hf = 2 * Math.atan(Math.tan(vf / 2) * a);
    const fit = Math.min(vf, hf);
    const dist = radius / Math.sin(fit / 2);
    const d = tmp.set(fromDir[0], fromDir[1], fromDir[2]).normalize();
    return { pos: new THREE.Vector3(target[0], target[1] + lift, target[2]).addScaledVector(d, dist), look: new THREE.Vector3(target[0], target[1], target[2]), fov: f };
  }

  return {
    frame,
    /** Glide to a framing over `seconds` (0: cut). */
    go(f, seconds = 0.9) {
      from.pos.copy(pos);
      from.look.copy(look);
      from.fov = fov;
      to.pos.copy(f.pos);
      to.look.copy(f.look);
      to.fov = f.fov ?? fov;
      dur = Math.max(0.0001, seconds);
      t = seconds <= 0 ? 1 : 0;
      if (seconds <= 0) {
        pos.copy(to.pos);
        look.copy(to.look);
        fov = to.fov;
      }
    },
    get moving() {
      return t < 1;
    },
    shake(amount, dx = 1, dy = 0.6) {
      if (reduced) return;
      trauma = Math.min(1, trauma + amount);
      shakeDir.set(dx, dy).normalize();
    },
    punch(amount = 0.08) {
      if (reduced) return;
      punch = Math.max(punch, amount);
    },
    set push(v) {
      push = reduced ? 0 : v;
    },
    set reduced(v) {
      reduced = !!v;
      if (reduced) trauma = 0;
    },
    set sway(v) {
      sway = v;
    },
    update(dt) {
      clock += dt;
      if (t < 1) {
        t = Math.min(1, t + dt / dur);
        const k = ease(t);
        pos.lerpVectors(from.pos, to.pos, k);
        // The look point leads the position a little so the move feels steered, not slid.
        const kl = ease(Math.min(1, t * 1.15));
        look.lerpVectors(from.look, to.look, kl);
        // Arc: lift the camera through the middle of a long move.
        const dist = from.pos.distanceTo(to.pos);
        pos.y += Math.sin(Math.PI * k) * Math.min(1.2, dist * 0.12);
        fov = from.fov + (to.fov - from.fov) * k;
      }
      pushNow += (push - pushNow) * Math.min(1, dt * 2.2);
      punch = Math.max(0, punch - dt * 0.35);
      trauma = Math.max(0, trauma - dt * 1.6);
      // Place: dolly toward the look point by push and punch.
      dir.subVectors(look, pos);
      const len = dir.length();
      dir.normalize();
      const dolly = len * (pushNow * 0.07 + punch);
      camera.position.copy(pos).addScaledVector(dir, dolly);
      // Idle breathing sway.
      camera.position.x += Math.sin(clock * 0.35) * 0.03 * sway;
      camera.position.y += Math.sin(clock * 0.5 + 1) * 0.02 * sway;
      camera.lookAt(look);
      const s = trauma * trauma;
      if (s > 0.0001) {
        const ax = noise(clock * 9, 1.1) * s * 0.045 * shakeDir.x;
        const ay = noise(clock * 9, 7.3) * s * 0.045 * shakeDir.y;
        const roll = noise(clock * 7, 3.7) * s * 0.03;
        camera.rotateY(ax);
        camera.rotateX(ay);
        camera.rotateZ(roll);
      }
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    },
  };
}
