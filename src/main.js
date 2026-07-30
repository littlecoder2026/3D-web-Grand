/**
 * GRAND. — the interactive 3D walkthrough.
 *
 * Route A from storyboard Part 6: real-time WebGL, first-person on desktop,
 * six waypoint cameras following the journey stages, hotspots on the dosage
 * system and product family, a hands-free auto-tour after 20s of inactivity, a
 * keyboard-only path, an age gate, and a phone fallback that drops to a
 * fixed-node tour.
 *
 * The one deliberate departure from Part 6: nothing is downloaded. There is no
 * glTF, no Draco, no KTX2 and no baked lightmap, because there is no upstream
 * Blender or Unreal file to bake from — the set is modelled procedurally, in
 * code, from the written specification. The consequences are honest ones and
 * they are recorded in the README: no GI solution, so the bounce is hand-placed
 * (see core/lighting.js), and no photogrammetric detail, so the fidelity comes
 * from construction logic, chamfered edges and varied roughness instead.
 */

import * as THREE from 'three';
import { App, sceneStats } from './core/app.js';
import { buildEnvironment, buildLighting } from './core/lighting.js';
import { buildMaterials } from './core/materials.js';
import { buildExterior } from './world/exterior.js';
import { buildInterior } from './world/interior.js';
import { loadDisplayFont } from './world/signage.js';
import { ensureDisplayFont } from './core/brandfont.js';
import { FirstPersonControls } from './nav/controls.js';
import { IdleWatch, Tour } from './nav/tour.js';
import { WAYPOINTS } from './data/journey.js';
import { Loader } from './ui/loader.js';
import { runAgeGate, runIntro } from './ui/gate.js';
import { Hud } from './ui/hud.js';
import { Hotspots, Panel } from './ui/hotspots.js';

const IS_TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const SMALL = window.matchMedia('(max-width: 820px)').matches;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A phone gets the light build and the node tour: no free roam, drag to look,
 * move between the six stops on the rail. Same set, same lighting, fewer maps.
 */
const MOBILE_FALLBACK = IS_TOUCH || SMALL;

// The visitor can force the light build from the HUD; it survives a reload
// within the session, which is how the switch is implemented.
const FORCED_QUALITY = sessionStorage.getItem('grand:quality');
const quality = FORCED_QUALITY || (MOBILE_FALLBACK ? 'low' : 'high');

boot().catch((err) => {
  console.error(err);
  new Loader().fail(
    err?.message?.includes('WebGL')
      ? "This browser can't run WebGL — try Chrome, Safari or Firefox."
      : 'Something went wrong opening the shop. Reload and we\'ll try again.',
  );
});

async function boot() {
  const loader = new Loader();
  const stage = document.getElementById('stage');

  await loader.set(0.04, 'Warming the lights');

  // The display face has to be parsed before any signwriting is extruded, and
  // loaded as a webfont before any canvas artwork is drawn in it.
  const fontWork = Promise.all([
    loadDisplayFont(),
    ensureDisplayFont(),
    document.fonts?.ready,
  ]);

  const app = new App(stage, quality);
  await loader.set(0.12, 'Setting the camera');

  // ── Environment first: every material needs something to reflect ──────────
  const { envMap, background } = buildEnvironment(app.renderer);
  app.scene.environment = envMap;
  app.scene.background = background;
  // Blue hour, post-rain: a little aerial perspective down the street.
  app.scene.fog = new THREE.Fog(0x24303c, 26, 78);
  await loader.set(0.2, 'Blue hour, post-rain');

  const materials = buildMaterials({ quality });
  await loader.set(0.38, 'Mixing the paint');

  await fontWork;
  await loader.set(0.46, 'Gilding the full stop');

  const exterior = buildExterior(materials, { quality });
  app.scene.add(exterior);
  await loader.set(0.66, 'Hanging the fascia');

  const interior = buildInterior(materials, { quality });
  app.scene.add(interior);
  await loader.set(0.86, 'Stocking the shelves');

  const lighting = buildLighting(app.scene, { quality });
  await loader.set(0.95, 'Lighting three passes');

  // ── Navigation ────────────────────────────────────────────────────────────
  const controls = new FirstPersonControls(app.camera, app.renderer.domElement, {
    allowWalk: !MOBILE_FALLBACK,
    reducedMotion: REDUCED_MOTION,
  });
  const tour = new Tour(app.camera, { reducedMotion: REDUCED_MOTION });
  const panel = new Panel();
  const hotspots = new Hotspots({
    camera: app.camera,
    scene: app.scene,
    container: stage,
    panel,
  });

  // Open on the establishing frame, before anyone has chosen anything.
  tour.goTo(0, { immediate: true });
  controls.syncFromCamera();

  const stats = sceneStats(app.scene);
  console.info(
    `GRAND. set built — ${stats.triangles.toLocaleString()} triangles, ${stats.meshes} meshes, quality: ${quality}`,
  );

  // Lighting handles, for tuning a frame without a rebuild. Dev only.
  if (import.meta.env.DEV) {
    window.__grand = { app, scene: app.scene, camera: app.camera, materials, lighting, tour, controls, stats, THREE };
  }

  // ── UI wiring ─────────────────────────────────────────────────────────────
  const idle = new IdleWatch({
    delay: 20,
    onIdle: () => {
      // Hands-free after 20 seconds, per the web build essentials.
      startTour();
      hud.showHint('Auto-tour — press any key to take over', 5000);
    },
  });

  const hud = new Hud({
    onStage: (i) => {
      goToStage(i);
      poke();
    },
    onTourToggle: () => {
      tour.playing || tour.travelling ? stopTour() : startTour();
      poke();
    },
    onMarkersToggle: () => {
      const on = !hotspots.visible;
      hotspots.setVisible(on);
      hud.setMarkers(on);
      if (!on) hotspots.close();
      poke();
    },
    onQualityToggle: () => {
      // A real quality switch means rebuilding every material and map, so it
      // reloads rather than pretending to be live.
      const next = quality === 'high' ? 'low' : 'high';
      sessionStorage.setItem('grand:quality', next);
      location.reload();
    },
  });

  hud.setQuality(quality);
  hud.setMarkers(true);
  hud.setStage(0);

  panel.onClose = () => hotspots.close();

  tour.onArrive = (i) => {
    hud.setStage(i);
    if (!tour.playing) {
      controls.syncFromCamera();
      controls.enabled = true;
    }
  };
  tour.onDepart = () => {
    hotspots.close();
  };

  function goToStage(i) {
    stopTour();
    controls.enabled = false;
    tour.goTo(i);
  }

  function startTour() {
    hotspots.close();
    controls.enabled = false;
    tour.play();
    // Re-establish the current stage's framing first. After a free walk the
    // visitor is never standing exactly on the mark, and cutting straight to
    // the next stop would skip a stage they never actually saw framed.
    if (!tour.travelling) tour.goTo(tour.index);
    hud.setTourPlaying(true);
  }

  function stopTour() {
    if (tour.active) controls.syncFromCamera();
    tour.pause();
    controls.enabled = true;
    hud.setTourPlaying(false);
  }

  function poke() {
    idle.poke();
  }
  controls.onActivity = () => {
    // Any real input takes the tour off the visitor's hands.
    if (tour.playing) stopTour();
    poke();
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();

    if (k === 'escape') {
      if (panel.open) return hotspots.close();
      if (hud.helpOpen) return hud.toggleHelp(false);
      if (tour.playing) return stopTour();
      return;
    }
    if (k >= '1' && k <= String(WAYPOINTS.length)) {
      goToStage(Number(k) - 1);
      poke();
      return;
    }
    if (k === 't') {
      tour.playing || tour.travelling ? stopTour() : startTour();
      poke();
      return;
    }
    if (k === 'm') {
      const on = !hotspots.visible;
      hotspots.setVisible(on);
      hud.setMarkers(on);
      if (!on) hotspots.close();
      poke();
      return;
    }
    if (k === '?' || k === 'h') {
      hud.toggleHelp();
      poke();
    }
  });

  // Clicking anywhere in the set takes the tour off the visitor's hands.
  app.renderer.domElement.addEventListener('pointerdown', () => {
    if (tour.playing) stopTour();
    poke();
  });

  // ── Frame loop ────────────────────────────────────────────────────────────
  app.onFrame((dt) => {
    const touring = tour.update(dt);
    if (!touring) controls.update(dt);
    hotspots.update();
    idle.update(dt);
  });

  await loader.set(1, 'Ready');
  app.start();
  await loader.done();

  // Dev-only shortcut so a specific frame can be checked without clicking
  // through the front door every reload: ?frame=1..6
  if (import.meta.env.DEV) {
    const frame = new URLSearchParams(location.search).get('frame');
    if (frame !== null) {
      hud.reveal(MOBILE_FALLBACK);
      idle.armed = false;
      tour.goTo(Math.max(0, Number(frame) - 1), { immediate: true });
      controls.syncFromCamera();
      controls.enabled = true;
      return;
    }
  }

  // ── Front door ────────────────────────────────────────────────────────────
  const ok = await runAgeGate();
  if (!ok) return; // the polite refusal screen stays up

  hud.reveal(MOBILE_FALLBACK);
  const mode = await runIntro();

  if (mode === 'tour') {
    tour.goTo(1);
    tour.play();
    hud.setTourPlaying(true);
    hud.showHint('Six stops · press T to pause, or click to take over');
  } else {
    controls.enabled = true;
    controls.syncFromCamera();
    hud.showHint(
      MOBILE_FALLBACK
        ? 'Drag to look around · use the stages along the bottom to move'
        : 'Drag to look · WASD to walk · click a gold marker to open it',
      6000,
    );
  }
  poke();

  if (FORCED_QUALITY) console.info(`Quality forced to "${quality}" for this session.`);
}
