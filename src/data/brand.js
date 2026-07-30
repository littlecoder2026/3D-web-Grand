/**
 * GRAND. — locked continuity bible, in code.
 *
 * Every colour, material and dimension in the 3D set traces back to this file.
 * Nothing enters the model that isn't specified here or in the storyboard system
 * (GRAND_3D_Storyboard_Prompt_System.md, Parts 2 & 3).
 */

// ---------------------------------------------------------------------------
// Palette — Grand-logo-ci.pdf p3 / storyboard Part 2
// ---------------------------------------------------------------------------
export const PALETTE = {
  bottleGreen: 0x163a2b, // shopfront fascia, primary joinery, dominant surface
  forestInk: 0x0f2c20, // shadow tone, recessed panelling, base plinths
  cream: 0xf4eede, // walls, ceiling, signage lettering, paper goods
  amberGold: 0xc8922e, // the full stop, hardware, brass rails — jewellery only
  softSage: 0xaec3a6, // upholstery, textiles, secondary washes
  signalGreen: 0x3e9b55, // accent only — never a wall, never a fascia
};

// Supporting naturals. Not brand colours — the real-world materials the brand sits on.
export const NATURALS = {
  // Lightened from the first pass: under 2800-2900K practicals a mid-tan
  // albedo lands orange-brown, and the shelving read maroon rather than oak.
  oak: 0xc6ac81,
  oakOiled: 0xb1926a,
  ash: 0xd8c4a4,
  brass: 0xb08d4f,
  brassAged: 0x8d7139,
  granite: 0x6d6c68,
  flagstone: 0x585a58,
  limePlaster: 0xece5d4,
  terrazzoBase: 0xe4ddcb,
  tweed: 0x5c6152,
  boucle: 0xaec3a6,
  stoneware: 0xa89982,
  clay: 0xb08466,
  zinc: 0x8a8f8d,
  glass: 0xdfe7e2,
  skyBlueHour: 0x2b3a4a,
  road: 0x33352f,
  // Dublin stock brick: a grey-yellow, not the red-brown of English stock. It
  // also keeps the upper storey from reading warmer than the shopfront, which
  // would pull the eye off the fascia.
  brickWarm: 0x9c9179,
};

// Distribution rule: ~60% cream/plaster, 30% bottle green joinery, 7% timber and
// sage, 3% amber gold. Gold must never exceed the area of a hand — enforced by
// only ever applying BRASS/GOLD materials to hardware-scale geometry.
export const DISTRIBUTION = { cream: 0.6, bottleGreen: 0.3, timberSage: 0.07, gold: 0.03 };

// ---------------------------------------------------------------------------
// Dimensions — taken off the supplied floor plan and elevation, all metres
//
// The plan is a 10.0m × 10.25m box, 102.5m² gross: 78.0 sales floor, 12.5 back
// of house, 12.0 counter zone. Symmetrical about the centreline, entered through
// double doors front-centre, with a pill-shaped island in the middle of the room
// and three product bays down each side wall.
// ---------------------------------------------------------------------------
export const DIMS = {
  frontageWidth: 10.0, // full shopfront, pier to pier
  interiorWidth: 10.0,
  interiorDepth: 10.25,
  ceilingHeight: 3.6, // a tall retail box, not a domestic terrace

  // Exterior elevation bands, measured up from the pavement
  stallriser: 0.75, // panelled base below the glazing
  glazingTop: 3.0,
  bandTop: 3.35, // the "PREMIUM PRODUCTS · CONSCIOUS CHOICES" strip
  fasciaHeight: 4.35, // top of the fascia board
  corniceTop: 4.55,
  upperTop: 9.0,

  counterHeight: 1.05, // locked: 1050mm
  islandHeight: 1.0, // central vape stand
  wallBayHeight: 2.85, // green cabinetry to the top of its cornice
  baseUnitHeight: 0.95, // the lower cupboards in each bay
  circulationMin: 1.2, // locked: 1200mm minimum
  eyeHeight: 1.65,
  seatedEyeHeight: 1.15, // the window bench
  doorWidth: 0.9, // per leaf; a 1.8m pair
  doorHeight: 2.4,
};

// Wall / plan landmarks derived once so geometry and navigation cannot disagree.
export const PLAN = {
  shopfrontZ: 0, // glazing plane; street is +Z, interior is -Z
  rearZ: -DIMS.interiorDepth, // -10.25
  leftX: -DIMS.interiorWidth / 2, // -5.0
  rightX: DIMS.interiorWidth / 2, // +5.0
  kerbZ: 4.0,
  // Building line to building line. A 10m frontage needs more standoff than the
  // old 5.2m one before a normal lens can hold the whole elevation.
  roadZ: 22.0,
};

/**
 * Zones, straight off the numbered plan. One source of truth for geometry,
 * navigation blockers and camera waypoints.
 */
export const ZONES = {
  // 1 — Entry / foyer
  entry: { x0: -1.6, x1: 1.6, z0: 0, z1: -2.2 },
  // 2 — Vape stand: the pill-shaped island, on its sage rug
  island: { cx: 0, cz: -5.1, w: 2.2, l: 3.8, rug: { w: 3.0, l: 4.8 } },
  // 9 — Main counter / checkout, curved ends, across the rear
  counter: { cx: 0, cz: -7.75, w: 5.6, d: 0.9 },
  // Back of house: a 1.9m strip across the rear
  boh: { z0: -8.35, z1: -10.25, storageX: [-5.0, -3.0], staffX: [3.0, 5.0] },
  // The rear feature wall between the two BOH rooms, carrying the arched niche
  featureWall: { z: -8.35, x0: -3.0, x1: 3.0 },
};

/**
 * The six wall bays, rear to front down each side — plan items 3–8.
 * `z` is the centre of the bay along the wall run.
 */
export const WALL_BAYS = [
  { id: 'tea', n: 3, side: 'left', z: -6.9, label: 'TEA', blurb: 'For the mind, body & soul.' },
  { id: 'gummies', n: 4, side: 'left', z: -4.1, label: 'GUMMIES', blurb: 'Good vibes. Anytime.' },
  { id: 'gum', n: 5, side: 'left', z: -1.3, label: 'CHEWING GUM', blurb: 'Fresh breath. Elevated.' },
  { id: 'drinks', n: 6, side: 'right', z: -6.9, label: 'DRINKS', blurb: 'Refresh. Reset. Rise.' },
  { id: 'mensch', n: 7, side: 'right', z: -4.1, label: 'MENSCH', blurb: 'Precise dosing. Naturally balanced.' },
  { id: 'merch', n: 8, side: 'right', z: -1.3, label: 'MERCH', blurb: 'Wear it. Live it.' },
];

export const BAY_LENGTH = 2.6; // along the wall
export const BAY_DEPTH = 0.42; // projection into the room

/**
 * Exterior signwriting, transcribed from the supplied elevation.
 */
export const SIGNAGE = {
  fasciaLeft: 'CANNABIS DISPENSARY',
  fasciaRight: 'FOR THE MIND, BODY & SOUL.',
  bandLeft: 'PREMIUM PRODUCTS.  CONSCIOUS CHOICES.',
  bandRight: 'TEA · VAPE · EDIBLES · DRINKS · MERCH',
  doorNumber: '27',
  hangingSign: ['GRAND.', 'CANNABIS', 'DISPENSARY'],
};

/**
 * The reference elevation and one interior poster carry a cannabis leaf mark.
 * That is explicitly on the brief's absolute-exclusions list ("hemp or cannabis
 * leaf iconography"), so the framed panels below the windows carry the wordmark
 * instead. Flip this to true to follow the reference image literally.
 */
export const USE_LEAF_MARK = false;

// ---------------------------------------------------------------------------
// Typography — CI p4: WARREN for logo & title, Georgia for text and label.
// The storyboard's Fraunces/Inter pairing is the same rule one generation earlier:
// serif reassures, grotesque informs. We ship the actual licensed WARREN file.
// ---------------------------------------------------------------------------
export const TYPE = {
  displayFamily: '"Warren", Georgia, serif',
  textFamily: 'Georgia, "Times New Roman", serif',
  informFamily: '"Helvetica Neue", Inter, Arial, sans-serif', // dosage cards, tickets
};

// ---------------------------------------------------------------------------
// Absolute exclusions — storyboard Part 2. Kept here so the build has a
// machine-readable record of what was deliberately never modelled.
// ---------------------------------------------------------------------------
export const EXCLUSIONS = [
  'hemp or cannabis leaf iconography',
  'neon of any kind',
  'tie-dye, rasta colourways, psychedelic pattern',
  'dispensary clinical white',
  'pharmacy counters, security glass, visible bollards or shutters',
  'vending machines',
  'smoke haze, visible product being consumed',
  'plastic clamshell packaging',
  'stock-photo smiles',
  'lens flare',
  'fisheye distortion',
  'text artefacts and garbled signage',
  'oversaturated HDR',
  'CGI plastic skin',
];

export const hex = (n) => `#${n.toString(16).padStart(6, '0').toUpperCase()}`;
