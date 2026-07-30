/**
 * The shop: router and boot.
 *
 * Hash routing rather than history routing, deliberately. The built bundle has to
 * run straight off a USB stick at the exhibition — `file://` with no server to
 * rewrite paths — and hash routes are the only kind that survive that.
 */

import { markHeader, renderFooter, renderHeader, runAgeGate } from './layout.js';
import { home, notFound, product, shop } from './pages/shop.js';
import { about, blog, post } from './pages/editorial.js';
import { cartPage, contact, login } from './pages/account.js';
import { ensureDisplayFont } from '../core/brandfont.js';

const routes = [
  { match: (p) => p.length === 0, page: home, title: 'Shop' },
  { match: (p) => p[0] === 'shop', page: shop, title: 'Shop' },
  { match: (p) => p[0] === 'product', page: product, title: 'Product' },
  { match: (p) => p[0] === 'about', page: about, title: 'About us' },
  { match: (p) => p[0] === 'blog' && p.length === 1, page: blog, title: 'Blog' },
  { match: (p) => p[0] === 'blog', page: post, title: 'Blog' },
  { match: (p) => p[0] === 'contact', page: contact, title: 'Contact' },
  { match: (p) => p[0] === 'login', page: login, title: 'Login' },
  { match: (p) => p[0] === 'cart', page: cartPage, title: 'Cart' },
];

function parse() {
  const raw = location.hash.replace(/^#\/?/, '');
  return { parts: raw.split('/').filter(Boolean) };
}

const header = document.getElementById('siteHeader');
const footer = document.getElementById('siteFooter');
const main = document.getElementById('main');

/** Teardown returned by the previous page's mount, if any. */
let cleanup = null;

function render() {
  const route = parse();
  const hit = routes.find((r) => r.match(route.parts));
  const view = hit ? hit.page(route) : notFound();

  if (typeof cleanup === 'function') cleanup();
  cleanup = null;

  main.innerHTML = view.html;
  if (view.mount) cleanup = view.mount(main) || null;

  markHeader(header, route);
  document.title = `GRAND. — ${hit ? hit.title : 'Not found'}`;

  // Land at the top of the new page, and put focus somewhere sensible for
  // anyone navigating by keyboard or screen reader.
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  main.focus({ preventScroll: true });
}

async function boot() {
  renderHeader(header);
  renderFooter(footer);

  const ok = await runAgeGate();
  if (!ok) return;

  window.addEventListener('hashchange', render);
  render();
}

boot();
