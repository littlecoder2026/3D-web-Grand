/**
 * The chrome that every page carries: header, footer, age gate, toast.
 *
 * Header and footer are rendered once from here rather than repeated per page,
 * so they cannot drift apart — and both carry a route straight back to the 3D
 * store, which is the point of having both.
 */

import { CATEGORIES } from './catalogue.js';
import * as cart from './cart.js';

/** Escape anything interpolated into markup. */
export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const WORDMARK = 'GRAND<span class="dot">.</span>';

/** Link back to the walkthrough. Present in the header and the footer of every page. */
const STREET_HREF = './index.html';

const NAV = [
  { href: '#/shop', label: 'Shop' },
  { href: '#/about', label: 'About us' },
  { href: '#/blog', label: 'Blog' },
  { href: '#/contact', label: 'Contact' },
];

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function renderHeader(el) {
  el.className = 'siteheader';
  el.innerHTML = `
    <div class="siteheader__band">
      <p class="siteheader__band-copy">Premium products. Conscious choices.</p>
      <p class="siteheader__band-copy siteheader__band-copy--right">
        Free delivery over €50 · 18+ only · Grown in Ireland
      </p>
    </div>

    <div class="siteheader__bar">
      <a class="siteheader__brand" href="#/" aria-label="GRAND. home">
        <span class="wordmark wordmark--sm">${WORDMARK}</span>
      </a>

      <button class="siteheader__burger" id="navToggle" type="button"
              aria-expanded="false" aria-controls="primaryNav" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>

      <nav class="siteheader__nav" id="primaryNav" aria-label="Primary">
        <ul>
          ${NAV.map((n) => `<li><a href="${n.href}" data-nav="${esc(n.href)}">${esc(n.label)}</a></li>`).join('')}
          <!-- On a phone these two move out of the action row and into the menu,
               so the header stays two rows instead of three. -->
          <li class="nav--phone"><a href="#/login" data-nav="#/login">Login</a></li>
          <li class="nav--phone"><a href="${STREET_HREF}">The store in 3D</a></li>
        </ul>
      </nav>

      <div class="siteheader__actions">
        <a class="chip chip--street" href="${STREET_HREF}">
          <span aria-hidden="true">◧</span> The store in 3D
        </a>
        <a class="chip chip--login" href="#/login">Login</a>
        <a class="chip chip--cart" href="#/cart">
          Cart <span class="chip__count" id="cartCount">0</span>
        </a>
      </div>
    </div>

    <div class="siteheader__cats">
      <ul>
        ${CATEGORIES.map(
          (c) => `<li><a href="#/shop/${c.id}" data-cat="${c.id}">${esc(c.name)}</a></li>`,
        ).join('')}
      </ul>
    </div>
  `;

  const toggle = el.querySelector('#navToggle');
  const nav = el.querySelector('#primaryNav');
  toggle.addEventListener('click', () => {
    const open = el.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    if (open) nav.querySelector('a')?.focus();
  });

  // Keep the badge in step with the store.
  const badge = el.querySelector('#cartCount');
  cart.subscribe(() => {
    const n = cart.count();
    badge.textContent = String(n);
    badge.classList.toggle('is-empty', n === 0);
  });
}

/** Mark the current route in the header, and close the mobile menu. */
export function markHeader(el, route) {
  el.classList.remove('is-open');
  el.querySelector('#navToggle')?.setAttribute('aria-expanded', 'false');

  const path = `#/${route.parts.join('/')}`;
  for (const a of el.querySelectorAll('[data-nav]')) {
    const href = a.dataset.nav;
    const on = href === path || (href !== '#/' && path.startsWith(href));
    a.setAttribute('aria-current', on ? 'page' : 'false');
  }
  for (const a of el.querySelectorAll('[data-cat]')) {
    a.setAttribute('aria-current', a.dataset.cat === route.parts[1] ? 'page' : 'false');
  }
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

export function renderFooter(el) {
  el.className = 'sitefooter';
  el.innerHTML = `
    <div class="sitefooter__inner">
      <div class="sitefooter__brand">
        <span class="wordmark wordmark--md wordmark--cream">${WORDMARK}</span>
        <p class="sitefooter__line">From curiosity to confidence.</p>
        <a class="btn btn--outline btn--sm" href="${STREET_HREF}">← Back to the street</a>
      </div>

      <div class="sitefooter__cols">
        <div>
          <h3>Shop</h3>
          <ul>
            ${CATEGORIES.slice(0, 5)
              .map((c) => `<li><a href="#/shop/${c.id}">${esc(c.name)}</a></li>`)
              .join('')}
          </ul>
        </div>
        <div>
          <h3>The shop</h3>
          <ul>
            ${CATEGORIES.slice(5)
              .map((c) => `<li><a href="#/shop/${c.id}">${esc(c.name)}</a></li>`)
              .join('')}
          </ul>
        </div>
        <div>
          <h3>GRAND.</h3>
          <ul>
            <li><a href="#/about">About us</a></li>
            <li><a href="#/blog">Blog</a></li>
            <li><a href="#/contact">Contact</a></li>
            <li><a href="#/login">Your account</a></li>
            <li><a href="${STREET_HREF}">Visit in 3D</a></li>
          </ul>
        </div>
        <div>
          <h3>The Grand Scale</h3>
          <p class="sitefooter__scale">
            One · Gentle 2.5mg<br />
            Two · Easy 5mg<br />
            Three · Grand 10mg
          </p>
          <p class="sitefooter__scale sitefooter__scale--quiet">
            Start at One. Wait a full hour before you decide it isn't working.
          </p>
        </div>
      </div>
    </div>

    <div class="sitefooter__legal">
      <p>
        Over 18s only. Licence IE-RC-0001. Grown two hundred metres from the shop,
        by Máire, Cormac and Aoife.
      </p>
      <p class="sitefooter__legal-right">
        A design showcase for ICAD Upstarts 2026 — nothing on this site is for sale.
      </p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Age gate — shares its session flag with the walkthrough
// ---------------------------------------------------------------------------

export function runAgeGate() {
  const KEY = 'grand:age-ok';
  const gate = document.getElementById('ageGate');
  const denied = document.getElementById('ageDenied');
  const shell = document.getElementById('shell');

  if (sessionStorage.getItem(KEY) === 'yes') {
    shell.hidden = false;
    return Promise.resolve(true);
  }

  gate.hidden = false;
  document.getElementById('gateYes').focus();

  return new Promise((resolve) => {
    document.getElementById('gateYes').addEventListener(
      'click',
      () => {
        try {
          sessionStorage.setItem(KEY, 'yes');
        } catch {
          /* private browsing — we'll just ask again next time */
        }
        gate.hidden = true;
        shell.hidden = false;
        resolve(true);
      },
      { once: true },
    );
    document.getElementById('gateNo').addEventListener('click', () => {
      gate.hidden = true;
      denied.hidden = false;
      document.getElementById('gateBack').focus();
    });
    document.getElementById('gateBack').addEventListener('click', () => {
      denied.hidden = true;
      gate.hidden = false;
      document.getElementById('gateYes').focus();
    });
  });
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

let toastTimer = 0;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.hidden = false;
  el.classList.add('is-in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => {
      el.hidden = true;
    }, 300);
  }, 2600);
}

/**
 * A page masthead: eyebrow, title, standfirst. Every page uses it, so headings
 * sit at the same height and the pages read as one site.
 */
export function masthead({ eyebrow, title, standfirst, arch = false }) {
  return `
    <section class="masthead${arch ? ' masthead--arch' : ''}">
      <div class="wrap">
        ${eyebrow ? `<p class="masthead__eyebrow">${esc(eyebrow)}</p>` : ''}
        <h1 class="masthead__title">${esc(title)}</h1>
        ${standfirst ? `<p class="masthead__standfirst">${esc(standfirst)}</p>` : ''}
      </div>
    </section>`;
}

/** Breadcrumb trail. */
export function crumbs(trail) {
  return `
    <nav class="crumbs wrap" aria-label="Breadcrumb">
      ${trail
        .map((t, i) =>
          i === trail.length - 1
            ? `<span aria-current="page">${esc(t.label)}</span>`
            : `<a href="${t.href}">${esc(t.label)}</a><span class="crumbs__sep" aria-hidden="true">/</span>`,
        )
        .join('')}
    </nav>`;
}
