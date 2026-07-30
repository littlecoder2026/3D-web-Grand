/**
 * Procedural texture authoring.
 *
 * Every map in the set is generated in code — no downloads, no CDN, nothing to
 * lose on a USB stick at the exhibition. Workflow Stage 5 applies regardless of
 * where the pixels come from: vary roughness across every surface, add subtle
 * imperfection, correct every texture to real-world scale.
 */

import * as THREE from 'three';
import { NATURALS, PALETTE } from '../data/brand.js';

// ---------------------------------------------------------------------------
// Noise plumbing
// ---------------------------------------------------------------------------

/** Small deterministic PRNG so a rebuild looks identical to the last one. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value-noise lattice. */
function lattice(size, seed) {
  const rnd = mulberry32(seed);
  const g = new Float32Array(size * size);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  return { size, g };
}

function sampleLattice(l, x, y) {
  const { size, g } = l;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = x - xi;
  const ty = y - yi;
  // smoothstep for C1 continuity — linear interpolation shows as diamonds
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const x0 = ((xi % size) + size) % size;
  const y0 = ((yi % size) + size) % size;
  const x1 = (x0 + 1) % size;
  const y1 = (y0 + 1) % size;
  const a = g[y0 * size + x0];
  const b = g[y0 * size + x1];
  const c = g[y1 * size + x0];
  const d = g[y1 * size + x1];
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

/**
 * Tileable fractional Brownian motion in [0,1].
 * `u`,`v` in [0,1]; `freq` is the base lattice frequency in tiles.
 */
export function fbm(u, v, freq, octaves, seed, gain = 0.5) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    // integer frequencies only — the lattice period must divide the tile or the
    // texture shows a seam where it wraps
    const f = Math.max(2, Math.round(freq * 2 ** o));
    const l = latticeCache(f, seed + o * 131);
    sum += amp * sampleLattice(l, u * f, v * f);
    norm += amp;
    amp *= gain;
  }
  return sum / norm;
}

const _lattices = new Map();
function latticeCache(size, seed) {
  const key = `${size}:${seed}`;
  let l = _lattices.get(key);
  if (!l) {
    l = lattice(Math.max(2, size), seed);
    _lattices.set(key, l);
  }
  return l;
}

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/** Per-pixel generator. `fn(u, v, x, y)` returns [r,g,b] in 0–255. */
function paint(size, fn) {
  const c = canvas(size);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const rgb = fn(x / size, y / size, x, y);
      d[i] = rgb[0];
      d[i + 1] = rgb[1];
      d[i + 2] = rgb[2];
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Single-channel generator, written to all three channels. */
function paintGrey(size, fn) {
  return paint(size, (u, v, x, y) => {
    const g = Math.max(0, Math.min(255, fn(u, v, x, y) * 255));
    return [g, g, g];
  });
}

const _canvases = new Map();
const _textures = new Map();

/**
 * Cache + configure a map. `repeat` is in tiles across the surface.
 *
 * The expensive part is painting the canvas, so canvases are cached by key and
 * only the lightweight THREE.Texture wrapper is duplicated when the same
 * material appears at a different real-world scale.
 */
export function toTexture(key, factory, { repeat = [1, 1], srgb = false, aniso = 8, rotation = 0 } = {}) {
  const id = `${key}:${repeat[0]}:${repeat[1]}:${rotation}`;
  const cached = _textures.get(id);
  if (cached) return cached;

  let cnv = _canvases.get(key);
  if (!cnv) {
    cnv = factory();
    _canvases.set(key, cnv);
  }

  const t = new THREE.CanvasTexture(cnv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  if (rotation) {
    t.center.set(0.5, 0.5);
    t.rotation = rotation;
  }
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  _textures.set(id, t);
  return t;
}

/** Free every generated map. Called on teardown. */
export function disposeTextures() {
  for (const t of _textures.values()) t.dispose();
  _textures.clear();
  _canvases.clear();
}

/** Sobel a height canvas into a tangent-space normal map. */
export function normalFromHeight(heightCanvas, strength = 1.6) {
  const size = heightCanvas.width;
  const src = heightCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, size, size).data;
  const h = (x, y) => src[((((y % size) + size) % size) * size + (((x % size) + size) % size)) * 4] / 255;
  return paint(size, (u, v, x, y) => {
    const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
    const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
    // normalise (-dx, -dy, 1)
    const len = Math.hypot(dx, dy, 1);
    return [((-dx / len) * 0.5 + 0.5) * 255, ((-dy / len) * 0.5 + 0.5) * 255, (1 / len) * 0.5 * 255 + 127.5];
  });
}

function rgbOf(hexInt) {
  return [(hexInt >> 16) & 255, (hexInt >> 8) & 255, hexInt & 255];
}
function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function shade(rgb, f) {
  return [rgb[0] * f, rgb[1] * f, rgb[2] * f];
}

// ---------------------------------------------------------------------------
// Lime plaster — walls and ceiling. Cream, hand-applied, never flat.
// ---------------------------------------------------------------------------

export const limePlaster = {
  height: () => paintGrey(256, (u, v) => 0.35 * fbm(u, v, 3, 4, 11) + 0.65 * fbm(u, v, 12, 3, 29)),
  colour: () =>
    paint(256, (u, v) => {
      const base = rgbOf(NATURALS.limePlaster);
      // broad trowel drift plus a fine tooth; the drift is what sells hand-work
      const drift = fbm(u, v, 2.5, 3, 11) - 0.5;
      const tooth = fbm(u, v, 24, 2, 47) - 0.5;
      return shade(base, 1 + drift * 0.075 + tooth * 0.03);
    }),
  roughness: () => paintGrey(256, (u, v) => 0.78 + (fbm(u, v, 6, 3, 53) - 0.5) * 0.22),
};

// ---------------------------------------------------------------------------
// Oak — counters, joinery, parquet. Oiled, not lacquered.
// ---------------------------------------------------------------------------

/** Grain runs along V. Anisotropic stretch is what makes wood read as wood. */
function oakField(u, v, seed) {
  const stretch = 14; // grain far longer than it is wide
  const wander = (fbm(u * 0.6, v, 2, 3, seed) - 0.5) * 0.06;
  const rings = fbm((u + wander) * stretch, v * 0.55, 6, 4, seed + 7);
  const fibre = fbm((u + wander) * stretch * 5, v * 0.8, 10, 2, seed + 13);
  return { rings, fibre };
}

/**
 * Grain is authored as a NEUTRAL modulation, not as coloured wood, so the
 * material's `color` can carry the species (oak, ash, oiled oak) without being
 * multiplied into a second copy of itself. Setting both a coloured map and a
 * tinted colour darkens a surface twice — which is how the oak shelving first
 * came out reading maroon.
 */
export const oak = () => ({
  colour: () =>
    paint(256, (u, v) => {
      const { rings, fibre } = oakField(u, v, 91);
      // sharpen the ring boundaries a little so they read as growth, not fog
      const t = Math.min(1, Math.max(0, (rings - 0.42) * 2.1));
      const g = (0.66 + 0.34 * (t * 0.85 + fibre * 0.15)) * 255;
      return [g, g * 0.995, g * 0.985];
    }),
  roughness: () =>
    paintGrey(256, (u, v) => {
      const { rings, fibre } = oakField(u, v, 91);
      // open grain drinks the oil and reads rougher than the dense rings
      return 0.46 + (1 - rings) * 0.2 + (fibre - 0.5) * 0.08;
    }),
  height: () =>
    paintGrey(256, (u, v) => {
      const { rings, fibre } = oakField(u, v, 91);
      return rings * 0.7 + fibre * 0.3;
    }),
});

// ---------------------------------------------------------------------------
// Terrazzo — the front-of-shop floor. Cream matrix, sage/green/gold chips.
// ---------------------------------------------------------------------------

export const terrazzo = {
  colour: () => {
    const size = 512;
    const c = canvas(size);
    const ctx = c.getContext('2d');
    ctx.fillStyle = `#${NATURALS.terrazzoBase.toString(16)}`;
    ctx.fillRect(0, 0, size, size);
    // faint matrix mottle under the chips
    const mottle = paint(size, (u, v) => shade(rgbOf(NATURALS.terrazzoBase), 1 + (fbm(u, v, 8, 3, 5) - 0.5) * 0.08));
    ctx.drawImage(mottle, 0, 0);

    // Mostly quiet greys and creams with the palette used sparingly. Terrazzo
    // that is 60% coloured chips reads as confetti; real honed terrazzo is a
    // pale matrix with occasional colour in it.
    const chipColours = [
      0xb8b3a4, 0xc9c3b2, 0x9a9788, 0xd8cfb8, 0xa8a293,
      PALETTE.softSage, 0x7d8a74, PALETTE.bottleGreen, PALETTE.amberGold,
    ];
    const rnd = mulberry32(2024);
    const CHIPS = 1200;
    // The tile covers ~1.2m of floor, so a 512px tile is ~2.3mm per pixel and
    // chips land at a real 5–14mm.
    for (let i = 0; i < CHIPS; i++) {
      const cx = rnd() * size;
      const cy = rnd() * size;
      const r = 1.2 + rnd() * rnd() * 4.8;
      // weight the pick toward the quiet end of the list
      const pick = Math.floor(rnd() ** 1.7 * chipColours.length);
      const col = chipColours[Math.min(chipColours.length - 1, pick)];
      ctx.fillStyle = `#${col.toString(16).padStart(6, '0')}`;
      ctx.globalAlpha = 0.4 + rnd() * 0.35;
      // irregular polygon — real chips are fractured, not round
      const sides = 5 + ((rnd() * 3) | 0);
      const spin = rnd() * Math.PI;
      const radii = [];
      for (let s = 0; s < sides; s++) radii.push(r * (0.62 + rnd() * 0.38));

      const chip = (ox, oy) => {
        ctx.beginPath();
        for (let s = 0; s < sides; s++) {
          const a = (s / sides) * Math.PI * 2 + spin;
          const px = cx + ox + Math.cos(a) * radii[s];
          const py = cy + oy + Math.sin(a) * radii[s];
          s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      };

      chip(0, 0);
      // Repeat across the edges so the tile is seamless. Canvas bakes path
      // points at construction time, so each copy has to be rebuilt rather
      // than re-filled under a translate.
      if (cx - r < 0 || cx + r > size || cy - r < 0 || cy + r > size) {
        for (const ox of [-size, 0, size]) {
          for (const oy of [-size, 0, size]) {
            if (ox === 0 && oy === 0) continue;
            chip(ox, oy);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    return c;
  },
  roughness: () =>
    paintGrey(256, (u, v) => {
      // polished terrazzo, but honed unevenly by twenty years of footfall
      const wear = fbm(u, v, 3, 3, 71);
      return 0.16 + wear * 0.22 + (fbm(u, v, 20, 2, 17) - 0.5) * 0.06;
    }),
};

// ---------------------------------------------------------------------------
// Flagstone — the wet pavement. Post-rain, per the locked continuity anchors.
// ---------------------------------------------------------------------------

/** Slab layout shared by colour/roughness/height so the joints line up. */
function slabs(u, v) {
  const rows = 4;
  const cols = 3;
  const row = Math.floor(v * rows);
  const offset = (row % 2) * 0.5; // running bond
  const uu = (u + offset / cols) % 1;
  const col = Math.floor(uu * cols);
  const fx = uu * cols - col;
  const fy = v * rows - row;
  const joint = Math.min(fx, 1 - fx, fy, 1 - fy);
  return { id: row * 31 + col * 7, joint, fx, fy };
}

export const flagstone = {
  colour: () =>
    paint(256, (u, v) => {
      const { id, joint } = slabs(u, v);
      const rnd = mulberry32(id * 977);
      const base = shade(rgbOf(NATURALS.flagstone), 0.86 + rnd() * 0.28);
      const grit = (fbm(u, v, 30, 3, id) - 0.5) * 0.14;
      const jointDark = joint < 0.035 ? 0.62 : 1;
      return shade(base, (1 + grit) * jointDark);
    }),
  /** Puddles read as smooth patches — this map is doing most of the "wet". */
  roughness: () =>
    paintGrey(256, (u, v) => {
      const { joint } = slabs(u, v);
      const puddle = fbm(u, v, 2.5, 3, 303);
      const wet = Math.max(0, Math.min(1, (puddle - 0.44) * 3.4));
      const dry = 0.82 + (fbm(u, v, 22, 2, 5) - 0.5) * 0.12;
      const sheen = 0.09;
      return dry * (1 - wet) + sheen * wet + (joint < 0.035 ? 0.14 : 0);
    }),
  height: () =>
    paintGrey(256, (u, v) => {
      const { id, joint } = slabs(u, v);
      const bevel = Math.min(1, joint / 0.05);
      return bevel * (0.7 + fbm(u, v, 26, 2, id) * 0.3);
    }),
};

export const granite = {
  colour: () =>
    paint(256, (u, v) => {
      const base = rgbOf(NATURALS.granite);
      const speck = fbm(u, v, 40, 3, 601);
      const cloud = fbm(u, v, 5, 3, 88) - 0.5;
      const rgb = shade(base, 1 + cloud * 0.1);
      // mica flecks
      return speck > 0.72 ? mix(rgb, [225, 222, 214], (speck - 0.72) * 2.4) : rgb;
    }),
  roughness: () => paintGrey(256, (u, v) => 0.6 + (fbm(u, v, 34, 3, 601) - 0.5) * 0.3),
};

// ---------------------------------------------------------------------------
// Brick — the upper storey above the shopfront.
// ---------------------------------------------------------------------------

export const brick = {
  colour: () =>
    paint(256, (u, v) => {
      const rows = 16;
      const row = Math.floor(v * rows);
      const uu = (u + (row % 2) * 0.5 * (1 / 8)) % 1;
      const cols = 8;
      const col = Math.floor(uu * cols);
      const fx = uu * cols - col;
      const fy = v * rows - row;
      const joint = Math.min(fx, 1 - fx) < 0.045 || Math.min(fy, 1 - fy) < 0.11;
      if (joint) return shade(rgbOf(0xa9a29a), 0.95 + (fbm(u, v, 30, 2, 3) - 0.5) * 0.1);
      const rnd = mulberry32(row * 613 + col * 37);
      const base = shade(rgbOf(NATURALS.brickWarm), 0.8 + rnd() * 0.42);
      return shade(base, 1 + (fbm(u, v, 36, 3, row + col) - 0.5) * 0.16);
    }),
  roughness: () => paintGrey(256, (u, v) => 0.84 + (fbm(u, v, 28, 2, 9) - 0.5) * 0.14),
  height: () =>
    paintGrey(128, (u, v) => {
      const rows = 16;
      const row = Math.floor(v * rows);
      const uu = (u + (row % 2) * 0.0625) % 1;
      const col = Math.floor(uu * 8);
      const fx = uu * 8 - col;
      const fy = v * rows - row;
      const j = Math.min(Math.min(fx, 1 - fx) / 0.05, Math.min(fy, 1 - fy) / 0.12);
      return Math.min(1, j) * 0.85 + fbm(u, v, 30, 2, 9) * 0.15;
    }),
};

// ---------------------------------------------------------------------------
// Reeded and fluted glass — vertical ridges, as a normal map.
// ---------------------------------------------------------------------------

/** `reeds` = ridges across the full tile. Amplitude tuned for 20mm reeding. */
export const reededNormal = (reeds = 26, amp = 1.0) => () =>
  paint(256, (u) => {
    // derivative of a sine ridge profile gives the surface slope directly
    const slope = Math.cos(u * Math.PI * 2 * reeds) * amp;
    const len = Math.hypot(slope, 1);
    return [((-slope / len) * 0.5 + 0.5) * 255, 127.5, (1 / len) * 127.5 + 127.5];
  });

// ---------------------------------------------------------------------------
// Textiles — Donegal tweed and wool bouclé.
// ---------------------------------------------------------------------------

export const tweed = {
  /** Donegal: a twill ground with coloured neps flecked through it. */
  colour: () =>
    paint(256, (u, v, x, y) => {
      const base = rgbOf(NATURALS.tweed);
      // 2/2 twill: diagonal float pattern
      const twill = ((x + y) % 4 < 2 ? 1.06 : 0.92) * ((x % 2 === 0) ? 1.02 : 0.98);
      let rgb = shade(base, twill * (1 + (fbm(u, v, 40, 2, 4) - 0.5) * 0.12));
      const nep = fbm(u, v, 46, 1, 199);
      if (nep > 0.9) {
        const neps = [PALETTE.amberGold, PALETTE.softSage, PALETTE.cream, PALETTE.signalGreen];
        const pick = neps[Math.floor(fbm(u, v, 46, 1, 233) * neps.length) % neps.length];
        rgb = mix(rgb, rgbOf(pick), (nep - 0.9) * 5.5);
      }
      return rgb;
    }),
  roughness: () => paintGrey(128, (u, v, x, y) => 0.86 + ((x + y) % 4 < 2 ? 0.04 : -0.04) + (fbm(u, v, 30, 2, 4) - 0.5) * 0.08),
  height: () => paintGrey(128, (u, v, x, y) => (((x + y) % 4 < 2 ? 0.72 : 0.3) + fbm(u, v, 44, 2, 4) * 0.28) * 0.9),
};

export const boucle = {
  colour: () =>
    paint(256, (u, v) => {
      const base = rgbOf(NATURALS.boucle);
      const loops = fbm(u, v, 34, 3, 77);
      return shade(base, 0.9 + loops * 0.24);
    }),
  roughness: () => paintGrey(128, (u, v) => 0.9 + (fbm(u, v, 34, 3, 77) - 0.5) * 0.08),
  height: () => paintGrey(256, (u, v) => fbm(u, v, 34, 3, 77) * 0.85 + fbm(u, v, 70, 2, 91) * 0.15),
};

// ---------------------------------------------------------------------------
// Metal imperfection — fingerprints and handling on unlacquered brass.
// ---------------------------------------------------------------------------

export const brassWear = {
  roughness: () =>
    paintGrey(256, (u, v) => {
      const patina = fbm(u, v, 4, 4, 313);
      const prints = fbm(u, v, 16, 2, 411);
      return 0.22 + patina * 0.3 + (prints > 0.62 ? (prints - 0.62) * 0.5 : 0);
    }),
  /**
   * Tarnish, as a neutral modulation with a faint warm drift — brass is never
   * one flat colour, but the colour itself belongs on the material.
   */
  colour: () =>
    paint(256, (u, v) => {
      const patina = fbm(u, v, 4, 4, 313) - 0.5;
      const g = (0.88 + patina * 0.2) * 255;
      // the aged patches pull very slightly green-brown, as unlacquered brass does
      return [g, g * (1 - Math.max(0, patina) * 0.05), g * (1 - Math.max(0, patina) * 0.12)];
    }),
};

/** Eggshell paint over timber — the fascia and joinery. Brush, not spray. */
export const paintedTimber = {
  roughness: (base = 0.42) =>
    paintGrey(256, (u, v) => {
      const brush = fbm(u * 0.35, v * 6, 8, 3, 733); // strokes run vertically
      return base + (brush - 0.5) * 0.16;
    }),
  height: () => paintGrey(256, (u, v) => fbm(u * 0.35, v * 6, 10, 3, 733) * 0.6 + fbm(u, v, 30, 2, 61) * 0.4),
};

/** Zinc — the window box. */
export const zinc = {
  colour: () =>
    paint(256, (u, v) => {
      const base = rgbOf(NATURALS.zinc);
      const weather = fbm(u, v, 6, 4, 151) - 0.5;
      return shade(base, 1 + weather * 0.2);
    }),
  roughness: () => paintGrey(256, (u, v) => 0.42 + fbm(u, v, 6, 4, 151) * 0.34),
};

/** Uncoated paper — bags, cards, tickets. */
export const paper = {
  roughness: () => paintGrey(128, (u, v) => 0.82 + (fbm(u, v, 26, 3, 88) - 0.5) * 0.1),
  height: () => paintGrey(128, (u, v) => fbm(u, v, 30, 3, 88) * 0.5 + fbm(u, v, 8, 2, 12) * 0.5),
};

/** Fired clay / stoneware — the aroma dishes and tea service. */
export const stoneware = {
  colour: () =>
    paint(256, (u, v) => {
      const base = rgbOf(NATURALS.stoneware);
      const clayGrit = fbm(u, v, 22, 3, 505) - 0.5;
      const wash = fbm(u, v, 4, 3, 66) - 0.5;
      return shade(base, 1 + clayGrit * 0.12 + wash * 0.14);
    }),
  roughness: () => paintGrey(256, (u, v) => 0.52 + (fbm(u, v, 5, 3, 66) - 0.5) * 0.3),
};

// ---------------------------------------------------------------------------
// In-world typography. Canvas-drawn, so it is always spelled correctly and
// always set in the right typeface (checklist item 4).
// ---------------------------------------------------------------------------

/**
 * Draw a small printed artefact — shelf ticket, dosage card, A-board, framed
 * card. `w`/`h` in pixels; returns the canvas.
 */
export function makeCard(
  w,
  h,
  draw,
  { bg = '#F4EEDE', grain = true } = {},
) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }
  draw(ctx, w, h);
  if (grain) {
    // paper tooth, so printed pieces don't read as vector overlays
    const g = ctx.getImageData(0, 0, w, h);
    const d = g.data;
    const rnd = mulberry32(31);
    for (let i = 0; i < d.length; i += 4) {
      const n = (rnd() - 0.5) * 11;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n;
    }
    ctx.putImageData(g, 0, 0);
  }
  return c;
}

/** Centre-aligned text helper with letter-spacing, which canvas lacks. */
export function tracked(ctx, text, x, y, spacing) {
  let total = 0;
  for (const ch of text) total += ctx.measureText(ch).width + spacing;
  total -= spacing;
  let cx = ctx.textAlign === 'center' ? x - total / 2 : x;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = align;
  return total;
}

/** Ruled lines standing in for body copy too small to read in-world. */
export function greekLines(ctx, x, y, w, lines, lh, colour = 'rgba(22,58,43,0.35)') {
  ctx.fillStyle = colour;
  for (let i = 0; i < lines; i++) {
    const lw = i === lines - 1 ? w * 0.55 : w * (0.86 + Math.sin(i * 2.7) * 0.13);
    ctx.fillRect(x, y + i * lh, lw, Math.max(1, lh * 0.1));
  }
}
