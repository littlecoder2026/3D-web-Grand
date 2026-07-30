/**
 * The material library — workflow Stage 5.
 *
 * Every surface is physically based, every roughness varies across the surface,
 * and every map is corrected to real-world scale (the `repeat` figures below are
 * derived from the size of the object the map lands on, not eyeballed).
 *
 * No chrome, no acrylic, no laminate, no backlit lightbox — per the locked
 * materiality list.
 */

import * as THREE from 'three';
import { NATURALS, PALETTE } from '../data/brand.js';
import * as T from './textures.js';

const C = (hex) => new THREE.Color(hex).convertSRGBToLinear();

/**
 * Memoise a material factory on its arguments.
 *
 * Every distinct material is a distinct shader program, and with 20-odd lights
 * in the scene those programs are large. Handing out a fresh material per shelf
 * ticket and per light strip pushed first-frame compilation into the seconds —
 * the loader visibly stalled at 100%. Identical inputs now return the identical
 * material, so the set compiles a couple of dozen programs instead of a hundred.
 */
function memo(fn) {
  const cache = new Map();
  return (...args) => {
    const key = args.join('|');
    if (!cache.has(key)) cache.set(key, fn(...args));
    return cache.get(key);
  };
}

export function buildMaterials({ quality = 'high' } = {}) {
  const hi = quality === 'high';
  // Normal and height detail is the first thing to go on a phone.
  const nm = (t, scale = 1) => (hi ? { normalMap: t, normalScale: new THREE.Vector2(scale, scale) } : {});

  // ── Plaster ───────────────────────────────────────────────────────────────
  const plasterNormal = hi ? T.toTexture('plasterN', () => T.normalFromHeight(T.limePlaster.height(), 0.7), { repeat: [3, 3] }) : null;

  // The tile is ~1.2m of wall, so `repeat` is the surface size in metres over
  // 1.2. Trowel marks at 4m per tile are invisible, which is what the first pass
  // did — the walls read as a flat gradient.
  const plasterAt = memo((repeat = [3, 3], tint = 0xffffff, envI = 0.55) =>
    new THREE.MeshStandardMaterial({
      color: C(tint),
      map: T.toTexture('plasterC', T.limePlaster.colour, { repeat, srgb: true }),
      roughnessMap: T.toTexture('plasterR', T.limePlaster.roughness, { repeat }),
      roughness: 0.92,
      metalness: 0,
      envMapIntensity: envI,
      ...nm(plasterNormal ? T.toTexture('plasterN', () => T.normalFromHeight(T.limePlaster.height(), 0.7), { repeat }) : null, 0.75),
    }));

  const plaster = plasterAt([3, 3]);
  const plasterCeiling = plasterAt([3, 3], 0xffffff, 0.4);

  // ── Painted joinery — eggshell over timber, brushed not sprayed ───────────
  const paintNormal = hi
    ? T.toTexture('paintN', () => T.normalFromHeight(T.paintedTimber.height(), 0.5), { repeat: [2, 2] })
    : null;

  const makePaint = memo((colour, rough = 0.42, envI = 0.7) =>
    new THREE.MeshStandardMaterial({
      color: C(colour),
      roughnessMap: T.toTexture(`paintR${rough}`, () => T.paintedTimber.roughness(rough), { repeat: [2, 2] }),
      roughness: rough,
      metalness: 0,
      envMapIntensity: envI,
      ...nm(paintNormal, 0.16),
    }));

  const joinery = makePaint(PALETTE.bottleGreen, 0.4, 0.8); // fascia, shopfront, screens
  const joineryDark = makePaint(PALETTE.forestInk, 0.46, 0.55); // reveals, plinths, flute shadows
  const creamPaint = makePaint(PALETTE.cream, 0.5, 0.5);
  const sagePaint = makePaint(PALETTE.softSage, 0.62, 0.4);

  // ── Timber ────────────────────────────────────────────────────────────────
  const oakSpec = T.oak();
  const oakNormal = hi ? T.toTexture('oakN', () => T.normalFromHeight(oakSpec.height(), 0.55), { repeat: [1, 1] }) : null;

  const oakAt = memo((repeat, tint = NATURALS.oakOiled, rough = 0.5) =>
    new THREE.MeshStandardMaterial({
      color: C(tint),
      map: T.toTexture('oakC', oakSpec.colour, { repeat, srgb: true }),
      roughnessMap: T.toTexture('oakR', oakSpec.roughness, { repeat }),
      roughness: rough,
      metalness: 0,
      envMapIntensity: 0.6,
      ...nm(oakNormal ? T.toTexture('oakN', () => T.normalFromHeight(oakSpec.height(), 0.55), { repeat }) : null, 0.3),
    }));

  // Counter tops get a tighter tile than shelving so the grain scale reads true
  const oakCounter = oakAt([1.4, 1.4]);
  const oakShelf = oakAt([2.2, 0.6], NATURALS.oak, 0.55);
  const oakFloor = oakAt([0.5, 0.5], NATURALS.oakOiled, 0.44);
  const ashLight = oakAt([1.6, 1.6], NATURALS.ash, 0.52);

  // ── Metal — unlacquered brass, handled daily ──────────────────────────────
  const brass = new THREE.MeshStandardMaterial({
    color: C(NATURALS.brass),
    map: T.toTexture('brassC', T.brassWear.colour, { repeat: [1, 1], srgb: true }),
    roughnessMap: T.toTexture('brassR', T.brassWear.roughness, { repeat: [1, 1] }),
    roughness: 0.34,
    metalness: 1,
    envMapIntensity: 1.15,
  });

  const brassDark = brass.clone();
  brassDark.color = C(NATURALS.brassAged);
  brassDark.roughness = 0.52;
  brassDark.envMapIntensity = 0.85;

  // Gold leaf — the full stop, the fascia shadow lettering. Jewellery only.
  //
  // Not a mirror: leaf is beaten metal laid over gesso and it scatters far more
  // than sheet brass does. Full metalness at low roughness would make it a
  // mirror of a dark blue-hour sky, i.e. black — which is exactly what it did on
  // the first pass. Pulling metalness back and roughness up lets it read as gold
  // under the swan-neck lamps, which is how real gilded signwriting behaves.
  const goldLeaf = new THREE.MeshStandardMaterial({
    color: C(PALETTE.amberGold),
    roughness: 0.38,
    metalness: 0.82,
    envMapIntensity: 1.7,
  });

  const blackSteel = new THREE.MeshStandardMaterial({
    color: C(0x2a2c2a),
    roughness: 0.48,
    metalness: 0.85,
    envMapIntensity: 0.7,
  });

  // ── Glass ─────────────────────────────────────────────────────────────────
  // Reeded glass: the ridges are a normal map, the softness comes from
  // roughness on the transmission lobe.
  const reededMap = (reeds, repeat) => T.toTexture(`reeded${reeds}`, T.reededNormal(reeds, 1.15), { repeat });

  const makeGlass = ({ reeds = 0, repeat = [1, 1], rough = 0.04, transmission = 0.92, tint = NATURALS.glass } = {}) => {
    if (!hi) {
      // Phones get a cheap approximation — transmission is the single most
      // expensive thing in this scene.
      return new THREE.MeshStandardMaterial({
        color: C(tint),
        roughness: reeds ? 0.34 : 0.1,
        metalness: 0,
        transparent: true,
        opacity: reeds ? 0.42 : 0.22,
        envMapIntensity: 1.1,
        side: THREE.DoubleSide,
      });
    }
    const m = new THREE.MeshPhysicalMaterial({
      color: C(tint),
      roughness: rough,
      metalness: 0,
      transmission,
      thickness: 0.012,
      ior: 1.52,
      transparent: true,
      opacity: 1,
      envMapIntensity: 1.2,
      side: THREE.DoubleSide,
      specularIntensity: 1,
    });
    if (reeds) {
      m.normalMap = reededMap(reeds, repeat);
      m.normalScale = new THREE.Vector2(1.1, 0.05); // ridges run vertically only
      m.roughness = 0.11;
    }
    return m;
  };

  const glassClear = makeGlass({ rough: 0.03 });
  const glassReeded = makeGlass({ reeds: 24, repeat: [1, 1], rough: 0.12 });
  const glassFluted = makeGlass({ reeds: 12, repeat: [1, 1], rough: 0.14, transmission: 0.95, tint: 0xeef3ef });

  // Shopfront glazing seen from the street: mostly a reflector at blue hour.
  const glassShopfront = hi
    ? new THREE.MeshPhysicalMaterial({
        color: C(0xdde6e0),
        roughness: 0.035,
        metalness: 0,
        transmission: 0.86,
        thickness: 0.008,
        ior: 1.52,
        transparent: true,
        envMapIntensity: 1.35,
        side: THREE.DoubleSide,
      })
    : new THREE.MeshStandardMaterial({
        color: C(0xdde6e0),
        roughness: 0.08,
        metalness: 0.1,
        transparent: true,
        opacity: 0.25,
        envMapIntensity: 1.2,
        side: THREE.DoubleSide,
      });

  // ── Floors ────────────────────────────────────────────────────────────────
  const terrazzo = new THREE.MeshStandardMaterial({
    color: C(0xdcd5c4),
    map: T.toTexture('terrazzoC', T.terrazzo.colour, { repeat: [4, 7.1], srgb: true, aniso: 16 }),
    roughnessMap: T.toTexture('terrazzoR', T.terrazzo.roughness, { repeat: [4, 7.1] }),
    roughness: 0.3,
    metalness: 0,
    envMapIntensity: 0.85,
  });

  const flagstoneNormal = hi
    ? T.toTexture('flagN', () => T.normalFromHeight(T.flagstone.height(), 1.1), { repeat: [3, 2] })
    : null;

  // Wet pavement. The reflection is doing the "post-rain" work in the
  // continuity anchors, so this is deliberately the smoothest thing outdoors.
  const flagstoneWet = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xffffff),
    map: T.toTexture('flagC', T.flagstone.colour, { repeat: [3, 2], srgb: true, aniso: 16 }),
    roughnessMap: T.toTexture('flagR', T.flagstone.roughness, { repeat: [3, 2] }),
    roughness: 0.5,
    metalness: 0.18,
    envMapIntensity: 1.25,
    ...nm(flagstoneNormal, 0.5),
  });

  const granite = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xffffff),
    map: T.toTexture('graniteC', T.granite.colour, { repeat: [4, 1], srgb: true }),
    roughnessMap: T.toTexture('graniteR', T.granite.roughness, { repeat: [4, 1] }),
    roughness: 0.62,
    metalness: 0.05,
    envMapIntensity: 0.9,
  });

  const road = new THREE.MeshStandardMaterial({
    color: C(NATURALS.road),
    roughnessMap: T.toTexture('flagR', T.flagstone.roughness, { repeat: [8, 8] }),
    roughness: 0.55,
    metalness: 0.12,
    envMapIntensity: 0.8,
  });

  // ── Masonry ───────────────────────────────────────────────────────────────
  const brickNormal = hi ? T.toTexture('brickN', () => T.normalFromHeight(T.brick.height(), 1.0), { repeat: [2, 3] }) : null;

  // Knocked back well below the shopfront: the brick is context, and if it
  // competes with the fascia for attention the whole frontage stops working.
  const brickFacade = new THREE.MeshStandardMaterial({
    color: C(0xa9a29c),
    map: T.toTexture('brickC', T.brick.colour, { repeat: [2.9, 2.4], srgb: true }),
    roughnessMap: T.toTexture('brickR', T.brick.roughness, { repeat: [2.9, 2.4] }),
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.32,
    ...nm(brickNormal, 0.55),
  });

  const limewash = memo((colour) =>
    new THREE.MeshStandardMaterial({
      color: C(colour),
      map: T.toTexture('plasterC', T.limePlaster.colour, { repeat: [2, 2], srgb: true }),
      roughnessMap: T.toTexture('plasterR', T.limePlaster.roughness, { repeat: [2, 2] }),
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0.4,
    }));

  // ── Textiles ──────────────────────────────────────────────────────────────
  const tweedNormal = hi ? T.toTexture('tweedN', () => T.normalFromHeight(T.tweed.height(), 1.5), { repeat: [6, 6] }) : null;
  const tweed = new THREE.MeshStandardMaterial({
    color: C(0xffffff),
    map: T.toTexture('tweedC', T.tweed.colour, { repeat: [6, 6], srgb: true }),
    roughnessMap: T.toTexture('tweedR', T.tweed.roughness, { repeat: [6, 6] }),
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.3,
    ...nm(tweedNormal, 0.7),
  });

  const boucleNormal = hi ? T.toTexture('boucleN', () => T.normalFromHeight(T.boucle.height(), 1.8), { repeat: [7, 7] }) : null;
  const boucle = new THREE.MeshStandardMaterial({
    color: C(0xffffff),
    map: T.toTexture('boucleC', T.boucle.colour, { repeat: [7, 7], srgb: true }),
    roughnessMap: T.toTexture('boucleR', T.boucle.roughness, { repeat: [7, 7] }),
    roughness: 0.96,
    metalness: 0,
    envMapIntensity: 0.28,
    ...nm(boucleNormal, 0.8),
  });

  // ── Odds and ends ─────────────────────────────────────────────────────────
  const zinc = new THREE.MeshStandardMaterial({
    color: C(0xffffff),
    map: T.toTexture('zincC', T.zinc.colour, { repeat: [2, 1], srgb: true }),
    roughnessMap: T.toTexture('zincR', T.zinc.roughness, { repeat: [2, 1] }),
    roughness: 0.55,
    metalness: 0.75,
    envMapIntensity: 0.9,
  });

  const paperNormal = hi ? T.toTexture('paperN', () => T.normalFromHeight(T.paper.height(), 0.4), { repeat: [1, 1] }) : null;
  const paperCream = new THREE.MeshStandardMaterial({
    color: C(PALETTE.cream),
    roughnessMap: T.toTexture('paperR', T.paper.roughness, { repeat: [1, 1] }),
    roughness: 0.85,
    metalness: 0,
    envMapIntensity: 0.35,
    ...nm(paperNormal, 0.2),
  });

  const stoneware = new THREE.MeshStandardMaterial({
    color: C(0xffffff),
    map: T.toTexture('stoneC', T.stoneware.colour, { repeat: [2, 2], srgb: true }),
    roughnessMap: T.toTexture('stoneR', T.stoneware.roughness, { repeat: [2, 2] }),
    roughness: 0.6,
    metalness: 0,
    envMapIntensity: 0.55,
  });

  const clay = stoneware.clone();
  clay.color = C(NATURALS.clay);
  clay.roughness = 0.78;

  // Glazed inner surfaces of the tea service — a little sheen, no plastic.
  const glaze = new THREE.MeshStandardMaterial({
    color: C(0xece4d2),
    roughness: 0.14,
    metalness: 0,
    envMapIntensity: 0.9,
  });

  // ── Planting ──────────────────────────────────────────────────────────────
  const rosemary = new THREE.MeshStandardMaterial({
    color: C(0x546b4c),
    roughness: 0.82,
    metalness: 0,
    envMapIntensity: 0.5,
    side: THREE.DoubleSide,
  });
  const ivy = new THREE.MeshStandardMaterial({
    color: C(0x3f5c3a),
    roughness: 0.7,
    metalness: 0,
    envMapIntensity: 0.55,
    side: THREE.DoubleSide,
  });
  const soil = new THREE.MeshStandardMaterial({ color: C(0x2e2a24), roughness: 0.95, metalness: 0 });

  // ── Product ───────────────────────────────────────────────────────────────
  // Flower reads as dried plant matter in a jar, at a distance, never as a
  // graphic leaf and never being consumed.
  const flower = new THREE.MeshStandardMaterial({
    color: C(0x8b9464),
    roughness: 0.88,
    metalness: 0,
    envMapIntensity: 0.4,
  });
  const teaLeaf = new THREE.MeshStandardMaterial({ color: C(0x6b563c), roughness: 0.9, metalness: 0 });
  const gummy = new THREE.MeshPhysicalMaterial({
    color: C(0xc9803a),
    roughness: 0.35,
    metalness: 0,
    transmission: hi ? 0.5 : 0,
    thickness: 0.006,
    transparent: hi,
    opacity: hi ? 1 : 0.85,
    envMapIntensity: 0.8,
  });

  // ── Emissive practicals ───────────────────────────────────────────────────
  // These are the visible bulbs and shades, not the light sources themselves.
  const emissive = memo((colour, intensity) =>
    new THREE.MeshStandardMaterial({
      color: C(colour),
      emissive: C(colour),
      emissiveIntensity: intensity,
      roughness: 0.5,
      metalness: 0,
      toneMapped: true,
    }));

  const bulb2400 = emissive(0xffc98a, 2.0); // door lantern — 2400K
  const bulb2700 = emissive(0xffd7a8, 1.7); // interior pendants — 2700K
  const shadeOpal = new THREE.MeshStandardMaterial({
    color: C(0xf3e9d6),
    emissive: C(0xffdcae),
    emissiveIntensity: 0.85,
    roughness: 0.42,
    metalness: 0,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
  });

  // ── Added for the redesigned store ────────────────────────────────────────

  // Cabinetry: the same bottle green, but sprayed and rubbed to a low sheen
  // rather than brushed eggshell. Still paint on timber — no laminate.
  //
  // Bottle green is a genuinely dark colour (about 0.017 linear), so on a mass
  // the size of a 5.6m counter it will read as black unless it has something to
  // reflect. The high envMapIntensity is doing that job: a lacquered surface
  // picks up the cream room around it, which is exactly why the reference
  // cabinetry reads as green rather than as a silhouette. The palette hex is
  // untouched.
  const cabinetGreen = makePaint(PALETTE.bottleGreen, 0.26, 2.1);
  const cabinetInk = makePaint(PALETTE.forestInk, 0.3, 1.5);

  // "LIGHT OAK WOOD" from the plan legend: counter tops, shelf boards, the
  // island top. Paler and pinker than the oiled oak of the first scheme.
  const lightOak = oakAt([1.2, 1.2], 0xd9c39a, 0.42);
  const lightOakShelf = oakAt([1.8, 0.5], 0xd3bb92, 0.46);

  // Polished brass for the frames, banding and sconces — brighter and cleaner
  // than the aged, unlacquered brass of the terrace scheme.
  const brassBright = new THREE.MeshStandardMaterial({
    color: C(0xc79a4a),
    map: T.toTexture('brassC', T.brassWear.colour, { repeat: [1, 1], srgb: true }),
    roughnessMap: T.toTexture('brassR', T.brassWear.roughness, { repeat: [1, 1] }),
    roughness: 0.2,
    metalness: 1,
    envMapIntensity: 1.5,
  });

  // The sage rug under the island — cut wool pile, so it reads flat and matte.
  // Colour comes from the map; tinting here as well would darken it twice —
  // the same trap the oak fell into.
  // Knocked down a shade: under the track wash a white-tinted sage clipped out
  // to near-white and lost the plan's Soft Sage entirely.
  const rug = new THREE.MeshStandardMaterial({
    color: C(0xcbd8c2),
    map: T.toTexture('boucleC', T.boucle.colour, { repeat: [10, 16], srgb: true }),
    roughnessMap: T.toTexture('boucleR', T.boucle.roughness, { repeat: [10, 16] }),
    roughness: 0.97,
    metalness: 0,
    envMapIntensity: 0.25,
    ...nm(hi ? T.toTexture('boucleN', () => T.normalFromHeight(T.boucle.height(), 1.8), { repeat: [10, 16] }) : null, 0.5),
  });

  // Ashlar limestone for the upper storey — the reference elevation is dressed
  // stone, not the stock brick of the terrace scheme.
  const stoneFacade = new THREE.MeshStandardMaterial({
    color: C(0xd2cdc2),
    map: T.toTexture('graniteC', T.granite.colour, { repeat: [3, 4], srgb: true }),
    roughnessMap: T.toTexture('graniteR', T.granite.roughness, { repeat: [3, 4] }),
    roughness: 0.82,
    metalness: 0,
    envMapIntensity: 0.72,
  });

  // Dry pavement — the reference exterior is overcast daylight, not post-rain.
  const pavement = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xffffff),
    map: T.toTexture('flagC', T.flagstone.colour, { repeat: [6, 4], srgb: true, aniso: 16 }),
    roughnessMap: T.toTexture('flagR', T.flagstone.roughness, { repeat: [6, 4] }),
    roughness: 0.8,
    metalness: 0.02,
    envMapIntensity: 0.6,
    ...nm(flagstoneNormal, 0.4),
  });

  /** Flat matte card for printed packaging, posters and signage plates. */
  const card = memo((colour, rough = 0.7) =>
    new THREE.MeshStandardMaterial({
      color: C(colour),
      roughness: rough,
      metalness: 0,
      envMapIntensity: 0.3,
    }));

  /** Anodised aluminium for vape devices and drink cans. */
  const anodised = memo((colour) =>
    new THREE.MeshStandardMaterial({
      color: C(colour),
      roughness: 0.32,
      metalness: 0.75,
      envMapIntensity: 1.1,
    }));

  // Foliage for the planters and the tops of the wall bays.
  const leafGreen = new THREE.MeshStandardMaterial({
    color: C(0x4c6b46),
    roughness: 0.62,
    metalness: 0,
    envMapIntensity: 0.6,
    side: THREE.DoubleSide,
  });
  const leafDark = new THREE.MeshStandardMaterial({
    color: C(0x3a5638),
    roughness: 0.6,
    metalness: 0,
    envMapIntensity: 0.55,
    side: THREE.DoubleSide,
  });

  return {
    plaster,
    plasterCeiling,
    plasterAt,
    cabinetGreen,
    cabinetInk,
    lightOak,
    lightOakShelf,
    brassBright,
    rug,
    stoneFacade,
    pavement,
    card,
    anodised,
    leafGreen,
    leafDark,
    joinery,
    joineryDark,
    creamPaint,
    sagePaint,
    makePaint,
    limewash,
    oakCounter,
    oakShelf,
    oakFloor,
    ashLight,
    brass,
    brassDark,
    goldLeaf,
    blackSteel,
    glassClear,
    glassReeded,
    glassFluted,
    glassShopfront,
    terrazzo,
    flagstoneWet,
    granite,
    road,
    brickFacade,
    tweed,
    boucle,
    zinc,
    paperCream,
    stoneware,
    clay,
    glaze,
    rosemary,
    ivy,
    soil,
    flower,
    teaLeaf,
    gummy,
    bulb2400,
    bulb2700,
    shadeOpal,
    emissive,
    quality,
  };
}
