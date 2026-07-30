/**
 * First-person navigation.
 *
 * Desktop: WASD (or arrows) to walk, drag to look. Deliberately NOT pointer
 * lock: the hotspot markers are real DOM buttons, and a captured cursor can't
 * click them. A judge who has to press Escape to touch the interface has been
 * given a puzzle instead of a shop.
 *
 * Phones drop `allowWalk` and become a look-around-from-a-fixed-node tour,
 * driven by the stage rail.
 *
 * Collision is a set of axis-aligned walkable rectangles minus a set of
 * blockers, with wall-sliding. It is not a physics engine and does not need to
 * be — the set is a shop, and every surface in it is square to the plan.
 */

import * as THREE from 'three';
import { DIMS } from '../data/brand.js';

/** Rectangles the visitor may stand in: [x0, x1, z0, z1]. */
const WALKABLE = [
  // The whole street, kerb to kerb. Crossing the road is how you actually see a
  // 10m shopfront, and the establishing camera stands over there.
  [-18.0, 18.0, 0.4, 18.4],
  [-0.85, 0.85, -0.5, 0.45], // the doorway
  [-4.85, 4.85, -8.2, -0.5], // the sales floor
];

/** Rectangles they may not: fixtures, joinery, planting. */
const BLOCKERS = [
  // Wall bays, both sides. Each is 2.6m along the wall by 0.42m deep, plus the
  // oak top's overhang.
  [-5.0, -4.42, -8.2, -5.6], // 3 tea
  [-5.0, -4.42, -5.4, -2.8], // 4 gummies
  [-5.0, -4.42, -2.6, 0.0], // 5 chewing gum
  [4.42, 5.0, -8.2, -5.6], // 6 drinks
  [4.42, 5.0, -5.4, -2.8], // 7 mensch
  [4.42, 5.0, -2.6, 0.0], // 8 merch

  [-1.28, 1.28, -7.13, -3.07], // 2 the island, plus its top overhang
  [-2.92, 2.92, -8.28, -7.22], // 9 the counter
  [-3.1, -1.55, -8.3, -7.2], // counter approach, left return
  [1.55, 3.1, -8.3, -7.2], // counter approach, right return

  [-4.4, -2.2, -0.98, -0.26], // window bench
  [2.5, 4.15, -0.92, -0.32], // merch console
  [-2.25, -1.65, -0.8, -0.2], // entry planters, left
  [1.65, 2.25, -0.8, -0.2], // entry planters, right
  [-4.78, -4.12, -2.22, -1.58], // corner planter, left
  [4.12, 4.78, -2.22, -1.58], // corner planter, right

  [-5.0, -3.9, 0.3, 1.2], // pavement tree planter, left
  [3.9, 5.0, 0.3, 1.2], // pavement tree planter, right
];

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

const inRect = (x, z, [x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1;

/** Is this a spot a visitor could actually stand? */
export function isWalkable(x, z) {
  if (!WALKABLE.some((r) => inRect(x, z, r))) return false;
  return !BLOCKERS.some((r) => inRect(x, z, r));
}

export class FirstPersonControls {
  constructor(camera, domElement, { allowWalk = true, reducedMotion = false } = {}) {
    this.camera = camera;
    this.dom = domElement;
    this.allowWalk = allowWalk;
    this.reducedMotion = reducedMotion;

    this.enabled = false;
    this.yaw = 0;
    this.pitch = 0;
    this.eye = DIMS.eyeHeight;

    this.speed = 2.1; // m/s — an unhurried indoor walk
    this.sprint = 3.6;
    this.lookSpeed = 0.0022;
    this.touchLookSpeed = 0.0042;

    this.keys = new Set();
    this.velocity = new THREE.Vector3();
    this.bobPhase = 0;

    /** Set by the app whenever the visitor does anything at all. */
    this.onActivity = () => {};

    this._dragging = false;
    this._lastX = 0;
    this._lastY = 0;

    this._bind();
  }

  // -------------------------------------------------------------------------

  _bind() {
    const d = this.dom;

    this._onPointerDown = (e) => {
      if (!this.enabled) return;
      // Left button only; the hotspot markers are DOM and handle themselves.
      if (e.button !== 0) return;
      this._dragging = true;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      d.setPointerCapture?.(e.pointerId);
      this.onActivity();
    };

    this._onPointerMove = (e) => {
      if (!this.enabled) return;
      if (!this._dragging) return;
      const dx = e.clientX - this._lastX;
      const dy = e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this._look(dx, dy, e.pointerType === 'touch' ? this.touchLookSpeed : this.lookSpeed * 1.6);
      this.onActivity();
    };

    this._onPointerUp = (e) => {
      this._dragging = false;
      d.releasePointerCapture?.(e.pointerId);
    };

    this._onKeyDown = (e) => {
      if (!this.enabled) return;
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.has(k)) {
        this.keys.add(k);
        // Arrow keys scroll the page otherwise, which is jarring mid-walk.
        if (k.startsWith('arrow')) e.preventDefault();
        this.onActivity();
      }
      if (k === 'shift') this.keys.add('shift');
    };

    this._onKeyUp = (e) => {
      const k = e.key.toLowerCase();
      this.keys.delete(k);
      if (k === 'shift') this.keys.delete('shift');
    };

    this._onBlur = () => this.keys.clear();

    d.addEventListener('pointerdown', this._onPointerDown);
    d.addEventListener('pointermove', this._onPointerMove);
    d.addEventListener('pointerup', this._onPointerUp);
    d.addEventListener('pointercancel', this._onPointerUp);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  dispose() {
    const d = this.dom;
    d.removeEventListener('pointerdown', this._onPointerDown);
    d.removeEventListener('pointermove', this._onPointerMove);
    d.removeEventListener('pointerup', this._onPointerUp);
    d.removeEventListener('pointercancel', this._onPointerUp);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }

  // -------------------------------------------------------------------------

  _look(dx, dy, speed) {
    this.yaw -= dx * speed;
    this.pitch -= dy * speed;
    const limit = Math.PI / 2 - 0.06;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
  }

  /** Adopt the camera's current orientation — used when the tour hands over. */
  syncFromCamera() {
    const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw = e.y;
    this.pitch = e.x;
    this.eye = this.camera.position.y;
  }

  /** Place the visitor, looking at a point. */
  placeAt(position, target) {
    this.camera.position.set(position[0], position[1], position[2]);
    this.eye = position[1];
    const dir = new THREE.Vector3(target[0] - position[0], target[1] - position[1], target[2] - position[2]).normalize();
    this.yaw = Math.atan2(-dir.x, -dir.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
  }

  update(dt) {
    if (!this.enabled) return;

    // Look
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    this.camera.quaternion.copy(q);

    if (!this.allowWalk) return;

    // Walk
    const forward = (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0) - (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0);
    const strafe = (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);

    const target = new THREE.Vector3();
    if (forward || strafe) {
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      // Forward is -Z in view space
      target.x = -sin * forward + cos * strafe;
      target.z = -cos * forward - sin * strafe;
      target.normalize().multiplyScalar(this.keys.has('shift') ? this.sprint : this.speed);
    }

    // Critically-damped-ish smoothing, so starting and stopping has weight.
    const k = 1 - Math.exp(-dt * 11);
    this.velocity.x += (target.x - this.velocity.x) * k;
    this.velocity.z += (target.z - this.velocity.z) * k;
    if (this.velocity.lengthSq() < 1e-6) this.velocity.set(0, 0, 0);

    const p = this.camera.position;
    const nx = p.x + this.velocity.x * dt;
    const nz = p.z + this.velocity.z * dt;

    // Wall sliding: try the full move, then each axis alone.
    if (isWalkable(nx, nz)) {
      p.x = nx;
      p.z = nz;
    } else if (isWalkable(nx, p.z)) {
      p.x = nx;
      this.velocity.z = 0;
    } else if (isWalkable(p.x, nz)) {
      p.z = nz;
      this.velocity.x = 0;
    } else {
      this.velocity.set(0, 0, 0);
    }

    // A whisper of head bob while moving. Off entirely for reduced motion —
    // it is the one thing here that can make somebody feel unwell.
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (!this.reducedMotion && speed > 0.05) {
      this.bobPhase += dt * speed * 5.4;
      p.y = this.eye + Math.sin(this.bobPhase) * 0.011 + Math.sin(this.bobPhase * 2) * 0.004;
    } else {
      p.y += (this.eye - p.y) * (1 - Math.exp(-dt * 8));
    }
  }
}
