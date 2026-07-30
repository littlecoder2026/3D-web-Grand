/**
 * Bloom.
 *
 * Two mips, soft-knee bright pass, separable Gaussian. Written here rather than
 * pulled from three's examples for two reasons: UnrealBloomPass rendered black
 * in this build, and — more usefully — the brief asks for "a whisper" of glow.
 * Owning the curve means the threshold sits above painted cream and below a
 * filament, so the fascia can never start behaving like the lightbox the
 * exclusion list forbids.
 *
 * Output is HDR linear, added into the grade pass before tonemapping, which is
 * the correct order: bloom is a lens artefact, not a colour grade.
 */

import * as THREE from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/** Soft-knee luminance threshold, as used in Call of Duty / Unreal's extract. */
const BRIGHT_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uThreshold;
  uniform float uKnee;
  varying vec2 vUv;

  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    // quadratic knee, so the effect fades in rather than switching on
    float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 1e-5);
    float w = max(soft, l - uThreshold) / max(l, 1e-5);
    gl_FragColor = vec4(c * w, 1.0);
  }
`;

/** 9-tap separable Gaussian with linear-sampling offsets. */
const BLUR_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uDirection; // texel-sized step
  varying vec2 vUv;

  void main() {
    // weights for sigma ~2.0, folded onto 5 bilinear taps
    const float w0 = 0.2270270270;
    const float w1 = 0.3162162162;
    const float w2 = 0.0702702703;
    const float o1 = 1.3846153846;
    const float o2 = 3.2307692308;

    vec3 c = texture2D(tDiffuse, vUv).rgb * w0;
    c += texture2D(tDiffuse, vUv + uDirection * o1).rgb * w1;
    c += texture2D(tDiffuse, vUv - uDirection * o1).rgb * w1;
    c += texture2D(tDiffuse, vUv + uDirection * o2).rgb * w2;
    c += texture2D(tDiffuse, vUv - uDirection * o2).rgb * w2;
    gl_FragColor = vec4(c, 1.0);
  }
`;

function rt(w, h) {
  const t = new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    stencilBuffer: false,
  });
  t.texture.minFilter = THREE.LinearFilter;
  t.texture.magFilter = THREE.LinearFilter;
  t.texture.generateMipmaps = false;
  return t;
}

export class Bloom {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {number} width  drawing-buffer width
   * @param {number} height drawing-buffer height
   */
  constructor(renderer, width, height, { threshold = 0.9, knee = 0.35 } = {}) {
    this.renderer = renderer;

    this.bright = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uThreshold: { value: threshold },
        uKnee: { value: knee },
      },
      vertexShader: QUAD_VERT,
      fragmentShader: BRIGHT_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    this.blur = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uDirection: { value: new THREE.Vector2() } },
      vertexShader: QUAD_VERT,
      fragmentShader: BLUR_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    // A fullscreen triangle-ish quad in clip space; no camera needed since the
    // vertex shader writes gl_Position directly.
    this._quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bright);
    this._quad.frustumCulled = false;
    this._scene = new THREE.Scene();
    this._scene.add(this._quad);
    this._camera = new THREE.Camera();

    this.setSize(width, height);
  }

  setSize(width, height) {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    const dispose = (t) => t?.dispose();
    dispose(this._bright);
    dispose(this._a0);
    dispose(this._b0);
    dispose(this._a1);
    dispose(this._b1);

    // Mip 0 at half resolution, mip 1 at a quarter — enough spread for a
    // filament halo without the wide, cheap-looking veil of a deep chain.
    this._bright = rt(w >> 1, h >> 1);
    this._a0 = rt(w >> 1, h >> 1);
    this._b0 = rt(w >> 1, h >> 1);
    this._a1 = rt(w >> 2, h >> 2);
    this._b1 = rt(w >> 2, h >> 2);
  }

  get textures() {
    return [this._b0.texture, this._b1.texture];
  }

  _draw(material, target) {
    this._quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this._scene, this._camera);
  }

  _blurInto(sourceTex, targetA, targetB) {
    const { width, height } = targetA;
    this.blur.uniforms.tDiffuse.value = sourceTex;
    this.blur.uniforms.uDirection.value.set(1 / width, 0);
    this._draw(this.blur, targetA);
    this.blur.uniforms.tDiffuse.value = targetA.texture;
    this.blur.uniforms.uDirection.value.set(0, 1 / height);
    this._draw(this.blur, targetB);
  }

  /** Run the chain over `inputTexture`. Leaves the render target unset. */
  render(inputTexture) {
    const prevTarget = this.renderer.getRenderTarget();
    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = true;

    this.bright.uniforms.tDiffuse.value = inputTexture;
    this._draw(this.bright, this._bright);

    this._blurInto(this._bright.texture, this._a0, this._b0);
    this._blurInto(this._b0.texture, this._a1, this._b1);

    this.renderer.autoClear = prevAutoClear;
    this.renderer.setRenderTarget(prevTarget);
    return this.textures;
  }

  set threshold(v) {
    this.bright.uniforms.uThreshold.value = v;
  }

  get threshold() {
    return this.bright.uniforms.uThreshold.value;
  }

  dispose() {
    for (const t of [this._bright, this._a0, this._b0, this._a1, this._b1]) t?.dispose();
    this.bright.dispose();
    this.blur.dispose();
    this._quad.geometry.dispose();
  }
}

/**
 * Composer pass wrapper. Builds the mips from whatever the previous pass wrote
 * and binds them onto the grade's uniforms — it never writes to the colour
 * buffer itself, so `needsSwap` is false and the scene is rendered exactly once
 * per frame.
 */
export class BloomPass extends Pass {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {object} targetUniforms uniforms object owning tBloom0 / tBloom1
   */
  constructor(renderer, targetUniforms, options) {
    super();
    this.needsSwap = false;
    const buf = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.bloom = new Bloom(renderer, buf.x, buf.y, options);
    this.uniforms = targetUniforms;
    this._pixelRatio = renderer.getPixelRatio();
  }

  render(renderer, writeBuffer, readBuffer) {
    const [b0, b1] = this.bloom.render(readBuffer.texture);
    this.uniforms.tBloom0.value = b0;
    this.uniforms.tBloom1.value = b1;
  }

  setSize(width, height) {
    // EffectComposer hands passes drawing-buffer pixels already.
    this.bloom.setSize(width, height);
  }

  dispose() {
    this.bloom.dispose();
  }
}
