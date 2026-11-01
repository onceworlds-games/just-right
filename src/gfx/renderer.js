// The renderer: three.js with soft sun shadows, a warm sky light, and (above low quality) a post chain of bloom, a colour
// grade (warm highlights, cool shadows, a golden mode for streaks), tilt-shift for the dollhouse feel, vignette and AgX.
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, ToneMappingEffect, ToneMappingMode, SMAAEffect, Effect, TiltShiftEffect, BlendFunction } from 'postprocessing';

const GRADE_FRAG = /* glsl */ `
uniform float golden;
uniform float warmth;
uniform float sat;
uniform float lift;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Split toning: cool, slightly teal shadows; warm honey highlights.
  vec3 shadowTint = vec3(0.86, 0.94, 1.06);
  vec3 highTint = vec3(1.07, 1.0, 0.86);
  c *= mix(shadowTint, highTint, smoothstep(0.05, 0.65, l)) * (1.0 + warmth * vec3(0.04, 0.0, -0.05));
  // Saturation around luminance.
  c = mix(vec3(l), c, sat);
  // Golden mode: a honey wash that keeps the shadows deep.
  vec3 gold = vec3(1.0, 0.78, 0.36) * (l * 1.25 + 0.06);
  c = mix(c, c * 0.55 + gold * 0.75, golden * 0.55);
  c += lift * vec3(0.03, 0.022, 0.035);
  outputColor = vec4(c, inputColor.a);
}`;

class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', GRADE_FRAG, {
      uniforms: new Map([
        ['golden', new THREE.Uniform(0)],
        ['warmth', new THREE.Uniform(1)],
        ['sat', new THREE.Uniform(1.08)],
        ['lift', new THREE.Uniform(1)],
      ]),
    });
  }
}

export function createGfx(canvas, { poster = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: poster, stencil: false, depth: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 400);
  camera.position.set(0, 4, 12);

  // Light: a low golden sun with soft shadows, a sky/ground fill, and the environment for a little sheen.
  const hemi = new THREE.HemisphereLight(0xcfe4ff, 0x8a5a3a, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd29a, 3.4);
  sun.position.set(-8, 10, 7);
  sun.castShadow = true;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  const sc = sun.shadow.camera;
  sc.near = 0.5;
  sc.far = 60;
  sc.left = -8;
  sc.right = 8;
  sc.top = 8;
  sc.bottom = -8;
  scene.add(sun);
  scene.add(sun.target);

  let quality = 'high';
  let composer = null;
  let grade = null;
  let bloom = null;
  let tilt = null;
  let toneOnly = null;
  let W = 1;
  let H = 1;
  let PR = 1;

  function buildComposer() {
    composer?.dispose();
    composer = null;
    if (quality === 'low') {
      renderer.toneMapping = THREE.AgXToneMapping;
      renderer.toneMappingExposure = 1.05;
      return;
    }
    renderer.toneMapping = THREE.NoToneMapping;
    composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: quality === 'high' && !poster ? 4 : poster ? 8 : 0 });
    composer.addPass(new RenderPass(scene, camera));
    bloom = new BloomEffect({ intensity: 0.9, luminanceThreshold: 0.82, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.7 });
    grade = new GradeEffect();
    toneOnly = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.52 });
    tilt = new TiltShiftEffect({ offset: 0.0, rotation: 0, focusArea: 0.62, feather: 0.32, kernelSize: 2 });
    tilt.blendMode.opacity.value = 0;
    const effects = [bloom, tilt, toneOnly, grade, vignette];
    if (quality === 'medium' && !poster) effects.push(new SMAAEffect());
    composer.addPass(new EffectPass(camera, ...effects));
    composer.setSize(W, H, false);
  }

  function setQuality(q) {
    quality = q === 'low' || q === 'medium' ? q : 'high';
    const size = quality === 'low' ? 0 : quality === 'medium' ? 1024 : 2048;
    renderer.shadowMap.enabled = size > 0;
    if (size > 0) {
      sun.shadow.mapSize.set(size, size);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
    buildComposer();
  }

  function resize(w, h, pr) {
    W = Math.max(1, Math.round(w));
    H = Math.max(1, Math.round(h));
    PR = pr;
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    composer?.setSize(W, H, false);
  }

  /** Aims the sun's shadow box at a point (the station in view), so a small map stays sharp. */
  function focusShadow(target, radius = 6) {
    const dir = new THREE.Vector3(-0.62, 0.72, 0.42).normalize();
    sun.target.position.copy(target);
    sun.position.copy(target).addScaledVector(dir, 22);
    sc.left = -radius;
    sc.right = radius;
    sc.top = radius;
    sc.bottom = -radius;
    sc.updateProjectionMatrix();
  }

  return {
    THREE,
    renderer,
    scene,
    camera,
    sun,
    hemi,
    get quality() {
      return quality;
    },
    setQuality,
    resize,
    focusShadow,
    /** 0..1: the honey wash of a perfect streak. */
    setGolden(v) {
      if (grade) grade.uniforms.get('golden').value = v;
    },
    /** 0..1: tilt-shift blur (wide establishing shots). */
    setTilt(v) {
      if (tilt) tilt.blendMode.opacity.value = v;
    },
    render(dt) {
      if (composer) composer.render(dt);
      else renderer.render(scene, camera);
    },
    compile() {
      try {
        renderer.compile(scene, camera);
      } catch {}
    },
  };
}
