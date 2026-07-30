/**
 * Lighting — three passes, in this order:
 *   (a) natural       — overcast Dublin daylight, and what comes through the glass
 *   (b) architectural — two ceiling track runs and a wash on each product bay
 *   (c) practicals    — globe pendants, brass sconces, shelf strips, lanterns
 *
 * The redesigned store is a bright, warm daylight interior rather than the
 * blue-hour scheme: cream plaster, pale terrazzo and a lot of light. Target
 * key-to-fill is nearer 3:1 than 5:1 — flatter, deliberately, because this room
 * is meant to feel open and easy to walk into rather than intimate.
 *
 * Real GI is off the table in a browser at 60fps, so the bounce is hand-placed:
 * a few low-intensity, non-shadowing fills standing in for light coming back off
 * the cream walls and pale floor.
 *
 * ── A note on units ─────────────────────────────────────────────────────────
 * Point and spot intensities are candela with `decay = 2`, so illuminance falls
 * off as I/d², and output radiance for a lit surface is roughly
 * (albedo/π)·(I/d²)·N·L. At the distances in a 3.6m-high shop that puts a
 * correctly exposed fitting in the low tens, not the hundreds. Directional and
 * hemisphere intensities are irradiance and sit near 1. Use `cd()` below rather
 * than guessing — getting this wrong by a factor of ten is the difference
 * between daylight and a welding accident.
 */

import * as THREE from 'three';
import { DIMS, PLAN, WALL_BAYS, ZONES } from '../data/brand.js';

/**
 * Candela for a wanted result, rather than a number picked by feel.
 *
 * Returns the intensity a decay-2 source needs in order to land a surface of
 * `albedo` at `distance` on roughly `radiance` linear, pre-tonemap. Aim for
 * 0.25–0.45 on the surfaces that carry a shot, and let only the lamps
 * themselves go over 1.
 */
export const cd = (radiance, distance, albedo = 0.8) => (radiance * Math.PI * distance * distance) / albedo;

// Kelvin → linear RGB, good enough over the 1800–9000K range we use.
export function kelvin(K) {
  const t = K / 100;
  let r;
  let g;
  let b;
  if (t <= 66) {
    r = 255;
    g = 99.47 * Math.log(t) - 161.12;
    b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  } else {
    r = 329.7 * (t - 60) ** -0.1332;
    g = 288.12 * (t - 60) ** -0.0755;
    b = 255;
  }
  return new THREE.Color(
    Math.min(1, Math.max(0, r / 255)),
    Math.min(1, Math.max(0, g / 255)),
    Math.min(1, Math.max(0, b / 255)),
  ).convertSRGBToLinear();
}

/**
 * Overcast late-afternoon sky as an equirectangular canvas: a bright, almost
 * shadowless dome with a slightly warmer west and a darker ground half.
 *
 * Authored brighter than the hex values look on paper — everything here goes
 * through sRGB→linear and then an ACES tonemap before anyone sees it, so
 * authoring the literal target colour gives a sky several stops too dark.
 */
function skyCanvas(w = 1024, h = 512) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#8fa8c4');
  grad.addColorStop(0.3, '#adc0d4');
  grad.addColorStop(0.46, '#ccd7e0');
  grad.addColorStop(0.5, '#dfe4e6'); // the horizon haze
  grad.addColorStop(0.54, '#9a978c'); // ground takes over
  grad.addColorStop(0.75, '#6f6c62');
  grad.addColorStop(1.0, '#4d4b44');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Broken cloud, so reflections in the glass have something to sit on.
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 60; i++) {
    const cx = Math.random() * w;
    const cy = h * (0.04 + Math.random() * 0.4);
    const rx = w * (0.05 + Math.random() * 0.14);
    const ry = rx * (0.14 + Math.random() * 0.16);
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    g2.addColorStop(0, 'rgba(255,255,255,0.9)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    ctx.translate(-cx, -cy);
    ctx.beginPath();
    ctx.arc(cx, cy, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // A brighter patch where the sun sits behind the cloud, low and to one side.
  const sun = ctx.createRadialGradient(w * 0.3, h * 0.34, 0, w * 0.3, h * 0.34, w * 0.28);
  sun.addColorStop(0, 'rgba(255,246,226,0.75)');
  sun.addColorStop(0.4, 'rgba(255,242,220,0.22)');
  sun.addColorStop(1, 'rgba(255,240,215,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  return c;
}

/** Build the environment + background. Returns { envMap, background }. */
export function buildEnvironment(renderer) {
  const tex = new THREE.CanvasTexture(skyCanvas());
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();

  return { envMap, background: tex };
}

/**
 * Place every light in the set. Returns the group plus named handles.
 */
export function buildLighting(scene, { quality = 'high' } = {}) {
  const hi = quality === 'high';
  const g = new THREE.Group();
  g.name = 'lighting';
  const lights = {};
  const shadowSize = hi ? 1024 : 512;
  const CH = DIMS.ceilingHeight;

  // ── (a) Natural ───────────────────────────────────────────────────────────

  // Overcast sky dome. Outdoors this is doing nearly all the work.
  const hemi = new THREE.HemisphereLight(kelvin(7000), new THREE.Color(0x55524a).convertSRGBToLinear(), 2.3);
  hemi.position.set(0, 12, 6);
  g.add(hemi);

  // A soft sun behind cloud: enough to model the joinery and throw one gentle
  // shadow across the pavement, not a hard midday key.
  const sun = new THREE.DirectionalLight(kelvin(5800), 1.9);
  sun.position.set(-11, 15, 14);
  sun.target.position.set(0, 2, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 48;
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -8;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.024;
  g.add(sun, sun.target);
  lights.sun = sun;

  // Daylight arriving through the shopfront. This is what makes the front half
  // of the room read as daylit rather than lamplit.
  const throughGlass = new THREE.SpotLight(kelvin(6500), cd(0.32, 4.0, 0.7), 13, Math.PI * 0.5, 1.0, 1.4);
  throughGlass.position.set(0, 2.9, 2.2);
  throughGlass.target.position.set(0, 0.4, -4.5);
  g.add(throughGlass, throughGlass.target);
  lights.throughGlass = throughGlass;

  // ── (b) Architectural ─────────────────────────────────────────────────────

  // Two track runs at x = ±2.9. Fourteen trims are modelled, but three wide
  // sources per run carry the illumination — a light per trim would cost far
  // more than it would show.
  lights.track = [];
  for (const s of [-1, 1]) {
    [-1.9, -4.4, -6.9].forEach((z, i) => {
      const spot = new THREE.SpotLight(kelvin(3000), cd(0.34, 2.9, 0.7), 6.4, Math.PI * 0.44, 0.75, 1.7);
      spot.position.set(s * 2.9, CH - 0.16, z);
      spot.target.position.set(s * 3.6, 0, z);
      // One caster per run is plenty for contact shadow under the fixtures.
      spot.castShadow = hi && i === 1;
      if (spot.castShadow) {
        spot.shadow.mapSize.set(shadowSize, shadowSize);
        spot.shadow.bias = -0.0009;
        spot.shadow.normalBias = 0.022;
        spot.shadow.camera.near = 0.4;
        spot.shadow.camera.far = 8;
      }
      g.add(spot, spot.target);
      lights.track.push(spot);
    });
  }

  // ── (c) Practicals: the shelf strips ──────────────────────────────────────
  // In the reference the niches are lit from within, by the LED strip tucked
  // behind each shelf's brass edge — that is what makes bottle green read as
  // green rather than as a silhouette. Eighteen strips are modelled; one warm
  // source per bay stands in for all three, sitting inside the recess.
  lights.bays = [];
  for (const bay of WALL_BAYS) {
    const x = bay.side === 'left' ? PLAN.leftX : PLAN.rightX;
    const sign = bay.side === 'left' ? 1 : -1;

    const inside = new THREE.PointLight(kelvin(2800), 2.6, 2.6, 2);
    inside.position.set(x + sign * 0.3, 1.95, bay.z);
    g.add(inside);
    lights.bays.push(inside);

    // Plus a track spot grazing the bay front, so the oak top and the
    // shelf-talker on it are lit from the room side too.
    const spot = new THREE.SpotLight(kelvin(3000), cd(0.4, 1.6, 0.5), 4.4, Math.PI * 0.44, 0.85, 1.7);
    spot.position.set(x + sign * 1.15, CH - 0.2, bay.z);
    spot.target.position.set(x + sign * 0.25, 1.4, bay.z);
    g.add(spot, spot.target);
  }

  // ── (c) Practicals ────────────────────────────────────────────────────────

  // The globe pendants. Warm, and the only fittings a customer really notices.
  const cluster = new THREE.PointLight(kelvin(2700), cd(0.3, 1.6, 0.7), 6.0, 2);
  cluster.position.set(0, 2.25, -6.55);
  g.add(cluster);
  lights.cluster = cluster;
  for (const s of [-1, 1]) {
    const globe = new THREE.PointLight(kelvin(2700), cd(0.24, 1.4, 0.7), 4.5, 2);
    globe.position.set(s * 1.15, 2.6, -8.05);
    g.add(globe);
  }

  // Over the counter: the last light a customer stands under.
  const counterLight = new THREE.SpotLight(kelvin(2900), cd(0.4, 2.3, 0.6), 5.2, Math.PI * 0.5, 0.7, 1.8);
  counterLight.position.set(ZONES.counter.cx, CH - 0.2, ZONES.counter.cz + 0.35);
  counterLight.target.position.set(ZONES.counter.cx, DIMS.counterHeight, ZONES.counter.cz);
  counterLight.castShadow = hi;
  if (hi) {
    counterLight.shadow.mapSize.set(shadowSize, shadowSize);
    counterLight.shadow.bias = -0.001;
    counterLight.shadow.normalBias = 0.022;
    counterLight.shadow.camera.near = 0.4;
    counterLight.shadow.camera.far = 6;
  }
  g.add(counterLight, counterLight.target);
  lights.counterLight = counterLight;

  // Grazing light on the arched GRAND. recess, so the wordmark reads from the
  // door. Motivated by the two globes hanging in front of it.
  const archWash = new THREE.SpotLight(kelvin(2800), cd(0.38, 1.7, 0.85), 3.6, Math.PI * 0.42, 0.8, 1.7);
  archWash.position.set(0, CH - 0.25, ZONES.featureWall.z + 1.1);
  archWash.target.position.set(0, 1.7, ZONES.featureWall.z);
  g.add(archWash, archWash.target);

  // Back of house, spilling through the two open doors — proof of a real
  // operating business rather than a set.
  const boh = new THREE.PointLight(kelvin(4000), cd(0.3, 1.8, 0.7), 5.0, 2);
  boh.position.set(0, 2.2, PLAN.rearZ + 0.9);
  g.add(boh);

  // ── Bounce ────────────────────────────────────────────────────────────────
  // Standing in for one bounce off cream plaster and pale terrazzo.
  // Non-shadowing, wide, weak.
  const bounces = [
    [0, 1.5, -1.6, 6.0],
    [0, 1.5, -5.1, 6.5],
    [0, 1.5, -8.0, 5.5],
    [-3.2, 1.4, -4.4, 5.0],
    [3.2, 1.4, -4.4, 5.0],
    [0, 0.9, -6.9, 4.5], // onto the counter face
  ];
  for (const [x, y, z, dist] of bounces) {
    const p = new THREE.PointLight(kelvin(3200), hi ? 1.6 : 2.2, dist, 2);
    p.position.set(x, y, z);
    g.add(p);
  }

  scene.add(g);
  return { group: g, lights };
}
