/**
 * The progressive loader.
 *
 * Branded cream-and-green, per the web build essentials. Because the whole set
 * is generated in code rather than downloaded, the honest thing to report is
 * build progress, not bytes — so each stage of the build pushes a step.
 */

export class Loader {
  constructor() {
    this.el = document.getElementById('loader');
    this.fill = document.getElementById('loaderFill');
    this.pct = document.getElementById('loaderPct');
    this.step = document.getElementById('loaderStep');
    this.value = 0;
  }

  /** @param {number} to 0–1 @param {string} label */
  async set(to, label) {
    this.value = Math.max(this.value, Math.min(1, to));
    this.fill.style.width = `${(this.value * 100).toFixed(0)}%`;
    this.pct.textContent = String(Math.round(this.value * 100));
    if (label) this.step.textContent = label;
    // Yield so the browser actually paints between build stages — otherwise the
    // bar jumps from 0 to 100 at the end and the loader is decoration.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  async done() {
    await this.set(1, 'Ready');
    this.el.classList.add('is-done');
    await new Promise((r) => setTimeout(r, 700));
    this.el.hidden = true;
  }

  fail(message) {
    this.step.textContent = message;
    this.step.style.opacity = '0.9';
    this.fill.style.width = '100%';
    this.fill.style.background = '#C8922E';
  }
}
