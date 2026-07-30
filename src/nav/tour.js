/**
 * The waypoint tour.
 *
 * "A set of predefined waypoint cameras following the six journey stages, so a
 * judge who won't learn controls still gets the tour" — storyboard Part 6, plus
 * the auto-tour that starts after 20 seconds of inactivity.
 *
 * Movement is a Catmull-Rom curve through the previous stop, any `via` points,
 * and the destination, so the camera walks the plan rather than cutting through
 * the joinery. The look target is interpolated separately and lags slightly
 * behind the move, which is what makes it read as a person turning their head
 * rather than a camera on rails.
 */

import * as THREE from 'three';
import { WAYPOINTS } from '../data/journey.js';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;

export class Tour {
  constructor(camera, { reducedMotion = false } = {}) {
    this.camera = camera;
    this.reducedMotion = reducedMotion;
    this.waypoints = WAYPOINTS;

    this.index = 0;
    this.playing = false;
    this.travelling = false;

    /** Seconds to linger at a stop before the auto-tour moves on. */
    this.dwell = 7.0;

    this._t = 0;
    this._duration = 0;
    this._dwellLeft = 0;
    this._curve = null;
    this._fromTarget = new THREE.Vector3();
    this._toTarget = new THREE.Vector3();
    this._fromFov = camera.fov;
    this._toFov = camera.fov;
    this._lookAt = new THREE.Vector3();
    this._driftPhase = 0;

    this.onArrive = () => {};
    this.onDepart = () => {};
  }

  get current() {
    return this.waypoints[this.index];
  }

  /** True while the tour owns the camera. */
  get active() {
    return this.playing || this.travelling;
  }

  // -------------------------------------------------------------------------

  /**
   * Travel to a stage. `immediate` snaps (used for the opening frame).
   * `duration` overrides the distance-derived travel time.
   */
  goTo(index, { immediate = false, duration = null } = {}) {
    const i = ((index % this.waypoints.length) + this.waypoints.length) % this.waypoints.length;
    const wp = this.waypoints[i];
    const from = this.camera.position.clone();

    this.onDepart(this.index);
    this.index = i;

    const dest = new THREE.Vector3(...wp.position);
    this._toTarget.set(...wp.target);

    // Start the head-turn from wherever the visitor is actually looking, not
    // from the last waypoint's target — otherwise handing back from free-walk
    // snaps the view before the move begins.
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this._fromTarget.copy(from).addScaledVector(fwd, Math.max(1.5, from.distanceTo(this._toTarget)));
    this._fromFov = this.camera.fov;
    this._toFov = wp.fov;

    if (immediate || this.reducedMotion) {
      this.camera.position.copy(dest);
      this._lookAt.copy(this._toTarget);
      this.camera.lookAt(this._lookAt);
      this.camera.fov = this._toFov;
      this.camera.updateProjectionMatrix();
      this.travelling = false;
      this._dwellLeft = this.dwell;
      this._driftPhase = 0;
      this.onArrive(this.index);
      return;
    }

    // Build the path: current position → via points → destination. Duplicate
    // the ends so the Catmull-Rom doesn't overshoot outside the shop.
    const pts = [from.clone(), from.clone()];
    for (const v of wp.via || []) pts.push(new THREE.Vector3(...v));
    pts.push(dest.clone(), dest.clone());
    this._curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);

    // Pace it like a walk: roughly 1.7 m/s, clamped so short hops still read.
    const length = this._curve.getLength();
    this._duration = duration ?? THREE.MathUtils.clamp(length / 1.7, 1.5, 7.5);
    this._t = 0;
    this.travelling = true;
    this._driftPhase = 0;
  }

  play() {
    this.playing = true;
    if (!this.travelling) this._dwellLeft = Math.min(this._dwellLeft || this.dwell, 2.2);
  }

  pause() {
    this.playing = false;
    this.travelling = false;
  }

  next() {
    this.goTo(this.index + 1);
  }

  prev() {
    this.goTo(this.index - 1);
  }

  // -------------------------------------------------------------------------

  update(dt) {
    if (this.travelling) {
      this._t = Math.min(1, this._t + dt / this._duration);
      const e = easeInOut(this._t);
      this.camera.position.copy(this._curve.getPointAt(e));

      // The head turns a little ahead of the feet arriving.
      const lookE = easeOut(Math.min(1, this._t * 1.22));
      this._lookAt.lerpVectors(this._fromTarget, this._toTarget, lookE);
      this.camera.lookAt(this._lookAt);

      this.camera.fov = THREE.MathUtils.lerp(this._fromFov, this._toFov, e);
      this.camera.updateProjectionMatrix();

      if (this._t >= 1) {
        this.travelling = false;
        this._dwellLeft = this.dwell;
        this.onArrive(this.index);
      }
      return true;
    }

    if (!this.playing) return false;

    // Dwell: a very slow drift around the target, so a held frame still
    // breathes. Two incommensurate periods, so it never visibly loops.
    this._dwellLeft -= dt;
    if (!this.reducedMotion) {
      this._driftPhase += dt;
      const p = this._driftPhase;
      const drift = new THREE.Vector3(
        Math.sin(p * 0.21) * 0.055,
        Math.sin(p * 0.13 + 1.1) * 0.022,
        Math.cos(p * 0.17) * 0.04,
      );
      this.camera.lookAt(this._lookAt.clone().add(drift));
    }

    if (this._dwellLeft <= 0) this.next();
    return true;
  }
}

/**
 * Auto-tour idle watch. Starts the tour after `delay` seconds of nothing
 * happening, and stands down the moment the visitor touches anything.
 */
export class IdleWatch {
  constructor({ delay = 20, onIdle = () => {} } = {}) {
    this.delay = delay;
    this.onIdle = onIdle;
    this.left = delay;
    this.armed = true;
    this.fired = false;
  }

  poke() {
    this.left = this.delay;
    this.fired = false;
  }

  update(dt) {
    if (!this.armed || this.fired) return;
    this.left -= dt;
    if (this.left <= 0) {
      this.fired = true;
      this.onIdle();
    }
  }
}
