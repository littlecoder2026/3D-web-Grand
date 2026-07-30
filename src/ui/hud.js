/**
 * HUD, stage rail, hint line, help sheet.
 *
 * The rail is the accessibility path as well as the tour control: six real
 * buttons, in journey order, reachable by Tab and activated by Enter. Nothing in
 * this interface requires a mouse, and nothing requires learning WASD.
 */

import { ASSUMPTIONS, WAYPOINTS } from '../data/journey.js';

export class Hud {
  constructor({ onStage, onTourToggle, onMarkersToggle, onQualityToggle }) {
    this.el = document.getElementById('hud');
    this.rail = document.getElementById('rail');
    this.railList = document.getElementById('railList');
    this.place = document.getElementById('hudPlace');
    this.hint = document.getElementById('hint');

    this.btnTour = document.getElementById('btnTour');
    this.btnTourLabel = document.getElementById('btnTourLabel');
    this.btnMarkers = document.getElementById('btnMarkers');
    this.btnQuality = document.getElementById('btnQuality');
    this.btnHelp = document.getElementById('btnHelp');
    this.help = document.getElementById('help');
    this.helpClose = document.getElementById('helpClose');

    this._hintTimer = 0;

    // Stage rail
    this.railButtons = WAYPOINTS.map((wp, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rail__btn';
      btn.innerHTML =
        `<span class="rail__num" aria-hidden="true">0${wp.stage}</span>` +
        `<span class="rail__name">${wp.name}</span>` +
        `<span class="rail__label">${wp.label}</span>`;
      btn.setAttribute('aria-label', `Stage ${wp.stage}. ${wp.name}. ${wp.job}`);
      btn.addEventListener('click', () => onStage(i));
      li.appendChild(btn);
      this.railList.appendChild(li);
      return btn;
    });

    this.btnTour.addEventListener('click', onTourToggle);
    this.btnMarkers.addEventListener('click', onMarkersToggle);
    this.btnQuality.addEventListener('click', onQualityToggle);
    this.btnHelp.addEventListener('click', () => this.toggleHelp());
    this.helpClose.addEventListener('click', () => this.toggleHelp(false));

    document.getElementById('helpAssumptions').textContent =
      `Flagged inventions: ${ASSUMPTIONS.length}. ` + ASSUMPTIONS.join(' ');
  }

  reveal(isTouch) {
    this.el.hidden = false;
    this.rail.hidden = false;
    if (isTouch) document.getElementById('helpTouchNote').hidden = false;
  }

  setStage(index) {
    const wp = WAYPOINTS[index];
    this.place.textContent = wp.name;
    this.railButtons.forEach((b, i) => b.setAttribute('aria-current', String(i === index)));
  }

  setTourPlaying(playing) {
    this.btnTour.setAttribute('aria-pressed', String(playing));
    this.btnTourLabel.textContent = playing ? 'Pause' : 'Tour';
    this.btnTour.querySelector('.chip__icon').textContent = playing ? '❙❙' : '▶';
  }

  setMarkers(on) {
    this.btnMarkers.setAttribute('aria-pressed', String(on));
  }

  setQuality(q) {
    this.btnQuality.textContent = `Quality: ${q === 'high' ? 'High' : 'Light'}`;
  }

  /** Transient line at the bottom of the frame. `ms = 0` keeps it up. */
  showHint(text, ms = 4200) {
    clearTimeout(this._hintTimer);
    this.hint.textContent = text;
    this.hint.hidden = false;
    if (ms) this._hintTimer = setTimeout(() => this.hideHint(), ms);
  }

  hideHint() {
    clearTimeout(this._hintTimer);
    this.hint.hidden = true;
  }

  toggleHelp(force) {
    const show = force ?? this.help.hidden;
    this.help.hidden = !show;
    if (show) this.helpClose.focus();
    else this.btnHelp.focus();
    return show;
  }

  get helpOpen() {
    return !this.help.hidden;
  }
}
