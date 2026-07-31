/**
 * Home, the shop listing, and the product page.
 */

import {
  CATEGORIES,
  PRODUCTS,
  SCALE,
  byCategory,
  byId,
  categoryById,
  doseOf,
  extraPhotosFor,
  hasPhoto,
  heroes,
  money,
  priceWith,
  scaleName,
  variantsFor,
} from '../catalogue.js';
import { media, packshot, pips } from '../packshot.js';
import { crumbs, esc, masthead, toast } from '../layout.js';
import * as cart from '../cart.js';

/** One product card. The arched shot echoes the niches in the store. */
export function card(p) {
  const mg = doseOf(p);
  return `
    <article class="card">
      <a class="card__shot${hasPhoto(p) ? ' card__shot--photo' : ''}" href="#/product/${p.id}"
         aria-label="${esc(p.name)}">
        <span class="card__arch">${media(p, mg)}</span>
        ${p.hero ? '<span class="card__hero" title="Hero product">★</span>' : ''}
      </a>
      <div class="card__body">
        <p class="card__cat">${esc(categoryById(p.category).name)}</p>
        <h3 class="card__name"><a href="#/product/${p.id}">${esc(p.name)}</a></h3>
        <p class="card__notes">${esc(p.notes)}</p>
        <div class="card__meta">
          <span class="card__price">${money(p.price)}</span>
          ${mg ? `${pips(p.scale)}<span class="card__dose">${mg}mg</span>` : '<span class="card__dose">No dose</span>'}
        </div>
        <button class="btn btn--solid btn--sm card__add" data-add="${p.id}">Add to cart</button>
      </div>
    </article>`;
}

const grid = (list) => `<div class="grid">${list.map(card).join('')}</div>`;

/** Wire every [data-add] button on the page. */
export function mountAdders(root) {
  for (const btn of root.querySelectorAll('[data-add]')) {
    btn.addEventListener('click', () => {
      const p = byId(btn.dataset.add);
      cart.add(p.id, 1);
      toast(`${p.name} — added to your cart`);
    });
  }
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export function home() {
  const html = `
    <section class="hero">
      <div class="wrap hero__inner">
        <div class="hero__copy">
          <p class="hero__eyebrow">Ireland's first legal recreational dispensary</p>
          <h1 class="hero__title">Grand,<br />I've got this.</h1>
          <p class="hero__body">
            Tea, gummies, gum, drinks, flower and a bit of merch — with the dose on the
            front of every pack and a plain-English word for how strong it is. Whatever
            your ritual already is, there's a Grand way in.
          </p>
          <div class="hero__actions">
            <a class="btn btn--solid" href="#/shop">Shop the range</a>
            <a class="btn btn--ghost" href="./index.html">Walk the store in 3D</a>
          </div>
        </div>
        <div class="hero__art" aria-hidden="true">
          <div class="hero__arch">
            <span class="wordmark wordmark--lg">GRAND<span class="dot">.</span></span>
          </div>
        </div>
      </div>
    </section>

    <section class="strip">
      <div class="wrap strip__inner">
        <div><h3>Grown in Ireland</h3><p>Two hundred metres from the shop, by people we name.</p></div>
        <div><h3>The dose, on the front</h3><p>One scale, three steps, every pack and every ticket.</p></div>
        <div><h3>Ask us anything</h3><p>A host, not a guard. No question is a stupid one.</p></div>
      </div>
    </section>

    <section class="band wrap">
      <header class="band__head">
        <h2 class="band__title">Start here</h2>
        <a class="band__more" href="#/shop">All products →</a>
      </header>
      <p class="band__standfirst">
        The five our hosts hand over most often, and the ones to reach for if you have
        never done this before.
      </p>
      ${grid(heroes())}
    </section>

    <section class="cats wrap">
      <header class="band__head"><h2 class="band__title">Shop by category</h2></header>
      <div class="cats__grid">
        ${CATEGORIES.map(
          (c) => `
          <a class="cats__item" href="#/shop/${c.id}">
            <span class="cats__n">${c.plan ? `0${c.plan}` : '—'}</span>
            <span class="cats__name">${esc(c.name)}</span>
            <span class="cats__tag">${esc(c.tagline)}</span>
            <span class="cats__count">${byCategory(c.id).length} products</span>
          </a>`,
        ).join('')}
      </div>
    </section>

    <section class="scale">
      <div class="wrap scale__inner">
        <div class="scale__copy">
          <p class="masthead__eyebrow">The dosage system</p>
          <h2 class="band__title">The Grand Scale</h2>
          <p class="band__standfirst">
            One scale, used identically on every shelf ticket, every pack and every card
            that leaves the shop. Start at One. Wait a full hour before you decide it
            isn't working — that hour is the advice, not the small print.
          </p>
        </div>
        <ol class="scale__steps">
          ${SCALE.map(
            (s) => `
            <li>
              ${pips(s.step)}
              <h3>${s.step === 1 ? 'One' : s.step === 2 ? 'Two' : 'Three'} · ${esc(s.name)}</h3>
              <p class="scale__mg">${s.mg}mg</p>
              <p>${esc(s.note)}</p>
            </li>`,
          ).join('')}
        </ol>
      </div>
    </section>

    <section class="visit">
      <div class="wrap visit__inner">
        <div>
          <p class="masthead__eyebrow">Or come and see us</p>
          <h2 class="band__title">27, on the high street.</h2>
          <p class="band__standfirst">
            The whole shop is modelled in three dimensions — the frontage, the island, the
            six bays and the counter. Walk it before you visit, or instead of visiting.
          </p>
        </div>
        <a class="btn btn--solid" href="./index.html">Open the 3D store →</a>
      </div>
    </section>
  `;
  return { html, mount: mountAdders };
}

// ---------------------------------------------------------------------------
// Shop listing
// ---------------------------------------------------------------------------

export function shop(route) {
  const catId = route.parts[1];
  const cat = catId ? categoryById(catId) : null;
  if (catId && !cat) return notFound(`No category called “${catId}”.`);

  const list = cat ? byCategory(cat.id) : PRODUCTS;

  const filters = `
    <nav class="filters wrap" aria-label="Categories">
      <a class="filters__pill${cat ? '' : ' is-on'}" href="#/shop">All <span>${PRODUCTS.length}</span></a>
      ${CATEGORIES.map(
        (c) => `<a class="filters__pill${cat && c.id === cat.id ? ' is-on' : ''}" href="#/shop/${c.id}">
                  ${esc(c.name)} <span>${byCategory(c.id).length}</span>
                </a>`,
      ).join('')}
    </nav>`;

  const html = `
    ${crumbs(
      cat
        ? [{ href: '#/', label: 'Home' }, { href: '#/shop', label: 'Shop' }, { label: cat.name }]
        : [{ href: '#/', label: 'Home' }, { label: 'Shop' }],
    )}
    ${masthead({
      eyebrow: cat ? (cat.plan ? `Plan item 0${cat.plan}` : 'On the island') : 'The full range',
      title: cat ? cat.name : 'Shop',
      standfirst: cat ? cat.blurb : 'Everything on the shelves, in the same order as the shop itself.',
    })}
    ${filters}
    <section class="wrap listing">
      <p class="listing__count">${list.length} product${list.length === 1 ? '' : 's'}${
        cat ? ` · ${esc(cat.tagline)}` : ''
      }</p>
      ${grid(list)}
    </section>
  `;
  return { html, mount: mountAdders };
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export function product(route) {
  const p = byId(route.parts[1]);
  if (!p) return notFound('We can\'t find that one.');

  const cat = categoryById(p.category);
  const mg = doseOf(p);
  const step = p.scale;
  const related = byCategory(p.category)
    .filter((r) => r.id !== p.id)
    .slice(0, 4);

  const html = `
    ${crumbs([
      { href: '#/', label: 'Home' },
      { href: '#/shop', label: 'Shop' },
      { href: `#/shop/${cat.id}`, label: cat.name },
      { label: p.name },
    ])}

    <section class="wrap product">
      <div class="product__shot">
        <span class="product__arch${hasPhoto(p) ? ' product__arch--photo' : ''}" id="heroShot">
          ${media(p, mg)}
        </span>
        ${
          extraPhotosFor(p).length
            ? `<div class="product__views">
                 <button class="view is-on" type="button" data-view="">
                   ${media(p, mg)}
                 </button>
                 ${extraPhotosFor(p)
                   .map(
                     (v) => `<button class="view" type="button" data-view="${v}">
                               ${media(p, mg, v)}
                             </button>`,
                   )
                   .join('')}
               </div>`
            : ''
        }
      </div>

      <div class="product__detail">
        <p class="product__cat"><a href="#/shop/${cat.id}">${esc(cat.name)}</a></p>
        <h1 class="product__name">${esc(p.name)}</h1>
        <p class="product__notes">${esc(p.notes)}</p>
        <p class="product__price" id="price">${money(p.price)}</p>

        <p class="product__body">${esc(p.body)}</p>

        ${variantsFor(p)
          .map(
            (g, gi) => `
          <div class="variant" data-group="${gi}">
            <p class="variant__label">${esc(g.name)}</p>
            <div class="variant__opts" role="radiogroup" aria-label="${esc(g.name)}">
              ${g.values
                .map(
                  (v, vi) => `
                <button class="variant__opt${vi === 0 ? ' is-on' : ''}" type="button"
                        role="radio" aria-checked="${vi === 0}"
                        data-group="${gi}" data-value="${esc(v.label)}">
                  <span>${esc(v.label)}</span>
                  ${v.note ? `<em>${esc(v.note)}</em>` : ''}
                </button>`,
                )
                .join('')}
            </div>
          </div>`,
          )
          .join('')}

        ${
          step
            ? `<div class="product__scale">
                 <p class="product__scale-head">Strength — ${pips(step)} ${esc(scaleName(p))}</p>
                 <p class="product__scale-note">
                   ${mg}mg per serving. ${esc(SCALE[step - 1].note)}
                 </p>
               </div>`
            : `<div class="product__scale">
                 <p class="product__scale-head">No dose</p>
                 <p class="product__scale-note">Merch. Wear it, carry it, nothing more.</p>
               </div>`
        }

        <dl class="product__spec">
          <dt>When people reach for it</dt><dd>${esc(p.when)}</dd>
          <dt>Grown &amp; made</dt><dd>Ireland. Licence IE-RC-0001.</dd>
          <dt>Collection</dt><dd>Ready in the shop within the hour.</dd>
        </dl>

        <div class="product__buy">
          <label class="qty">
            <span class="qty__label">Qty</span>
            <input id="qty" class="qty__input" type="number" min="1" max="99" value="1" />
          </label>
          <button class="btn btn--solid" id="addOne" data-add-detail="${p.id}">Add to cart</button>
        </div>

        <p class="product__reassure">
          Not sure? <a href="./index.html">Come and see it in the shop</a> — a host will
          open a jar and let you have a smell before you decide.
        </p>
      </div>
    </section>

    ${
      related.length
        ? `<section class="band wrap">
             <header class="band__head"><h2 class="band__title">More ${esc(cat.name.toLowerCase())}</h2></header>
             <div class="grid">${related.map(card).join('')}</div>
           </section>`
        : ''
    }
  `;

  return {
    html,
    mount(root) {
      mountAdders(root);
      const qty = root.querySelector('#qty');
      const priceEl = root.querySelector('#price');

      // ── Variants ──────────────────────────────────────────────────────────
      // One selection per group. The price recalculates from the catalogue
      // rather than from anything held in the DOM, so what's shown and what's
      // added to the cart can't disagree.
      const groups = variantsFor(p);
      const chosen = groups.map((g) => g.values[0].label);

      const repriceAndLabel = () => {
        if (priceEl) priceEl.textContent = money(priceWith(p, chosen));
      };

      for (const btn of root.querySelectorAll('.variant__opt')) {
        btn.addEventListener('click', () => {
          const gi = Number(btn.dataset.group);
          chosen[gi] = btn.dataset.value;
          for (const sib of root.querySelectorAll(`.variant__opt[data-group="${gi}"]`)) {
            const on = sib === btn;
            sib.classList.toggle('is-on', on);
            sib.setAttribute('aria-checked', String(on));
          }
          repriceAndLabel();
        });
      }

      // ── Alternate views ───────────────────────────────────────────────────
      const hero = root.querySelector('#heroShot');
      for (const v of root.querySelectorAll('.view')) {
        v.addEventListener('click', () => {
          if (hero) hero.innerHTML = media(p, mg, v.dataset.view || null);
          for (const sib of root.querySelectorAll('.view')) sib.classList.toggle('is-on', sib === v);
        });
      }

      root.querySelector('#addOne').addEventListener('click', () => {
        const n = Math.max(1, Math.min(99, Number(qty.value) || 1));
        cart.add(p.id, n, chosen);
        const what = chosen.length ? ` (${chosen.join(' · ')})` : '';
        toast(`${p.name}${what} ×${n} — added to your cart`);
      });
    },
  };
}

// ---------------------------------------------------------------------------

export function notFound(message = 'That page has moved, or never existed.') {
  return {
    html: `
      ${masthead({ eyebrow: '404', title: 'We\'ve nothing here.', standfirst: message })}
      <section class="wrap prose">
        <p>
          Try <a href="#/shop">the shop</a>, have a read of
          <a href="#/blog">the blog</a>, or
          <a href="./index.html">walk the store in 3D</a>.
        </p>
      </section>`,
  };
}
