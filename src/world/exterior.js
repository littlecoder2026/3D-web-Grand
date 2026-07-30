/**
 * The store exterior, built to the supplied elevation.
 *
 * A grand 10m frontage rather than a narrow terrace: bottle green joinery lined
 * out in gold, clear plate glass either side of a central pair of doors, a fascia
 * carrying GRAND. between two gold grotesque lines, a second band listing the
 * range, a projecting circular hanging sign, brass lanterns, recessed fascia
 * downlights, and dressed stone above.
 *
 * ── Elevation, measured up from the pavement ────────────────────────────────
 *   0.00 – 0.75   panelled base, gold pinstripe, framed wordmark panels
 *   0.75 – 3.00   glazing
 *   3.00 – 3.35   "PREMIUM PRODUCTS · CONSCIOUS CHOICES" / range band
 *   3.35 – 4.35   fascia: GRAND. centre, gold lines left and right
 *   4.35 – 4.55   moulded cornice, downlights on its soffit
 *   4.55 – 9.00   dressed stone upper storey with planted sills
 *
 * ── Plan, in Z ─────────────────────────────────────────────────────────────
 *   z = 0.00   glazing plane        z = +0.12  face of the joinery
 *   z = +0.34  outer edge of the cornice
 *   z = +4.00  kerb                 z = +22.0  far side of the street
 */

import * as THREE from 'three';
import { DIMS, PALETTE, PLAN, SIGNAGE, TYPE, USE_LEAF_MARK } from '../data/brand.js';
import { box, corniceProfile, ground, mouldingAlongX, roundedRectShape, slab } from '../core/geometry.js';
import { makeCard, toTexture, tracked } from '../core/textures.js';
import { cd } from '../core/lighting.js';
import { wordmark } from './signage.js';
import * as R from './retail.js';

const FRONT = 0.12; // face of the painted joinery
const HALF = DIMS.frontageWidth / 2; // 5.0
const BASE = DIMS.stallriser; // 0.75
const GLAZE_TOP = DIMS.glazingTop; // 3.00
const BAND_TOP = DIMS.bandTop; // 3.35
const FASCIA_TOP = DIMS.fasciaHeight; // 4.35
const CORNICE_TOP = DIMS.corniceTop; // 4.55
const UPPER_TOP = DIMS.upperTop; // 9.00
const DOOR_HALF = 0.9; // the pair is 1.8m clear
const PIER = 0.34; // green pier between glazing and doors

export function buildExterior(materials, { quality = 'high' } = {}) {
  const g = new THREE.Group();
  g.name = 'exterior';
  const hi = quality === 'high';

  g.add(buildStreet(materials, hi));
  g.add(buildShopfront(materials));
  g.add(buildFascia(materials));
  g.add(buildUpperStorey(materials));
  g.add(buildNeighbours(materials));
  g.add(buildStreetProps(materials));

  return g;
}

// ---------------------------------------------------------------------------
// Street — dry flagstone, granite kerb, and enough of the far side to enclose.
// ---------------------------------------------------------------------------

function buildStreet(materials, hi) {
  const g = new THREE.Group();
  g.name = 'street';
  const WIDTH = 46;

  // Level threshold: no step at the door. A 150mm upstand is the commonest way
  // a shopfront quietly tells a wheelchair user the shop isn't for them.
  const pavement = ground(WIDTH, PLAN.kerbZ, materials.pavement, hi ? 20 : 1);
  pavement.position.set(0, 0.001, PLAN.kerbZ / 2);
  g.add(pavement);

  const kerb = slab(WIDTH, 0.125, 0.32, materials.granite, 0, 0.0625, PLAN.kerbZ + 0.16, 0.006);
  g.add(kerb);

  const road = ground(WIDTH, PLAN.roadZ - PLAN.kerbZ, materials.road, hi ? 12 : 1);
  road.position.set(0, -0.02, (PLAN.kerbZ + PLAN.roadZ) / 2 + 0.32);
  g.add(road);

  // Far side of the street: a stone terrace silhouette, only ever a backdrop.
  g.add(slab(WIDTH, 13, 0.6, materials.limewash(0x8d8a80), 0, 6.5, PLAN.roadZ + 0.6, 0.01));
  const farGlass = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x2a3138).convertSRGBToLinear(),
    roughness: 0.1,
    metalness: 0.2,
    envMapIntensity: 1.1,
  });
  for (let i = -8; i <= 8; i++) {
    for (let f = 0; f < 3; f++) {
      const w = new THREE.Mesh(box(1.0, 1.5, 0.06, 0.004), farGlass);
      w.position.set(i * 2.7, 2.6 + f * 3.0, PLAN.roadZ + 0.28);
      g.add(w);
    }
  }

  return g;
}

// ---------------------------------------------------------------------------
// Shopfront — base, glazing, doors, band
// ---------------------------------------------------------------------------

/** A gold pinstripe rectangle inset into a green panel — the signature lining. */
function pinstripe(parent, materials, cx, cy, w, h, z, r = 0.005) {
  const pts = roundedRectShape(w, h, 0.02)
    .getPoints(80)
    .map((p) => new THREE.Vector3(p.x + cx, p.y + cy, z));
  const line = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 90, r, 5, true),
    materials.brassBright,
  );
  parent.add(line);
}

function buildShopfront(materials) {
  const g = new THREE.Group();
  g.name = 'shopfront';

  const bays = [
    { from: -HALF + 0.28, to: -DOOR_HALF - PIER },
    { from: DOOR_HALF + PIER, to: HALF - 0.28 },
  ];

  // ── Panelled base ────────────────────────────────────────────────────────
  for (const bay of bays) {
    const w = bay.to - bay.from;
    const cx = (bay.from + bay.to) / 2;

    g.add(slab(w, BASE, 0.1, materials.cabinetGreen, cx, BASE / 2, FRONT - 0.05, 0.004));
    // Two lined panels per bay, as on the elevation.
    const n = 2;
    const pw = (w - 0.18) / n - 0.1;
    for (let i = 0; i < n; i++) {
      const px = cx - w / 2 + 0.09 + pw / 2 + i * (pw + 0.1);
      pinstripe(g, materials, px, BASE / 2, pw, BASE - 0.22, FRONT + 0.004);
    }

    // Cill over the base, projecting with a drip.
    const cill = new THREE.Mesh(
      mouldingAlongX(
        [
          [0, -0.02],
          [0, FRONT + 0.05],
          [0.026, FRONT + 0.055],
          [0.036, FRONT + 0.02],
          [0.036, -0.02],
        ],
        w + 0.06,
      ),
      materials.cabinetGreen,
    );
    cill.position.set(cx, BASE, 0);
    cill.castShadow = true;
    g.add(cill);

    // ── Glazing: clear plate, as the reference. Big single lights. ──────────
    const gh = GLAZE_TOP - BASE - 0.04;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, gh), materials.glassClear);
    pane.position.set(cx, BASE + 0.04 + gh / 2, 0);
    g.add(pane);

    // Slim frame around the light.
    for (const s of [-1, 1]) {
      g.add(slab(0.06, gh + 0.08, 0.075, materials.cabinetGreen, cx + s * (w / 2 - 0.03), BASE + 0.04 + gh / 2, 0.028, 0.002));
    }
    g.add(slab(w, 0.07, 0.08, materials.cabinetGreen, cx, GLAZE_TOP - 0.035, 0.03, 0.002));

    // Planting along the inside of the cill, visible through the glass.
    for (let i = 0; i < 5; i++) {
      const p = R.planter(materials, { r: 0.13, h: 0.16, kind: 'bush' });
      p.position.set(cx - w / 2 + 0.4 + i * ((w - 0.8) / 4), BASE + 0.04, -0.34);
      g.add(p);
    }
  }

  // ── Piers either side of the doors, and the end piers ────────────────────
  for (const x of [-HALF + 0.14, -DOOR_HALF - PIER / 2, DOOR_HALF + PIER / 2, HALF - 0.14]) {
    const w = Math.abs(x) > HALF - 0.4 ? 0.28 : PIER;
    g.add(slab(w, BAND_TOP, 0.12, materials.cabinetGreen, x, BAND_TOP / 2, FRONT / 2, 0.004));
    pinstripe(g, materials, x, BAND_TOP / 2, w - 0.09, BAND_TOP - 0.18, FRONT + 0.004, 0.004);
  }

  // ── Doors ─────────────────────────────────────────────────────────────────
  g.add(buildDoors(materials));

  // ── The range band ────────────────────────────────────────────────────────
  const bandH = BAND_TOP - GLAZE_TOP;
  g.add(slab(DIMS.frontageWidth, bandH, 0.11, materials.cabinetInk, 0, GLAZE_TOP + bandH / 2, FRONT - 0.055, 0.003));

  const bandFace = new THREE.Mesh(new THREE.PlaneGeometry(DIMS.frontageWidth - 0.1, bandH * 0.8), bandMaterial());
  bandFace.position.set(0, GLAZE_TOP + bandH / 2, FRONT + 0.001);
  g.add(bandFace);

  return g;
}

/** The gold grotesque band under the fascia. */
function bandMaterial() {
  return new THREE.MeshStandardMaterial({
    map: toTexture(
      'band',
      () =>
        makeCard(
          2048,
          128,
          (ctx, w, h) => {
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#C8922E';
            ctx.font = `300 44px ${TYPE.informFamily}`;
            ctx.textAlign = 'left';
            tracked(ctx, SIGNAGE.bandLeft, 48, h / 2 + 16, 3);
            ctx.textAlign = 'right';
            tracked(ctx, SIGNAGE.bandRight, w - 48, h / 2 + 16, 3);
          },
          { bg: null, grain: false },
        ),
      { repeat: [1, 1], srgb: true, aniso: 16 },
    ),
    transparent: true,
    roughness: 0.3,
    metalness: 0.8,
    envMapIntensity: 1.2,
  });
}

// ---------------------------------------------------------------------------
// The central pair of doors
// ---------------------------------------------------------------------------

function buildDoors(materials) {
  const g = new THREE.Group();
  g.name = 'doors';
  const H = DIMS.doorHeight;

  // Transom over the doors, carrying the street number.
  const transomH = BAND_TOP - H - 0.12;
  const transom = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_HALF * 2, transomH), materials.glassClear);
  transom.position.set(0, H + 0.12 + transomH / 2, 0);
  g.add(transom);

  const numberPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, transomH * 0.7),
    new THREE.MeshStandardMaterial({
      map: toTexture(
        'doornumber',
        () =>
          makeCard(
            300,
            180,
            (ctx, w, h) => {
              ctx.clearRect(0, 0, w, h);
              ctx.textAlign = 'center';
              ctx.fillStyle = '#C8922E';
              ctx.font = `400 96px ${TYPE.displayFamily}`;
              ctx.fillText(SIGNAGE.doorNumber, w / 2, h / 2 + 34);
            },
            { bg: null, grain: false },
          ),
        { repeat: [1, 1], srgb: true },
      ),
      transparent: true,
      roughness: 0.32,
      metalness: 0.85,
      envMapIntensity: 1.2,
    }),
  );
  numberPlate.position.set(0, H + 0.12 + transomH / 2, 0.012);
  g.add(numberPlate);
  g.add(slab(DOOR_HALF * 2 + 0.14, 0.1, 0.09, materials.cabinetGreen, 0, H + 0.06, 0.02, 0.003));

  // Two leaves, mostly glass, with a green base rail and brass push bars.
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group();
    const lw = DOOR_HALF;

    leaf.add(slab(lw, 0.42, 0.05, materials.cabinetGreen, 0, 0.21, 0, 0.003));
    pinstripe(leaf, materials, 0, 0.21, lw - 0.14, 0.26, 0.028, 0.0035);
    leaf.add(slab(lw, 0.09, 0.05, materials.cabinetGreen, 0, H - 0.045, 0, 0.003));
    for (const e of [-1, 1]) {
      leaf.add(slab(0.075, H - 0.5, 0.05, materials.cabinetGreen, e * (lw / 2 - 0.037), 0.42 + (H - 0.5) / 2, 0, 0.003));
    }
    const glassH = H - 0.55;
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(lw - 0.14, glassH), materials.glassClear);
    gl.position.set(0, 0.42 + glassH / 2 + 0.02, 0);
    leaf.add(gl);

    // Full-height brass push bar on the leading edge.
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.15, 12), materials.brassBright);
    bar.position.set(-s * (lw / 2 - 0.11), 1.06, 0.055);
    leaf.add(bar);
    for (const by of [0.52, 1.6]) {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.055, 8), materials.brassBright);
      stand.rotation.x = Math.PI / 2;
      stand.position.set(-s * (lw / 2 - 0.11), by, 0.03);
      leaf.add(stand);
    }

    // Hung on the outer jamb, standing very slightly open.
    const hinge = new THREE.Group();
    hinge.position.set(s * DOOR_HALF, 0, 0.01);
    leaf.position.set(-s * (lw / 2), 0, 0);
    hinge.add(leaf);
    hinge.rotation.y = -s * 0.06;
    g.add(hinge);
  }

  // Brass threshold strip, flush.
  g.add(slab(DOOR_HALF * 2, 0.008, 0.12, materials.brassDark, 0, 0.004, 0.02, 0.002));

  // A lantern each side of the doors.
  for (const s of [-1, 1]) {
    const l = R.lantern(materials);
    l.position.set(s * (DOOR_HALF + PIER + 0.42), 2.2, FRONT + 0.02);
    g.add(l);
  }

  g.traverse((m) => {
    if (m.isMesh) m.castShadow = true;
  });
  return g;
}

// ---------------------------------------------------------------------------
// Fascia — GRAND. between two gold lines, cornice, downlights
// ---------------------------------------------------------------------------

function buildFascia(materials) {
  const g = new THREE.Group();
  g.name = 'fascia';
  const W = DIMS.frontageWidth;
  const h = FASCIA_TOP - BAND_TOP;
  const cy = BAND_TOP + h / 2;

  g.add(slab(W, h, 0.12, materials.cabinetGreen, 0, cy, FRONT / 2, 0.004));
  pinstripe(g, materials, 0, cy, W - 0.26, h - 0.2, FRONT + 0.004, 0.005);

  // ── The wordmark, extruded ────────────────────────────────────────────────
  // Cream lettering with a gilded stop, sized to about a quarter of the frontage
  // so the two gold lines either side have room to breathe. No drop shadow in
  // this scheme — the reference fascia is flat cream on green.
  let size = 0.44;
  let mark = wordmark({ size, materials, depth: 0.026, shadowOffset: 0 });
  const scale = (W * 0.26) / mark.userData.width;
  if (Math.abs(scale - 1) > 0.02) {
    size *= scale;
    mark = wordmark({ size, materials, depth: 0.026, shadowOffset: 0 });
  }
  mark.position.set(0, cy - mark.userData.capHeight / 2, FRONT + 0.001);
  g.add(mark);

  // ── The two gold grotesque lines ──────────────────────────────────────────
  const sideMat = (text, align) =>
    new THREE.MeshStandardMaterial({
      map: toTexture(
        `fascia:${text}`,
        () =>
          makeCard(
            1024,
            300,
            (ctx, w, hh) => {
              ctx.clearRect(0, 0, w, hh);
              ctx.fillStyle = '#C8922E';
              ctx.font = `400 84px ${TYPE.informFamily}`;
              ctx.textAlign = align;
              // The elevation sets each of these over two lines.
              const words = text.split(' ');
              const mid = Math.ceil(words.length / 2);
              const x = align === 'left' ? 24 : w - 24;
              tracked(ctx, words.slice(0, mid).join(' '), x, 118, 4);
              tracked(ctx, words.slice(mid).join(' '), x, 222, 4);
            },
            { bg: null, grain: false },
          ),
        { repeat: [1, 1], srgb: true, aniso: 16 },
      ),
      transparent: true,
      roughness: 0.32,
      metalness: 0.82,
      envMapIntensity: 1.3,
    });

  const sideW = 2.45;
  const left = new THREE.Mesh(new THREE.PlaneGeometry(sideW, sideW * 0.293), sideMat(SIGNAGE.fasciaLeft, 'left'));
  left.position.set(-W / 2 + 0.32 + sideW / 2, cy, FRONT + 0.002);
  g.add(left);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(sideW, sideW * 0.293), sideMat(SIGNAGE.fasciaRight, 'right'));
  right.position.set(W / 2 - 0.32 - sideW / 2, cy, FRONT + 0.002);
  g.add(right);

  // ── Cornice ───────────────────────────────────────────────────────────────
  const cornice = new THREE.Mesh(mouldingAlongX(corniceProfile(0.2, 0.22), W + 0.34), materials.cabinetGreen);
  cornice.position.set(0, FASCIA_TOP, 0);
  cornice.castShadow = true;
  g.add(cornice);

  // ── Fascia downlights ─────────────────────────────────────────────────────
  // Eight recessed spots on the cornice soffit, washing the board. Motivated,
  // and the reason the fascia reads after dark without a lightbox.
  const N = 8;
  for (let i = 0; i < N; i++) {
    const x = -W / 2 + (W / (N - 1)) * i;
    const trim = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 14), materials.brassBright);
    trim.position.set(x, FASCIA_TOP - 0.01, 0.16);
    g.add(trim);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 14), materials.emissive(0xffe0b0, 1.4));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, FASCIA_TOP - 0.021, 0.16);
    g.add(lens);
  }
  // Two spots do the lighting work for all eight — a light per trim would cost
  // far more than it shows.
  for (const s of [-1, 1]) {
    const spot = new THREE.SpotLight(0xffe0b0, cd(0.5, 0.85, 0.9), 2.4, Math.PI * 0.5, 0.8, 1.7);
    spot.color.convertSRGBToLinear();
    spot.position.set(s * W * 0.26, FASCIA_TOP - 0.04, 0.16);
    spot.target.position.set(s * W * 0.26, cy - 0.1, FRONT);
    g.add(spot, spot.target);
  }

  // ── The hanging sign, on the left pier ────────────────────────────────────
  const sign = R.hangingSign(materials, { r: 0.48 });
  sign.position.set(-HALF - 0.62, 2.55, FRONT + 0.6);
  sign.rotation.y = Math.PI / 2;
  g.add(sign);

  return g;
}

// ---------------------------------------------------------------------------
// Upper storey — dressed stone with planted sills
// ---------------------------------------------------------------------------

function buildUpperStorey(materials) {
  const g = new THREE.Group();
  g.name = 'upperStorey';
  const W = DIMS.frontageWidth;
  const base = CORNICE_TOP;

  g.add(slab(W + 0.7, UPPER_TOP - base, 0.5, materials.stoneFacade, 0, (base + UPPER_TOP) / 2, -0.25, 0.012));

  const sashGlass = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x232b31).convertSRGBToLinear(),
    roughness: 0.07,
    metalness: 0.18,
    envMapIntensity: 1.3,
  });

  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 3.1;
    const y = base + 1.5;
    const win = new THREE.Group();
    win.add(slab(1.24, 2.0, 0.14, materials.cabinetInk, 0, 0, -0.07, 0.004));
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 1.9), sashGlass);
    gl.position.z = -0.005;
    win.add(gl);
    win.add(slab(1.16, 0.05, 0.03, materials.cabinetGreen, 0, 0.05, 0.012, 0.0015));
    for (const bx of [-0.29, 0.29]) win.add(slab(0.022, 1.9, 0.026, materials.cabinetGreen, bx, 0, 0.01, 0.001));

    const cill = new THREE.Mesh(
      mouldingAlongX(
        [
          [0, -0.02],
          [0, 0.12],
          [0.024, 0.13],
          [0.062, 0.1],
          [0.062, -0.02],
        ],
        1.5,
      ),
      materials.granite,
    );
    cill.position.set(0, -1.04, 0);
    cill.castShadow = true;
    win.add(cill);
    win.add(slab(1.5, 0.14, 0.08, materials.granite, 0, 1.08, 0.025, 0.004));

    win.position.set(x, y, 0.02);
    g.add(win);

    // A planter on each sill — the reference has planting at every level.
    const p = R.planter(materials, { r: 0.16, h: 0.2, kind: 'bush' });
    p.position.set(x, y - 0.95, 0.1);
    g.add(p);
  }

  // Parapet and coping.
  g.add(slab(W + 0.8, 0.55, 0.52, materials.stoneFacade, 0, UPPER_TOP + 0.275, -0.24, 0.01));
  const coping = new THREE.Mesh(
    mouldingAlongX(
      [
        [0, -0.04],
        [0, 0.55],
        [0.07, 0.58],
        [0.09, 0.5],
        [0.09, -0.04],
      ],
      W + 1.0,
    ),
    materials.granite,
  );
  coping.position.set(0, UPPER_TOP + 0.55, -0.28);
  coping.castShadow = true;
  g.add(coping);

  return g;
}

// ---------------------------------------------------------------------------
// Neighbours — stone frontages either side, to prove an ordinary street
// ---------------------------------------------------------------------------

function buildNeighbours(materials) {
  const g = new THREE.Group();
  g.name = 'neighbours';

  const unit = (x, width) => {
    const u = new THREE.Group();
    u.add(slab(width, UPPER_TOP + 0.6, 0.5, materials.stoneFacade, 0, (UPPER_TOP + 0.6) / 2, -0.25, 0.012));
    // A quiet neighbouring shopfront: dark reveal, plain glass, stone surround.
    u.add(slab(width - 1.0, 2.9, 0.14, materials.cabinetInk, 0, 1.75, 0.03, 0.006));
    const gl = new THREE.Mesh(
      box(width - 1.5, 2.4, 0.05, 0.004),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x2b3238).convertSRGBToLinear(),
        roughness: 0.1,
        metalness: 0.2,
        envMapIntensity: 1.15,
      }),
    );
    gl.position.set(0, 1.8, 0.09);
    u.add(gl);
    for (let f = 0; f < 2; f++) {
      for (const wx of [-width / 4, width / 4]) {
        u.add(slab(1.0, 1.7, 0.12, materials.cabinetInk, wx, 4.6 + f * 2.7, -0.06, 0.004));
      }
    }
    u.position.x = x;
    u.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return u;
  };

  g.add(unit(-HALF - 4.2, 7.4));
  g.add(unit(HALF + 4.2, 7.4));
  g.add(unit(-HALF - 11.8, 7.4));
  g.add(unit(HALF + 11.8, 7.4));

  return g;
}

// ---------------------------------------------------------------------------
// Street dressing
// ---------------------------------------------------------------------------

function buildStreetProps(materials) {
  const g = new THREE.Group();
  g.name = 'streetProps';

  // Two large planters with clipped standards, flanking the frontage.
  for (const s of [-1, 1]) {
    const p = R.planter(materials, { r: 0.34, h: 0.5, kind: 'tree' });
    p.position.set(s * (HALF - 0.5), 0, FRONT + 0.7);
    g.add(p);
  }

  // A discreet brass 18+ roundel beside the doors at door height. The only
  // statement of responsibility on the frontage, and deliberately small.
  const roundel = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.004, 26), materials.brassBright);
  disc.rotation.x = Math.PI / 2;
  roundel.add(disc);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.025, 26),
    new THREE.MeshStandardMaterial({
      map: toTexture(
        'roundel18',
        () =>
          makeCard(
            128,
            128,
            (ctx, w, h) => {
              ctx.fillStyle = '#0F2C20';
              ctx.fillRect(0, 0, w, h);
              ctx.fillStyle = '#C8922E';
              ctx.textAlign = 'center';
              ctx.font = `500 46px ${TYPE.informFamily}`;
              ctx.fillText('18+', w / 2, h / 2 + 16);
            },
            { bg: '#0F2C20', grain: false },
          ),
        { repeat: [1, 1], srgb: true },
      ),
      roughness: 0.4,
      metalness: 0.6,
      envMapIntensity: 1.0,
    }),
  );
  face.position.z = 0.0025;
  roundel.add(face);
  roundel.position.set(DOOR_HALF + PIER / 2, 1.55, FRONT + 0.004);
  g.add(roundel);

  // Framed panels below the windows, as on the elevation. The reference puts a
  // cannabis leaf here; the brief's exclusion list forbids leaf iconography, so
  // these carry the wordmark unless USE_LEAF_MARK is set.
  for (const s of [-1, 1]) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.44),
      new THREE.MeshStandardMaterial({
        map: toTexture(
          `basepanel:${USE_LEAF_MARK ? 'leaf' : 'mark'}`,
          () =>
            makeCard(
              440,
              320,
              (ctx, w, h) => {
                ctx.fillStyle = '#163A2B';
                ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = '#C8922E';
                ctx.lineWidth = 3;
                ctx.strokeRect(18, 18, w - 36, h - 36);
                ctx.textAlign = 'center';
                ctx.fillStyle = '#F4EEDE';
                ctx.font = `400 62px ${TYPE.displayFamily}`;
                ctx.fillText('GRAND', w / 2 - 12, h / 2 + 22);
                ctx.fillStyle = '#C8922E';
                ctx.beginPath();
                ctx.arc(w / 2 + 82, h / 2 + 6, 10, 0, Math.PI * 2);
                ctx.fill();
              },
              { bg: '#163A2B' },
            ),
          { repeat: [1, 1], srgb: true },
        ),
        roughness: 0.5,
        metalness: 0,
        envMapIntensity: 0.5,
      }),
    );
    panel.position.set(s * (HALF - 1.4), BASE / 2 + 0.02, FRONT + 0.006);
    g.add(panel);
  }

  return g;
}

export { BASE, FASCIA_TOP, FRONT, PALETTE };
