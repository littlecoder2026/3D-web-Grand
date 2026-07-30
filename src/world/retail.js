/**
 * Retail fixtures and product, built to the supplied floor plan and elevation.
 *
 * The redesigned store is a symmetrical 10m box: green cabinetry with gold-framed
 * arched niches down both side walls, a pill-shaped island in the middle, and a
 * curved counter across the rear under an arched GRAND. recess.
 *
 * Everything printed — shelf signage, packaging, posters, the entry mat — is
 * drawn to canvas in the brand faces, so nothing is ever garbled and the
 * serif-reassures / grotesque-informs rule holds at product scale.
 */

import * as THREE from 'three';
import { BAY_DEPTH, BAY_LENGTH, DIMS, PALETTE, TYPE, USE_LEAF_MARK } from '../data/brand.js';
import {
  archShape,
  box,
  outlineTube,
  prism,
  rail,
  relief,
  roundedRectShape,
  slab,
  turned,
  wallWithArch,
} from '../core/geometry.js';
import { makeCard, toTexture, tracked } from '../core/textures.js';

const GREEN = '#163A2B';
const INK = '#0F2C20';
const GOLD = '#C8922E';
const CREAM = '#F4EEDE';

// ---------------------------------------------------------------------------
// Printed matter
// ---------------------------------------------------------------------------

const _mats = new Map();
function printedMat(key, w, h, draw, opts = {}) {
  const hit = _mats.get(key);
  if (hit) return hit;
  const m = new THREE.MeshStandardMaterial({
    map: toTexture(key, () => makeCard(w, h, draw, opts), { repeat: [1, 1], srgb: true, aniso: 8 }),
    roughness: 0.68,
    metalness: 0,
    envMapIntensity: 0.3,
  });
  _mats.set(key, m);
  return m;
}

/**
 * A shelf-talker: bottle green card, category in grotesque caps, one line of
 * plain-English benefit underneath. Straight off the reference photograph.
 */
export function signCardMaterial(label, blurb) {
  return printedMat(
    `sign:${label}`,
    512,
    320,
    (ctx, w, h) => {
      ctx.fillStyle = GREEN;
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'left';
      ctx.fillStyle = CREAM;
      ctx.font = `500 54px ${TYPE.informFamily}`;
      tracked(ctx, label.toUpperCase(), 38, 118, 3.2);

      ctx.fillStyle = 'rgba(244,238,222,0.72)';
      ctx.font = `300 32px ${TYPE.informFamily}`;
      // wrap the blurb on its sentence breaks, the way the reference cards do
      const lines = blurb.split(/(?<=\.)\s+/);
      lines.slice(0, 3).forEach((t, i) => ctx.fillText(t, 38, 186 + i * 46));

      ctx.fillStyle = GOLD;
      ctx.fillRect(38, h - 46, 58, 3);
    },
    { bg: GREEN },
  );
}

/** Framed wall poster — the TEA / ELEVATED MOMENTS / MERCH prints. */
export function posterMaterial(kind) {
  const specs = {
    tea: { head: 'TEA', sub: ['For the mind,', 'body & soul.'], accent: '#8FA98C', motif: 'cup' },
    vape: { head: 'ELEVATED', sub: ['MOMENTS.'], accent: '#2A2E2B', motif: 'pen', dark: true },
    merch: { head: 'MERCH', sub: ['Wear it. Live it.'], accent: '#8FA98C', motif: 'none' },
    balance: { head: 'NATURE.', sub: ['SCIENCE.', 'BALANCE.'], accent: '#8FA98C', motif: 'mark' },
  };
  const s = specs[kind] || specs.tea;

  return printedMat(
    `poster:${kind}`,
    480,
    640,
    (ctx, w, h) => {
      const bg = s.dark ? INK : '#F6F2E6';
      const fg = s.dark ? CREAM : GREEN;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.textAlign = 'left';
      ctx.fillStyle = fg;
      ctx.font = `400 62px ${TYPE.displayFamily}`;
      ctx.fillText(s.head, 46, 108);
      ctx.font = `300 30px ${TYPE.textFamily}`;
      ctx.fillStyle = s.dark ? 'rgba(244,238,222,0.72)' : 'rgba(22,58,43,0.7)';
      s.sub.forEach((t, i) => ctx.fillText(t, 46, 158 + i * 40));

      // Motif. The reference uses a cannabis leaf on one of these; the brief
      // forbids leaf iconography, so the default is the gilded full stop.
      ctx.save();
      ctx.translate(w / 2, h * 0.58);
      if (s.motif === 'cup') {
        ctx.fillStyle = s.accent;
        ctx.beginPath();
        ctx.ellipse(0, 40, 110, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-78, -66);
        ctx.bezierCurveTo(-78, 34, 78, 34, 78, -66);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = s.accent;
        ctx.lineWidth = 13;
        ctx.beginPath();
        ctx.arc(104, -30, 34, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      } else if (s.motif === 'pen') {
        ctx.fillStyle = '#4A4F4B';
        ctx.beginPath();
        ctx.roundRect(-17, -128, 34, 254, 15);
        ctx.fill();
        ctx.fillStyle = GOLD;
        ctx.fillRect(-17, -46, 34, 5);
      } else if (s.motif === 'mark') {
        if (USE_LEAF_MARK) {
          // Simple seven-point mark, only reachable when the flag is set.
          ctx.fillStyle = s.accent;
          for (let i = 0; i < 7; i++) {
            const a = -Math.PI / 2 + (i - 3) * 0.42;
            ctx.save();
            ctx.rotate(a);
            ctx.beginPath();
            ctx.ellipse(0, -70, 16, 74, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        } else {
          ctx.fillStyle = GREEN;
          ctx.font = `400 84px ${TYPE.displayFamily}`;
          ctx.textAlign = 'center';
          ctx.fillText('GRAND', -14, 30);
          ctx.fillStyle = GOLD;
          ctx.beginPath();
          ctx.arc(112, 16, 14, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Foot: the wordmark, always with its gold stop.
      ctx.textAlign = 'left';
      ctx.fillStyle = fg;
      ctx.font = `400 38px ${TYPE.displayFamily}`;
      ctx.fillText('GRAND', 46, h - 52);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(152, h - 63, 8, 0, Math.PI * 2);
      ctx.fill();
    },
    { bg: null },
  );
}

/** Packaging face for a carton, pouch or can. */
export function packMaterial(name, sub, bodyColour, textColour = CREAM) {
  return printedMat(
    `pack:${name}:${bodyColour}`,
    256,
    384,
    (ctx, w, h) => {
      ctx.fillStyle = bodyColour;
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.fillStyle = textColour;
      ctx.font = `400 34px ${TYPE.displayFamily}`;
      ctx.fillText('GRAND', w / 2 - 8, 66);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(w / 2 + 52, 56, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = textColour;
      ctx.font = `300 22px ${TYPE.informFamily}`;
      tracked(ctx, name.toUpperCase(), w / 2, h / 2 - 6, 2);
      ctx.font = `300 17px ${TYPE.informFamily}`;
      ctx.globalAlpha = 0.75;
      ctx.fillText(sub, w / 2, h / 2 + 26);
      ctx.globalAlpha = 1;

      // Dose, boxed — the responsibility signal, at product scale.
      ctx.strokeStyle = textColour;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      ctx.strokeRect(w / 2 - 52, h - 74, 104, 34);
      ctx.globalAlpha = 1;
      ctx.font = `400 19px ${TYPE.informFamily}`;
      tracked(ctx, '10mg THC', w / 2, h - 50, 1);
    },
    { bg: bodyColour },
  );
}

/** The GRAND. entry mat. */
export function matMaterial() {
  return printedMat(
    'entrymat',
    1024,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.fillStyle = CREAM;
      ctx.font = `400 210px ${TYPE.displayFamily}`;
      ctx.fillText('GRAND', w / 2 - 40, h / 2 + 72);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(w / 2 + 300, h / 2 + 44, 30, 0, Math.PI * 2);
      ctx.fill();
    },
    { bg: INK },
  );
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

/** A printed carton standing on a shelf. */
export function carton(materials, { w = 0.075, h = 0.115, d = 0.032, face }) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(box(w, h, d, 0.002), materials.card(0xdad4c4));
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  if (face) {
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.98, h * 0.98), face);
    front.position.set(0, h / 2, d / 2 + 0.0008);
    g.add(front);
  }
  return g;
}

/** A stand-up gummy pouch: rounded top, flat bottom gusset. */
export function pouch(materials, { w = 0.085, h = 0.12, face }) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(box(w, h, 0.038, 0.008), materials.card(0xcfc8b8, 0.55));
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  // heat-sealed top with a hang hole
  const top = new THREE.Mesh(box(w, 0.016, 0.006, 0.002), materials.card(0xcfc8b8, 0.55));
  top.position.y = h + 0.008;
  g.add(top);
  if (face) {
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.97, h * 0.94), face);
    front.position.set(0, h / 2, 0.0198);
    g.add(front);
  }
  return g;
}

/** A 330ml infused drinks can. */
export function drinksCan(materials, { colour = 0x4f7a3f, label } = {}) {
  const g = new THREE.Group();
  const r = 0.033;
  const body = new THREE.Mesh(
    turned(
      [
        [0, 0],
        [r * 0.86, 0],
        [r, 0.012],
        [r, 0.098],
        [r * 0.88, 0.112],
        [r * 0.82, 0.115],
        [r * 0.84, 0.117],
        [0, 0.117],
      ],
      20,
    ),
    materials.anodised(colour),
  );
  body.castShadow = true;
  g.add(body);
  if (label) {
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.005, r * 1.005, 0.078, 20, 1, true), label);
    wrap.position.y = 0.055;
    g.add(wrap);
  }
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.83, r * 0.83, 0.004, 18), materials.brassDark);
  lid.position.y = 0.118;
  g.add(lid);
  return g;
}

/** A glass jar of flower with a printed neck label. */
export function flowerJar(materials, { h = 0.115, r = 0.045, label } = {}) {
  const g = new THREE.Group();
  const jar = new THREE.Mesh(
    turned(
      [
        [0, 0],
        [r * 0.9, 0],
        [r, 0.012],
        [r, h * 0.78],
        [r * 0.9, h * 0.86],
        [r * 0.7, h * 0.9],
        [r * 0.72, h * 0.94],
        [r * 0.7, h * 0.95],
      ],
      22,
    ),
    materials.glassClear,
  );
  g.add(jar);
  const lid = new THREE.Mesh(
    turned(
      [
        [0, h * 0.95],
        [r * 0.74, h * 0.95],
        [r * 0.76, h * 0.98],
        [r * 0.7, h * 1.02],
        [0, h * 1.03],
      ],
      18,
    ),
    materials.brassBright,
  );
  lid.castShadow = true;
  g.add(lid);

  // Bud, as clustered spheres — dried plant matter at browsing distance, never
  // a graphic and never being consumed.
  const bud = new THREE.SphereGeometry(0.014, 7, 5);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    const m = new THREE.Mesh(bud, materials.flower);
    m.position.set(Math.cos(a) * r * 0.5, 0.02 + (i % 3) * 0.022, Math.sin(a) * r * 0.5);
    m.scale.setScalar(0.8 + ((i * 37) % 10) / 22);
    g.add(m);
  }
  if (label) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, 0.03, 20, 1, true), label);
    band.position.y = h * 0.42;
    g.add(band);
  }
  return g;
}

/** A pre-roll tube in a rack. */
export function preRollTube(materials) {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.115, 14), materials.glassClear);
  tube.position.y = 0.0575;
  g.add(tube);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.016, 14), materials.cabinetGreen);
  cap.position.y = 0.123;
  cap.castShadow = true;
  g.add(cap);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.095, 8), materials.paperCream);
  stick.position.y = 0.052;
  g.add(stick);
  return g;
}

/** A dropper bottle — the tinctures. */
export function tincture(materials, { colour = 0x6b4a2a } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    turned(
      [
        [0, 0],
        [0.018, 0],
        [0.019, 0.006],
        [0.019, 0.052],
        [0.011, 0.062],
        [0.0105, 0.072],
        [0, 0.072],
      ],
      16,
    ),
    materials.card(colour, 0.25),
  );
  body.castShadow = true;
  g.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.024, 14), materials.cabinetInk);
  cap.position.y = 0.083;
  g.add(cap);
  return g;
}

/** A squat topical jar. */
export function topical(materials) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.034, 18), materials.card(0xe7e0cf));
  body.position.y = 0.017;
  body.castShadow = true;
  g.add(body);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.012, 18), materials.cabinetGreen);
  lid.position.y = 0.04;
  g.add(lid);
  return g;
}

/** A vape device lying on a tray. */
export function vapePen(materials, { colour = 0x3a3f3b } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(box(0.017, 0.088, 0.011, 0.004), materials.anodised(colour));
  body.position.y = 0.044;
  body.castShadow = true;
  g.add(body);
  const band = new THREE.Mesh(box(0.0175, 0.004, 0.0115, 0.001), materials.brassBright);
  band.position.y = 0.03;
  g.add(band);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.006, 0.014, 10), materials.cabinetInk);
  tip.position.y = 0.094;
  g.add(tip);
  return g;
}

/** Folded merch: a tee, a cap and a tote. */
export function merchStack(materials) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const tee = new THREE.Mesh(box(0.19, 0.028, 0.15, 0.01), i % 2 ? materials.card(0xe3dccb) : materials.cabinetGreen);
    tee.position.set(0, 0.016 + i * 0.03, 0);
    tee.rotation.y = (i - 1) * 0.04;
    tee.castShadow = true;
    g.add(tee);
  }
  const cap = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), materials.cabinetGreen);
  crown.scale.set(1, 0.75, 1);
  cap.add(crown);
  const peak = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.007, 16, 1, false, 0, Math.PI), materials.cabinetGreen);
  peak.position.set(0, 0.004, 0.045);
  peak.scale.z = 1.25;
  cap.add(peak);
  cap.position.set(0.24, 0.1, 0.01);
  cap.traverse((m) => {
    if (m.isMesh) m.castShadow = true;
  });
  g.add(cap);

  const tote = new THREE.Mesh(box(0.16, 0.19, 0.05, 0.006), materials.card(0xded6c2, 0.85));
  tote.position.set(-0.25, 0.095, 0);
  tote.castShadow = true;
  g.add(tote);
  for (const s of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.0035, 5, 12, Math.PI), materials.card(0xded6c2, 0.85));
    handle.position.set(-0.25 + s * 0.04, 0.19, 0);
    handle.rotation.y = Math.PI / 2;
    g.add(handle);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * A gold-framed, LED-lit shelf board. The frame is the signature detail of the
 * reference interior: a brass angle under a light oak board, with a warm strip
 * washing the products below.
 */
export function goldShelf(materials, { w, d = 0.3, lit = true }) {
  const g = new THREE.Group();
  const board = slab(w, 0.026, d, materials.lightOakShelf, 0, 0, 0, 0.002);
  g.add(board);
  const edge = new THREE.Mesh(rail(0.006, w, 'x', 8), materials.brassBright);
  edge.position.set(0, -0.004, d / 2);
  g.add(edge);
  if (lit) {
    // The strip sits behind the brass edge, so you see the light and not the
    // source — the reference shelves glow, they don't glare.
    const strip = new THREE.Mesh(box(w - 0.06, 0.008, 0.014, 0.002), materials.emissive(0xffe0b0, 0.9));
    strip.position.set(0, -0.02, d / 2 - 0.03);
    g.add(strip);
  }
  g.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return g;
}

/** Brass wall sconce — the uplights between the wall bays. */
export function brassSconce(materials) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(box(0.07, 0.12, 0.014, 0.002), materials.brassBright);
  g.add(plate);
  const armPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 10), materials.brassBright);
  armPipe.rotation.x = Math.PI / 2.6;
  armPipe.position.set(0, 0.05, 0.05);
  g.add(armPipe);
  const shade = new THREE.Mesh(
    turned(
      [
        [0.014, 0.09],
        [0.03, 0.085],
        [0.055, 0.05],
        [0.062, 0.004],
        [0.062, 0],
      ],
      18,
    ),
    materials.brassBright,
  );
  shade.position.set(0, 0.04, 0.1);
  g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), materials.bulb2700);
  bulb.position.set(0, 0.06, 0.1);
  g.add(bulb);
  g.traverse((m) => {
    if (m.isMesh) m.castShadow = true;
  });
  return g;
}

/** Opal globe pendant, hung in a vertical cluster on a brass stem. */
export function globePendant(materials, { from = DIMS.ceilingHeight, drops = [1.9, 2.35], r = 0.13 } = {}) {
  const g = new THREE.Group();
  const lowest = Math.min(...drops);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, from - lowest, 10), materials.brassBright);
  stem.position.y = lowest + (from - lowest) / 2;
  g.add(stem);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.018, 16), materials.brassBright);
  rose.position.y = from - 0.009;
  g.add(rose);
  for (const y of drops) {
    const globe = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), materials.shadeOpal);
    globe.position.y = y;
    g.add(globe);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.02, 14), materials.brassBright);
    collar.position.y = y + r * 0.92;
    g.add(collar);
  }
  g.traverse((m) => {
    if (m.isMesh && m.material !== materials.shadeOpal) m.castShadow = true;
  });
  return g;
}

/** A ceiling track with directional spots. */
export function lightTrack(materials, { length = 7.0, spots = 7 }) {
  const g = new THREE.Group();
  const bar = new THREE.Mesh(box(0.032, 0.028, length, 0.002), materials.card(0xe8e3d6, 0.4));
  g.add(bar);
  for (let i = 0; i < spots; i++) {
    const z = -length / 2 + (length / (spots - 1)) * i;
    const head = new THREE.Group();
    const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), materials.card(0xe8e3d6, 0.4));
    yoke.position.y = -0.036;
    head.add(yoke);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.085, 14), materials.card(0xece7da, 0.35));
    can.position.y = -0.09;
    can.rotation.x = 0.28;
    head.add(can);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 14), materials.emissive(0xffe3b8, 1.1));
    lens.position.set(0, -0.131, 0.012);
    lens.rotation.x = -Math.PI / 2 + 0.28;
    head.add(lens);
    head.position.z = z;
    head.traverse((m) => {
      if (m.isMesh) m.castShadow = true;
    });
    g.add(head);
  }
  return g;
}

/**
 * One wall bay — plan items 3 to 8.
 *
 * Base cupboards with a light oak top, a tall arched recess above lined in
 * Forest Ink, three gold-framed shelves inside it, a brass-lettered header, and
 * a planter on the cornice. Built once and mirrored to both walls.
 */
export function wallBay(materials, { label, blurb, dress }) {
  const g = new THREE.Group();
  const W = BAY_LENGTH;
  const D = BAY_DEPTH;
  const H = DIMS.wallBayHeight;
  const baseH = DIMS.baseUnitHeight;

  // ── Base cupboards ────────────────────────────────────────────────────────
  const carcass = slab(W, baseH - 0.1, D, materials.cabinetGreen, 0, (baseH - 0.1) / 2 + 0.1, D / 2, 0.003);
  g.add(carcass);
  const plinth = slab(W - 0.04, 0.1, D - 0.06, materials.cabinetInk, 0, 0.05, D / 2 - 0.01, 0.002);
  g.add(plinth);

  // Two shaker doors with brass knobs.
  for (const s of [-1, 1]) {
    const doorW = W / 2 - 0.03;
    const dr = slab(doorW, baseH - 0.16, 0.022, materials.cabinetGreen, s * (W / 4), (baseH - 0.16) / 2 + 0.12, D + 0.011, 0.002);
    g.add(dr);
    const panelInset = slab(doorW - 0.13, baseH - 0.29, 0.008, materials.cabinetGreen, s * (W / 4), (baseH - 0.16) / 2 + 0.12, D + 0.004, 0.002);
    g.add(panelInset);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), materials.brassBright);
    knob.position.set(s * 0.08, baseH - 0.26, D + 0.03);
    g.add(knob);
  }

  // Light oak counter over the cupboards, with a brass nosing.
  const top = slab(W + 0.04, 0.038, D + 0.06, materials.lightOak, 0, baseH, D / 2 + 0.02, 0.003);
  g.add(top);
  const nosing = new THREE.Mesh(rail(0.005, W + 0.04, 'x', 8), materials.brassBright);
  nosing.position.set(0, baseH - 0.004, D + 0.05);
  g.add(nosing);

  // ── Arched recess ─────────────────────────────────────────────────────────
  //
  // A face panel with the arch genuinely cut out of it, extruded 300mm forward.
  // Extruding a shape that has a hole gives the reveal walls for free, so the
  // opening is a real recess with real self-shadowing. Modelling the arch as a
  // solid slab instead — which is how this first went together — leaves the
  // shelves floating in front of a flat green cut-out, and no amount of light
  // makes that read as a niche.
  const upperH = H - baseH - 0.06;
  const archW = W - 0.3;
  const archH = upperH - 0.34;
  const RECESS = 0.3;
  const archSill = 0.12;

  const face = new THREE.Mesh(
    relief(wallWithArch(W, upperH, archW, archH, archSill), RECESS, 0.004, 22),
    materials.cabinetGreen,
  );
  face.position.set(0, baseH + 0.03, 0.02);
  face.castShadow = true;
  face.receiveShadow = true;
  g.add(face);

  // Back of the recess, in the darker Forest Ink so lit product pops off it.
  const backBoard = slab(W - 0.06, upperH - 0.04, 0.024, materials.cabinetInk, 0, baseH + 0.03 + upperH / 2, 0.012, 0.002);
  backBoard.receiveShadow = true;
  g.add(backBoard);

  // Gold bead round the opening, sitting on the face.
  const r = archW / 2;
  const straight = archH - r;
  const beadY = baseH + 0.03 + archSill;
  const beadZ = 0.02 + RECESS;
  const beadPts = [];
  for (let i = 0; i <= 26; i++) {
    const a = Math.PI - (i / 26) * Math.PI;
    beadPts.push(new THREE.Vector3(Math.cos(a) * r, beadY + straight + Math.sin(a) * r, beadZ));
  }
  g.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beadPts), 28, 0.0075, 6, false),
      materials.brassBright,
    ),
  );
  for (const s of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, straight, 6), materials.brassBright);
    jamb.position.set(s * r, beadY + straight / 2, beadZ);
    g.add(jamb);
  }

  // ── Shelves inside the recess ─────────────────────────────────────────────
  const shelfYs = [beadY + 0.34, beadY + 0.86, beadY + 1.36];
  for (const y of shelfYs) {
    const sh = goldShelf(materials, { w: archW - 0.05, d: 0.25, lit: true });
    sh.position.set(0, y, 0.16);
    g.add(sh);
  }

  // ── Header ────────────────────────────────────────────────────────────────
  const headerPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(archW * 0.8, 0.13),
    printedMat(
      `bayhead:${label}`,
      600,
      120,
      (ctx, w, h) => {
        ctx.fillStyle = INK;
        ctx.fillRect(0, 0, w, h);
        ctx.textAlign = 'center';
        ctx.fillStyle = GOLD;
        ctx.font = `400 62px ${TYPE.displayFamily}`;
        tracked(ctx, label, w / 2, h / 2 + 22, 6);
      },
      { bg: INK },
    ),
  );
  headerPlate.position.set(0, H - 0.17, 0.02 + RECESS + 0.002);
  g.add(headerPlate);

  // Cornice and a planter sitting on it.
  const cornice = slab(W + 0.08, 0.07, 0.42, materials.cabinetGreen, 0, H - 0.035, 0.16, 0.003);
  g.add(cornice);
  const pl = planter(materials, { r: 0.11, h: 0.14, kind: 'bush' });
  pl.position.set(W * 0.28, H, 0.16);
  g.add(pl);

  // ── Dressing ──────────────────────────────────────────────────────────────
  // A shelf-talker on the oak top, and product on the three shelves.
  const talker = signCard(materials, label, blurb);
  talker.position.set(-W * 0.22, baseH + 0.019, D + 0.02);
  talker.rotation.y = 0.06;
  g.add(talker);

  if (dress) dress(g, { W, D, baseH, shelfYs, archW });

  g.traverse((m) => {
    if (m.isMesh) m.receiveShadow = true;
  });
  return g;
}

/** A free-standing shelf-talker card on a small oak foot. */
export function signCard(materials, label, blurb, { w = 0.2, h = 0.13 } = {}) {
  const g = new THREE.Group();
  const cardMesh = new THREE.Mesh(box(w, h, 0.008, 0.002), materials.cabinetInk);
  cardMesh.position.y = h / 2 + 0.012;
  cardMesh.castShadow = true;
  g.add(cardMesh);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.97, h * 0.95), signCardMaterial(label, blurb));
  face.position.set(0, h / 2 + 0.012, 0.0045);
  g.add(face);
  const foot = slab(w * 0.7, 0.012, 0.05, materials.lightOak, 0, 0.006, 0.006, 0.002);
  g.add(foot);
  g.rotation.x = -0.06;
  return g;
}

/** A framed wall poster. */
export function poster(materials, kind, { w = 0.5, h = 0.66 } = {}) {
  const g = new THREE.Group();
  const t = 0.03;
  for (const [bw, bh, bx, by] of [
    [w + t * 2, t, 0, h / 2 + t / 2],
    [w + t * 2, t, 0, -h / 2 - t / 2],
    [t, h, -w / 2 - t / 2, 0],
    [t, h, w / 2 + t / 2, 0],
  ]) {
    g.add(slab(bw, bh, 0.022, materials.brassBright, bx, by, 0, 0.0015));
  }
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), posterMaterial(kind));
  art.position.z = -0.002;
  g.add(art);
  return g;
}

/** Planter — a green or dark vessel with foliage. */
export function planter(materials, { r = 0.22, h = 0.3, kind = 'bush' } = {}) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(
    turned(
      [
        [0, 0],
        [r * 0.72, 0],
        [r * 0.76, 0.02],
        [r, h * 0.86],
        [r, h],
        [r * 0.94, h],
        [r * 0.94, h * 0.88],
        [r * 0.7, 0.024],
        [0, 0.02],
      ],
      22,
    ),
    materials.cabinetGreen,
  );
  pot.castShadow = true;
  g.add(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(r * 0.92, 18), materials.soil);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = h * 0.9;
  g.add(soil);

  const leaf = new THREE.CircleGeometry(r * 0.5, 6);
  if (kind === 'tree') {
    // A clipped standard: a bare stem with a rounded head of small leaves.
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, h * 1.9, 8), materials.leafDark);
    stem.position.y = h * 0.9 + h * 0.95;
    g.add(stem);
    const headY = h + h * 1.75;
    for (let i = 0; i < 46; i++) {
      const a = i * 2.399;
      const t = i / 46;
      const rad = r * 1.5 * Math.sin(Math.acos(2 * t - 1));
      const m = new THREE.Mesh(leaf, i % 3 ? materials.leafGreen : materials.leafDark);
      m.position.set(Math.cos(a) * rad, headY + (t - 0.5) * r * 2.4, Math.sin(a) * rad);
      m.rotation.set(Math.random() * 3, a, Math.random() * 2);
      m.scale.setScalar(0.4 + (i % 4) * 0.1);
      g.add(m);
    }
  } else {
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399;
      const t = i / 26;
      const m = new THREE.Mesh(leaf, i % 3 ? materials.leafGreen : materials.leafDark);
      m.position.set(Math.cos(a) * r * 0.7 * (0.4 + t), h * 0.9 + t * r * 1.5, Math.sin(a) * r * 0.7 * (0.4 + t));
      m.rotation.set(-1.0 + Math.sin(a) * 0.7, a, Math.cos(a) * 0.6);
      m.scale.setScalar(0.55 + (i % 3) * 0.14);
      g.add(m);
    }
  }
  g.traverse((m) => {
    if (m.isMesh) m.castShadow = true;
  });
  return g;
}

/**
 * The central island — plan item 2, the vape stand.
 *
 * A pill-shaped green plinth ringed with gold banding, a light oak top, product
 * trays down its length and planting at the ends.
 */
export function island(materials, { w, l, h = DIMS.islandHeight }) {
  const g = new THREE.Group();
  const shape = roundedRectShape(w, l, w / 2);

  const body = new THREE.Mesh(prism(shape, h - 0.045, 0.005, 24), materials.cabinetGreen);
  body.castShadow = body.receiveShadow = true;
  g.add(body);

  // Recessed plinth, so the mass appears to float a little.
  const plinthShape = roundedRectShape(w - 0.09, l - 0.09, (w - 0.09) / 2);
  const plinthMesh = new THREE.Mesh(prism(plinthShape, 0.09, 0.003, 24), materials.cabinetInk);
  plinthMesh.position.y = 0.0;
  g.add(plinthMesh);

  // Two gold bands around the body — the reference detail.
  for (const y of [h * 0.34, h * 0.62]) {
    const bandMesh = new THREE.Mesh(outlineTube(roundedRectShape(w + 0.006, l + 0.006, w / 2), 0.006, 120), materials.brassBright);
    bandMesh.position.y = y;
    g.add(bandMesh);
  }

  // Light oak top with a gold edge.
  const topShape = roundedRectShape(w + 0.07, l + 0.07, (w + 0.07) / 2);
  const topMesh = new THREE.Mesh(prism(topShape, 0.045, 0.004, 24), materials.lightOak);
  topMesh.position.y = h - 0.045;
  topMesh.castShadow = topMesh.receiveShadow = true;
  g.add(topMesh);
  const topEdge = new THREE.Mesh(outlineTube(topShape, 0.007, 120), materials.brassBright);
  topEdge.position.y = h - 0.024;
  g.add(topEdge);

  return g;
}

/**
 * The main counter — plan item 9. A curved-ended green mass with a light oak
 * top, GRAND. across its front, and two till screens on the staff side.
 */
export function counter(materials, { w, d, h = DIMS.counterHeight }) {
  const g = new THREE.Group();
  const shape = roundedRectShape(w, d, d / 2);

  const body = new THREE.Mesh(prism(shape, h - 0.04, 0.005, 24), materials.cabinetGreen);
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  const plinthMesh = new THREE.Mesh(prism(roundedRectShape(w - 0.08, d - 0.08, (d - 0.08) / 2), 0.1, 0.003, 24), materials.cabinetInk);
  g.add(plinthMesh);

  const bandMesh = new THREE.Mesh(outlineTube(roundedRectShape(w + 0.006, d + 0.006, d / 2), 0.006, 140), materials.brassBright);
  bandMesh.position.y = h * 0.5;
  g.add(bandMesh);

  const topShape = roundedRectShape(w + 0.08, d + 0.08, (d + 0.08) / 2);
  const topMesh = new THREE.Mesh(prism(topShape, 0.04, 0.004, 24), materials.lightOak);
  topMesh.position.y = h - 0.04;
  topMesh.castShadow = topMesh.receiveShadow = true;
  g.add(topMesh);
  const topEdge = new THREE.Mesh(outlineTube(topShape, 0.007, 140), materials.brassBright);
  topEdge.position.y = h - 0.02;
  g.add(topEdge);

  // GRAND. in gilded letters across the front face, as on the reference.
  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.2),
    printedMat(
      'counterfront',
      900,
      120,
      (ctx, cw, ch) => {
        ctx.clearRect(0, 0, cw, ch);
        ctx.textAlign = 'center';
        ctx.fillStyle = GOLD;
        ctx.font = `400 84px ${TYPE.displayFamily}`;
        ctx.fillText('GRAND', cw / 2 - 20, ch / 2 + 30);
        ctx.beginPath();
        ctx.arc(cw / 2 + 176, ch / 2 + 18, 13, 0, Math.PI * 2);
        ctx.fill();
      },
      { bg: null, grain: false },
    ),
  );
  front.material.transparent = true;
  front.position.set(0, h * 0.5, d / 2 + 0.004);
  g.add(front);

  return g;
}

/** A till screen on a brass stem, angled to the staff side. */
export function tillScreen(materials) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.16, 10), materials.brassDark);
  stem.position.y = 0.08;
  g.add(stem);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.014, 16), materials.brassDark);
  base.position.y = 0.007;
  g.add(base);
  const screen = new THREE.Mesh(box(0.26, 0.19, 0.016, 0.003), materials.cabinetInk);
  screen.position.y = 0.255;
  screen.rotation.x = -0.22;
  g.add(screen);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.17),
    printedMat(
      'till',
      420,
      300,
      (ctx, w, h) => {
        ctx.fillStyle = '#101d16';
        ctx.fillRect(0, 0, w, h);
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(244,238,222,0.8)';
        ctx.font = `300 20px ${TYPE.informFamily}`;
        tracked(ctx, 'GRAND · TILL', 26, 44, 2.4);
        ctx.fillStyle = 'rgba(174,195,166,0.55)';
        ctx.font = `300 17px ${TYPE.informFamily}`;
        ['Tea · Gentle', 'Gummies · Easy', 'Drinks · Easy'].forEach((t, i) => ctx.fillText(t, 26, 92 + i * 30));
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(w - 34, 38, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(244,238,222,0.5)';
        ctx.font = `300 15px ${TYPE.informFamily}`;
        ctx.fillText('AGE VERIFIED', 26, h - 30);
      },
      { bg: '#101d16', grain: false },
    ),
  );
  face.position.set(0, 0.255, 0.0095);
  face.rotation.x = -0.22;
  g.add(face);
  g.traverse((m) => {
    if (m.isMesh) m.castShadow = true;
  });
  return g;
}

/** Upholstered window bench — the sage seat in the reference interior. */
export function benchSeat(materials, { w = 1.7, d = 0.55 } = {}) {
  const g = new THREE.Group();
  const carcass = slab(w, 0.34, d, materials.cabinetGreen, 0, 0.17, 0, 0.004);
  g.add(carcass);
  const plinthMesh = slab(w - 0.06, 0.08, d - 0.08, materials.cabinetInk, 0, 0.04, 0, 0.003);
  g.add(plinthMesh);
  const cushion = slab(w - 0.04, 0.1, d - 0.04, materials.boucle, 0, 0.39, 0, 0.035);
  cushion.castShadow = true;
  g.add(cushion);
  for (let i = 0; i < 2; i++) {
    const pillow = slab(0.32, 0.32, 0.11, materials.boucle, -w / 2 + 0.32 + i * 0.42, 0.58, -d / 2 + 0.11, 0.045);
    pillow.rotation.set(0.22, 0.1 * (i ? 1 : -1), 0.06);
    pillow.castShadow = true;
    g.add(pillow);
  }
  g.traverse((m) => {
    if (m.isMesh) m.receiveShadow = true;
  });
  return g;
}

/** The projecting circular hanging sign on the shopfront. */
export function hangingSign(materials, { r = 0.46 } = {}) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 40), materials.cabinetGreen);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = true;
  g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r - 0.035, 0.006, 6, 44), materials.brassBright);
  ring.position.z = 0.027;
  g.add(ring);

  const faceMat = printedMat(
    'hangingsign',
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = GREEN;
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.fillStyle = CREAM;
      ctx.font = `400 96px ${TYPE.displayFamily}`;
      ctx.fillText('GRAND', w / 2 - 16, h / 2 - 4);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(w / 2 + 122, h / 2 - 22, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(244,238,222,0.78)';
      ctx.font = `300 30px ${TYPE.informFamily}`;
      tracked(ctx, 'CANNABIS', w / 2, h / 2 + 62, 5);
      tracked(ctx, 'DISPENSARY', w / 2, h / 2 + 106, 5);
    },
    { bg: GREEN },
  );
  for (const s of [1, -1]) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(r - 0.045, 40), faceMat);
    face.position.z = s * 0.026;
    face.rotation.y = s > 0 ? 0 : Math.PI;
    g.add(face);
  }

  // Bracket back to the wall.
  const arm = new THREE.Mesh(box(0.5, 0.035, 0.035, 0.003), materials.brassDark);
  arm.position.set(0.32, r + 0.16, 0);
  g.add(arm);
  const upright = new THREE.Mesh(box(0.035, 0.24, 0.035, 0.003), materials.brassDark);
  upright.position.set(0.56, r + 0.05, 0);
  g.add(upright);
  for (const dx of [-0.16, 0.16]) {
    const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.17, 6), materials.brassDark);
    hang.position.set(dx, r + 0.08, 0);
    g.add(hang);
  }
  g.traverse((m) => {
    if (m.isMesh) m.castShadow = true;
  });
  return g;
}

/** Exterior brass lantern flanking the doors. */
export function lantern(materials) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(box(0.06, 0.14, 0.02, 0.002), materials.brassDark);
  g.add(plate);
  const armPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.1, 8), materials.brassDark);
  armPipe.rotation.x = Math.PI / 2;
  armPipe.position.set(0, 0.12, 0.05);
  g.add(armPipe);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.078, 0.24, 4), materials.glassClear);
  body.position.set(0, -0.02, 0.11);
  body.rotation.y = Math.PI / 4;
  g.add(body);
  const capTop = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.06, 4), materials.brassDark);
  capTop.position.set(0, 0.13, 0.11);
  capTop.rotation.y = Math.PI / 4;
  g.add(capTop);
  const capBot = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.07, 0.022, 4), materials.brassDark);
  capBot.position.set(0, -0.15, 0.11);
  capBot.rotation.y = Math.PI / 4;
  g.add(capBot);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 9), materials.bulb2400);
  bulb.position.set(0, -0.02, 0.11);
  g.add(bulb);
  g.traverse((m) => {
    if (m.isMesh) m.castShadow = true;
  });
  return g;
}

export { printedMat };
