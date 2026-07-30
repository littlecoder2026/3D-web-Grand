/**
 * In-world signwriting.
 *
 * Workflow Stage 4: "Model the signwriting as geometry, not a decal, so the gold
 * leaf catches light." The glyph outlines come from the actual licensed WARREN
 * face (CI p4: WARREN for logo and title), are converted to THREE shapes, and
 * are extruded with a bevel so the gilded edge has something to catch.
 *
 * WARREN is licensed and is not committed to this repository. It is fetched at
 * runtime from `public/fonts/`, and when it isn't there the wordmark falls back
 * to a drawn face on a thin extruded plate — the composition and the gold stop
 * survive, only the true relief is lost. See src/core/brandfont.js.
 */

import * as THREE from 'three';
import * as opentype from 'opentype.js';
import { TYPE } from '../data/brand.js';
import { makeCard, toTexture } from '../core/textures.js';
import { WARREN_OTF, assetUrl } from '../core/brandfont.js';

let _font = null;
let _tried = false;

/**
 * Parse WARREN if it is available.
 * @returns {Promise<object|null>} the opentype font, or null when absent
 */
export async function loadDisplayFont() {
  if (_font || _tried) return _font;
  _tried = true;
  try {
    const res = await fetch(assetUrl(WARREN_OTF));
    if (!res.ok) throw new Error(String(res.status));
    _font = opentype.parse(await res.arrayBuffer());
  } catch {
    // Not an error: the licensed outlines simply aren't in this checkout, so
    // the signwriting is drawn instead of extruded.
    console.info('WARREN not found in public/fonts — signwriting falls back to a drawn face.');
    _font = null;
  }
  return _font;
}

/** True once loadDisplayFont() has resolved with real outlines. */
export const hasDisplayFont = () => _font !== null;

/** Winding-aware point-in-polygon, for assigning counters to their letter. */
function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Convert an opentype path into THREE shapes.
 *
 * Font space has Y increasing downward from the baseline, so every Y is negated.
 *
 * We do the solid/hole split by winding direction rather than using
 * `ShapePath.toShapes`, which treats *any* contained subpath as a counter. Type
 * designers rely on the nonzero fill rule: WARREN's 'A' carries an inner contour
 * wound the same way as its outer one, which a renderer is meant to union, and
 * toShapes punched it out as a hole — a clean rectangular notch in the middle of
 * the fascia. Here, only contours wound *against* the outer direction become
 * holes; same-direction contours stay solid and simply overlap.
 */
function pathToShapes(otPath) {
  const sp = new THREE.ShapePath();
  for (const cmd of otPath.commands) {
    switch (cmd.type) {
      case 'M':
        sp.moveTo(cmd.x, -cmd.y);
        break;
      case 'L':
        sp.lineTo(cmd.x, -cmd.y);
        break;
      case 'C':
        sp.bezierCurveTo(cmd.x1, -cmd.y1, cmd.x2, -cmd.y2, cmd.x, -cmd.y);
        break;
      case 'Q':
        sp.quadraticCurveTo(cmd.x1, -cmd.y1, cmd.x, -cmd.y);
        break;
      case 'Z':
        // subpaths are closed implicitly when the contour list is resolved
        break;
      default:
        break;
    }
  }

  const contours = sp.subPaths
    .map((path) => {
      const pts = path.getPoints(24);
      return { path, pts, cw: THREE.ShapeUtils.isClockWise(pts), area: Math.abs(THREE.ShapeUtils.area(pts)) };
    })
    .filter((c) => c.pts.length > 2 && c.area > 0);

  if (!contours.length) return [];

  // The biggest contour in a glyph is always an outer one, so its winding
  // defines "solid" for this glyph regardless of which convention the font uses.
  const outerWinding = contours.reduce((a, b) => (b.area > a.area ? b : a)).cw;
  const solids = contours.filter((c) => c.cw === outerWinding);
  const holes = contours.filter((c) => c.cw !== outerWinding);

  const shapes = solids.map((s) => {
    const shape = new THREE.Shape();
    shape.curves = s.path.curves;
    return shape;
  });

  // Each counter belongs to the smallest solid that contains it.
  for (const hole of holes) {
    let best = -1;
    for (let i = 0; i < solids.length; i++) {
      if (!pointInPolygon(hole.pts[0], solids[i].pts)) continue;
      if (best === -1 || solids[i].area < solids[best].area) best = i;
    }
    if (best !== -1) shapes[best].holes.push(hole.path);
  }

  return shapes;
}

/**
 * Extruded lettering, centred on its own bounding box in X and sitting on the
 * baseline in Y (so a run of text aligns the way a signwriter would set it).
 *
 * @param {string} text
 * @param {object} o
 * @param {number} o.size    cap-to-descender em size in metres
 * @param {number} o.depth   how far the letters stand proud of the board
 * @param {number} o.bevel   gilded edge chamfer
 * @param {number} o.tracking letter-spacing as a fraction of the em
 */
export function letterGeometry(text, { size = 0.4, depth = 0.006, bevel = 0.0008, tracking = 0 } = {}) {
  if (!_font) throw new Error('loadDisplayFont() must resolve before letterGeometry()');
  const otPath = _font.getPath(text, 0, 0, size, { letterSpacing: tracking, kerning: true });
  const shapes = pathToShapes(otPath);
  if (!shapes.length) throw new Error(`no outlines for "${text}"`);

  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: Math.max(0.0005, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
    bevelSegments: 1,
    curveSegments: 5,
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  geo.translate(-(bb.min.x + bb.max.x) / 2, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

/** Measured advance width, for laying out a fascia before committing to a size. */
export function letterWidth(text, size, tracking = 0) {
  if (!_font) return 0;
  return _font.getAdvanceWidth(text, size, { letterSpacing: tracking, kerning: true });
}

/**
 * The wordmark, as built for a painted timber fascia: cream lettering standing
 * proud of the board, a gold-leaf drop shadow offset down and right behind it,
 * and the full stop gilded solid.
 *
 * @returns {THREE.Group} origin at the baseline, centred on the whole lockup
 */
export function wordmark({
  text = 'GRAND',
  size = 0.4,
  materials,
  depth = 0.008,
  shadowOffset = 0.013,
  dotGap = 0.055,
  letterMaterial = null,
} = {}) {
  const g = new THREE.Group();
  g.name = 'wordmark';

  if (!_font) return drawnWordmark({ text, size, materials, depth, letterMaterial, group: g });

  const wordGeo = letterGeometry(text, { size, depth, bevel: 0.0009, tracking: 0.02 });
  const dotGeo = letterGeometry('.', { size, depth, bevel: 0.0009 });

  wordGeo.computeBoundingBox();
  dotGeo.computeBoundingBox();
  const wordW = wordGeo.boundingBox.max.x - wordGeo.boundingBox.min.x;
  const dotW = dotGeo.boundingBox.max.x - dotGeo.boundingBox.min.x;
  const totalW = wordW + dotGap + dotW;

  // Positions relative to the centre of the whole lockup, word + stop.
  const wordX = -totalW / 2 + wordW / 2;
  const dotX = totalW / 2 - dotW / 2;

  // The drop shadow goes on first and sits fractionally behind the board face,
  // so it reads as gilding under the paint rather than a second set of letters.
  // Skipped entirely when shadowOffset is 0 — the redesigned fascia is flat
  // cream on green with no shadow line.
  if (shadowOffset > 0) {
    const shadow = new THREE.Mesh(wordGeo, materials.goldLeaf);
    shadow.position.set(wordX + shadowOffset, -shadowOffset, -0.003);
    shadow.castShadow = false;
    g.add(shadow);
  }

  const word = new THREE.Mesh(wordGeo, letterMaterial || materials.creamPaint);
  word.position.set(wordX, 0, 0);
  word.castShadow = true;
  g.add(word);

  // The full stop is solid gold leaf — the signature device, and the only gold
  // on the frontage besides the door furniture.
  const dot = new THREE.Mesh(dotGeo, materials.goldLeaf);
  dot.position.set(dotX, 0, 0.001);
  dot.castShadow = true;
  g.add(dot);

  // Cap height, so a fascia can optically centre the lettering on the board
  // rather than centring the baseline and looking wrong.
  g.userData.width = totalW;
  g.userData.capHeight = wordGeo.boundingBox.max.y;
  return g;
}

/** Small gilded lettering — the door glass, the 18+ roundel, wayfinding. */
export function gildedText(text, { size = 0.05, materials, depth = 0.0012, tracking = 0.08 }) {
  const geo = letterGeometry(text, { size, depth, bevel: 0.0003, tracking });
  const m = new THREE.Mesh(geo, materials.goldLeaf);
  m.castShadow = false;
  return m;
}

/**
 * Fallback wordmark, used when the licensed outlines aren't in the checkout.
 *
 * A thin plate carrying a drawn face, in whatever the CSS stack resolves — so
 * the lockup, the proportions and the gold stop all survive and only the true
 * relief is lost. Returns the same `userData` contract as the extruded version
 * (`width`, `capHeight`) so every caller positions it identically.
 */
function drawnWordmark({ text, size, materials, depth, letterMaterial, group }) {
  const PX = 96; // canvas pixels per em
  const pad = 0.35 * PX;
  const w = Math.ceil(text.length * 0.78 * PX + pad * 2 + PX);
  const h = Math.ceil(PX * 1.6);

  const cream = letterMaterial ? null : '#F4EEDE';
  const inkHex = letterMaterial?.color
    ? `#${letterMaterial.color.clone().convertLinearToSRGB().getHexString()}`
    : cream;

  const faceMat = new THREE.MeshStandardMaterial({
    map: toTexture(
      `drawnmark:${text}:${inkHex}`,
      () =>
        makeCard(
          w,
          h,
          (ctx, cw, ch) => {
            ctx.clearRect(0, 0, cw, ch);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = inkHex;
            ctx.font = `400 ${PX}px ${TYPE.displayFamily}`;
            const dotR = PX * 0.1;
            const advance = ctx.measureText(text).width;
            const total = advance + PX * 0.28 + dotR * 2;
            const cx = cw / 2 - total / 2 + advance / 2;
            const baseline = ch * 0.72;
            ctx.fillText(text, cx, baseline);
            ctx.fillStyle = '#C8922E';
            ctx.beginPath();
            ctx.arc(cw / 2 + total / 2 - dotR, baseline - dotR * 0.1, dotR, 0, Math.PI * 2);
            ctx.fill();
          },
          { bg: null, grain: false },
        ),
      { repeat: [1, 1], srgb: true, aniso: 8 },
    ),
    transparent: true,
    roughness: 0.5,
    metalness: 0,
    envMapIntensity: 0.6,
  });

  const emScale = size / PX;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(w * emScale, h * emScale), faceMat);
  // Sit the plate so its drawn baseline lands on the group origin, matching the
  // extruded path, and stand it proud of the board by `depth`.
  plate.position.set(0, h * emScale * 0.22, Math.max(0.001, depth));
  plate.castShadow = false;
  group.add(plate);

  group.userData.width = w * emScale * 0.82;
  group.userData.capHeight = size * 0.72;
  return group;
}
