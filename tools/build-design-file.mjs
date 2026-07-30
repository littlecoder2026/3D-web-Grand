/**
 * Builds the UI design file.
 *
 * Rather than redrawing the screens by hand, this imports the shop's own page
 * modules and renders each route to markup, then drops that markup into a
 * labelled artboard. The design file is therefore generated from the product
 * code: it cannot drift from what actually ships, and re-running it after a
 * change to the catalogue or the stylesheet updates every board at once.
 *
 *   node tools/build-design-file.mjs
 *   → design/grand-ui-design.html
 *
 * Each artboard is an isolated iframe carrying the real stylesheet, so the boards
 * render exactly as the browser will render production, and nothing in the
 * presentation chrome can leak into them (or the other way round).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Browser stubs — the page modules are pure, but cart.js reads localStorage at
// module scope and layout.js expects an element to render into.
// ---------------------------------------------------------------------------

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

/** Enough of an Element for renderHeader/renderFooter to write into. */
function fakeEl() {
  const noop = () => {};
  const stub = {
    className: '',
    innerHTML: '',
    dataset: {},
    classList: { add: noop, remove: noop, toggle: () => false },
    textContent: '',
    setAttribute: noop,
    addEventListener: noop,
    focus: noop,
    querySelector: () => stub,
    querySelectorAll: () => [],
  };
  return stub;
}

const { renderHeader, renderFooter } = await import('../src/shop/layout.js');
const { home, shop, product, notFound } = await import('../src/shop/pages/shop.js');
const { about, blog, post } = await import('../src/shop/pages/editorial.js');
const { contact, login, cartPage } = await import('../src/shop/pages/account.js');
const cart = await import('../src/shop/cart.js');
const { CATEGORIES, PRODUCTS, SCALE } = await import('../src/shop/catalogue.js');

// Seed a cart so the cart board shows a real basket rather than its empty state.
cart.add('tea-barmbrack', 2);
cart.add('gum-sour-bears', 1);
cart.add('flower-lime-kush', 1);

const header = fakeEl();
const footer = fakeEl();
renderHeader(header);
renderFooter(footer);

const HEADER = `<header class="siteheader">${header.innerHTML}</header>`;
const FOOTER = `<footer class="sitefooter">${footer.innerHTML}</footer>`;

const route = (hash) => ({ parts: hash.replace(/^#\/?/, '').split('/').filter(Boolean) });

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

const shopCss = await readFile(join(ROOT, 'src/shop/shop.css'), 'utf8');

// The licensed display face is embedded so the design file shows the real
// lettering. It is deliberately not in the repo — see public/fonts/README.md.
const fontPath = join(ROOT, 'public/fonts/WARREN.woff');
const hasFont = existsSync(fontPath);
const fontFace = hasFont
  ? `@font-face{font-family:'Warren';src:url(data:font/woff;base64,${(
      await readFile(fontPath)
    ).toString('base64')}) format('woff');font-weight:400;font-display:block}`
  : '';

if (!hasFont) {
  console.warn('! WARREN.woff not found — the design file will fall back to Georgia.');
}

// ---------------------------------------------------------------------------
// Artboards
// ---------------------------------------------------------------------------

/** Wrap a page's markup in the full document an iframe will render. */
function frameDoc(inner, { chrome = true, width = 1440 } = {}) {
  return `<!doctype html><html lang="en-IE"><head><meta charset="utf-8">
<style>${fontFace}${shopCss}
html{overflow:hidden}
body{width:${width}px}
/* The design file is a still: freeze anything that would otherwise animate
   under the viewer and make the boards impossible to compare. */
*,*::before,*::after{animation:none!important;transition:none!important}
</style></head><body>${chrome ? HEADER : ''}<main id="main">${inner}</main>${chrome ? FOOTER : ''}</body></html>`;
}

const gateMarkup = `
<div class="overlay overlay--cream" style="position:static;min-height:900px">
  <div class="gate">
    <div class="wordmark wordmark--md">GRAND<span class="dot">.</span></div>
    <p class="gate__eyebrow">Before you come in</p>
    <h1 class="gate__head">Are you 18 or over?</h1>
    <p class="gate__body">Legal cannabis in Ireland is for adults only. We ask everyone — no
      exceptions, no hard feelings.</p>
    <div class="gate__actions">
      <button class="btn btn--solid" type="button">Yes, I'm 18 or over</button>
      <button class="btn btn--ghost" type="button">Not yet</button>
    </div>
    <p class="gate__foot">A design showcase for ICAD Upstarts 2026. Nothing is for sale here.</p>
  </div>
</div>`;

/**
 * The screens, in the order a customer meets them.
 * `w` is the artboard width; anything at 390 is the phone layout.
 */
const BOARDS = [
  {
    id: 'gate',
    name: 'Age gate',
    route: 'on first visit',
    w: 1440,
    note:
      'Asked once per session and shared with the walkthrough, so nobody is asked twice. ' +
      'The refusal is a civil screen, not a dead end — being turned away is part of the ' +
      'brand voice too.',
    html: () => frameDoc(gateMarkup, { chrome: false }),
  },
  {
    id: 'home',
    name: 'Home',
    route: '#/',
    w: 1440,
    note:
      'The hero states the job — from curiosity to confidence — then the five heroes, the ' +
      'nine categories as arched cards, and the Grand Scale explained before anything is ' +
      'sold. Responsibility sits above the fold, not in a footer.',
    html: () => frameDoc(home().html),
  },
  {
    id: 'shop',
    name: 'Shop — all products',
    route: '#/shop',
    w: 1440,
    note:
      'A four-up grid on the arched card. Every card carries name, flavour line, strength ' +
      'on the Grand Scale and price, so a decision can be made without opening anything.',
    html: () => frameDoc(shop(route('#/shop')).html),
  },
  {
    id: 'shop-cat',
    name: 'Shop — category',
    route: '#/shop/tea',
    w: 1440,
    note:
      'The same grid, filtered, with the category tagline and blurb promoted to a masthead. ' +
      'Categories mirror the six wall bays and three island groups of the physical store.',
    html: () => frameDoc(shop(route('#/shop/tea')).html),
  },
  {
    id: 'product',
    name: 'Product',
    route: '#/product/flower-lime-kush',
    w: 1440,
    note:
      'Packshot in the arch, strength panel, flavour, when people reach for it, and the ' +
      'add-to-cart. The dose is stated three times over — pips, milligrams and plain ' +
      'English — because that is the responsibility pillar doing its job.',
    html: () => frameDoc(product(route('#/product/flower-lime-kush')).html),
  },
  {
    id: 'cart',
    name: 'Cart',
    route: '#/cart',
    w: 1440,
    note:
      'Line items with quantity steppers, the free-delivery threshold, and a summary. ' +
      'Checkout ends in a showcase notice: there is deliberately nowhere here to type a ' +
      'card number.',
    html: () => frameDoc(cartPage().html),
  },
  {
    id: 'about',
    name: 'About us',
    route: '#/about',
    w: 1440,
    note:
      'The strategy, in the brand voice: the insight, the Irish precedent, and the three ' +
      'governing tests the whole project is judged against.',
    html: () => frameDoc(about().html),
  },
  {
    id: 'blog',
    name: 'Blog — index',
    route: '#/blog',
    w: 1440,
    note: 'A lead article in the arch, then the rest as a list. Editorial, not marketing.',
    html: () => frameDoc(blog().html),
  },
  {
    id: 'post',
    name: 'Blog — article',
    route: '#/blog/your-first-visit',
    w: 1440,
    note:
      'A single measure of about 65 characters, Georgia at reading size, with the standfirst ' +
      'set larger. Long-form is where the confident-expert voice has room to work.',
    html: () => frameDoc(post(route('#/blog/your-first-visit')).html),
  },
  {
    id: 'contact',
    name: 'Contact',
    route: '#/contact',
    w: 1440,
    note: 'Form on the left, the shop’s address, hours and licence number on the right.',
    html: () => frameDoc(contact().html),
  },
  {
    id: 'login',
    name: 'Login',
    route: '#/login',
    w: 1440,
    note:
      'A sign-in screen that does not authenticate. No password is ever collected — the ' +
      'submit ends in the same showcase notice as checkout.',
    html: () => frameDoc(login().html),
  },
  {
    id: 'notfound',
    name: 'Not found',
    route: 'any unknown route',
    w: 1440,
    note: 'Even the 404 keeps its manners and offers a way back in.',
    html: () => frameDoc(notFound().html),
  },
];

const PHONE = [
  { id: 'm-home', name: 'Home', route: '#/', html: () => frameDoc(home().html, { width: 390 }) },
  {
    id: 'm-shop',
    name: 'Shop',
    route: '#/shop',
    html: () => frameDoc(shop(route('#/shop')).html, { width: 390 }),
  },
  {
    id: 'm-product',
    name: 'Product',
    route: '#/product/gum-sour-bears',
    html: () => frameDoc(product(route('#/product/gum-sour-bears')).html, { width: 390 }),
  },
  { id: 'm-cart', name: 'Cart', route: '#/cart', html: () => frameDoc(cartPage().html, { width: 390 }) },
];

// ---------------------------------------------------------------------------
// Foundations
// ---------------------------------------------------------------------------

const PALETTE = [
  ['Bottle Green', '#163A2B', 'Primary ink, cabinetry, the footer'],
  ['Forest Ink', '#0F2C20', 'Shadow tone, recessed panels, the mat'],
  ['Cream', '#F4EEDE', 'Ground, walls, paper goods'],
  ['Amber Gold', '#C8922E', 'The full stop, hairlines, hardware — jewellery only'],
  ['Soft Sage', '#AEC3A6', 'Upholstery, secondary washes, the rug'],
  ['Signal Green', '#3E9B55', 'Accent only — never a ground, never a fascia'],
];

const swatches = PALETTE.map(
  ([name, hex, use]) => `
  <figure class="sw">
    <div class="sw__chip" style="background:${hex}"></div>
    <figcaption>
      <b>${name}</b>
      <code>${hex}</code>
      <span>${use}</span>
    </figcaption>
  </figure>`,
).join('');

const scaleRows = SCALE.map(
  (s) => `
  <tr>
    <td><span class="pipset">${[1, 2, 3]
      .map((n) => `<i class="${n <= s.step ? 'on' : ''}"></i>`)
      .join('')}</span></td>
    <td><b>${s.step} · ${s.name}</b></td>
    <td class="num">${s.mg}mg</td>
    <td>${s.note}</td>
  </tr>`,
).join('');

const catRows = CATEGORIES.map(
  (c) => `<tr><td class="num">${c.plan ?? '—'}</td><td><b>${c.name}</b></td><td>${c.tagline}</td>
  <td class="num">${PRODUCTS.filter((p) => p.category === c.id).length}</td></tr>`,
).join('');

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * True content height of each board, measured in a browser and baked in so the
 * document reserves the right space up front. Without these the boards grow as
 * their lazy iframe loads and the reader gets thrown down the page mid-scroll.
 * Re-measure if a page's content changes materially.
 */
const HEIGHTS = {
  gate: 900, home: 4153, shop: 4367, 'shop-cat': 1440, product: 2085, cart: 798,
  about: 2628, blog: 1610, post: 1780, contact: 1430, login: 1283, notfound: 864,
  'm-home': 7943, 'm-shop': 17673, 'm-product': 4036, 'm-cart': 1154,
};

const board = (b, cls = '') => `
<figure class="board ${cls}" id="b-${b.id}">
  <figcaption class="board__cap">
    <span class="board__name">${b.name}</span>
    <span class="board__meta">${b.route} · ${b.w || 390}×auto</span>
  </figcaption>
  ${b.note ? `<p class="board__note">${b.note}</p>` : ''}
  <div class="frame" data-w="${b.w || 390}" data-h="${HEIGHTS[b.id] || 900}"
       style="height:${Math.round((HEIGHTS[b.id] || 900) * ((b.w || 390) === 390 ? 1 : 1124 / 1440))}px">
    <iframe title="${b.name}" loading="lazy" srcdoc="${b.html().replace(/"/g, '&quot;')}"></iframe>
  </div>
</figure>`;

const html = `<!doctype html>
<html lang="en-IE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GRAND. — UI design file</title>
<style>
${fontFace}

/* ── Presentation chrome ────────────────────────────────────────────────────
   Deliberately a different world from the work it carries: a dark studio
   canvas so the cream artboards read as objects on a surface. The neutral is
   biased green off Forest Ink rather than a default grey. Single-theme on
   purpose — a design file has to show the brand's colours, not the viewer's. */
:root{
  --canvas:#0E1512;
  --canvas-2:#161F1A;
  --rule:#24322B;
  --ink:#93A79A;
  --ink-dim:#5E6F65;
  --ink-bright:#DDE6E0;
  --gold:#C8922E;
  --sans:ui-sans-serif,-apple-system,"Helvetica Neue",Arial,sans-serif;
  --serif:Georgia,"Times New Roman",serif;
  --display:"Warren",Georgia,serif;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;background:var(--canvas);color:var(--ink);
  font-family:var(--sans);font-size:14px;line-height:1.6;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1180px;margin:0 auto;padding:0 28px}
a{color:var(--gold)}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.86em}

.eyebrow{
  font-size:10px;letter-spacing:.24em;text-transform:uppercase;
  color:var(--ink-dim);margin:0 0 .9em;
}

/* ── Cover ─────────────────────────────────────────────────────────────── */
.cover{padding:120px 0 90px;border-bottom:1px solid var(--rule)}
.cover__mark{
  font-family:var(--display);font-size:clamp(64px,11vw,132px);line-height:.9;
  color:var(--ink-bright);margin:0 0 .2em;letter-spacing:.01em;
}
.cover__mark i{color:var(--gold);font-style:normal}
.cover__title{
  font-family:var(--display);font-weight:400;font-size:clamp(26px,4vw,44px);
  color:var(--ink-bright);margin:0 0 .5em;line-height:1.08;text-wrap:balance;
}
.cover__sub{max-width:62ch;font-family:var(--serif);font-size:17px;color:var(--ink)}
.cover__meta{
  display:flex;flex-wrap:wrap;gap:10px 34px;margin-top:44px;padding-top:24px;
  border-top:1px solid var(--rule);font-size:11px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--ink-dim);
}
.cover__meta b{color:var(--ink);font-weight:500}

/* ── Sections ──────────────────────────────────────────────────────────── */
section{padding:80px 0;border-bottom:1px solid var(--rule)}
h2.sec{
  font-family:var(--display);font-weight:400;font-size:30px;color:var(--ink-bright);
  margin:0 0 .3em;
}
h2.sec + p{max-width:66ch;font-family:var(--serif);font-size:15.5px;margin:0 0 2.6em}
h3.sub{
  font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);
  margin:52px 0 18px;padding-bottom:10px;border-bottom:1px solid var(--rule);
}

/* ── Foundations ───────────────────────────────────────────────────────── */
.swatches{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:18px}
.sw{margin:0}
.sw__chip{height:92px;border-radius:2px;border:1px solid rgba(255,255,255,.09)}
.sw figcaption{display:flex;flex-direction:column;gap:2px;padding-top:10px;font-size:12px}
.sw b{color:var(--ink-bright);font-weight:500}
.sw code{color:var(--gold)}
.sw span{color:var(--ink-dim);font-size:11.5px;line-height:1.45}

.typerow{display:grid;grid-template-columns:120px 1fr;gap:20px;align-items:baseline;
  padding:16px 0;border-bottom:1px solid var(--rule)}
.typerow small{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-dim)}
.t-display{font-family:var(--display);font-size:42px;color:var(--ink-bright);line-height:1}
.t-body{font-family:var(--serif);font-size:16px;color:var(--ink)}
.t-util{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink)}

table.spec{width:100%;border-collapse:collapse;font-size:13px}
table.spec td,table.spec th{padding:11px 14px;border-bottom:1px solid var(--rule);text-align:left;
  vertical-align:top}
table.spec th{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-dim);
  font-weight:500}
table.spec b{color:var(--ink-bright);font-weight:500}
.num{font-variant-numeric:tabular-nums;color:var(--ink-bright)}
.tablewrap{overflow-x:auto}

.pipset{display:inline-flex;gap:5px}
.pipset i{width:9px;height:9px;border-radius:50%;border:1px solid var(--gold);display:block}
.pipset i.on{background:var(--gold)}

/* ── Artboards ─────────────────────────────────────────────────────────── */
.boards{display:flex;flex-direction:column;gap:76px}
.board{margin:0}
.board__cap{display:flex;flex-wrap:wrap;align-items:baseline;gap:14px;margin-bottom:8px}
.board__name{font-family:var(--display);font-size:22px;color:var(--ink-bright)}
.board__meta{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-dim)}
.board__note{max-width:74ch;margin:0 0 18px;font-family:var(--serif);font-size:14.5px;
  color:var(--ink)}
.frame{
  position:relative;overflow:hidden;border:1px solid var(--rule);border-radius:3px;
  background:#F4EEDE;box-shadow:0 30px 70px -34px rgba(0,0,0,.8);
  min-height:420px;
  /* Boards grow as their lazy iframe loads and gets measured. Without this the
     browser keeps the *content* still and moves the scrollbar instead, which
     throws the reader down the document mid-scroll. */
  overflow-anchor:none;
}
.board{overflow-anchor:none}
.frame iframe{border:0;display:block;transform-origin:0 0;background:#F4EEDE}

/* Phones sit in a row, at true size where the viewport allows. */
.phones{display:flex;flex-wrap:wrap;gap:34px}
.phones .board{flex:0 0 auto;width:390px;max-width:100%}
.phones .frame{border-radius:14px}

.legend{display:flex;flex-wrap:wrap;gap:10px 26px;font-size:11px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink-dim);margin-bottom:30px}
.legend b{color:var(--gold);font-weight:500}

/* ── Index ─────────────────────────────────────────────────────────────── */
.index{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2px 26px;
  list-style:none;padding:0;margin:0;counter-reset:i}
.index a{display:flex;justify-content:space-between;gap:12px;padding:9px 0;
  border-bottom:1px solid var(--rule);text-decoration:none;color:var(--ink)}
.index a:hover{color:var(--ink-bright)}
.index a::after{content:counter(i,decimal-leading-zero);counter-increment:i;color:var(--ink-dim);
  font-variant-numeric:tabular-nums}

footer.end{padding:70px 0 110px;color:var(--ink-dim);font-size:12.5px}
footer.end p{max-width:70ch}

a:focus-visible,.index a:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media (max-width:640px){
  .cover{padding:70px 0 50px}
  section{padding:54px 0}
}
</style>
</head>
<body>

<header class="cover">
  <div class="wrap">
    <p class="eyebrow">ICAD Upstarts 2026 · deliverable #6 · website &amp; mobile</p>
    <p class="cover__mark">GRAND<i>.</i></p>
    <h1 class="cover__title">The online shop, screen by screen.</h1>
    <p class="cover__sub">
      Every page of the e-commerce site, at desktop and at phone width, with the
      foundations they are built from. The same range, the same categories and the
      same dosage system as the physical store — so walking the shop online is
      walking the same room.
    </p>
    <div class="cover__meta">
      <span><b>${BOARDS.length}</b> screens</span>
      <span><b>${PHONE.length}</b> phone layouts</span>
      <span><b>${PRODUCTS.length}</b> products</span>
      <span><b>${CATEGORIES.length}</b> categories</span>
      <span>Desktop <b>1440</b> · Phone <b>390</b></span>
    </div>
  </div>
</header>

<section>
  <div class="wrap">
    <p class="eyebrow">Contents</p>
    <ul class="index">
      ${[...BOARDS.map((b) => `<li><a href="#b-${b.id}">${b.name}</a></li>`), '<li><a href="#phones">Phone layouts</a></li>', '<li><a href="#foundations">Foundations</a></li>'].join('\n      ')}
    </ul>
  </div>
</section>

<section id="foundations">
  <div class="wrap">
    <h2 class="sec">Foundations</h2>
    <p>
      Locked before a single screen was drawn, and shared with the store itself —
      the palette on the wall is the palette on the page.
    </p>

    <h3 class="sub">Palette</h3>
    <div class="swatches">${swatches}</div>

    <h3 class="sub">Typography</h3>
    <div class="typerow"><small>Display</small><div><span class="t-display">Grand, I've got this.</span>
      <p style="margin:.5em 0 0;font-size:12px;color:var(--ink-dim)">WARREN · headings, the wordmark, product names. If it reassures, it is the serif.</p></div></div>
    <div class="typerow"><small>Body</small><div><span class="t-body">Whatever your ritual already is — a brew, a sweet, a smoke, a chew — there is a Grand way in.</span>
      <p style="margin:.5em 0 0;font-size:12px;color:var(--ink-dim)">Georgia · running text, set to a 65-character measure.</p></div></div>
    <div class="typerow"><small>Utility</small><div><span class="t-util">Premium products · Conscious choices · 18+ only</span>
      <p style="margin:.5em 0 0;font-size:12px;color:var(--ink-dim)">Grotesque · labels, prices, doses, navigation. If it informs, it is the sans.</p></div></div>

    <h3 class="sub">The Grand Scale</h3>
    <p style="margin:-6px 0 20px;max-width:66ch;font-family:var(--serif)">
      One scale, used identically on every card, product page, cart line and pack.
      Three pips, the same device as the shelf tickets in the store.
    </p>
    <div class="tablewrap"><table class="spec">
      <thead><tr><th>Scale</th><th>Step</th><th>Dose</th><th>In plain English</th></tr></thead>
      <tbody>${scaleRows}</tbody>
    </table></div>

    <h3 class="sub">Categories</h3>
    <p style="margin:-6px 0 20px;max-width:66ch;font-family:var(--serif)">
      The six wall bays from the floor plan, plus the three groups off the central
      island. The plan number is the fixture the category maps to in the room.
    </p>
    <div class="tablewrap"><table class="spec">
      <thead><tr><th>Plan</th><th>Category</th><th>Tagline</th><th>Items</th></tr></thead>
      <tbody>${catRows}</tbody>
    </table></div>
  </div>
</section>

<section>
  <div class="wrap">
    <h2 class="sec">Screens</h2>
    <p>
      In the order a customer meets them. Every board is live — the real
      stylesheet, the real components and the real catalogue, rendered at 1440
      and scaled to fit. Hover a card and it behaves as it will in production.
    </p>
    <p class="legend">
      <span><b>Live</b> not screenshots</span>
      <span><b>1440</b> desktop artboard</span>
      <span><b>Real</b> catalogue data</span>
    </p>
    <div class="boards">
      ${BOARDS.map((b) => board(b)).join('\n')}
    </div>
  </div>
</section>

<section id="phones">
  <div class="wrap">
    <h2 class="sec">Phone</h2>
    <p>
      390 wide. The header collapses to two rows with the category rail scrolling
      horizontally, the product grid drops to one column, and the cart summary
      moves below the lines rather than beside them.
    </p>
    <div class="phones">
      ${PHONE.map((b) => board(b, 'is-phone')).join('\n')}
    </div>
  </div>
</section>

<footer class="end">
  <div class="wrap">
    <p class="eyebrow">Notes</p>
    <p>
      Generated from the shop's own source by <code>tools/build-design-file.mjs</code>,
      so these boards cannot drift from what ships. Re-run it after a change to the
      catalogue or the stylesheet and every screen updates at once.
    </p>
    <p style="margin-top:1.2em">
      Nothing on the site takes payment. Checkout, login and the contact form all
      end in a plainly-worded showcase notice — there is deliberately nowhere to
      type a card number. The age gate shares its session flag with the 3D
      walkthrough, so a visitor is asked once rather than twice.
    </p>
    <p style="margin-top:1.2em">
      ${hasFont ? 'Headings are set in WARREN, embedded in this file.' : 'WARREN was unavailable at build time — headings fall back to Georgia.'}
    </p>
  </div>
</footer>

<script>
// A long document full of lazily-measured boards should always open at the top.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// Scale each artboard to the width available, and give its frame the true
// height of the content inside. Runs again on resize so the boards stay
// proportional rather than cropping.
function fit(){
  for (const frame of document.querySelectorAll('.frame')) {
    const iframe = frame.querySelector('iframe');
    const w = Number(frame.dataset.w);
    const avail = frame.clientWidth || frame.parentElement.clientWidth;
    const scale = Math.min(1, avail / w);
    let h = Number(frame.dataset.h) || 900;
    try {
      const d = iframe.contentDocument;
      if (d && d.body && d.body.scrollHeight > 40) {
        // Trust the live measurement once it disagrees with the baked figure by
        // more than a hair — fonts and wrapping can shift a board a little.
        const live = Math.max(d.body.scrollHeight, d.documentElement.scrollHeight);
        if (Math.abs(live - h) > 24) h = live;
      }
    } catch (e) { /* cross-document access not ready yet */ }
    iframe.style.width = w + 'px';
    iframe.style.height = h + 'px';
    iframe.style.transform = 'scale(' + scale + ')';
    frame.style.height = (h * scale) + 'px';
  }
}
addEventListener('resize', fit);
addEventListener('load', () => {
  fit();
  if (!location.hash) scrollTo(0, 0);
  setTimeout(fit, 250);
  setTimeout(fit, 1200);
});
for (const f of document.querySelectorAll('.frame iframe')) {
  f.addEventListener('load', () => { fit(); setTimeout(fit, 120); });
}
fit();
</script>
</body>
</html>`;

await mkdir(join(ROOT, 'design'), { recursive: true });
const out = join(ROOT, 'design/grand-ui-design.html');
await writeFile(out, html, 'utf8');

console.log(
  `design file → ${out}\n` +
    `  ${BOARDS.length} desktop boards, ${PHONE.length} phone boards\n` +
    `  ${PRODUCTS.length} products across ${CATEGORIES.length} categories\n` +
    `  ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB${hasFont ? ' (WARREN embedded)' : ' (no display font)'}`,
);
