// The Just Right meter: a brass-and-glass thermometer on a painted board, standing beside every page. A glowing liquid rises
// with the page's value (blue below the band, green inside, red above), the band is a glowing green sleeve with a gold notch
// for a perfect, a snowflake and a flame mark the two ends. Sideways pages lay it down; the chair turns it upside down.
import * as THREE from 'three';
import { PAL } from '../gfx/palette.js';

const L = 1.3; // tube length
const R = 0.07;

const GLASS_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const GLASS_FRAG = /* glsl */ `
uniform vec3 tint; uniform float glow;
varying vec3 vN; varying vec3 vV;
void main() {
  float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.2);
  float spec = smoothstep(0.82, 0.98, abs(vN.x * 0.6 + vN.y * 0.3 + 0.2));
  vec3 c = tint * (0.25 + f * 1.2) + vec3(1.0) * spec * 0.9;
  gl_FragColor = vec4(c, 0.10 + f * 0.55 + spec * 0.5);
  #include <colorspace_fragment>
}`;

function paintBoard(axis) {
  const W = 128;
  const H = 768;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  // Cream enamel board with a rounded edge and a brass border.
  g.fillStyle = '#f4e6c9';
  g.beginPath();
  g.roundRect(4, 4, W - 8, H - 8, 40);
  g.fill();
  g.lineWidth = 7;
  g.strokeStyle = '#b8862e';
  g.stroke();
  // Ticks along the tube (tube runs from y=130 to y=H-80 in board space).
  const y0 = H - 92;
  const y1 = 120;
  g.strokeStyle = 'rgba(29,36,64,0.55)';
  for (let k = 0; k <= 20; k++) {
    const y = y0 + ((y1 - y0) * k) / 20;
    g.lineWidth = k % 5 === 0 ? 4 : 2;
    const w = k % 5 === 0 ? 30 : 18;
    g.beginPath();
    g.moveTo(W / 2 - 26 - w, y);
    g.lineTo(W / 2 - 26, y);
    g.moveTo(W / 2 + 26, y);
    g.lineTo(W / 2 + 26 + w, y);
    g.stroke();
  }
  const icon = (y, kind) => {
    g.save();
    g.translate(W / 2, y);
    if (axis === 'right') g.rotate(Math.PI / 2);
    if (axis === 'down') g.rotate(Math.PI);
    if (kind === 'cold') {
      g.strokeStyle = PAL.cold;
      g.lineWidth = 7;
      g.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        g.save();
        g.rotate((k * Math.PI) / 3);
        g.beginPath();
        g.moveTo(0, -26);
        g.lineTo(0, 26);
        g.moveTo(-8, -18);
        g.lineTo(0, -10);
        g.lineTo(8, -18);
        g.moveTo(-8, 18);
        g.lineTo(0, 10);
        g.lineTo(8, 18);
        g.stroke();
        g.restore();
      }
    } else {
      g.fillStyle = PAL.red;
      g.beginPath();
      g.moveTo(0, -30);
      g.bezierCurveTo(16, -10, 24, 4, 18, 18);
      g.bezierCurveTo(12, 30, -12, 30, -18, 18);
      g.bezierCurveTo(-22, 6, -12, -4, -6, -14);
      g.bezierCurveTo(-4, -4, 2, -2, 0, -30);
      g.fill();
      g.fillStyle = '#ffd36a';
      g.beginPath();
      g.ellipse(0, 14, 8, 11, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  };
  // Ends: cold at the bottom of the board, hot at the top (the board turns with the axis).
  icon(H - 40, 'cold');
  icon(58, 'hot');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createMeter() {
  const group = new THREE.Group();
  const inner = new THREE.Group(); // rotated by axis
  group.add(inner);

  const brass = new THREE.MeshStandardMaterial({ color: '#d4a24c', metalness: 0.8, roughness: 0.3 });
  const darkBrass = new THREE.MeshStandardMaterial({ color: '#8f6526', metalness: 0.7, roughness: 0.4 });

  const boards = {};
  const boardMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0 });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.95), boardMat);
  board.position.set(0, L / 2 + 0.02, -0.11);
  board.receiveShadow = true;
  inner.add(board);
  // A wooden back for the board so it reads as an object.
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.99, 0.06), new THREE.MeshStandardMaterial({ color: PAL.woodDark, roughness: 0.7 }));
  back.position.set(0, L / 2 + 0.02, -0.15);
  back.castShadow = true;
  inner.add(back);

  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.012, R + 0.012, L, 28, 1, true),
    new THREE.ShaderMaterial({ uniforms: { tint: { value: new THREE.Color('#cfe8ff') }, glow: { value: 0 } }, vertexShader: GLASS_VERT, fragmentShader: GLASS_FRAG, transparent: true, depthWrite: false }),
  );
  glass.position.y = L / 2;
  glass.renderOrder = 5;
  inner.add(glass);

  const liquidMat = new THREE.MeshStandardMaterial({ color: PAL.cold, emissive: new THREE.Color(PAL.cold), emissiveIntensity: 0.6, roughness: 0.25 });
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.012, R - 0.012, 1, 20), liquidMat);
  liquid.geometry.translate(0, 0.5, 0);
  inner.add(liquid);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(R * 1.9, 24, 16), liquidMat);
  bulb.position.y = -R * 1.2;
  bulb.castShadow = true;
  inner.add(bulb);
  const bulbRing = new THREE.Mesh(new THREE.TorusGeometry(R * 1.35, 0.022, 10, 28), brass);
  bulbRing.rotation.x = Math.PI / 2;
  bulbRing.position.y = R * 0.45;
  inner.add(bulbRing);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.35, R * 1.6, 0.12, 20), brass);
  cap.position.y = L + 0.05;
  cap.castShadow = true;
  inner.add(cap);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 16, 12), brass);
  knob.position.y = L + 0.15;
  inner.add(knob);

  // The band: a glowing green sleeve, brass rings at its edges, a gold notch at its centre.
  const bandMat = new THREE.MeshStandardMaterial({ color: PAL.green, emissive: new THREE.Color(PAL.green), emissiveIntensity: 0.9, transparent: true, opacity: 0.62, roughness: 0.4, depthWrite: false });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 1, 28, 1, true), bandMat);
  band.renderOrder = 6;
  inner.add(band);
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(R + 0.035, 0.014, 8, 28), brass);
  const ringB = ringA.clone();
  ringA.rotation.x = ringB.rotation.x = Math.PI / 2;
  inner.add(ringA, ringB);
  const notchMat = new THREE.MeshStandardMaterial({ color: PAL.gold, emissive: new THREE.Color('#ffb21a'), emissiveIntensity: 1.2, metalness: 0.5, roughness: 0.3 });
  const notch = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.04, R + 0.04, 1, 28, 1, true), notchMat);
  inner.add(notch);
  // Side tabs on the band (a check shape for colour-blind players): two little brass flags.
  const tabGeo = new THREE.BoxGeometry(0.09, 0.03, 0.03);
  const tabL = new THREE.Mesh(tabGeo, notchMat);
  const tabR = tabL.clone();
  inner.add(tabL, tabR);

  // The pointer that rides the liquid's top: a brass arrow on the right.
  const pointer = new THREE.Group();
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), darkBrass);
  arrow.rotation.z = Math.PI / 2;
  arrow.position.x = R + 0.11;
  pointer.add(arrow);
  inner.add(pointer);
  // Ghost: where it will land (a charm shows it).
  const ghostMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
  const ghost = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.012, 6, 24), ghostMat);
  ghost.rotation.x = Math.PI / 2;
  ghost.visible = false;
  inner.add(ghost);

  // A small brass stand so it stands on the floor or a counter.
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.06, 24), brass);
  foot.position.y = -0.3;
  foot.castShadow = true;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 10), brass);
  stem.position.y = -0.23;
  group.add(foot, stem);

  const cold = new THREE.Color(PAL.cold);
  const good = new THREE.Color('#58c95a');
  const hot = new THREE.Color('#e24a2c');
  const cNow = new THREE.Color();
  let axis = 'up';
  let value = 0;
  let shown = 0;
  let c = 0.5;
  let w = 0.07;
  let pr = 0.02;
  let pulse = 0;
  let glowHold = 0;
  let flash = 0;
  let flashColor = good;

  const at = (v) => v * L; // along the tube

  function setAxis(a) {
    axis = a === 'right' || a === 'down' ? a : 'up';
    inner.rotation.set(0, 0, 0);
    inner.position.set(0, 0, 0);
    foot.visible = stem.visible = axis !== 'right';
    if (axis === 'right') {
      inner.rotation.z = -Math.PI / 2;
      inner.position.set(-L / 2, 0.28, 0);
    } else if (axis === 'down') {
      inner.rotation.z = Math.PI;
      inner.position.set(0, L + 0.02, 0);
    }
    let tex = boards[axis];
    if (!tex) tex = boards[axis] = paintBoard(axis);
    boardMat.map = tex;
    boardMat.needsUpdate = true;
  }

  function layoutBand() {
    band.position.y = at(c);
    band.scale.y = Math.max(0.001, 2 * w * L);
    ringA.position.y = at(c - w);
    ringB.position.y = at(c + w);
    notch.position.y = at(c);
    notch.scale.y = Math.max(0.004, 2 * pr * L);
    tabL.position.set(-(R + 0.08), at(c), 0);
    tabR.position.set(R + 0.08, at(c), 0);
  }

  setAxis('up');
  layoutBand();

  return {
    group,
    setAxis,
    get axis() {
      return axis;
    },
    setBand(center, half, perfect) {
      c = center;
      w = half;
      pr = perfect;
      layoutBand();
    },
    setValue(v) {
      value = Math.max(0, Math.min(1, v));
    },
    snap(v) {
      value = shown = Math.max(0, Math.min(1, v));
    },
    /** The value right now (smoothed). */
    get shown() {
      return shown;
    },
    setHolding(on) {
      glowHold = on ? 1 : 0;
    },
    setGhost(v) {
      ghost.visible = v !== null && v !== undefined;
      if (ghost.visible) ghost.position.y = at(v);
    },
    /** A verdict flash: 'perfect' | 'good' | 'under' | 'over'. */
    flash(kind) {
      flash = 1;
      flashColor = kind === 'perfect' || kind === 'good' ? good : kind === 'under' ? cold : hot;
      if (kind === 'perfect') pulse = 1;
    },
    update(dt, t) {
      shown += (value - shown) * Math.min(1, dt * 30);
      liquid.scale.y = Math.max(0.0001, at(shown));
      pointer.position.y = at(shown);
      // Liquid colour: by where it is against the band.
      const d = shown - c;
      if (Math.abs(d) <= w) cNow.copy(good);
      else if (d < 0) cNow.copy(cold).lerp(good, Math.max(0, 1 - (-d - w) / 0.06));
      else cNow.copy(hot).lerp(good, Math.max(0, 1 - (d - w) / 0.06));
      liquidMat.color.copy(cNow);
      liquidMat.emissive.copy(cNow);
      liquidMat.emissiveIntensity = 0.45 + glowHold * 0.35 + flash * 1.2;
      flash = Math.max(0, flash - dt * 1.6);
      pulse = Math.max(0, pulse - dt * 1.2);
      const breathe = 0.5 + 0.5 * Math.sin(t * 4);
      bandMat.emissiveIntensity = 0.75 + breathe * 0.25 * glowHold + pulse * 2.5;
      notchMat.emissiveIntensity = 1.0 + pulse * 3 + breathe * 0.3;
      const s = 1 + pulse * 0.25;
      band.scale.x = band.scale.z = s;
    },
  };
}
