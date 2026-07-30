/**
 * Hotspots.
 *
 * "Hotspots on hover reveal the dosage system and product family" — storyboard
 * Part 6. Markers are DOM buttons projected from world positions rather than
 * sprites, which means they are real focusable controls: a keyboard-only visitor
 * tabs to them and presses Enter, and a screen reader announces them.
 *
 * Occlusion is handled by a raycast against the set, so a marker on the counter
 * doesn't float through the partition in front of it.
 */

import * as THREE from 'three';
import { HOTSPOTS } from '../data/journey.js';

export class Hotspots {
  constructor({ camera, scene, container, panel }) {
    this.camera = camera;
    this.scene = scene;
    this.container = container;
    this.panel = panel;
    this.visible = true;
    this.activeId = null;

    this.ray = new THREE.Raycaster();
    this.ray.far = 40;
    this._v = new THREE.Vector3();
    this._camPos = new THREE.Vector3();

    this.items = HOTSPOTS.map((h) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'marker';
      btn.hidden = true;
      btn.setAttribute('aria-label', `${h.title} — ${h.kicker}`);
      btn.innerHTML =
        '<span class="marker__ring" aria-hidden="true"></span>' +
        '<span class="marker__dot" aria-hidden="true"></span>' +
        `<span class="marker__tip">${h.title}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.open(h.id);
      });
      // Hovering reveals the label; opening is a click, so a passing cursor
      // never fires a panel at somebody.
      container.appendChild(btn);
      return { data: h, el: btn, world: new THREE.Vector3(...h.position), blocked: false };
    });

    // Occlusion is the expensive part, so only one marker is tested per frame,
    // round-robin, and the result is cached. At 60fps every marker is still
    // re-checked six times a second, which is well inside human reaction time.
    this._checkCursor = 0;
    this.onOpen = () => {};
  }

  open(id) {
    const item = this.items.find((i) => i.data.id === id);
    if (!item) return;
    this.activeId = id;
    for (const i of this.items) i.el.classList.toggle('is-active', i.data.id === id);
    this.panel.show(item.data);
    this.onOpen(item.data);
  }

  close() {
    this.activeId = null;
    for (const i of this.items) i.el.classList.remove('is-active');
    this.panel.hide();
  }

  setVisible(v) {
    this.visible = v;
    if (!v) for (const i of this.items) i.el.hidden = true;
  }

  /** One occlusion test, against the item at the round-robin cursor. */
  _stepOcclusion() {
    if (!this.items.length) return;
    this._checkCursor = (this._checkCursor + 1) % this.items.length;
    const item = this.items[this._checkCursor];
    const dir = item.world.clone().sub(this._camPos);
    const len = dir.length();
    if (len < 0.6) {
      item.blocked = false;
      return;
    }
    this.ray.set(this._camPos, dir.normalize());
    this.ray.far = len - 0.12;
    const hits = this.ray.intersectObjects(this.scene.children, true);
    item.blocked = hits.some((hit) => {
      const m = hit.object.material;
      if (!m || hit.object.isPoints || hit.object.isLine) return false;
      // Glass shouldn't count as an occluder — you can see the roundel through
      // the fanlight, and that is correct.
      if (m.transmission > 0.2 || (m.transparent && m.opacity < 0.7)) return false;
      return true;
    });
  }

  update() {
    if (!this.visible) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.getWorldPosition(this._camPos);
    this._stepOcclusion();

    for (const item of this.items) {
      this._v.copy(item.world);
      const dist = this._v.distanceTo(this._camPos);

      // Fade out anything too far to be meaningful, and anything behind us.
      this._v.project(this.camera);
      const behind = this._v.z > 1;
      const off = this._v.x < -1 || this._v.x > 1 || this._v.y < -1 || this._v.y > 1;

      if (behind || off || dist > 16 || item.blocked) {
        if (!item.el.hidden) item.el.hidden = true;
        continue;
      }

      const x = (this._v.x * 0.5 + 0.5) * w;
      const y = (-this._v.y * 0.5 + 0.5) * h;
      item.el.hidden = false;
      item.el.style.left = `${x.toFixed(1)}px`;
      item.el.style.top = `${y.toFixed(1)}px`;
      // Markers recede a little with distance rather than staying poster-sized.
      const s = THREE.MathUtils.clamp(1.25 - dist * 0.035, 0.62, 1.15);
      item.el.style.transform = `translate(-50%, -50%) scale(${s.toFixed(3)})`;
    }
  }

  dispose() {
    for (const i of this.items) i.el.remove();
  }
}

/** The hotspot panel. */
export class Panel {
  constructor() {
    this.el = document.getElementById('panel');
    this.kicker = document.getElementById('panelKicker');
    this.title = document.getElementById('panelTitle');
    this.body = document.getElementById('panelBody');
    this.list = document.getElementById('panelList');
    this.foot = document.getElementById('panelFoot');
    this.closeBtn = document.getElementById('panelClose');
    this.onClose = () => {};
    this.closeBtn.addEventListener('click', () => this.onClose());
  }

  show(data) {
    this.kicker.textContent = data.kicker || '';
    this.title.textContent = data.title;
    this.body.textContent = data.body;

    this.list.innerHTML = '';
    if (data.items?.length) {
      for (const [k, v, hero] of data.items) {
        const li = document.createElement('li');
        const ks = document.createElement('span');
        ks.className = 'k';
        ks.textContent = k;
        if (hero) {
          const star = document.createElement('span');
          star.className = 'star';
          star.textContent = '★';
          ks.appendChild(star);
        }
        const vs = document.createElement('span');
        vs.className = 'v';
        vs.textContent = v;
        li.append(ks, vs);
        this.list.appendChild(li);
      }
      this.list.hidden = false;
    } else {
      this.list.hidden = true;
    }

    this.foot.textContent = data.footnote || '';
    this.foot.hidden = !data.footnote;
    this.el.hidden = false;
    this.el.scrollTop = 0;
  }

  hide() {
    this.el.hidden = true;
  }

  get open() {
    return !this.el.hidden;
  }
}
