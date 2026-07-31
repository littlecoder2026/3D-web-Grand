/**
 * Contact, login and cart.
 *
 * None of these three submit anywhere. This is a design showcase, so the forms
 * are real, validated, accessible UI that end in a plainly-worded notice rather
 * than pretending to create an account or take a payment. There is deliberately
 * nowhere on this site to type a card number.
 */

import { byId, doseOf, money, priceWith } from '../catalogue.js';
import { media, packshot, pips } from '../packshot.js';
import { crumbs, esc, masthead, toast } from '../layout.js';
import * as cart from '../cart.js';

const FREE_OVER = 50;
const DELIVERY = 4.95;

/** Shared "this is a showcase" panel, shown in place of a real submission. */
function showcaseNotice(head, body) {
  return `
    <div class="notice" role="status">
      <p class="notice__head">${esc(head)}</p>
      <p class="notice__body">${esc(body)}</p>
      <p class="notice__foot">
        A design showcase for ICAD Upstarts 2026 — nothing here is for sale, and no
        details are stored or sent anywhere.
      </p>
    </div>`;
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export function contact() {
  const html = `
    ${crumbs([{ href: '#/', label: 'Home' }, { label: 'Contact' }])}
    ${masthead({
      eyebrow: 'Contact',
      title: 'Ask us anything.',
      standfirst:
        'Including the questions you would rather not ask at the counter. Especially those, actually.',
    })}

    <section class="wrap contact">
      <form class="form" id="contactForm" novalidate>
        <div class="field">
          <label for="cName">Your name</label>
          <input id="cName" name="name" type="text" autocomplete="name" required />
          <p class="field__error" data-for="cName"></p>
        </div>
        <div class="field">
          <label for="cEmail">Email</label>
          <input id="cEmail" name="email" type="email" autocomplete="email" required />
          <p class="field__error" data-for="cEmail"></p>
        </div>
        <div class="field">
          <label for="cTopic">What's it about?</label>
          <select id="cTopic" name="topic">
            <option>A product</option>
            <option>Dosage and the Grand Scale</option>
            <option>An order or collection</option>
            <option>Press or stockist enquiry</option>
            <option>Something else</option>
          </select>
        </div>
        <div class="field">
          <label for="cMessage">Your message</label>
          <textarea id="cMessage" name="message" rows="6" required></textarea>
          <p class="field__error" data-for="cMessage"></p>
        </div>
        <button class="btn btn--solid" type="submit">Send it</button>
        <div id="contactResult" hidden></div>
      </form>

      <aside class="sidecard">
        <h2 class="sidecard__head">The shop</h2>
        <p class="sidecard__body">
          27 High Street<br />Dublin<br />Ireland
        </p>
        <h3 class="sidecard__sub">Opening</h3>
        <p class="sidecard__body">
          Monday to Saturday, 10 til 8<br />Sunday, 12 til 6
        </p>
        <h3 class="sidecard__sub">Phone</h3>
        <p class="sidecard__body">01 555 0127</p>
        <h3 class="sidecard__sub">Licence</h3>
        <p class="sidecard__body">IE-RC-0001 · over 18s only</p>
        <a class="btn btn--ghost btn--sm" href="./index.html">See the shop in 3D</a>
      </aside>
    </section>
  `;

  return {
    html,
    mount(root) {
      const form = root.querySelector('#contactForm');
      const result = root.querySelector('#contactResult');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validate(form)) return;
        result.hidden = false;
        result.innerHTML = showcaseNotice(
          'Thanks — that would have sent.',
          'In a live build this would reach the shop and a host would reply the same day.',
        );
        form.querySelector('button[type=submit]').disabled = true;
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export function login() {
  const html = `
    ${crumbs([{ href: '#/', label: 'Home' }, { label: 'Login' }])}
    ${masthead({
      eyebrow: 'Your account',
      title: 'Welcome back.',
      standfirst:
        'An account keeps your dosage card, your order history and your collection slots in one place. It is never required to buy anything.',
    })}

    <section class="wrap auth">
      <form class="form" id="loginForm" novalidate>
        <div class="field">
          <label for="lEmail">Email</label>
          <input id="lEmail" name="email" type="email" autocomplete="email" required />
          <p class="field__error" data-for="lEmail"></p>
        </div>
        <div class="field">
          <label for="lPass">Password</label>
          <input id="lPass" name="password" type="password" autocomplete="current-password" required minlength="8" />
          <p class="field__error" data-for="lPass"></p>
        </div>
        <label class="check">
          <input type="checkbox" id="lRemember" />
          <span>Keep me signed in on this device</span>
        </label>
        <button class="btn btn--solid" type="submit">Sign in</button>
        <p class="form__aside">
          <a href="#/contact">Forgotten your password?</a> ·
          <a href="#/contact">Create an account</a>
        </p>
        <div id="loginResult" hidden></div>
      </form>

      <aside class="sidecard">
        <h2 class="sidecard__head">Why bother</h2>
        <ul class="sidecard__list">
          <li>Your Grand Scale card, saved — so you don't have to remember what worked.</li>
          <li>Reserve for collection and skip the queue at the counter.</li>
          <li>Reorder the thing you liked without having to recall its name.</li>
        </ul>
        <h3 class="sidecard__sub">Age verification</h3>
        <p class="sidecard__body">
          Accounts are 18+ and verified once, in the shop, by a host. We don't ask you to
          upload a photograph of your passport to a website.
        </p>
      </aside>
    </section>
  `;

  return {
    html,
    mount(root) {
      const form = root.querySelector('#loginForm');
      const result = root.querySelector('#loginResult');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validate(form)) return;
        result.hidden = false;
        result.innerHTML = showcaseNotice(
          'No accounts exist yet.',
          'This is the sign-in screen as designed. It is not wired to an auth service, and nothing you typed has left this page.',
        );
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export function cartPage() {
  const html = `
    ${crumbs([{ href: '#/', label: 'Home' }, { label: 'Cart' }])}
    ${masthead({ eyebrow: 'Your cart', title: 'Nearly there.' })}
    <section class="wrap cartwrap" id="cartWrap"></section>
  `;

  return {
    html,
    mount(root) {
      const wrap = root.querySelector('#cartWrap');

      const draw = () => {
        const lines = cart.lines();
        if (!lines.length) {
          wrap.innerHTML = `
            <div class="empty">
              <p class="empty__head">There's nothing in it yet.</p>
              <p class="empty__body">
                Have a look at <a href="#/shop">the range</a>, or start with
                <a href="#/shop/tea">the tea</a> — it's where most people do.
              </p>
              <a class="btn btn--solid" href="#/shop">Shop the range</a>
            </div>`;
          return;
        }

        const rows = lines
          .map(({ id, qty, variant = [] }) => {
            const p = byId(id);
            if (!p) return '';
            const mg = doseOf(p);
            const key = cart.lineKey(id, variant);
            const each = priceWith(p, variant);
            return `
              <li class="line">
                <a class="line__shot" href="#/product/${p.id}" aria-label="${esc(p.name)}">
                  ${media(p, mg)}
                </a>
                <div class="line__detail">
                  <h3 class="line__name"><a href="#/product/${p.id}">${esc(p.name)}</a></h3>
                  <p class="line__notes">${esc(p.notes)}</p>
                  ${variant.length ? `<p class="line__variant">${esc(variant.join(' · '))}</p>` : ''}
                  ${mg ? `<p class="line__dose">${pips(p.scale)} ${mg}mg per serving</p>` : ''}
                </div>
                <div class="line__qty">
                  <button class="step" data-dec="${key}" aria-label="One fewer ${esc(p.name)}">−</button>
                  <input class="qty__input" type="number" min="0" max="99" value="${qty}" data-qty="${key}"
                         aria-label="Quantity of ${esc(p.name)}" />
                  <button class="step" data-inc="${key}" aria-label="One more ${esc(p.name)}">+</button>
                </div>
                <p class="line__price">${money(each * qty)}</p>
                <button class="line__remove" data-remove="${key}" data-name="${esc(p.name)}"
                        aria-label="Remove ${esc(p.name)}">Remove</button>
              </li>`;
          })
          .join('');

        const subtotal = lines.reduce((n, { id, qty, variant = [] }) => {
          const p = byId(id);
          return n + (p ? priceWith(p, variant) : 0) * qty;
        }, 0);
        const delivery = subtotal >= FREE_OVER || subtotal === 0 ? 0 : DELIVERY;
        const toFree = Math.max(0, FREE_OVER - subtotal);

        wrap.innerHTML = `
          <ul class="lines">${rows}</ul>

          <aside class="summary">
            <h2 class="summary__head">Summary</h2>
            <dl class="summary__rows">
              <dt>Subtotal</dt><dd>${money(subtotal)}</dd>
              <dt>Delivery</dt><dd>${delivery === 0 ? 'Free' : money(delivery)}</dd>
              <dt class="summary__total">Total</dt><dd class="summary__total">${money(subtotal + delivery)}</dd>
            </dl>
            ${
              toFree > 0
                ? `<p class="summary__nudge">${money(toFree)} more for free delivery.</p>`
                : '<p class="summary__nudge summary__nudge--on">Free delivery — you\'re over €50.</p>'
            }
            <button class="btn btn--solid summary__go" id="checkout">Checkout</button>
            <button class="btn btn--ghost btn--sm" id="clear">Empty the cart</button>
            <p class="summary__small">
              Or reserve for collection and pick it up at the counter within the hour. A host
              will check you're over 18 when you collect.
            </p>
            <div id="checkoutResult" hidden></div>
          </aside>
        `;

        // Quantity controls
        for (const b of wrap.querySelectorAll('[data-inc]')) {
          b.addEventListener('click', () => {
            const line = cart.lines().find((l) => cart.lineKey(l.id, l.variant || []) === b.dataset.inc);
            cart.setQty(b.dataset.inc, (line?.qty ?? 0) + 1);
          });
        }
        for (const b of wrap.querySelectorAll('[data-dec]')) {
          b.addEventListener('click', () => {
            const line = cart.lines().find((l) => cart.lineKey(l.id, l.variant || []) === b.dataset.dec);
            cart.setQty(b.dataset.dec, (line?.qty ?? 1) - 1);
          });
        }
        for (const i of wrap.querySelectorAll('[data-qty]')) {
          i.addEventListener('change', () => cart.setQty(i.dataset.qty, Number(i.value)));
        }
        for (const b of wrap.querySelectorAll('[data-remove]')) {
          b.addEventListener('click', () => {
            cart.remove(b.dataset.remove);
            toast(`${b.dataset.name || 'Item'} — removed`);
          });
        }

        wrap.querySelector('#clear')?.addEventListener('click', () => {
          cart.clear();
          toast('Cart emptied');
        });

        wrap.querySelector('#checkout')?.addEventListener('click', () => {
          const res = wrap.querySelector('#checkoutResult');
          res.hidden = false;
          res.innerHTML = showcaseNotice(
            'This is where checkout would go.',
            'Deliberately not built: there is nowhere on this site to enter a card number, because nothing here is actually for sale.',
          );
          res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      };

      // Redraw whenever the store changes, and clean up on navigation.
      return cart.subscribe(draw);
    },
  };
}

// ---------------------------------------------------------------------------
// Validation — native constraints, surfaced inline rather than as tooltips
// ---------------------------------------------------------------------------

function validate(form) {
  let ok = true;
  let first = null;

  for (const el of form.querySelectorAll('input, textarea, select')) {
    const slot = form.querySelector(`[data-for="${el.id}"]`);
    if (!slot) continue;

    let msg = '';
    if (el.required && !el.value.trim()) msg = 'We need this one.';
    else if (el.type === 'email' && el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value)) {
      msg = "That doesn't look like an email address.";
    } else if (el.minLength > 0 && el.value && el.value.length < el.minLength) {
      msg = `At least ${el.minLength} characters, please.`;
    }

    slot.textContent = msg;
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) {
      ok = false;
      first = first || el;
    }
  }

  first?.focus();
  return ok;
}
