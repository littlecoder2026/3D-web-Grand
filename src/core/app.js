/**
 * Renderer, scene, post chain, resize, frame loop.
 *
 * Workflow Stage 8 (post) in real time: ACES tonemap, a restrained bloom, then
 * one grade pass carrying fine grain, a whisper of chromatic aberration and a
 * subtle vignette. Every frame gets the same treatment, which is the whole
 * point of a LUT — consistency across the set.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BloomPass } from './bloom.js';

/**
 * The grade. Deliberately gentle — restraint is the brand.
 *
 * The bloom mips are composited in here rather than in their own pass, so the
 * glow is added in HDR before the tonemap (bloom is a lens artefact, not a
 * colour move) and the whole grade stays one draw call.
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tBloom0: { value: null },
    tBloom1: { value: null },
    uBloom: { value: 0.42 },
    uTime: { value: 0 },
    uGrain: { value: 0.032 },
    uVignette: { value: 0.26 },
    uAberration: { value: 0.0011 },
    uLift: { value: new THREE.Vector3(0.004, 0.003, 0.006) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tBloom0;
    uniform sampler2D tBloom1;
    uniform float uBloom;
    uniform float uTime;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uAberration;
    uniform vec3 uLift;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(443.897, 441.423));
      p += dot(p, p + 19.19);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);

      // Lateral chromatic aberration: zero in the centre, growing to the corners,
      // as a real lens does. Not a full-frame RGB split.
      vec2 off = c * r2 * uAberration * 6.0;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;

      // Bloom, in HDR, before the tonemap. Two mips: a tight halo and a wider,
      // weaker tail.
      col += texture2D(tBloom0, vUv).rgb * uBloom;
      col += texture2D(tBloom1, vUv).rgb * uBloom * 0.65;

      // Vignette — optical, not a black frame.
      float vig = 1.0 - uVignette * smoothstep(0.15, 0.78, r2);
      col *= vig;

      // Fine grain, weighted into the shadows the way film stock behaves.
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float n = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 91.7) - 0.5;
      col += n * uGrain * (1.0 - smoothstep(0.0, 0.85, luma));

      // A hair of cool lift in the blacks, so blue hour never crushes to zero.
      col += uLift * (1.0 - smoothstep(0.0, 0.35, luma));

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class App {
  /**
   * @param {HTMLElement} container
   * @param {'high'|'low'} quality
   */
  constructor(container, quality = 'high') {
    this.container = container;
    this.quality = quality;
    this._last = 0;
    this._raf = 0;
    this._updaters = new Set();

    const hi = quality === 'high';

    this.renderer = new THREE.WebGLRenderer({
      antialias: hi,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, hi ? 2 : 1.5));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute('aria-label', 'The GRAND. store, in three dimensions');

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.05, 120);
    this.camera.position.set(0, 1.6, 8.4);

    // ── Post chain ──────────────────────────────────────────────────────────
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.grade = new ShaderPass(GradeShader);
    if (!hi) {
      this.grade.uniforms.uGrain.value = 0.022;
      this.grade.uniforms.uAberration.value = 0.0;
      this.grade.uniforms.uBloom.value = 0;
    }

    // Bloom sits between the render and the grade: it reads the HDR buffer and
    // binds its mips onto the grade's uniforms. Threshold sits above lit cream
    // paint and below a visible filament, so bulbs and gilding glow and painted
    // surfaces never do.
    if (hi) {
      this.bloomPass = new BloomPass(this.renderer, this.grade.uniforms, { threshold: 0.92, knee: 0.3 });
      this.composer.addPass(this.bloomPass);
    }

    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());

    // A ResizeObserver on the container, not a window resize listener: the
    // canvas needs to follow its box, which also changes when a side panel opens
    // or the page is embedded — cases where no window resize event ever fires.
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this._observer = new ResizeObserver(() => this.resize());
      this._observer.observe(container);
    }

    this._onContextLost = (e) => {
      e.preventDefault();
      this.stop();
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this._onContextLost);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    if (w === this._w && h === this._h) return;
    this._w = w;
    this._h = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    // EffectComposer resizes every pass it owns, bloom included.
    this.composer.setSize(w, h);
  }

  /** Register a per-frame callback. Returns an unsubscribe function. */
  onFrame(fn) {
    this._updaters.add(fn);
    return () => this._updaters.delete(fn);
  }

  start() {
    if (this._raf) return;
    this._last = performance.now();
    const tick = (now) => {
      this._raf = requestAnimationFrame(tick);
      // Clamp dt: a backgrounded tab returns with a huge delta and the visitor
      // would otherwise reappear through a wall.
      const dt = Math.min((now - this._last) / 1000, 0.1);
      this._last = now;
      for (const fn of this._updaters) fn(dt);
      this.grade.uniforms.uTime.value += dt;

      this.composer.render();
    };
    this._raf = requestAnimationFrame(tick);
  }

  stop() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  dispose() {
    this.stop();
    this._observer?.disconnect();
    window.removeEventListener('resize', this._onResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this._onContextLost);
    this.renderer.dispose();
  }
}

/** Rough triangle and draw-call count, for the performance budget. */
export function sceneStats(scene) {
  let tris = 0;
  let meshes = 0;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry;
    const count = g.index ? g.index.count : g.attributes.position?.count ?? 0;
    tris += (count / 3) * (o.isInstancedMesh ? o.count : 1);
  });
  return { triangles: Math.round(tris), meshes };
}
