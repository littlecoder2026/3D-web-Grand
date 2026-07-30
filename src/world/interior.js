/**
 * The store interior, built to the supplied floor plan.
 *
 * 10.0m × 10.25m, symmetrical about the centreline, 102.5m² gross.
 *
 * ── Plan ────────────────────────────────────────────────────────────────────
 *   x = -5.00 … +5.00     side walls          z = 0 shopfront, z = -10.25 rear
 *   1  Entry / foyer      centre front, double doors, GRAND. mat
 *   2  Vape stand         pill-shaped island on a sage rug, centre of the room
 *   3  Tea                left wall, rear bay
 *   4  Gummies            left wall, middle bay
 *   5  Chewing gum        left wall, front bay
 *   6  Drinks             right wall, rear bay
 *   7  Mensch             right wall, middle bay
 *   8  Merch              right wall, front bay
 *   9  Main counter       curved-ended, across the rear at z = -7.75
 *      Back of house      z -8.35 … -10.25: storage left, staff + sink right,
 *                         arched GRAND. niche on the feature wall between them
 *
 * Sales floor 78.0m², back of house 12.5m², counter zone 12.0m².
 */

import * as THREE from 'three';
import { BAY_DEPTH, BAY_LENGTH, DIMS, PLAN, TYPE, WALL_BAYS, ZONES } from '../data/brand.js';
import {
  archShape,
  box,
  ground,
  mouldingAlongX,
  mouldingAlongZ,
  prism,
  rail,
  relief,
  roundedRectShape,
  skirtingProfile,
  slab,
  turned,
  wallWithArch,
} from '../core/geometry.js';
import { tracked } from '../core/textures.js';
import * as R from './retail.js';
import { wordmark } from './signage.js';

const L = PLAN.leftX; // -5.0
const Rt = PLAN.rightX; // +5.0
const REAR = PLAN.rearZ; // -10.25
const CH = DIMS.ceilingHeight; // 3.6

export function buildInterior(materials, { quality = 'high' } = {}) {
  const g = new THREE.Group();
  g.name = 'interior';
  const hi = quality === 'high';

  g.add(buildShell(materials, hi));
  g.add(buildEntry(materials));
  g.add(buildWallBays(materials));
  g.add(buildIsland(materials));
  g.add(buildCounter(materials));
  g.add(buildFeatureWall(materials));
  g.add(buildBackOfHouse(materials));
  g.add(buildCeilingRig(materials));

  return g;
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

function buildShell(materials, hi) {
  const g = new THREE.Group();
  g.name = 'shell';
  const W = DIMS.interiorWidth;
  const D = DIMS.interiorDepth;

  // Pale terrazzo across the whole sales floor.
  const floor = ground(W, D, materials.terrazzo, hi ? 24 : 1);
  floor.position.set(0, 0, -D / 2);
  g.add(floor);

  // Cream plaster walls, at a real trowel scale.
  const sidePlaster = materials.plasterAt([D / 1.2, CH / 1.2]);
  const endPlaster = materials.plasterAt([W / 1.2, CH / 1.2]);

  for (const [x, sign] of [[L, 1], [Rt, -1]]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(D, CH), sidePlaster);
    w.rotation.y = sign * (Math.PI / 2);
    w.position.set(x, CH / 2, -D / 2);
    w.receiveShadow = true;
    g.add(w);

    const sk = new THREE.Mesh(mouldingAlongZ(skirtingProfile(0.14, 0.022), D), materials.creamPaint);
    sk.position.set(x, 0, -D / 2);
    sk.scale.x = sign;
    g.add(sk);
  }

  const rearWall = new THREE.Mesh(new THREE.PlaneGeometry(W, CH), endPlaster);
  rearWall.position.set(0, CH / 2, REAR);
  rearWall.receiveShadow = true;
  g.add(rearWall);

  // Ceiling. A half-turn, not a quarter — ground() already lies flat.
  const ceil = ground(W, D, materials.plasterAt([W / 1.4, D / 1.4], 0xffffff, 0.35), 1);
  ceil.rotation.x = Math.PI;
  ceil.position.set(0, CH, -D / 2);
  ceil.castShadow = false;
  ceil.receiveShadow = true;
  g.add(ceil);

  // A simple shadow-gap cornice all round, which is what the reference has —
  // no ornate plaster in this scheme.
  const gap = [
    [0, 0],
    [0, 0.05],
    [-0.05, 0.05],
    [-0.05, 0],
  ];
  const cRear = new THREE.Mesh(mouldingAlongX(gap, W), materials.creamPaint);
  cRear.position.set(0, CH - 0.001, REAR + 0.001);
  g.add(cRear);
  for (const [x, sign] of [[L, 1], [Rt, -1]]) {
    const c = new THREE.Mesh(mouldingAlongZ(gap, D), materials.creamPaint);
    c.position.set(x, CH - 0.001, -D / 2);
    c.scale.x = sign;
    g.add(c);
  }

  // The sage rug under the island.
  const rugShape = roundedRectShape(ZONES.island.rug.w, ZONES.island.rug.l, 1.2);
  const rugMesh = new THREE.Mesh(prism(rugShape, 0.012, 0.002, 28), materials.rug);
  rugMesh.position.set(ZONES.island.cx, 0.001, ZONES.island.cz);
  rugMesh.receiveShadow = true;
  g.add(rugMesh);
  // A gold line round the rug, as drawn on the plan.
  const rugEdge = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        roundedRectShape(ZONES.island.rug.w, ZONES.island.rug.l, 1.2)
          .getPoints(120)
          .map((p) => new THREE.Vector3(p.x + ZONES.island.cx, 0.014, -p.y + ZONES.island.cz)),
        true,
      ),
      140,
      0.005,
      5,
      true,
    ),
    materials.brassBright,
  );
  g.add(rugEdge);

  return g;
}

// ---------------------------------------------------------------------------
// 1 — Entry / foyer
// ---------------------------------------------------------------------------

function buildEntry(materials) {
  const g = new THREE.Group();
  g.name = 'entry';

  // The GRAND. mat, recessed flush into the terrazzo.
  const mat = new THREE.Mesh(box(2.0, 0.014, 1.2, 0.004), materials.cabinetInk);
  mat.position.set(0, 0.007, -1.15);
  mat.receiveShadow = true;
  g.add(mat);
  const matFace = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 1.16), R.matMaterial());
  matFace.rotation.x = -Math.PI / 2;
  matFace.position.set(0, 0.0145, -1.15);
  g.add(matFace);

  // Bench under the left window, and planters flanking the doors inside.
  const bench = R.benchSeat(materials, { w: 1.8, d: 0.58 });
  bench.position.set(-3.3, 0, -0.62);
  bench.rotation.y = Math.PI;
  g.add(bench);

  for (const [x, z, r, h] of [
    [-1.95, -0.5, 0.24, 0.34],
    [1.95, -0.5, 0.24, 0.34],
    [-4.45, -1.9, 0.26, 0.36],
    [4.45, -1.9, 0.26, 0.36],
  ]) {
    const p = R.planter(materials, { r, h, kind: 'bush' });
    p.position.set(x, 0, z);
    g.add(p);
  }

  // A low console of merch by the right window, so the front of the shop is
  // dressed rather than empty.
  const console = slab(1.5, 0.9, 0.5, materials.cabinetGreen, 3.3, 0.45, -0.62, 0.004);
  g.add(console);
  const consoleTop = slab(1.58, 0.04, 0.56, materials.lightOak, 3.3, 0.92, -0.62, 0.003);
  g.add(consoleTop);
  const stack = R.merchStack(materials);
  stack.position.set(3.3, 0.94, -0.62);
  stack.scale.setScalar(0.85);
  g.add(stack);

  g.traverse((m) => {
    if (m.isMesh) m.receiveShadow = true;
  });
  return g;
}

// ---------------------------------------------------------------------------
// 3–8 — The six wall bays
// ---------------------------------------------------------------------------

/** Product dressing per bay, keyed to the plan labels. */
function dresserFor(id, materials) {
  return (bay, { shelfYs, archW }) => {
    const put = (obj, x, y, z = 0.16) => {
      obj.position.set(x, y, z);
      bay.add(obj);
    };
    const spread = archW - 0.28;
    const across = (i, n) => -spread / 2 + (spread / Math.max(1, n - 1)) * i;

    shelfYs.forEach((y, si) => {
      const top = y + 0.013;
      if (id === 'tea') {
        const face = R.packMaterial(['Barmbrack', 'Dublin Dry', 'Liffeyside'][si % 3], 'Loose leaf · 20 bags', ['#3E5C46', '#7A5C3A', '#4A6B72'][si % 3]);
        for (let i = 0; i < 5; i++) put(R.carton(materials, { face, w: 0.08, h: 0.12 }), across(i, 5), top);
      } else if (id === 'gummies') {
        const flavours = [
          ['Sour Bears', '#5E6B36'],
          ['Watermelon', '#8E2F3E'],
          ['Peach', '#B4682A'],
          ['Mixed Fruit', '#6B7333'],
        ];
        for (let i = 0; i < 4; i++) {
          const [nm, col] = flavours[(i + si) % 4];
          put(R.pouch(materials, { face: R.packMaterial(nm, 'Cannabis gummies', col) }), across(i, 4), top);
        }
      } else if (id === 'gum') {
        const face = R.packMaterial(['Peppermint', 'Spearmint'][si % 2], 'Cannabis gum · 10 pieces', '#E7E1D0', '#163A2B');
        for (let i = 0; i < 6; i++) put(R.carton(materials, { face, w: 0.055, h: 0.085, d: 0.022 }), across(i, 6), top);
      } else if (id === 'drinks') {
        const cans = [
          ['Lemon Lime', 0x4f7a3f],
          ['Blood Orange', 0xb2612a],
          ['Berry Hibiscus', 0x6d3f66],
        ];
        for (let i = 0; i < 6; i++) {
          const [nm, col] = cans[(i + si) % 3];
          put(R.drinksCan(materials, { colour: col, label: R.packMaterial(nm, 'Cannabis infused', `#${col.toString(16)}`) }), across(i, 6), top);
        }
      } else if (id === 'mensch') {
        if (si === 0) for (let i = 0; i < 6; i++) put(R.tincture(materials), across(i, 6), top);
        else if (si === 1) for (let i = 0; i < 5; i++) put(R.topical(materials), across(i, 5), top);
        else {
          const face = R.packMaterial('Mensch', 'Balance · daily', '#3B5A4A');
          for (let i = 0; i < 5; i++) put(R.carton(materials, { face }), across(i, 5), top);
        }
      } else if (id === 'merch') {
        if (si === 2) {
          const st = R.merchStack(materials);
          st.scale.setScalar(0.7);
          put(st, 0, top);
        } else {
          const face = R.packMaterial(si ? 'Tote' : 'Cap', 'GRAND. everyday', si ? '#DED6C2' : '#22432F', si ? '#163A2B' : '#F4EEDE');
          for (let i = 0; i < 4; i++) put(R.carton(materials, { face, w: 0.11, h: 0.09, d: 0.05 }), across(i, 4), top);
        }
      }
    });
  };
}

function buildWallBays(materials) {
  const g = new THREE.Group();
  g.name = 'wallBays';

  for (const bay of WALL_BAYS) {
    const left = bay.side === 'left';
    const unit = R.wallBay(materials, {
      label: bay.label,
      blurb: bay.blurb,
      dress: dresserFor(bay.id, materials),
    });
    unit.position.set(left ? L : Rt, 0, bay.z);
    // The bay is modelled facing +Z, so a quarter turn points it into the room.
    unit.rotation.y = left ? Math.PI / 2 : -Math.PI / 2;
    g.add(unit);
  }

  // Posters on the piers between the bays, and a sconce on each pier.
  const piers = [-2.7, -5.5];
  const posterKinds = { left: ['tea', 'balance'], right: ['vape', 'merch'] };
  for (const side of ['left', 'right']) {
    const x = side === 'left' ? L : Rt;
    const sign = side === 'left' ? 1 : -1;
    piers.forEach((z, i) => {
      const p = R.poster(materials, posterKinds[side][i], { w: 0.52, h: 0.7 });
      p.position.set(x + sign * 0.04, 1.72, z);
      p.rotation.y = sign * (Math.PI / 2);
      g.add(p);

      const sc = R.brassSconce(materials);
      sc.position.set(x + sign * 0.03, 2.42, z);
      sc.rotation.y = sign * (Math.PI / 2);
      g.add(sc);
    });
  }

  return g;
}

// ---------------------------------------------------------------------------
// 2 — The vape stand island
// ---------------------------------------------------------------------------

function buildIsland(materials) {
  const g = new THREE.Group();
  g.name = 'island';
  const { cx, cz, w, l } = ZONES.island;

  const body = R.island(materials, { w, l });
  body.position.set(cx, 0, cz);
  g.add(body);

  const top = DIMS.islandHeight;
  const put = (obj, x, z) => {
    obj.position.set(cx + x, top, cz + z);
    g.add(obj);
  };

  // Five product groups down the length, each with its own shelf-talker —
  // the arrangement in the supplied product photograph.
  const groups = [
    { label: 'VAPE', blurb: 'Premium devices & cartridges.', z: -1.45 },
    { label: 'FLOWER', blurb: 'Hand trimmed. Lab tested.', z: -0.72 },
    { label: 'PRE-ROLLS', blurb: 'Perfectly rolled. Always ready.', z: 0.0 },
    { label: 'TINCTURES', blurb: 'Precise dosing. Naturally balanced.', z: 0.72 },
    { label: 'TOPICALS', blurb: 'Feel the relief. Naturally.', z: 1.45 },
  ];

  for (const grp of groups) {
    const talker = R.signCard(materials, grp.label, grp.blurb, { w: 0.19, h: 0.12 });
    talker.position.set(cx - 0.02, top, cz + grp.z - 0.28);
    talker.rotation.y = Math.PI; // faces the entry
    g.add(talker);

    if (grp.label === 'VAPE') {
      const tray = slab(0.62, 0.016, 0.2, materials.lightOak, 0, 0, 0, 0.002);
      put(tray, 0, grp.z + 0.06);
      for (let i = 0; i < 5; i++) {
        const pen = R.vapePen(materials, { colour: [0x3a3f3b, 0x8d7139, 0x2b3a36][i % 3] });
        put(pen, -0.24 + i * 0.12, grp.z + 0.06);
      }
    } else if (grp.label === 'FLOWER') {
      const names = ['Lime Kush', 'Gelato', 'Purple Haze'];
      for (let i = 0; i < 3; i++) {
        put(
          R.flowerJar(materials, { label: R.packMaterial(names[i], 'Hand trimmed', '#E9E2D0', '#163A2B') }),
          -0.2 + i * 0.2,
          grp.z + 0.06,
        );
      }
    } else if (grp.label === 'PRE-ROLLS') {
      const rack = slab(0.56, 0.02, 0.18, materials.lightOak, 0, 0, 0, 0.002);
      put(rack, 0, grp.z + 0.06);
      for (let i = 0; i < 7; i++) put(R.preRollTube(materials), -0.24 + i * 0.08, grp.z + 0.06);
    } else if (grp.label === 'TINCTURES') {
      for (let i = 0; i < 5; i++) put(R.tincture(materials, { colour: [0x6b4a2a, 0x3d5240][i % 2] }), -0.24 + i * 0.12, grp.z + 0.06);
    } else {
      for (let i = 0; i < 4; i++) put(R.topical(materials), -0.2 + i * 0.13, grp.z + 0.06);
    }
  }

  // Planting at each end of the island, as drawn on the plan.
  for (const z of [-l / 2 + 0.42, l / 2 - 0.42]) {
    const p = R.planter(materials, { r: 0.15, h: 0.17, kind: 'bush' });
    p.position.set(cx, top, cz + z);
    g.add(p);
  }

  // The house card at the entry end.
  const house = R.signCard(materials, 'GRAND.', 'Premium products. Conscious choices.', { w: 0.26, h: 0.16 });
  house.position.set(cx, top, cz + l / 2 - 0.02);
  g.add(house);

  return g;
}

// ---------------------------------------------------------------------------
// 9 — Main counter
// ---------------------------------------------------------------------------

function buildCounter(materials) {
  const g = new THREE.Group();
  g.name = 'counterZone';
  const { cx, cz, w, d } = ZONES.counter;

  const c = R.counter(materials, { w, d });
  c.position.set(cx, 0, cz);
  g.add(c);

  // Two till screens, set back on the staff side and turned away from the
  // customer — nothing glowing at the person being served.
  for (const s of [-1, 1]) {
    const till = R.tillScreen(materials);
    till.position.set(cx + s * 1.15, DIMS.counterHeight, cz - 0.16);
    till.rotation.y = Math.PI + s * 0.22;
    g.add(till);
  }

  // A pair of small oak trays of paper bags on the customer side.
  for (const s of [-1, 1]) {
    const tray = slab(0.34, 0.02, 0.24, materials.lightOak, cx + s * 2.05, DIMS.counterHeight + 0.01, cz + 0.05, 0.002);
    g.add(tray);
    for (let i = 0; i < 2; i++) {
      const bagBody = slab(0.12, 0.16, 0.06, materials.paperCream, cx + s * 2.05 - 0.06 + i * 0.12, DIMS.counterHeight + 0.1, cz + 0.05, 0.004);
      bagBody.castShadow = true;
      g.add(bagBody);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.011, 16), materials.goldLeaf);
      dot.position.set(cx + s * 2.05 - 0.06 + i * 0.12, DIMS.counterHeight + 0.12, cz + 0.081);
      g.add(dot);
    }
  }

  g.traverse((m) => {
    if (m.isMesh) m.receiveShadow = true;
  });
  return g;
}

// ---------------------------------------------------------------------------
// The rear feature wall: arched GRAND. recess between two shelf units
// ---------------------------------------------------------------------------

function buildFeatureWall(materials) {
  const g = new THREE.Group();
  const z = ZONES.featureWall.z;
  const x0 = ZONES.featureWall.x0;
  const x1 = ZONES.featureWall.x1;
  const wallW = x1 - x0;

  // ── Arched recess ─────────────────────────────────────────────────────────
  const archW = 2.5;
  const archH = 2.65;

  // The wall, with the arch actually cut out of it. A solid plane here would
  // simply hide the recess behind it.
  const wall = new THREE.Mesh(
    relief(wallWithArch(wallW, CH, archW, archH), 0.06, 0.003, 26),
    materials.plasterAt([wallW / 1.2, CH / 1.2]),
  );
  wall.position.set((x0 + x1) / 2, 0, z - 0.06);
  wall.receiveShadow = true;
  wall.castShadow = true;
  g.add(wall);
  // The recess is 140mm deep and its back face is a warmer, slightly deeper
  // plaster than the wall. Without that tonal step the arch reads as a gold
  // hoop floating in front of a flat wall rather than as a niche.
  const REVEAL = 0.14;
  const lining = new THREE.Mesh(
    new THREE.ShapeGeometry(archShape(archW, archH), 26),
    materials.plasterAt([archW / 1.2, archH / 1.2], 0xe9dfc9, 0.3),
  );
  lining.position.set(0, 0.0, z - REVEAL);
  lining.receiveShadow = true;
  g.add(lining);

  // Reveal: a ring of short segments following the arch, so the wash from above
  // throws a real shadow down one side of the opening.
  const revealMat = materials.plasterAt([1, 1], 0xf2ead8, 0.3);
  const arcPts = [];
  {
    const rr = archW / 2;
    const st = archH - rr;
    for (let i = 0; i <= 22; i++) {
      const a = Math.PI - (i / 22) * Math.PI;
      arcPts.push(new THREE.Vector2(Math.cos(a) * rr, st + Math.sin(a) * rr));
    }
  }
  for (let i = 0; i < arcPts.length - 1; i++) {
    const a = arcPts[i];
    const b = arcPts[i + 1];
    const len = a.distanceTo(b) + 0.01;
    const seg = slab(len, 0.012, REVEAL, revealMat, (a.x + b.x) / 2, (a.y + b.y) / 2, z - REVEAL / 2, 0.002);
    seg.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
    g.add(seg);
  }
  for (const s of [-1, 1]) {
    const jambReveal = slab(0.012, archH - archW / 2, REVEAL, revealMat, s * (archW / 2), (archH - archW / 2) / 2, z - REVEAL / 2, 0.002);
    g.add(jambReveal);
  }

  // Gold bead following the arch.
  const r = archW / 2;
  const straight = archH - r;
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const a = Math.PI - (i / 30) * Math.PI;
    pts.push(new THREE.Vector3(Math.cos(a) * r, straight + Math.sin(a) * r, z + 0.012));
  }
  const bead = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.011, 6, false), materials.brassBright);
  g.add(bead);
  for (const s of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, straight, 6), materials.brassBright);
    jamb.position.set(s * r, straight / 2, z + 0.012);
    g.add(jamb);
  }

  // The wordmark, in relief inside the arch. Same extruded WARREN geometry as
  // the fascia, so the interior and exterior carry an identical lockup.
  const mark = wordmark({
    size: 0.42,
    materials,
    depth: 0.022,
    shadowOffset: 0,
    letterMaterial: materials.cabinetGreen,
  });
  mark.position.set(0, 1.55, z - REVEAL + 0.002);
  g.add(mark);

  // ── Flanking shelf units ──────────────────────────────────────────────────
  for (const s of [-1, 1]) {
    const ux = s * 2.02;
    const uw = 0.86;
    // Back board plus two sides and a top, so the shelves sit inside the unit
    // rather than buried in a solid mass.
    g.add(slab(uw, 1.9, 0.03, materials.cabinetGreen, ux, 0.95, z + 0.015, 0.003));
    for (const e of [-1, 1]) {
      g.add(slab(0.03, 1.9, 0.32, materials.cabinetGreen, ux + e * (uw / 2), 0.95, z + 0.16, 0.003));
    }
    g.add(slab(uw + 0.06, 0.04, 0.36, materials.cabinetGreen, ux, 1.92, z + 0.18, 0.003));
    g.add(slab(uw + 0.02, 0.1, 0.34, materials.cabinetInk, ux, 0.05, z + 0.17, 0.003));
    for (let i = 0; i < 4; i++) {
      const sh = R.goldShelf(materials, { w: uw - 0.06, d: 0.26, lit: true });
      sh.position.set(ux, 0.52 + i * 0.42, z + 0.18);
      g.add(sh);
      // a few cartons per shelf
      for (let k = 0; k < 3; k++) {
        const cn = R.carton(materials, {
          face: R.packMaterial(['Tea', 'Gum', 'Mensch'][k], 'GRAND.', ['#3E5C46', '#E7E1D0', '#3B5A4A'][k], k === 1 ? '#163A2B' : '#F4EEDE'),
          w: 0.08,
          h: 0.11,
        });
        cn.position.set(ux - 0.24 + k * 0.24, 0.535 + i * 0.42, z + 0.2);
        g.add(cn);
      }
    }
    const planterTop = R.planter(materials, { r: 0.13, h: 0.15, kind: 'bush' });
    planterTop.position.set(ux, 1.9, z + 0.16);
    g.add(planterTop);
  }

  g.traverse((m) => {
    if (m.isMesh) m.receiveShadow = true;
  });
  return g;
}

// ---------------------------------------------------------------------------
// Back of house — storage left, staff room with a sink right
// ---------------------------------------------------------------------------

function buildBackOfHouse(materials) {
  const g = new THREE.Group();
  g.name = 'backOfHouse';
  const { z0, storageX, staffX } = ZONES.boh;

  const rooms = [
    { x: storageX, label: 'STORAGE ROOM', doorAt: storageX[1] - 0.55 },
    { x: staffX, label: 'STAFF ONLY', doorAt: staffX[0] + 0.55 },
  ];

  for (const room of rooms) {
    const [rx0, rx1] = room.x;
    const w = rx1 - rx0;
    const cxr = (rx0 + rx1) / 2;

    // Partition across the front of the room, with a door opening.
    const doorW = 0.9;
    const segs = [
      [rx0, room.doorAt - doorW / 2],
      [room.doorAt + doorW / 2, rx1],
    ];
    for (const [a, b] of segs) {
      if (b - a < 0.02) continue;
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(b - a, CH), materials.plasterAt([(b - a) / 1.2, CH / 1.2]));
      seg.position.set((a + b) / 2, CH / 2, z0);
      seg.receiveShadow = true;
      g.add(seg);
      const skirt = new THREE.Mesh(mouldingAlongX(skirtingProfile(0.14, 0.022), b - a), materials.creamPaint);
      skirt.position.set((a + b) / 2, 0, z0 + 0.001);
      g.add(skirt);
    }
    // Head over the door.
    const head = slab(doorW + 0.14, CH - DIMS.doorHeight, 0.1, materials.creamPaint, room.doorAt, DIMS.doorHeight + (CH - DIMS.doorHeight) / 2, z0, 0.003);
    g.add(head);

    // The door: green, with a brass lever and a small grotesque sign.
    const leaf = new THREE.Group();
    const leafMesh = slab(doorW, DIMS.doorHeight, 0.04, materials.cabinetGreen, doorW / 2, DIMS.doorHeight / 2, 0, 0.003);
    leaf.add(leafMesh);
    const lever = new THREE.Mesh(rail(0.011, 0.11, 'x', 10), materials.brassBright);
    lever.position.set(doorW - 0.11, 1.05, 0.035);
    leaf.add(lever);
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.06),
      R.printedMat(
        `bohsign:${room.label}`,
        400,
        120,
        (ctx, cw, ch) => {
          ctx.fillStyle = '#0F2C20';
          ctx.fillRect(0, 0, cw, ch);
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(244,238,222,0.85)';
          ctx.font = `300 40px ${TYPE.informFamily}`;
          tracked(ctx, room.label, cw / 2, ch / 2 + 14, 4);
        },
        { bg: '#0F2C20' },
      ),
    );
    plate.position.set(doorW / 2, 1.72, 0.021);
    leaf.add(plate);

    leaf.position.set(room.doorAt - doorW / 2, 0, z0 + 0.02);
    leaf.rotation.y = room.label === 'STORAGE ROOM' ? -0.3 : -0.12;
    g.add(leaf);

    // A sliver of the room behind: shelving, and a sink in the staff room.
    for (let i = 0; i < 3; i++) {
      const sh = slab(w - 0.5, 0.03, 0.4, materials.blackSteel, cxr, 0.6 + i * 0.55, REAR + 0.32, 0.002);
      g.add(sh);
      for (let k = 0; k < 3; k++) {
        const crate = new THREE.Mesh(box(0.3, 0.22, 0.3, 0.006), materials.ashLight);
        crate.position.set(cxr - 0.5 + k * 0.5, 0.73 + i * 0.55, REAR + 0.32);
        crate.castShadow = true;
        g.add(crate);
      }
    }

    if (room.label === 'STAFF ONLY') {
      const run = slab(1.4, 0.9, 0.6, materials.cabinetGreen, cxr + 0.2, 0.45, REAR + 0.95, 0.004);
      g.add(run);
      const worktop = slab(1.48, 0.04, 0.64, materials.lightOak, cxr + 0.2, 0.92, REAR + 0.95, 0.003);
      g.add(worktop);
      const basin = new THREE.Mesh(
        turned(
          [
            [0, 0],
            [0.17, 0],
            [0.18, 0.01],
            [0.19, 0.1],
            [0.2, 0.11],
            [0, 0.11],
          ],
          18,
        ),
        materials.blackSteel,
      );
      basin.position.set(cxr + 0.2, 0.83, REAR + 0.95);
      g.add(basin);
      const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.26, 10), materials.brassBright);
      tap.position.set(cxr + 0.2, 1.06, REAR + 0.72);
      g.add(tap);
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.16, 8), materials.brassBright);
      spout.rotation.x = Math.PI / 2;
      spout.position.set(cxr + 0.2, 1.18, REAR + 0.8);
      g.add(spout);
    }
  }

  // Rear wall behind the BOH rooms is the shell's rear wall; add a plain floor
  // tone so the sliver reads as a working room rather than the shop.
  const bohFloor = ground(DIMS.interiorWidth, Math.abs(REAR - z0), materials.limewash(0x9c988d), 1);
  bohFloor.position.set(0, 0.003, (z0 + REAR) / 2);
  g.add(bohFloor);

  g.traverse((m) => {
    if (m.isMesh) m.receiveShadow = true;
  });
  return g;
}

// ---------------------------------------------------------------------------
// Ceiling rig — two track runs and the globe pendants
// ---------------------------------------------------------------------------

function buildCeilingRig(materials) {
  const g = new THREE.Group();
  g.name = 'ceilingRig';

  for (const s of [-1, 1]) {
    const track = R.lightTrack(materials, { length: 6.8, spots: 7 });
    track.position.set(s * 2.9, CH - 0.014, -4.4);
    g.add(track);
  }

  // Central cluster in front of the arch, plus a single globe each side of it.
  const cluster = R.globePendant(materials, { from: CH, drops: [2.5, 2.05], r: 0.15 });
  cluster.position.set(0, 0, -6.55);
  g.add(cluster);
  for (const s of [-1, 1]) {
    const single = R.globePendant(materials, { from: CH, drops: [2.62], r: 0.12 });
    single.position.set(s * 1.15, 0, -8.05);
    g.add(single);
  }

  return g;
}
